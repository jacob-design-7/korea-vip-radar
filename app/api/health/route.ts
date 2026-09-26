import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const openaiConfigured=Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({
    ok:true,
    app:"korea-vip-radar",
    supabaseConfigured:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    aiMode:openaiConfigured?"openai":"mock",
    openaiConfigured
  });
}
