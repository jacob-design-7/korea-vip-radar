import type {EvidenceUnit} from "./ingestion-types";

export type MockEvent = {
  event_name:string|null; start_date:null; end_date:null; timezone:null; venue:string|null; city:null; country_code:"KR";
  event_format:"UNKNOWN"; official_url:string|null; date_unit_ids:string[]; venue_unit_ids:string[]; format_unit_ids:string[];
  appearances:Array<{person_name_original:string|null;person_name_en:string|null;person_name_ko:null;title_at_event:null;organization_at_event:null;role_at_event:null;presence_hint:"UNKNOWN";attendance_unit_ids:string[];role_unit_ids:string[];presence_unit_ids:string[];confidence:number;opportunity:{topic_fit:null;contactability:null;schedule_feasibility:null;rationale:string}}>;
  contacts:any[];
};
export function buildMockExtraction(units:EvidenceUnit[],sourceUrl:string){
  const all=units.map(u=>u.text).join("\n");
  const eventUnit=units.find(u=>/forum|conference|symposium|lecture|seminar|expo|summit|workshop|congress|colloquium/i.test(u.text));
  const dateUnit=units.find(u=>/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan\.?|Feb\.?|Mar\.?|Apr\.?|Jun\.?|Jul\.?|Aug\.?|Sep\.?|Sept\.?|Oct\.?|Nov\.?|Dec\.?)\b|\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/i.test(u.text));
  const nameUnit=units.find(u=>/speaker|keynote|professor|director|president|Dr\.|Prof\./i.test(u.text));
  const name=nameUnit?.text.match(/(?:Dr\.|Prof\.)\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){1,3})/)?.[1]??null;
  const events:MockEvent[]=eventUnit?[{
    event_name:eventUnit.sectionHeading??eventUnit.text.slice(0,140),start_date:null,end_date:null,timezone:null,
    venue:/Seoul|COEX|Busan|Daejeon/i.test(all)?"Korea (review required)":null,city:null,country_code:"KR",event_format:"UNKNOWN",
    official_url:sourceUrl,date_unit_ids:dateUnit?[dateUnit.unitId]:[],venue_unit_ids:[],format_unit_ids:[],
    appearances:nameUnit?[{person_name_original:name,person_name_en:name,person_name_ko:null,title_at_event:null,organization_at_event:null,role_at_event:null,presence_hint:"UNKNOWN",attendance_unit_ids:[nameUnit.unitId],role_unit_ids:[nameUnit.unitId],presence_unit_ids:[],confidence:.25,opportunity:{topic_fit:null,contactability:null,schedule_feasibility:null,rationale:"Mock mode: human review required."}}]:[],
    contacts:[]
  }]:[];
  return {events,warnings:["RADAR_AI_MODE=mock: deterministic extraction for pipeline testing only."]};
}
