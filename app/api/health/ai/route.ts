import {NextResponse} from "next/server";
import {activeAIModel} from "../../../../src/openai-extractor";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
  const configured=Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    ok:true,
    aiMode:configured?"openai":"mock",
    openaiConfigured:configured,
    model:activeAIModel(),
    liveExtractionReady:configured,
    cronConfigured:Boolean(process.env.CRON_SECRET),
    modeRule:"OPENAI_API_KEY present => live OpenAI extraction; otherwise mock"
  });
}
