import type {EvidenceUnit} from "./ingestion-types";

export type MockEvent = {
  event_name:string|null;
  start_date:string|null;
  end_date:string|null;
  timezone:string|null;
  venue:string|null;
  city:string|null;
  country_code:"KR";
  event_format:"UNKNOWN";
  official_url:string|null;
  date_unit_ids:string[];
  venue_unit_ids:string[];
  format_unit_ids:string[];
  appearances:Array<{
    person_name_original:string|null;
    person_name_en:string|null;
    person_name_ko:null;
    title_at_event:string|null;
    organization_at_event:string|null;
    role_at_event:string|null;
    presence_hint:"UNKNOWN";
    attendance_unit_ids:string[];
    role_unit_ids:string[];
    presence_unit_ids:string[];
    confidence:number;
    opportunity:{topic_fit:null;contactability:null;schedule_feasibility:null;rationale:string};
  }>;
  contacts:any[];
};

function findUnit(units:EvidenceUnit[],re:RegExp){
  return units.find(u=>re.test(u.text));
}

function parse2026Period(text:string){
  const m=text.match(/Oct\.?\s*(\d{1,2}).*?Oct\.?\s*(\d{1,2}),\s*(2026)/i);
  if(!m)return {start:null,end:null};
  return {start:`${m[3]}-10-${m[1].padStart(2,"0")}`,end:`${m[3]}-10-${m[2].padStart(2,"0")}`};
}

export function buildMockExtraction(units:EvidenceUnit[],sourceUrl:string){
  // Prefer explicit structured event facts over nearby headings or archive references.
  const eventNameUnit =
    findUnit(units,/^Event Name:\s*Smart Life Week 2026\b/i) ??
    findUnit(units,/Smart Life Week 2026 \(SLW 2026\)/i) ??
    findUnit(units,/\b2026\b.*\b(forum|conference|symposium|lecture|seminar|expo|summit|workshop|congress)\b/i);

  if(!eventNameUnit){
    return {events:[],warnings:["RADAR_AI_MODE=mock: deterministic extraction for pipeline testing only."]};
  }

  const periodUnit =
    findUnit(units,/^Period:.*2026/i) ??
    findUnit(units,/Smart Life Week 2026.*October\s+6.*October\s+8/i);

  const venueUnit =
    findUnit(units,/^Venue:\s*COEX\b/i) ??
    findUnit(units,/Smart Life Week 2026.*\bat COEX\b/i);

  const marcDetailUnit =
    findUnit(units,/At the opening ceremony.*Marc Raibert.*will deliver a keynote/i) ??
    findUnit(units,/Marc Raibert.*deliver a keynote/i);

  const marcHeadlineUnit =
    findUnit(units,/World-renowned roboticist Marc Raibert to deliver a keynote/i);

  const dates=periodUnit?parse2026Period(periodUnit.text):{start:null,end:null};
  const eventName=eventNameUnit.text.replace(/^Event Name:\s*/i,"").trim();
  const venue=venueUnit?venueUnit.text.replace(/^Venue:\s*/i,"").trim():null;

  let appearance:MockEvent["appearances"][number]|null=null;
  if(marcDetailUnit||marcHeadlineUnit){
    const evidence=marcDetailUnit??marcHeadlineUnit!;
    appearance={
      person_name_original:"Marc Raibert",
      person_name_en:"Marc Raibert",
      person_name_ko:null,
      title_at_event:marcDetailUnit?"Director of the Robotics and AI Institute (RAI Institute); founder of Boston Dynamics":null,
      organization_at_event:marcDetailUnit?"Robotics and AI Institute (RAI Institute)":null,
      role_at_event:"Keynote speaker",
      // Attendance is explicitly supported; physical presence is not promoted without explicit presence evidence.
      presence_hint:"UNKNOWN",
      attendance_unit_ids:[evidence.unitId],
      role_unit_ids:[evidence.unitId],
      presence_unit_ids:[],
      confidence:0.9,
      opportunity:{topic_fit:null,contactability:null,schedule_feasibility:null,rationale:"Mock mode: explicit event and keynote facts detected; human review required."}
    };
  }

  const event:MockEvent={
    event_name:eventName,
    start_date:dates.start,
    end_date:dates.end,
    timezone:"Asia/Seoul",
    venue,
    city:"Seoul",
    country_code:"KR",
    event_format:"UNKNOWN",
    official_url:sourceUrl,
    date_unit_ids:periodUnit?[periodUnit.unitId]:[],
    venue_unit_ids:venueUnit?[venueUnit.unitId]:[],
    format_unit_ids:[],
    appearances:appearance?[appearance]:[],
    contacts:[]
  };

  return {
    events:[event],
    warnings:["RADAR_AI_MODE=mock: deterministic extraction for pipeline testing only."]
  };
}
