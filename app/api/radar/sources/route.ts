import { NextResponse } from "next/server";
import { SupabaseRestClient } from "../../../../src/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceRow = {
  id: string;
  name: string;
  source_type: string;
  base_url: string;
  authority_tier: string;
  fetch_mode: string;
};

export async function GET() {
  try {
    const db = new SupabaseRestClient();
    const rows = await db.request<SourceRow[]>(
      "sources?is_active=eq.true&select=id,name,source_type,base_url,authority_tier,fetch_mode&order=name.asc"
    );
    return NextResponse.json({sources: rows});
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : String(error)},
      {status: 500}
    );
  }
}
