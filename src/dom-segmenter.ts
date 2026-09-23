import {createHash} from "node:crypto";
import {parseHtml,textContent,type HtmlNode} from "./html-parser";
import type {EvidenceBlockType,EvidenceUnit,SegmentResult} from "./ingestion-types";
const DROP=new Set(["script","style","noscript","template","svg","canvas","iframe","form","nav"]);
const HEAD=new Set(["h1","h2","h3","h4","h5","h6"]);
const DIRECT=new Map<string,EvidenceBlockType>([["p","paragraph"],["li","list_item"],["tr","table_row"],["blockquote","blockquote"],["dt","definition"],["dd","definition"]]);
const PROFILE=/(speaker|keynote|panelist|profile|person|member|presenter|lecturer|faculty|guest)/i;
export function norm(s:string){return s.replace(/\u00a0/g," ").replace(/[\t\r\n ]+/g," ").replace(/\s+([,.;:!?])/g,"$1").trim();}
function meaningful(s:string){return s.length>=2&&s.length<=1800&&!/^(home|menu|search|login|skip|top)$/i.test(s);}
export function segmentHtml(html:string):SegmentResult{
  const root=parseHtml(html);const c:{node:HtmlNode;blockType:EvidenceBlockType;text:string;heading:string|null}[]=[];let current:string|null=null;let title:string|null=null;
  const walk=(n:HtmlNode,inherit:string|null)=>{if(n.kind==="text")return;const tag=n.tag??"";if(DROP.has(tag))return;const text=norm(textContent(n));if(tag==="title"&&text)title=text.slice(0,300);if(HEAD.has(tag)&&meaningful(text)){current=text.slice(0,500);c.push({node:n,blockType:"heading",text,heading:inherit});inherit=current;}
    const d=DIRECT.get(tag);if(d&&meaningful(text)){c.push({node:n,blockType:d,text,heading:current??inherit});return;}
    const a=n.attrs??{};if(["article","section","div"].includes(tag)&&PROFILE.test(`${a.id??""} ${a.class??""} ${a.role??""}`)&&meaningful(text)){c.push({node:n,blockType:"profile_card",text,heading:current??inherit});return;}
    for(const ch of n.children??[])walk(ch,current??inherit);
  };walk(root,null);c.sort((a,b)=>a.node.order-b.node.order);
  const seen=new Set<string>();const d=c.filter(x=>{const k=x.text.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});const normalizedText=d.map(x=>x.text).join("\n");let offset=0;
  const units:EvidenceUnit[]=d.map((x,i)=>{const start=normalizedText.indexOf(x.text,offset);const end=start>=0?start+x.text.length:-1;offset=Math.max(offset,end+1);return {unitId:`U${String(i+1).padStart(4,"0")}`,ordinal:i+1,blockType:x.blockType,text:x.text,sectionHeading:x.heading,contextBefore:i?d[i-1].text:null,contextAfter:i<d.length-1?d[i+1].text:null,sourceStartOffset:start>=0?start:null,sourceEndOffset:end>=0?end:null};});
  return {normalizerVersion:"vipradar-dom-v1",title,units,normalizedText};
}
