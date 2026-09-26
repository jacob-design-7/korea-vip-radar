import type {EvidenceUnit} from "./ingestion-types";
import type {ExtractionOutput,ExtractedEvent,ExtractedAppearance,ExtractedContact} from "./extraction-contract";

function validDate(v:string|null){return !v||/^\d{4}-\d{2}-\d{2}$/.test(v);}
function norm(s:string){return s.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").trim();}
function nameSupported(name:string|null,units:EvidenceUnit[]){
  if(!name)return false;
  const toks=norm(name).split(/\s+/).filter(x=>x.length>=2);
  if(!toks.length)return false;
  const text=norm(units.map(x=>x.text).join(" "));
  return toks.some(t=>text.includes(t));
}
function dedupeIds(ids:string[],map:Map<string,EvidenceUnit>,warnings:string[],label:string){
  const out:string[]=[];
  for(const id of ids??[]){
    if(!map.has(id)){warnings.push(`Dropped invalid ${label} evidence id: ${id}`);continue;}
    if(!out.includes(id))out.push(id);
  }
  return out;
}
function unitsFor(ids:string[],map:Map<string,EvidenceUnit>){return ids.map(id=>map.get(id)).filter(Boolean) as EvidenceUnit[];}
function cleanContact(c:ExtractedContact,map:Map<string,EvidenceUnit>,warnings:string[]){
  const ids=dedupeIds(c.unit_ids,map,warnings,"contact");
  if(!ids.length)return null;
  const hay=unitsFor(ids,map).map(x=>x.text).join("\n");
  if(!c.contact_value||!hay.toLowerCase().includes(c.contact_value.toLowerCase())){
    warnings.push(`Dropped unsupported contact value: ${c.contact_value}`);
    return null;
  }
  return {...c,unit_ids:ids};
}
function cleanAppearance(a:ExtractedAppearance,map:Map<string,EvidenceUnit>,warnings:string[]){
  const attendance=dedupeIds(a.attendance_unit_ids,map,warnings,"attendance");
  const role=dedupeIds(a.role_unit_ids,map,warnings,"role");
  const presence=dedupeIds(a.presence_unit_ids,map,warnings,"presence");
  const name=a.person_name_en||a.person_name_original;
  const supportUnits=unitsFor([...attendance,...role],map);
  if(!name||!nameSupported(name,supportUnits)){
    warnings.push(`Dropped appearance without name-linked evidence: ${name??"unnamed"}`);
    return null;
  }
  let hint=a.presence_hint;
  if(hint!=="UNKNOWN"&&!presence.length){
    warnings.push(`Presence reset to UNKNOWN for ${name}: no presence evidence unit.`);
    hint="UNKNOWN";
  }
  if(hint==="PHYSICAL_CONFIRMED"){
    const text=unitsFor(presence,map).map(x=>x.text).join(" ");
    if(!/(in.person|on.site|onsite|physically|arriv|visit(?:ing|ed)?|attend(?:ing|ed)?|현장|직접 참석|방한|방문)/i.test(text)){
      warnings.push(`Physical presence reset to UNKNOWN for ${name}: evidence not explicit enough.`);
      hint="UNKNOWN";
    }
  }
  if(hint==="REMOTE_CONFIRMED"){
    const text=unitsFor(presence,map).map(x=>x.text).join(" ");
    if(!/(online|virtual|remote|zoom|webinar|온라인|비대면|원격)/i.test(text)){
      warnings.push(`Remote presence reset to UNKNOWN for ${name}: evidence not explicit enough.`);
      hint="UNKNOWN";
    }
  }
  return {...a,attendance_unit_ids:attendance,role_unit_ids:role,presence_unit_ids:presence,presence_hint:hint,confidence:Math.max(0,Math.min(1,Number(a.confidence)||0))};
}

export function validateExtraction(output:ExtractionOutput,units:EvidenceUnit[],sourceUrl:string):ExtractionOutput{
  const map=new Map(units.map(u=>[u.unitId,u]));
  const warnings=[...(output.warnings??[])];
  const events:ExtractedEvent[]=[];
  for(const e of output.events??[]){
    if(!validDate(e.start_date)||!validDate(e.end_date)){warnings.push(`Dropped event with malformed date: ${e.event_name??"unnamed"}`);continue;}
    const dateIds=dedupeIds(e.date_unit_ids,map,warnings,"date");
    const venueIds=dedupeIds(e.venue_unit_ids,map,warnings,"venue");
    const formatIds=dedupeIds(e.format_unit_ids,map,warnings,"format");
    const appearances=(e.appearances??[]).map(a=>cleanAppearance(a,map,warnings)).filter(Boolean) as ExtractedAppearance[];
    const contacts=(e.contacts??[]).map(c=>cleanContact(c,map,warnings)).filter(Boolean) as ExtractedContact[];
    let eventFormat=e.event_format;
    if(eventFormat!=="UNKNOWN"&&!formatIds.length){warnings.push(`Event format reset to UNKNOWN for ${e.event_name??"unnamed"}.`);eventFormat="UNKNOWN";}
    if(!e.event_name||!e.start_date||!dateIds.length||!appearances.length){
      warnings.push(`Dropped incomplete candidate event: ${e.event_name??"unnamed"}`);
      continue;
    }
    events.push({
      ...e,
      official_url:sourceUrl,
      country_code:e.country_code?.toUpperCase()??null,
      event_format:eventFormat,
      date_unit_ids:dateIds,
      venue_unit_ids:venueIds,
      format_unit_ids:formatIds,
      appearances,
      contacts
    });
  }
  return {events,warnings:Array.from(new Set(warnings)).slice(0,50)};
}

export function evidenceSummary(e:ExtractedEvent){
  const a=e.appearances[0];
  return {
    date:e.date_unit_ids.length>0,
    venue:e.venue_unit_ids.length>0,
    event_format:e.format_unit_ids.length>0,
    attendance:Boolean(a?.attendance_unit_ids.length),
    role:Boolean(a?.role_unit_ids.length),
    physical_presence:Boolean(a?.presence_unit_ids.length&&a.presence_hint==="PHYSICAL_CONFIRMED"),
    remote_presence:Boolean(a?.presence_unit_ids.length&&a.presence_hint==="REMOTE_CONFIRMED")
  };
}
