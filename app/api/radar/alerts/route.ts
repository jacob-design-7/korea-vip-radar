import {NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  try{
    const db=new SupabaseRestClient();
    const alerts=await db.select<any>("radar_alerts","select=id,candidate_id,alert_type,status,title,body,payload,created_at,acknowledged_at&order=created_at.desc&limit=80");
    return NextResponse.json({alerts});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}
