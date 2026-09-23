import {NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../../src/supabase-rest";
import {getJob} from "../../../../../src/radar-job";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_req:Request,ctx:{params:Promise<{id:string}>}){try{const {id}=await ctx.params;return NextResponse.json(await getJob(new SupabaseRestClient(),id));}catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:500});}}
