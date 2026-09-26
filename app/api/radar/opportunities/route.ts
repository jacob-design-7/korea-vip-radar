import {NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  try{
    const db=new SupabaseRestClient();
    const opportunities=await db.rpc<any[]>("list_opportunity_briefs",{});
    return NextResponse.json({opportunities});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}
}
