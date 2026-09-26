import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
import {discoverSourceLinks} from "../../../../src/source-discovery";
import {runRadarPipeline} from "../../../../src/radar-job";

export const runtime="nodejs";
export const maxDuration=60;

function intervalHours(priority:number){
  if(priority>=5)return 24;
  if(priority===4)return 48;
  if(priority===3)return 96;
  if(priority===2)return 168;
  return 336;
}

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(!secret)return NextResponse.json({error:"CRON_SECRET not configured"},{status:503});
  if(req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
  try{
    const db=new SupabaseRestClient();
    const [sources,runs]=await Promise.all([
      db.select<any>("sources","is_active=eq.true&scan_enabled=eq.true&select=id,name,base_url,source_type,scan_priority,discovery_depth&order=scan_priority.desc,name.asc&limit=40"),
      db.select<any>("source_runs","select=source_id,started_at,status&order=started_at.desc&limit=500")
    ]);
    const latest=new Map<string,number>();
    for(const r of runs){
      if(!latest.has(r.source_id))latest.set(r.source_id,Date.parse(r.started_at));
    }
    const now=Date.now();
    const due=sources.filter((s:any)=>{
      const last=latest.get(s.id);
      return !last||now-last>=intervalHours(Number(s.scan_priority||3))*3600000;
    }).slice(0,6);

    const results=[] as any[];
    for(const s of due){
      let targets=[s.base_url];
      let discoveryError:string|null=null;
      try{
        const d=await discoverSourceLinks(s.base_url,Math.min(2,Math.max(1,s.discovery_depth??1)));
        if(d.links.length)targets=d.links.slice(0,2).map(x=>x.url);
      }catch(e){discoveryError=e instanceof Error?e.message:String(e);}
      const pages=[] as any[];
      for(const target of targets){
        try{pages.push({url:target,status:"SUCCESS",...(await runRadarPipeline(db,{sourceId:s.id,url:target}))});}
        catch(e){pages.push({url:target,status:"FAILED",error:e instanceof Error?e.message:String(e)});}
      }
      results.push({source:s.name,priority:s.scan_priority,discoveryError,pages});
    }
    return NextResponse.json({
      ok:true,dueSources:due.length,scannedPages:results.reduce((n,x)=>n+x.pages.length,0),
      aiMode:process.env.RADAR_AI_MODE??"mock",openaiConfigured:Boolean(process.env.OPENAI_API_KEY),results
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
