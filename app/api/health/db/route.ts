import { NextResponse } from "next/server";
import { SupabaseRestClient } from "../../../../src/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = new SupabaseRestClient();
    const rows = await db.request<Array<{id:string}>>("sources?select=id&limit=10");

    return NextResponse.json({
      ok: true,
      database: "reachable",
      sourcesReadable: true,
      sampledSourceCount: rows.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        error: error instanceof Error ? error.message : String(error)
      },
      {status: 500}
    );
  }
}
