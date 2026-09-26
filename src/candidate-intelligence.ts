import type {ExtractedEvent,ContactRoute} from "./extraction-contract";
import type {SupabaseRestClient} from "./supabase-rest";
import {evidenceSummary} from "./evidence-validator";

function koreaToday(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const get=(t:string)=>parts.find(p=>p.type===t)?.value??"";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function leadTime(startDate:string|null){
  if(!startDate)return {lead_days:null as number|null,lead_bucket:"UNKNOWN"};
  const a=Date.parse(koreaToday()+"T00:00:00Z"),b=Date.parse(startDate+"T00:00:00Z");
  if(!Number.isFinite(b))return {lead_days:null as number|null,lead_bucket:"UNKNOWN"};
  const days=Math.round((b-a)/86400000);
  const bucket=days<0?"PAST":days<=6?"URGENT":days<=13?"SHORT_FUSE":days<=29?"ACTIONABLE":"EARLY";
  return {lead_days:days,lead_bucket:bucket};
}
export function deriveContactRoute(sourceType:string,event:ExtractedEvent):{route:ContactRoute;reason:string}{
  if(sourceType==="EMBASSY")return {route:"EMBASSY_OR_ORG_FIRST",reason:"The official source is an embassy; institutional coordination should precede direct speaker outreach."};
  if(event.contacts.some(c=>c.contact_kind==="PERSON"&&c.contact_type==="OFFICIAL_EMAIL"))
    return {route:"SPEAKER_DIRECT",reason:"The official source explicitly publishes a person-level official email contact."};
  if(["UNIVERSITY","RESEARCH_INSTITUTE","ACADEMIC_SOCIETY"].includes(sourceType))
    return {route:"HOST_FIRST",reason:"The named event is hosted by an academic or research institution; the host is the most reliable first route."};
  if(["INTERNATIONAL_ORG","GOVERNMENT","PARLIAMENT","CONVENTION_CENTER","CONFERENCE_ORGANIZER"].includes(sourceType))
    return {route:"HOST_FIRST",reason:"The event host/organizer is the safest first coordination route before direct outreach."};
  return {route:event.contact_route_hint||"INSTITUTION_FIRST",reason:event.contact_route_reason||"Use the relevant institution as the first contact route."};
}
function canonicalName(s:string|null|undefined){
  return (s??"").normalize("NFKC").toLowerCase().replace(/\b(dr|prof|professor|mr|mrs|ms|sir|hon|the honorable)\.?\b/g," ").replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export async function duplicateHint(db:SupabaseRestClient,event:ExtractedEvent){
  const names=event.appearances.map(a=>canonicalName(a.person_name_en||a.person_name_original)).filter(Boolean);
  if(!names.length)return {possible:false,matches:[]};
  const [people,candidates]=await Promise.all([
    db.select<any>("people","select=id,name_primary,name_original,name_english,current_title&limit=500"),
    db.select<any>("extraction_event_candidates","select=id,status,extracted_json,created_at&order=created_at.desc&limit=250")
  ]);
  const matches:any[]=[];
  for(const p of people){
    const aliases=[p.name_primary,p.name_original,p.name_english].map(canonicalName).filter(Boolean);
    if(names.some(n=>aliases.includes(n)))matches.push({kind:"PERSON",id:p.id,name:p.name_primary,title:p.current_title??null});
  }
  for(const c of candidates){
    const events=Array.isArray(c.extracted_json)?c.extracted_json:[c.extracted_json];
    for(const e of events){
      for(const a of e?.appearances??[]){
        const n=canonicalName(a.person_name_en||a.person_name_original);
        if(n&&names.includes(n))matches.push({kind:"CANDIDATE",id:c.id,status:c.status,name:a.person_name_en||a.person_name_original,event:e?.event_name??null});
      }
    }
  }
  const unique=matches.filter((m,i,arr)=>arr.findIndex(x=>x.kind===m.kind&&x.id===m.id)===i).slice(0,8);
  return {possible:unique.length>0,matches:unique};
}
export function passesReviewGate(event:ExtractedEvent){
  const lead=leadTime(event.start_date);
  if(lead.lead_bucket==="PAST")return {pass:false,reason:"Event date has already passed.",...lead};
  if((event.country_code??"").toUpperCase()!=="KR"&&!/(seoul|busan|incheon|daejeon|jeju|korea|서울|부산|인천|대전|제주|한국)/i.test((event.city??"")+" "+(event.venue??"")))
    return {pass:false,reason:"No explicit Korea location signal.",...lead};
  if(!event.date_unit_ids.length)return {pass:false,reason:"No date evidence.",...lead};
  if(!event.appearances.length)return {pass:false,reason:"No named participant.",...lead};
  const supported=event.appearances.some(a=>a.attendance_unit_ids.length>0||a.role_unit_ids.length>0);
  if(!supported)return {pass:false,reason:"No attendance/role evidence for a named participant.",...lead};
  return {pass:true,reason:"Named participant + dated Korea event + evidence linkage.",...lead};
}
export function candidateMetadata(event:ExtractedEvent,route:{route:ContactRoute;reason:string},duplicate:any){
  const lead=leadTime(event.start_date);
  return {lead,...lead,evidence:evidenceSummary(event),duplicate,route};
}
