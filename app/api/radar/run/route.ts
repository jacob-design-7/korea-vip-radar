import {NextRequest,NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../src/supabase-rest";
import {runRadarPipeline} from "../../../../src/radar-job";
export const runtime="nodejs";export const maxDuration=60;
export async function POST(req:NextRequest){
  try{
    const body=await req.json() as {source_id?:string;url?:string};
    if(!body.source_id||!body.url)return NextResponse.json({error:"source_id and url are required"},{status:400});
    const result=await runRadarPipeline(new SupabaseRestClient(),{sourceId:body.source_id,url:body.url});
    return NextResponse.json(result);
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:422});}
}
