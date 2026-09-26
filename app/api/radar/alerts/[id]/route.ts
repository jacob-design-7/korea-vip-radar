import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../../src/supabase-rest";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
  try{
    const {id}=await ctx.params;
    const body=await req.json().catch(()=>({})) as {status?:"ACKNOWLEDGED"|"DISMISSED"};
    const db=new SupabaseRestClient();
    const result=await db.rpc("acknowledge_radar_alert",{p_alert_id:id,p_status:body.status??"ACKNOWLEDGED"});
    return NextResponse.json(result);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:422});}
}
