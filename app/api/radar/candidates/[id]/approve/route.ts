import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../../../src/supabase-rest";
export const runtime="nodejs";
export async function POST(req:NextRequest,ctx:{params:Promise<{id:string}>}){
  try{
    const {id}=await ctx.params;
    const body=await req.json().catch(()=>({})) as {review_note?:string};
    const db=new SupabaseRestClient();
    const result=await db.rpc("approve_extraction_candidate",{p_candidate_id:id,p_review_note:body.review_note??null});
    return NextResponse.json(result);
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:422});
  }
}
