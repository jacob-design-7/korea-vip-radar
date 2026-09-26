import {safeFetch} from "./safe-fetcher";
import {segmentHtml} from "./dom-segmenter";
import {buildMockExtraction} from "./mock-extractor";
import {extractWithOpenAI,canUseOpenAI} from "./openai-extractor";
import {validateExtraction} from "./evidence-validator";
import {passesReviewGate,deriveContactRoute,duplicateHint,candidateMetadata} from "./candidate-intelligence";
import {SupabaseRestClient} from "./supabase-rest";
import type {ExtractionOutput} from "./extraction-contract";

export async function runRadarPipeline(db:SupabaseRestClient,input:{sourceId:string;url:string}){
  const sources=await db.select<any>("sources",`id=eq.${encodeURIComponent(input.sourceId)}&select=id,name,base_url,is_active,source_type,scan_priority,source_category`);
  const source=sources[0];if(!source||!source.is_active)throw new Error("Active source not found.");
  const sourceHost=new URL(source.base_url).hostname;
  const targetHost=new URL(input.url).hostname.toLowerCase();
  const allowed=targetHost===sourceHost.toLowerCase()||targetHost.endsWith(`.${sourceHost.toLowerCase()}`);
  if(!allowed)throw new Error(`URL host must match source host: ${sourceHost}`);

  const runRows=await db.insert<{id:string}>("source_runs",{source_id:input.sourceId,status:"PARTIAL",pages_seen:0,candidates_found:0},"id");
  const sourceRunId=runRows[0]?.id;if(!sourceRunId)throw new Error("Failed to create source run.");
  try{
    const fetched=await safeFetch(input.url,sourceHost);
    const previous=await db.select<any>("source_snapshots",`source_id=eq.${encodeURIComponent(input.sourceId)}&source_url=eq.${encodeURIComponent(fetched.finalUrl)}&content_hash=eq.${encodeURIComponent(fetched.sha256)}&select=id,fetched_at&order=fetched_at.desc&limit=1`);
    if(previous[0]){
      await db.update("source_runs",`id=eq.${encodeURIComponent(sourceRunId)}`,{status:"SUCCESS",pages_seen:1,candidates_found:0,finished_at:new Date().toISOString()},"id");
      return {sourceRunId,snapshotId:previous[0].id,jobId:null,candidateIds:[],unitCount:0,warnings:["UNCHANGED_CONTENT: extraction skipped."],unchanged:true,fetch:{finalUrl:fetched.finalUrl,status:fetched.status,fetchedAt:fetched.fetchedAt,sha256:fetched.sha256}};
    }

    const segmentation=segmentHtml(fetched.body);
    if(!segmentation.units.length)throw new Error("No Evidence Units extracted.");
    const snapshotId=await db.rpc<string>("persist_ingestion_snapshot",{
      p_source_id:input.sourceId,p_source_run_id:sourceRunId,p_source_url:fetched.finalUrl,p_fetched_at:fetched.fetchedAt,
      p_content_hash:fetched.sha256,p_normalizer_version:segmentation.normalizerVersion,p_segmenter_version:segmentation.normalizerVersion,
      p_http_status:fetched.status,p_storage_scope:"SECTION",p_section_text:segmentation.normalizedText.slice(0,200000),
      p_units:segmentation.units.map(u=>({ordinal:u.ordinal,blockType:u.blockType,sectionHeading:u.sectionHeading,text:u.text,sourceStartOffset:u.sourceStartOffset,sourceEndOffset:u.sourceEndOffset,contextBefore:u.contextBefore,contextAfter:u.contextAfter}))
    });

    const mode=(process.env.RADAR_AI_MODE??"mock").toLowerCase();
    if(mode==="openai"&&!process.env.OPENAI_API_KEY)throw new Error("RADAR_AI_MODE=openai but OPENAI_API_KEY is not configured.");
    let raw:ExtractionOutput;
    let model="mock",promptVersion="mock-v2";
    if(canUseOpenAI()){
      raw=await extractWithOpenAI(segmentation.units,fetched.finalUrl);
      model=process.env.OPENAI_MODEL||"gpt-5.6";promptVersion="vip-radar-structured-v1";
    }else{
      raw=buildMockExtraction(segmentation.units,fetched.finalUrl);
    }
    const extraction=validateExtraction(raw,segmentation.units,fetched.finalUrl);
    const jobWarnings=[...extraction.warnings];
    const jobs=await db.insert<{id:string}>("extraction_jobs",{
      snapshot_id:snapshotId,source_run_id:sourceRunId,model,prompt_version:promptVersion,status:"READY_FOR_REVIEW",
      request_fingerprint:fetched.sha256,raw_output:extraction,warnings:jobWarnings
    },"id");
    const jobId=jobs[0]?.id;if(!jobId)throw new Error("Failed to create extraction job.");

    const candidateIds:string[]=[];
    for(let i=0;i<extraction.events.length;i++){
      const event=extraction.events[i];
      const gate=passesReviewGate(event);
      if(!gate.pass){jobWarnings.push(`FILTERED: ${event.event_name??"unnamed"} — ${gate.reason}`);continue;}
      const route=deriveContactRoute(source.source_type,event);
      event.contact_route_hint=route.route;event.contact_route_reason=route.reason;
      const dup=await duplicateHint(db,event);
      const meta=candidateMetadata(event,route,dup);
      const rows=await db.insert<{id:string}>("extraction_event_candidates",{
        job_id:jobId,candidate_index:i,extracted_json:event,status:"PROPOSED",
        lead_days:meta.lead_days,lead_bucket:meta.lead_bucket,evidence_summary:meta.evidence,
        duplicate_hint:dup,contact_route_hint:route.route,contact_route_reason:route.reason
      },"id");
      const candidateId=rows[0]?.id;
      if(candidateId){
        candidateIds.push(candidateId);
        const person=event.appearances[0]?.person_name_en||event.appearances[0]?.person_name_original||"Named participant";
        await db.rpc("mark_candidate_alerted",{
          p_candidate_id:candidateId,
          p_title:`${person} · ${event.event_name??"Korea event"}`,
          p_body:`${meta.lead_days??"?"} days lead · ${meta.lead_bucket} · ${route.route}`,
          p_payload:{lead_days:meta.lead_days,lead_bucket:meta.lead_bucket,route:route.route,duplicate:dup,evidence:meta.evidence,source:source.name}
        });
      }
    }
    await db.update("extraction_jobs",`id=eq.${encodeURIComponent(jobId)}`,{warnings:Array.from(new Set(jobWarnings)).slice(0,50),raw_output:extraction},"id");
    await db.update("source_runs",`id=eq.${encodeURIComponent(sourceRunId)}`,{status:"SUCCESS",candidates_found:candidateIds.length,finished_at:new Date().toISOString()},"id");
    return {sourceRunId,snapshotId,jobId,candidateIds,unitCount:segmentation.units.length,warnings:jobWarnings,unchanged:false,fetch:{finalUrl:fetched.finalUrl,status:fetched.status,fetchedAt:fetched.fetchedAt,sha256:fetched.sha256}};
  }catch(error){
    try{await db.update("source_runs",`id=eq.${encodeURIComponent(sourceRunId)}`,{status:"FAILED",error_code:(error instanceof Error?error.message:String(error)).slice(0,500),finished_at:new Date().toISOString()},"id");}catch{}
    throw error;
  }
}
export async function listJobs(db:SupabaseRestClient){
  return await db.select<any>("extraction_jobs","select=id,snapshot_id,source_run_id,model,prompt_version,status,warnings,error_text,created_at,completed_at&order=created_at.desc&limit=80");
}
export async function getJob(db:SupabaseRestClient,id:string){
  const jobs=await db.select<any>("extraction_jobs",`id=eq.${encodeURIComponent(id)}&select=*`);const job=jobs[0];if(!job)throw new Error("Job not found.");
  const [snap,candidates,units]=await Promise.all([
    db.select<any>("source_snapshots",`id=eq.${encodeURIComponent(job.snapshot_id)}&select=*`),
    db.select<any>("extraction_event_candidates",`job_id=eq.${encodeURIComponent(id)}&select=*&order=candidate_index.asc`),
    db.select<any>("snapshot_units",`snapshot_id=eq.${encodeURIComponent(job.snapshot_id)}&select=*&order=unit_index.asc`)
  ]);
  return {job,snapshot:snap[0]??null,candidates,units};
}
