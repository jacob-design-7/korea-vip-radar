import http from "node:http";
import https from "node:https";
import {createHash} from "node:crypto";
import {resolvePublicAddress,validateUrlShape} from "./security";
import type {SafeFetchResult} from "./ingestion-types";

async function requestPinned(url:URL){
  const {address,family}=await resolvePublicAddress(url.hostname);
  const mod=url.protocol==="https:"?https:http;
  return await new Promise<{status:number;headers:http.IncomingHttpHeaders;body:Buffer}>((resolve,reject)=>{
    const req=mod.request({
      protocol:url.protocol,hostname:address,family,port:url.port?Number(url.port):(url.protocol==="https:"?443:80),
      method:"GET",path:url.pathname+url.search,servername:url.protocol==="https:"?url.hostname:undefined,rejectUnauthorized:true,
      headers:{host:url.host,"user-agent":"KoreaVIPRadar/1.0 (+evidence-fetcher)",accept:"text/html,application/xhtml+xml,text/plain;q=0.8","accept-encoding":"identity",connection:"close"}
    },res=>{
      const chunks:Buffer[]=[];let total=0;
      res.on("data",(c:Buffer)=>{total+=c.length;if(total>2_000_000){req.destroy(new Error("Response exceeds 2MB"));return;}chunks.push(c);});
      res.on("end",()=>resolve({status:res.statusCode??0,headers:res.headers,body:Buffer.concat(chunks)}));
    });
    req.setTimeout(10_000,()=>req.destroy(new Error("Fetch timeout")));
    req.on("error",reject);req.end();
  });
}
export async function safeFetch(rawUrl:string):Promise<SafeFetchResult>{
  let current=validateUrlShape(rawUrl);const redirects:string[]=[];
  for(let hop=0;hop<=4;hop++){
    const r=await requestPinned(current);
    if([301,302,303,307,308].includes(r.status)){
      const loc=r.headers.location;if(!loc)throw new Error("Redirect without Location"); if(hop===4)throw new Error("Too many redirects");
      current=validateUrlShape(new URL(loc,current).toString());redirects.push(current.toString());continue;
    }
    if(r.status<200||r.status>=300)throw new Error(`HTTP ${r.status}`);
    const ct=String(r.headers["content-type"]??"").split(";",1)[0].trim().toLowerCase();
    if(!["text/html","application/xhtml+xml","text/plain"].includes(ct))throw new Error(`Unsupported content type: ${ct}`);
    const enc=String(r.headers["content-encoding"]??"identity").toLowerCase();if(enc!=="identity"&&enc!=="")throw new Error(`Unexpected compression: ${enc}`);
    return {finalUrl:current.toString(),status:r.status,contentType:ct,fetchedAt:new Date().toISOString(),body:r.body.toString("utf8"),byteLength:r.body.length,sha256:createHash("sha256").update(r.body).digest("hex"),redirects};
  }
  throw new Error("Redirect loop");
}
