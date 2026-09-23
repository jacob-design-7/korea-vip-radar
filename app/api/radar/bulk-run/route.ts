import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
import {runRadarPipeline} from "../../../../src/radar-job";
import {discoverSourceLinks} from "../../../../src/source-discovery";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(req:NextRequest){
  try{
    const body=await req.json() as {source_ids?:string[];all?:boolean};
    const db=new SupabaseRestClient();
    const rows=await db.select<any>("sources","is_active=eq.true&scan_enabled=eq.true&select=id,name,base_url,scan_priority,source_category,discovery_depth&order=scan_priority.desc,name.asc");
    const requested=body.all?rows:rows.filter((s:any)=>(body.source_ids??[]).includes(s.id));
    if(!requested.length)return NextResponse.json({error:"No sources selected"},{status:400});
    if(requested.length>25)return NextResponse.json({error:"Too many sources selected"},{status:400});

    const detailLimit=body.all?1:3;
    const settled=await Promise.allSettled(requested.map(async(s:any)=>{
      let discovered:{url:string;text:string;score:number}[]=[];
      let discoveryError:string|null=null;
      try{
        const d=await discoverSourceLinks(s.base_url,Math.min(detailLimit,Math.max(1,s.discovery_depth??detailLimit)));
        discovered=d.links;
      }catch(e){discoveryError=e instanceof Error?e.message:String(e);}

      const targets=discovered.length?discovered.map(x=>x.url):[s.base_url];
      const pageRuns=[] as any[];
      for(const target of targets){
        try{
          const result=await runRadarPipeline(db,{sourceId:s.id,url:target});
          pageRuns.push({url:target,status:"SUCCESS",...result});
        }catch(e){
          pageRuns.push({url:target,status:"FAILED",error:e instanceof Error?e.message:String(e)});
        }
      }
      return {
        sourceId:s.id,name:s.name,category:s.source_category,priority:s.scan_priority,
        status:pageRuns.some(x=>x.status==="SUCCESS")?"SUCCESS":"FAILED",
        discoveryError,discovered,pageRuns
      };
    }));

    const results=settled.map((x,i)=>x.status==="fulfilled"?x.value:{
      sourceId:requested[i].id,name:requested[i].name,category:requested[i].source_category,
      priority:requested[i].scan_priority,status:"FAILED",discoveryError:String(x.reason),discovered:[],pageRuns:[]
    });
    const pages=results.flatMap((x:any)=>x.pageRuns??[]);
    return NextResponse.json({
      ok:true,requested:requested.length,
      succeeded:results.filter((x:any)=>x.status==="SUCCESS").length,
      failed:results.filter((x:any)=>x.status==="FAILED").length,
      pagesScanned:pages.length,
      candidatePages:results.reduce((n:number,x:any)=>n+(x.discovered?.length??0),0),
      results
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
