import type {EvidenceUnit} from "./ingestion-types";
import type {ExtractionOutput} from "./extraction-contract";

function findUnit(units:EvidenceUnit[],re:RegExp){return units.find(u=>re.test(u.text));}
function parse2026Period(text:string){
  const m=text.match(/Oct\.?\s*(\d{1,2}).*?Oct\.?\s*(\d{1,2}),\s*(2026)/i);
  if(!m)return {start:null,end:null};
  return {start:`${m[3]}-10-${m[1].padStart(2,"0")}`,end:`${m[3]}-10-${m[2].padStart(2,"0")}`};
}
export function buildMockExtraction(units:EvidenceUnit[],sourceUrl:string):ExtractionOutput{
  const eventNameUnit=findUnit(units,/^Event Name:\s*Smart Life Week 2026\b/i)??findUnit(units,/Smart Life Week 2026 \(SLW 2026\)/i);
  if(!eventNameUnit)return {events:[],warnings:["RADAR_AI_MODE=mock: deterministic extraction for pipeline testing only."]};
  const periodUnit=findUnit(units,/^Period:.*2026/i)??findUnit(units,/Smart Life Week 2026.*October\s+6.*October\s+8/i);
  const venueUnit=findUnit(units,/^Venue:\s*COEX\b/i)??findUnit(units,/Smart Life Week 2026.*\bat COEX\b/i);
  const marcDetailUnit=findUnit(units,/At the opening ceremony.*Marc Raibert.*will deliver a keynote/i)??findUnit(units,/Marc Raibert.*deliver a keynote/i);
  const marcHeadlineUnit=findUnit(units,/World-renowned roboticist Marc Raibert to deliver a keynote/i);
  const dates=periodUnit?parse2026Period(periodUnit.text):{start:null,end:null};
  const appearance=marcDetailUnit||marcHeadlineUnit?{
    person_name_original:"Marc Raibert",person_name_en:"Marc Raibert",person_name_ko:null,
    title_at_event:marcDetailUnit?"Director of the Robotics and AI Institute (RAI Institute); founder of Boston Dynamics":null,
    organization_at_event:marcDetailUnit?"Robotics and AI Institute (RAI Institute)":null,
    role_at_event:"Keynote speaker",role_category:"RESEARCHER_EXPERT" as const,public_official_or_political_role:false,
    presence_hint:"UNKNOWN" as const,
    attendance_unit_ids:[(marcDetailUnit??marcHeadlineUnit)!.unitId],
    role_unit_ids:[(marcDetailUnit??marcHeadlineUnit)!.unitId],
    presence_unit_ids:[],confidence:.9
  }:null;
  return {
    events:[{
      event_name:eventNameUnit.text.replace(/^Event Name:\s*/i,"").trim(),
      start_date:dates.start,end_date:dates.end,timezone:"Asia/Seoul",
      venue:venueUnit?venueUnit.text.replace(/^Venue:\s*/i,"").trim():null,city:"Seoul",country_code:"KR",
      event_format:"UNKNOWN",official_url:sourceUrl,
      date_unit_ids:periodUnit?[periodUnit.unitId]:[],venue_unit_ids:venueUnit?[venueUnit.unitId]:[],format_unit_ids:[],
      contact_route_hint:"HOST_FIRST",contact_route_reason:"Mock mode: use the event host first.",
      appearances:appearance?[appearance]:[],contacts:[]
    }],
    warnings:["RADAR_AI_MODE=mock: deterministic extraction for pipeline testing only."]
  };
}
