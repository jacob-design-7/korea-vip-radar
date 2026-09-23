import {safeFetch} from "./safe-fetcher";
import {segmentHtml} from "./dom-segmenter";
import {buildMockExtraction} from "./mock-extractor";
import {SupabaseRestClient} from "./supabase-rest";

export async function runRadarPipeline(db:SupabaseRestClient,input:{sourceId:string;url:string}){
  const sources=await db.select<any>("sources",`id=eq.${encodeURIComponent(input.sourceId)}&select=id,name,base_url,is_active`);
  const source=sources[0];if(!source||!source.is_active)throw new Error("Active source not found.");
  const sourceHost=new URL(source.base_url).hostname;
  const targetHost=new URL(input.url).hostname.toLowerCase();
  const allowed=targetHost===sourceHost.toLowerCase()||targetHost.endsWith(`.${sourceHost.toLowerCase()}`);
  if(!allowed)throw new Error(`URL host must match source host: ${sourceHost}`);

  const runRows=await db.insert<{id:string}>("source_runs",{source_id:input.sourceId,status:"PARTIAL",pages_seen:0,candidates_found:0},"id");
  const sourceRunId=runRows[0]?.id;if(!sourceRunId)throw new Error("Failed to create source run.");
  try{
    const fetched=await safeFetch(input.url,sourceHost);
    const segmentation=segmentHtml(fetched.body);
    if(!segmentation.units.length)throw new Error("No Evidence Units extracted.");
    const snapshotId=await db.rpc<string>("persist_ingestion_snapshot",{
      p_source_id:input.sourceId,p_source_run_id:sourceRunId,p_source_url:fetched.finalUrl,p_fetched_at:fetched.fetchedAt,
      p_content_hash:fetched.sha256,p_normalizer_version:segmentation.normalizerVersion,p_segmenter_version:segmentation.normalizerVersion,
      p_http_status:fetched.status,p_storage_scope:"SECTION",p_section_text:segmentation.normalizedText.slice(0,200000),
      p_units:segmentation.units.map(u=>({ordinal:u.ordinal,blockType:u.blockType,sectionHeading:u.sectionHeading,text:u.text,sourceStartOffset:u.sourceStartOffset,sourceEndOffset:u.sourceEndOffset,contextBefore:u.contextBefore,contextAfter:u.contextAfter}))
    });
    const extraction=buildMockExtraction(segmentation.units,fetched.finalUrl);
    const jobs=await db.insert<{id:string}>("extraction_jobs",{snapshot_id:snapshotId,source_run_id:sourceRunId,model:"mock",prompt_version:"mock-v1",status:"READY_FOR_REVIEW",raw_output:extraction,warnings:extraction.warnings},"id");
    const jobId=jobs[0]?.id;if(!jobId)throw new Error("Failed to create extraction job.");
    const candidateIds:string[]=[];
    for(let i=0;i<extraction.events.length;i++){
      const rows=await db.insert<{id:string}>("extraction_event_candidates",{job_id:jobId,candidate_index:i,extracted_json:extraction.events[i],status:"PROPOSED"},"id");
      if(rows[0]?.id)candidateIds.push(rows[0].id);
    }
    await db.update("source_runs",`id=eq.${encodeURIComponent(sourceRunId)}`,{status:"SUCCESS",candidates_found:candidateIds.length,finished_at:new Date().toISOString()},"id");
    return {sourceRunId,snapshotId,jobId,candidateIds,unitCount:segmentation.units.length,warnings:extraction.warnings,fetch:{finalUrl:fetched.finalUrl,status:fetched.status,fetchedAt:fetched.fetchedAt,sha256:fetched.sha256}};
  }catch(error){
    try{await db.update("source_runs",`id=eq.${encodeURIComponent(sourceRunId)}`,{status:"FAILED",error_code:(error instanceof Error?error.message:String(error)).slice(0,500),finished_at:new Date().toISOString()},"id");}catch{}
    throw error;
  }
}
export async function listJobs(db:SupabaseRestClient){
  return await db.select<any>("extraction_jobs","select=id,snapshot_id,source_run_id,model,prompt_version,status,warnings,error_text,created_at,completed_at&order=created_at.desc&limit=50");
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
