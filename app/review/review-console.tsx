"use client";
import {useEffect,useState,type CSSProperties} from "react";

type Source={id:string;name:string;source_type:string;base_url:string;authority_tier:string;fetch_mode:string};
type Job={id:string;status:string;model:string;created_at:string;warnings:string[]};
type Detail={job:any;snapshot:any;candidates:any[];units:any[]};

const card:CSSProperties={background:"#fff",border:"1px solid #d9e2ec",borderRadius:14,padding:18,boxShadow:"0 2px 8px rgba(16,42,67,.05)"};
const input:CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px",border:"1px solid #bcccdc",borderRadius:8,fontSize:14};
const button:CSSProperties={border:0,borderRadius:8,padding:"10px 14px",background:"#1f5fa8",color:"#fff",fontWeight:700,cursor:"pointer"};

async function api(path:string,init?:RequestInit){
  const r=await fetch(path,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error??("HTTP "+r.status));return b;
}
export default function ReviewConsole(){
  const [sources,setSources]=useState<Source[]>([]);const [jobs,setJobs]=useState<Job[]>([]);
  const [sourceId,setSourceId]=useState("");const [url,setUrl]=useState("");const [detail,setDetail]=useState<Detail|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  async function refresh(){
    const [s,j]=await Promise.all([api("/api/radar/sources"),api("/api/radar/jobs")]);
    setSources(s.sources??[]);setJobs(j.jobs??[]);
    if(!sourceId&&s.sources?.[0]){setSourceId(s.sources[0].id);setUrl(s.sources[0].base_url);}
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  function choose(id:string){setSourceId(id);const s=sources.find(x=>x.id===id);if(s)setUrl(s.base_url);}
  async function run(){
    setBusy(true);setError("");try{
      const r=await api("/api/radar/run",{method:"POST",body:JSON.stringify({source_id:sourceId,url})});
      await refresh();setDetail(await api("/api/radar/jobs/"+r.jobId));
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  async function load(id:string){setError("");try{setDetail(await api("/api/radar/jobs/"+id));}catch(e:any){setError(e.message);}}
  return <main style={{minHeight:"100vh",background:"#f4f7fb",fontFamily:"Inter,system-ui,sans-serif",color:"#162033"}}>
    <div style={{maxWidth:1250,margin:"0 auto",padding:"34px 22px"}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:1.4,color:"#1f5fa8"}}>KOREA VIP RADAR</div>
      <h1 style={{fontSize:32,margin:"7px 0"}}>Evidence Review Console</h1>
      <p style={{color:"#627d98",marginTop:0}}>공식 URL 수집 → Evidence Unit 생성 → Mock 후보 추출 → 사람 검토. 실제 아웃리치는 아직 실행하지 않습니다.</p>
      {error&&<div style={{...card,borderColor:"#f5c2c7",background:"#fff5f5",color:"#9b2c2c",marginBottom:16}}>{error}</div>}
      <section style={{...card,marginBottom:18}}>
        <h2 style={{marginTop:0,fontSize:18}}>1. 공식 페이지 수집</h2>
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr auto",gap:10,alignItems:"end"}}>
          <label><div style={{fontSize:12,fontWeight:700,marginBottom:5}}>Source</div><select style={input} value={sourceId} onChange={e=>choose(e.target.value)}>{sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.authority_tier}</option>)}</select></label>
          <label><div style={{fontSize:12,fontWeight:700,marginBottom:5}}>공식 페이지 URL</div><input style={input} value={url} onChange={e=>setUrl(e.target.value)}/></label>
          <button style={{...button,opacity:busy?.55:1}} disabled={busy||!sourceId||!url} onClick={run}>{busy?"수집 중…":"수집·추출"}</button>
        </div>
        <div style={{fontSize:12,color:"#829ab1",marginTop:9}}>안전장치: 선택한 Source와 같은 도메인(또는 하위 도메인)만 수집하며, 사설 IP·비표준 포트는 차단합니다.</div>
      </section>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:18,alignItems:"start"}}>
        <aside style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{fontSize:17,marginTop:0}}>Jobs</h2><button style={{...button,padding:"6px 9px",background:"#486581"}} onClick={()=>refresh()}>새로고침</button></div>
          <div style={{display:"grid",gap:8}}>{jobs.map(j=><button key={j.id} onClick={()=>load(j.id)} style={{textAlign:"left",padding:10,border:"1px solid #d9e2ec",borderRadius:8,background:"#fff",cursor:"pointer"}}><b>{j.status}</b><div style={{fontSize:12,color:"#627d98"}}>{new Date(j.created_at).toLocaleString()}</div><div style={{fontSize:11,color:"#829ab1"}}>{j.model}</div></button>)}</div>
        </aside>
        <section style={{display:"grid",gap:14}}>
          {!detail&&<div style={card}>새 URL을 실행하거나 왼쪽의 Job을 선택하세요.</div>}
          {detail&&<>
            <div style={card}><b>Source URL</b><div style={{wordBreak:"break-all",marginTop:5}}>{detail.snapshot?.source_url}</div><div style={{marginTop:10}}><b>Evidence Units:</b> {detail.units.length} · <b>Candidates:</b> {detail.candidates.length}</div>{(detail.job?.warnings??[]).map((w:string,i:number)=><div key={i} style={{marginTop:8,padding:8,background:"#fff7df",borderRadius:7,fontSize:12}}>{w}</div>)}</div>
            {detail.candidates.map((c:any)=><div key={c.id} style={{...card,borderLeft:"5px solid #1f5fa8"}}><div style={{display:"flex",justifyContent:"space-between"}}><h2 style={{fontSize:18,marginTop:0}}>Candidate #{c.candidate_index+1}</h2><b>{c.status}</b></div><pre style={{whiteSpace:"pre-wrap",wordBreak:"break-word",fontSize:12,background:"#f7fafc",padding:12,borderRadius:8}}>{JSON.stringify(c.extracted_json,null,2)}</pre></div>)}
            <details style={card} open><summary style={{fontWeight:800,cursor:"pointer"}}>Evidence Units ({detail.units.length})</summary><div style={{display:"grid",gap:7,marginTop:12}}>{detail.units.slice(0,80).map((u:any)=><div key={u.id} style={{padding:"8px 0",borderBottom:"1px solid #eef2f6",fontSize:12}}><b>{"U"+String(u.unit_index).padStart(4,"0")}</b> · {u.unit_type}{u.section_heading?(" · "+u.section_heading):""}<div style={{marginTop:3}}>{u.exact_text}</div></div>)}</div></details>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
