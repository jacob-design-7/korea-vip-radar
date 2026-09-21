export const dynamic = "force-dynamic";

function status(ok: boolean) {
  return {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: ok ? "#e8f5ee" : "#fff4e5",
    color: ok ? "#176b43" : "#8a5a00"
  } as const;
}

export default function ReviewPage() {
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  const aiMode = process.env.RADAR_AI_MODE || "mock";
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  return (
    <main style={{minHeight:"100vh",background:"#f4f7fb",fontFamily:"Inter,system-ui,sans-serif",color:"#162033"}}>
      <div style={{maxWidth:980,margin:"0 auto",padding:"42px 24px"}}>
        <div style={{fontSize:12,fontWeight:800,letterSpacing:1.4,color:"#1f5fa8"}}>KOREA VIP RADAR</div>
        <h1 style={{fontSize:34,margin:"8px 0 10px"}}>MVP Deployment Console</h1>
        <p style={{color:"#627d98",lineHeight:1.6}}>
          DISCOVER → VERIFY → MATCH → CONTACT → FOLLOW-UP. Evidence-first workflow for overseas VIP opportunities already coming to Korea.
        </p>

        <section style={{marginTop:28,background:"white",border:"1px solid #d9e2ec",borderRadius:16,padding:22}}>
          <h2 style={{marginTop:0}}>Environment status</h2>
          <div style={{display:"grid",gap:12}}>
            <div><span style={status(hasSupabase)}>{hasSupabase ? "READY" : "SETUP NEEDED"}</span> <b style={{marginLeft:8}}>Supabase server connection</b></div>
            <div><span style={status(aiMode === "mock" || hasOpenAI)}>{aiMode === "mock" || hasOpenAI ? "READY" : "SETUP NEEDED"}</span> <b style={{marginLeft:8}}>AI extraction</b> <span style={{color:"#627d98"}}>({aiMode})</span></div>
            <div><span style={status(true)}>READY</span> <b style={{marginLeft:8}}>Vercel application shell</b></div>
          </div>
        </section>

        <section style={{marginTop:18,background:"white",border:"1px solid #d9e2ec",borderRadius:16,padding:22}}>
          <h2 style={{marginTop:0}}>Current MVP boundary</h2>
          <p style={{lineHeight:1.7,marginBottom:0}}>
            P0 starts with static official HTML sources. Exact Evidence Units are stored before AI extraction, and human approval remains mandatory before outreach.
            PDF, browser-rendered pages and scheduled monitoring follow in P1.
          </p>
        </section>

        <section style={{marginTop:18,background:"#eef5ff",border:"1px solid #c9def8",borderRadius:16,padding:22}}>
          <h2 style={{marginTop:0}}>Next deployment step</h2>
          <p style={{lineHeight:1.7,marginBottom:0}}>
            Connect the server-side Supabase secret and keep AI in mock mode first. After the database check passes, enable the full Evidence Review Console and run the first official-source pilot.
          </p>
        </section>
      </div>
    </main>
  );
}
