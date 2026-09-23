import {NextResponse} from "next/server";
import dns from "node:dns/promises";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const host="vipradar.practicalaidesk.com";
const url="https://vipradar.practicalaidesk.com/api/health";

async function safeResolve<T>(fn:()=>Promise<T>){
  try{return {ok:true,value:await fn()};}
  catch(error){return {ok:false,error:error instanceof Error?error.message:String(error)};}
}

export async function GET(){
  const [cname,a,aaaa]=await Promise.all([
    safeResolve(()=>dns.resolveCname(host)),
    safeResolve(()=>dns.resolve4(host)),
    safeResolve(()=>dns.resolve6(host))
  ]);

  let http:any;
  try{
    const res=await fetch(url,{redirect:"manual",cache:"no-store",signal:AbortSignal.timeout(8000)});
    const text=await res.text();
    http={ok:res.ok,status:res.status,statusText:res.statusText,location:res.headers.get("location"),body:text.slice(0,1000)};
  }catch(error){
    http={ok:false,error:error instanceof Error?error.message:String(error)};
  }

  return NextResponse.json({host,cname,a,aaaa,http,checkedAt:new Date().toISOString()});
}
