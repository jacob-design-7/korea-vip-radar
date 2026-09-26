import {NextResponse} from "next/server";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  const mode=(process.env.RADAR_AI_MODE??"mock").toLowerCase();
  return NextResponse.json({
    ok:true,
    aiMode:mode,
    openaiConfigured:Boolean(process.env.OPENAI_API_KEY),
    model:process.env.OPENAI_MODEL||"gpt-5.6-luna",
    liveExtractionReady:(mode==="openai"||mode==="auto")&&Boolean(process.env.OPENAI_API_KEY),
    cronConfigured:Boolean(process.env.CRON_SECRET)
  });
}
