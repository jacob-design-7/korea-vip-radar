export type EvidenceBlockType = "heading"|"paragraph"|"list_item"|"table_row"|"profile_card"|"blockquote"|"definition";
export interface SafeFetchResult { finalUrl:string; status:number; contentType:string; fetchedAt:string; body:string; byteLength:number; sha256:string; redirects:string[]; }
export interface EvidenceUnit { unitId:string; ordinal:number; blockType:EvidenceBlockType; text:string; sectionHeading:string|null; contextBefore:string|null; contextAfter:string|null; sourceStartOffset:number|null; sourceEndOffset:number|null; }
export interface SegmentResult { normalizerVersion:string; title:string|null; units:EvidenceUnit[]; normalizedText:string; }
