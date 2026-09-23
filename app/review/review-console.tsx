"use client";
import {useEffect,useState,type CSSProperties} from "react";

type Source={id:string;name:string;source_type:string;base_url:string;authority_tier:string;fetch_mode:string};
type Job={id:string;status:string;model:string;created_at:string;warnings:string[]};
type Detail={job:any;snapshot:any;candidates:any[];units:any[]};

const card:CSSProperties={background:"#fff",border:"1px solid #d9e2ec",borderRadius:14,padding:18,boxShadow:"0 2px 8px rgba(16,42,67,.05)"};
const input:CSSProperties={width:"100%",boxSizing:"border-box",padding:"10px",border:"1px solid #bcccdc",borderRadius:8,fontSize:14};
const button:CSSProperties={border:0,borderRadius:8,padding:"10px 14px",background:"#1f5fa8",color:"#fff",fontWeight:700,cursor:"pointer"};
const secondary:CSSProperties={...button,background:"#fff",color:"#344e66",border:"1px solid #bcccdc"};
const danger:CSSProperties={...button,background:"#fff",color:"#b42318",border:"1px solid #f3b7b0"};

async function api(path:string,init?:RequestInit){
  const r=await fetch(path,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error??("HTTP "+r.status));return b;
}
export default function ReviewConsole(){
  const [sources,setSources]=useState<Source[]>([]);const [jobs,setJobs]=useState<Job[]>([]);
  const [sourceId,setSourceId]=useState("");const [url,setUrl]=useState("");const [detail,setDetail]=useState<Detail|null>(null);
  const [busy,setBusy]=useState(false);const [reviewing,setReviewing]=useState<string|null>(null);const [error,setError]=useState("");const [message,setMessage]=useState("");
  async function refresh(){
    const [s,j]=await Promise.all([api("/api/radar/sources"),api("/api/radar/jobs")]);
    setSources(s.sources??[]);setJobs(j.jobs??[]);
    if(!sourceId&&s.sources?.[0]){setSourceId(s.sources[0].id);setUrl(s.sources[0].base_url);}
  }
  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);
  function choose(id:string){setSourceId(id);const s=sources.find(x=>x.id===id);if(s)setUrl(s.base_url);}
  async function run(){
    setBusy(true);setError("");setMessage("");try{
      const r=await api("/api/radar/run",{method:"POST",body:JSON.stringify({source_id:sourceId,url})});
      await refresh();setDetail(await api("/api/radar/jobs/"+r.jobId));setMessage("수집·추출 완료");
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  }
  async function load(id:string){setError("");setMessage("");try{setDetail(await api("/api/radar/jobs/"+id));}catch(e:any){setError(e.message);}}
  async function approve(c:any){
    if(!confirm("이 후보를 승인하여 정식 Event / Person / Appearance / Evidence로 저장할까요?"))return;
    setReviewing(c.id);setError("");setMessage("");
    try{
      const result=await api("/api/radar/candidates/"+c.id+"/approve",{method:"POST",body:JSON.stringify({review_note:"Approved in Evidence Review Console"})});
      setDetail(await api("/api/radar/jobs/"+c.job_id));await refresh();
      setMessage("승인 완료: 정식 Radar 데이터로 저장되었습니다.");
      console.log(result);
    }catch(e:any){setError(e.message);}finally{setReviewing(null);}
  }
  async function reject(c:any){
    const reason=prompt("거절 사유를 입력해 주세요.");if(reason===null)return;if(!reason.trim()){setError("거절 사유가 필요합니다.");return;}
    setReviewing(c.id);setError("");setMessage("");
    try{
      await api("/api/radar/candidates/"+c.id+"/reject",{method:"POST",body:JSON.stringify({review_note:reason.trim()})});
      setDetail(await api("/api/radar/jobs/"+c.job_id));await refresh();setMessage("후보를 거절했습니다.");
    }catch(e:any){setError(e.message);}finally{setReviewing(null);}
  }
  return <main style={{minHeight:"100vh",background:"#f4f7fb",fontFamily:"Inter,system-ui,sans-serif",color:"#162033"}}>
    <div style={{maxWidth:1250,margin:"0 auto",padding:"34px 22px"}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:1.4,color:"#1f5fa8"}}>KOREA VIP RADAR</div>
      <h1 style={{fontSize:32,margin:"7px 0"}}>Evidence Review Console</h1>
      <p style={{color:"#627d98",marginTop:0}}>공식 URL 수집 → Evidence Unit 생성 → 후보 추출 → 사람 승인/거절. 승인 전에는 정식 Radar 데이터로 승격되지 않습니다.</p>
      {message&&<div style={{...card,borderColor:"#b7dfc8",background:"#f0fff6",color:"#176b43",marginBottom:16}}>{message}</div>}
      {error&&<div style={{...card,borderColor:"#f5c2c7",background:"#fff5f5",color:"#9b2c2c",marginBottom:16}}>{error}</div>}
      <section style={{...card,marginBottom:18}}>
        <h2 style={{marginTop:0,fontSize:18}}>1. 공식 페이지 수집</h2>
        <div style={{display:"grid",gridTemplateColumns:"300px 1fr auto",gap:10,alignItems:"end"}}>
          <label><div style={{fontSize:12,fontWeight:700,marginBottom:5}}>Source</div><select style={input} value={sourceId} onChange={e=>choose(e.target.value)}>{sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.authority_tier}</option>)}</select></label>
          <label><div style={{fontSize:12,fontWeight:700,marginBottom:5}}>공식 페이지 URL</div><input style={input} value={url} onChange={e=>setUrl(e.target.value)}/></label>
          <button style={{...button,opacity:busy?0.55:1}} disabled={busy||!sourceId||!url} onClick={run}>{busy?"수집 중…":"수집·추출"}</button>
        </div>
        <div style={{fontSize:12,color:"#829ab1",marginTop:9}}>선택한 Source와 같은 도메인(또는 하위 도메인)만 수집하며, 사설 IP·비표준 포트는 차단합니다.</div>
      </section>
      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:18,alignItems:"start"}}>
        <aside style={card}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><h2 style={{fontSize:17,marginTop:0}}>Jobs</h2><button style={{...secondary,padding:"6px 9px"}} onClick={()=>refresh()}>새로고침</button></div>
          <div style={{display:"grid",gap:8}}>{jobs.map(j=><button key={j.id} onClick={()=>load(j.id)} style={{textAlign:"left",padding:10,border:"1px solid #d9e2ec",borderRadius:8,background:"#fff",cursor:"pointer"}}><b>{j.status}</b><div style={{fontSize:12,color:"#627d98"}}>{new Date(j.created_at).toLocaleString()}</div><div style={{fontSize:11,color:"#829ab1"}}>{j.model}</div></button>)}</div>
        </aside>
        <section style={{display:"grid",gap:14}}>
          {!detail&&<div style={card}>새 URL을 실행하거나 왼쪽 Job을 선택하세요.</div>}
          {detail&&<>
            <div style={card}><b>Source URL</b><div style={{wordBreak:"break-all",marginTop:5}}>{detail.snapshot?.source_url}</div><div style={{marginTop:10}}><b>Evidence Units:</b> {detail.units.length} · <b>Candidates:</b> {detail.candidates.length}</div>{(detail.job?.warnings??[]).map((w:string,i:number)=><div key={i} style={{marginTop:8,padding:8,background:"#fff7df",borderRadius:7,fontSize:12}}>{w}</div>)}</div>
            {detail.candidates.map((c:any)=>{
              const x=c.edited_json??c.extracted_json;const person=x?.appearances?.[0];
              return <div key={c.id} style={{...card,borderLeft:"5px solid "+(c.status==="APPROVED"?"#2f855a":c.status==="REJECTED"?"#c53030":"#1f5fa8")}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"start"}}>
                  <div><h2 style={{fontSize:20,margin:"0 0 6px"}}>{x?.event_name??("Candidate #"+(c.candidate_index+1))}</h2><div style={{fontSize:13,color:"#627d98"}}>{x?.start_date??"날짜 미확인"} ~ {x?.end_date??""} · {x?.venue??"장소 미확인"}</div></div>
                  <span style={{fontWeight:800,padding:"5px 9px",borderRadius:999,background:c.status==="APPROVED"?"#e8f5ee":c.status==="REJECTED"?"#fff1f0":"#eef5ff",color:c.status==="APPROVED"?"#176b43":c.status==="REJECTED"?"#b42318":"#1f5fa8"}}>{c.status}</span>
                </div>
                {person&&<div style={{marginTop:14,padding:14,background:"#f7fafc",borderRadius:10}}><b style={{fontSize:17}}>{person.person_name_en??person.person_name_original}</b><div style={{marginTop:4}}>{person.role_at_event??""}</div><div style={{fontSize:13,color:"#627d98"}}>{person.title_at_event??""}{person.organization_at_event?" · "+person.organization_at_event:""}</div><div style={{fontSize:12,color:"#829ab1",marginTop:5}}>Presence: {person.presence_hint??"UNKNOWN"}</div></div>}
                <div style={{marginTop:12,fontSize:12,color:"#486581"}}>Date evidence: {(x?.date_unit_ids??[]).join(", ")||"없음"} · Venue evidence: {(x?.venue_unit_ids??[]).join(", ")||"없음"} · Attendance evidence: {(person?.attendance_unit_ids??[]).join(", ")||"없음"}</div>
                {c.review_note&&<div style={{marginTop:10,fontSize:12,color:"#627d98"}}>Review note: {c.review_note}</div>}
                {c.status==="PROPOSED"&&<div style={{display:"flex",gap:9,marginTop:16}}>
                  <button style={{...button,opacity:reviewing===c.id?0.55:1}} disabled={reviewing===c.id} onClick={()=>approve(c)}>{reviewing===c.id?"처리 중…":"승인하기"}</button>
                  <button style={danger} disabled={reviewing===c.id} onClick={()=>reject(c)}>거절하기</button>
                </div>}
              </div>
            })}
            <details style={card}><summary style={{fontWeight:800,cursor:"pointer"}}>Evidence Units ({detail.units.length})</summary><div style={{display:"grid",gap:7,marginTop:12}}>{detail.units.slice(0,100).map((u:any)=><div key={u.id} style={{padding:"8px 0",borderBottom:"1px solid #eef2f6",fontSize:12}}><b>{"U"+String(u.unit_index).padStart(4,"0")}</b> · {u.unit_type}{u.section_heading?(" · "+u.section_heading):""}<div style={{marginTop:3}}>{u.exact_text}</div></div>)}</div></details>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
