export type ContactRoute="HOST_FIRST"|"INSTITUTION_FIRST"|"SPEAKER_DIRECT"|"EMBASSY_OR_ORG_FIRST";
export type PresenceHint="UNKNOWN"|"PHYSICAL_CONFIRMED"|"REMOTE_CONFIRMED";
export type EventFormat="IN_PERSON"|"HYBRID"|"ONLINE"|"UNKNOWN";

export type ExtractedContact={
  contact_kind:"ORGANIZATION"|"ROLE"|"PERSON";
  contact_type:"OFFICIAL_EMAIL"|"CONTACT_FORM"|"PHONE"|"OFFICIAL_WEBPAGE"|"OTHER";
  contact_name:string|null;
  role:string|null;
  contact_value:string;
  unit_ids:string[];
};

export type ExtractedAppearance={
  person_name_original:string|null;
  person_name_en:string|null;
  person_name_ko:string|null;
  title_at_event:string|null;
  organization_at_event:string|null;
  role_at_event:string|null;
  role_category:"PUBLIC_OFFICIAL"|"DIPLOMAT"|"INTERNATIONAL_ORG"|"UNIVERSITY_LEADER"|"RESEARCHER_EXPERT"|"CORPORATE_EXECUTIVE"|"CIVIL_SOCIETY"|"OTHER";
  public_official_or_political_role:boolean;
  presence_hint:PresenceHint;
  attendance_unit_ids:string[];
  role_unit_ids:string[];
  presence_unit_ids:string[];
  confidence:number;
};

export type ExtractedEvent={
  event_name:string|null;
  start_date:string|null;
  end_date:string|null;
  timezone:string|null;
  venue:string|null;
  city:string|null;
  country_code:string|null;
  event_format:EventFormat;
  official_url:string|null;
  date_unit_ids:string[];
  venue_unit_ids:string[];
  format_unit_ids:string[];
  contact_route_hint:ContactRoute;
  contact_route_reason:string;
  appearances:ExtractedAppearance[];
  contacts:ExtractedContact[];
};

export type ExtractionOutput={
  events:ExtractedEvent[];
  warnings:string[];
};

const nullableString={anyOf:[{type:"string"},{type:"null"}]};

export const extractionSchema={
  type:"object",
  additionalProperties:false,
  properties:{
    events:{
      type:"array",
      maxItems:8,
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          event_name:nullableString,
          start_date:nullableString,
          end_date:nullableString,
          timezone:nullableString,
          venue:nullableString,
          city:nullableString,
          country_code:nullableString,
          event_format:{type:"string",enum:["IN_PERSON","HYBRID","ONLINE","UNKNOWN"]},
          official_url:nullableString,
          date_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
          venue_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
          format_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
          contact_route_hint:{type:"string",enum:["HOST_FIRST","INSTITUTION_FIRST","SPEAKER_DIRECT","EMBASSY_OR_ORG_FIRST"]},
          contact_route_reason:{type:"string"},
          appearances:{
            type:"array",maxItems:12,
            items:{
              type:"object",additionalProperties:false,
              properties:{
                person_name_original:nullableString,
                person_name_en:nullableString,
                person_name_ko:nullableString,
                title_at_event:nullableString,
                organization_at_event:nullableString,
                role_at_event:nullableString,
                role_category:{type:"string",enum:["PUBLIC_OFFICIAL","DIPLOMAT","INTERNATIONAL_ORG","UNIVERSITY_LEADER","RESEARCHER_EXPERT","CORPORATE_EXECUTIVE","CIVIL_SOCIETY","OTHER"]},
                public_official_or_political_role:{type:"boolean"},
                presence_hint:{type:"string",enum:["UNKNOWN","PHYSICAL_CONFIRMED","REMOTE_CONFIRMED"]},
                attendance_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
                role_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
                presence_unit_ids:{type:"array",items:{type:"string"},maxItems:5},
                confidence:{type:"number",minimum:0,maximum:1}
              },
              required:["person_name_original","person_name_en","person_name_ko","title_at_event","organization_at_event","role_at_event","role_category","public_official_or_political_role","presence_hint","attendance_unit_ids","role_unit_ids","presence_unit_ids","confidence"]
            }
          },
          contacts:{
            type:"array",maxItems:8,
            items:{
              type:"object",additionalProperties:false,
              properties:{
                contact_kind:{type:"string",enum:["ORGANIZATION","ROLE","PERSON"]},
                contact_type:{type:"string",enum:["OFFICIAL_EMAIL","CONTACT_FORM","PHONE","OFFICIAL_WEBPAGE","OTHER"]},
                contact_name:nullableString,
                role:nullableString,
                contact_value:{type:"string"},
                unit_ids:{type:"array",items:{type:"string"},maxItems:4}
              },
              required:["contact_kind","contact_type","contact_name","role","contact_value","unit_ids"]
            }
          }
        },
        required:["event_name","start_date","end_date","timezone","venue","city","country_code","event_format","official_url","date_unit_ids","venue_unit_ids","format_unit_ids","contact_route_hint","contact_route_reason","appearances","contacts"]
      }
    },
    warnings:{type:"array",items:{type:"string"},maxItems:20}
  },
  required:["events","warnings"]
} as const;
