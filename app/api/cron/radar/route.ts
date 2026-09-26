import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
import {discoverSourceLinks} from "../../../../src/source-discovery";
import {runRadarPipeline} from "../../../../src/radar-job";

export const runtime="nodejs";
export const maxDuration=60;

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(!secret)return NextResponse.json({error:"CRON_SECRET not configured"},{status:503});
  if(req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const db=new SupabaseRestClient();
    const sources=await db.select<any>("sources","is_active=eq.true&scan_enabled=eq.true&scan_priority=eq.5&select=id,name,base_url,source_type&order=name.asc&limit=8");
    const settled=await Promise.allSettled(sources.map(async(s:any)=>{
      let targets=[s.base_url];
      try{
        const d=await discoverSourceLinks(s.base_url,1);
        if(d.links[0]?.url)targets=[d.links[0].url];
      }catch{}
      const result=await runRadarPipeline(db,{sourceId:s.id,url:targets[0]});
      return {source:s.name,url:targets[0],...result};
    }));
    const results=settled.map((x,i)=>x.status==="fulfilled"?{status:"SUCCESS",...x.value}:{status:"FAILED",source:sources[i]?.name,error:x.reason instanceof Error?x.reason.message:String(x.reason)});
    return NextResponse.json({ok:true,scanned:sources.length,succeeded:results.filter(x=>x.status==="SUCCESS").length,failed:results.filter(x=>x.status==="FAILED").length,results});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}
