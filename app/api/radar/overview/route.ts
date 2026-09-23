import {NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const db=new SupabaseRestClient();
    const [candidates,people,events,opportunities,sources]=await Promise.all([
      db.select<{id:string;status:string}>("extraction_event_candidates","select=id,status&order=created_at.desc&limit=500"),
      db.select<{id:string}>("people","select=id&limit=500"),
      db.select<{id:string}>("events","select=id&limit=500"),
      db.select<{id:string;workflow_status:string}>("opportunities","select=id,workflow_status&limit=500"),
      db.select<{id:string;is_active:boolean}>("sources","select=id,is_active&limit=200")
    ]);
    return NextResponse.json({
      review:candidates.filter(x=>x.status==="PROPOSED").length,
      approved:candidates.filter(x=>x.status==="APPROVED").length,
      rejected:candidates.filter(x=>x.status==="REJECTED").length,
      vips:people.length,
      events:events.length,
      booked:opportunities.filter(x=>x.workflow_status==="BOOKED").length,
      opportunities:opportunities.length,
      activeSources:sources.filter(x=>x.is_active).length
    });
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
