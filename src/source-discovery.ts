import {safeFetch} from "./safe-fetcher";

export type DiscoveredLink={url:string;text:string;score:number};

const POSITIVE=[
  /conference|forum|seminar|summit|symposium|lecture|colloquium|keynote|speaker|workshop|congress|meeting|event/i,
  /visit|delegation|minister|president|mayor|ambassador|director|secretary[- ]general|chair/i,
  /international|global|world|united nations|un\b|sdg|climate|ai\b|robot|policy|diplomacy/i,
  /국제|포럼|세미나|심포지엄|강연|특강|학술|회의|총회|정상|장관|대사|시장|방문|방한|초청|대표단|국제기구/
];
const NEGATIVE=/privacy|terms|login|sign.?in|register|newsletter|facebook|instagram|youtube|twitter|linkedin|sitemap|contact us|about us|javascript:|mailto:|tel:/i;

function decodeEntities(s:string){
  return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">");
}
function stripTags(s:string){return decodeEntities(s.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim());}
function score(text:string,url:string){
  let n=0;const hay=text+" "+url;
  for(const re of POSITIVE)if(re.test(hay))n+=3;
  if(/2026|2027/.test(hay))n+=2;
  if(/event|news|seminar|forum|conference|lecture|activity|notice|board|press|view|detail/i.test(url))n+=2;
  if(/\/\d{2,}|id=\d+|no=\d+|idx=\d+|seq=\d+/i.test(url))n+=2;
  if(text.length>=12&&text.length<=180)n+=1;
  if(NEGATIVE.test(hay))n-=8;
  if(/\.(pdf|jpg|jpeg|png|gif|svg|zip|docx?|xlsx?)($|\?)/i.test(url))n-=8;
  return n;
}
export async function discoverSourceLinks(baseUrl:string,limit=5){
  const host=new URL(baseUrl).hostname;
  const fetched=await safeFetch(baseUrl,host);
  const html=fetched.body;
  const re=/<a\b([^>]*?)href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))([^>]*)>([\s\S]*?)<\/a>/gi;
  const map=new Map<string,DiscoveredLink>();let m:RegExpExecArray|null;
  while((m=re.exec(html))){
    const raw=m[2]??m[3]??m[4]??"";const text=stripTags(m[6]??"");
    if(!raw||raw.startsWith("#")||NEGATIVE.test(raw))continue;
    let u:URL;try{u=new URL(raw,fetched.finalUrl);}catch{continue;}
    if(!["http:","https:"].includes(u.protocol))continue;
    const target=u.hostname.toLowerCase(),root=host.toLowerCase();
    if(!(target===root||target.endsWith("."+root)))continue;
    u.hash="";
    const key=u.toString();
    const s=score(text,key);if(s<4)continue;
    const prev=map.get(key);if(!prev||s>prev.score)map.set(key,{url:key,text:text.slice(0,240),score:s});
  }
  return {
    fetchedUrl:fetched.finalUrl,
    links:[...map.values()].sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,limit)
  };
}
