import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
import {runRadarPipeline} from "../../../../src/radar-job";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(req:NextRequest){
  try{
    const body=await req.json() as {source_ids?:string[];all?:boolean};
    const db=new SupabaseRestClient();
    const rows=await db.select<any>(
      "sources",
      "is_active=eq.true&scan_enabled=eq.true&select=id,name,base_url,scan_priority,source_category&order=scan_priority.desc,name.asc"
    );
    const requested=body.all?rows:rows.filter((s:any)=>(body.source_ids??[]).includes(s.id));
    if(!requested.length)return NextResponse.json({error:"No sources selected"},{status:400});
    if(requested.length>25)return NextResponse.json({error:"Too many sources selected"},{status:400});

    const settled=await Promise.allSettled(requested.map(async(s:any)=>{
      const result=await runRadarPipeline(db,{sourceId:s.id,url:s.base_url});
      return {sourceId:s.id,name:s.name,category:s.source_category,priority:s.scan_priority,status:"SUCCESS",...result};
    }));

    const results=settled.map((x,i)=>{
      if(x.status==="fulfilled")return x.value;
      return {
        sourceId:requested[i].id,
        name:requested[i].name,
        category:requested[i].source_category,
        priority:requested[i].scan_priority,
        status:"FAILED",
        error:x.reason instanceof Error?x.reason.message:String(x.reason)
      };
    });

    return NextResponse.json({
      ok:true,
      requested:requested.length,
      succeeded:results.filter((x:any)=>x.status==="SUCCESS").length,
      failed:results.filter((x:any)=>x.status==="FAILED").length,
      results
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
