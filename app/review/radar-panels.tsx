"use client";
import {useEffect,useState} from "react";
import styles from "./radar-panels.module.css";

type Alert={id:string;candidate_id:string|null;status:string;title:string;body:string|null;payload:any;created_at:string};
type Opp={
  opportunity_id:string;workflow_status:string;recommended_contact_route:string|null;route_reason:string|null;lead_days:number|null;lead_bucket:string|null;
  duplicate_hint:any;presence_status:string;visit_status:string;person_name:string;person_title:string|null;organization_name:string|null;role_at_event:string|null;
  event_title:string;start_at:string|null;venue:string|null;city:string|null;official_url:string|null;contact_count:number;
  latest_draft_id:string|null;latest_draft_subject:string|null;latest_draft_body:string|null;
};
async function api(path:string,init?:RequestInit){
  const r=await fetch(path,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error??("HTTP "+r.status));return b;
}
function leadLabel(o:Opp){if(o.lead_days==null)return "Lead time unknown";return o.lead_days>=0?`${o.lead_days} days left`:"Past event";}
export default function RadarPanels(){
  const [alerts,setAlerts]=useState<Alert[]>([]);const [opps,setOpps]=useState<Opp[]>([]);const [busy,setBusy]=useState("");const [error,setError]=useState("");
  async function refresh(){try{const [a,o]=await Promise.all([api("/api/radar/alerts"),api("/api/radar/opportunities")]);setAlerts(a.alerts??[]);setOpps(o.opportunities??[]);}catch(e:any){setError(e.message);}}
  useEffect(()=>{refresh();},[]);
  async function ack(id:string){setBusy(id);try{await api("/api/radar/alerts/"+id,{method:"POST",body:JSON.stringify({status:"ACKNOWLEDGED"})});await refresh();}catch(e:any){setError(e.message);}finally{setBusy("");}}
  async function draft(id:string){setBusy(id);try{await api("/api/radar/opportunities/"+id+"/draft",{method:"POST",body:"{}"});await refresh();}catch(e:any){setError(e.message);}finally{setBusy("");}}
  const fresh=alerts.filter(a=>a.status==="NEW").slice(0,8);
  return <section id="approved" className={styles.wrap}>
    <div className={styles.heading}><div><h2>Radar workspace</h2><p>새 후보 알림과 승인된 인사의 접촉 경로·초청 초안을 한 곳에서 관리합니다.</p></div><button onClick={refresh}>Refresh</button></div>
    {error&&<div className={styles.error}>{error}</div>}
    <div className={styles.grid}>
      <div className={styles.panel}>
        <div className={styles.panelHead}><div><b>New candidate alerts</b><span>{fresh.length} new</span></div><small>In-app only</small></div>
        <div className={styles.list}>
          {!fresh.length&&<div className={styles.empty}>새 알림이 없습니다.</div>}
          {fresh.map(a=><div key={a.id} className={styles.alert}>
            <div className={styles.alertDot}/>
            <div className={styles.alertBody}><b>{a.title}</b><p>{a.body}</p><small>{new Date(a.created_at).toLocaleString("ko-KR")}</small></div>
            <button disabled={busy===a.id} onClick={()=>ack(a.id)}>확인</button>
          </div>)}
        </div>
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHead}><div><b>Approved radar</b><span>{opps.length} opportunities</span></div><small>Human-approved only</small></div>
        <div className={styles.list}>
          {!opps.length&&<div className={styles.empty}>아직 승인된 후보가 없습니다. Review Queue에서 승인하면 여기에 표시됩니다.</div>}
          {opps.slice(0,12).map(o=><article key={o.opportunity_id} className={styles.opp}>
            <div className={styles.oppTop}><div><h3>{o.person_name}</h3><p>{o.role_at_event||o.person_title||"Role not confirmed"}{o.organization_name?" · "+o.organization_name:""}</p></div><span className={styles.lead+" "+styles[(o.lead_bucket||"UNKNOWN").toLowerCase()]}>{leadLabel(o)}</span></div>
            <div className={styles.event}><b>{o.event_title}</b><span>{[o.venue,o.city].filter(Boolean).join(" · ")||"Venue unknown"}</span></div>
            <div className={styles.meta}>
              <span>Route <b>{(o.recommended_contact_route||"HOST_FIRST").replaceAll("_"," ")}</b></span>
              <span>Presence <b>{o.presence_status}</b></span>
              <span>Official contacts <b>{o.contact_count||0}</b></span>
              {o.duplicate_hint?.possible&&<span className={styles.duplicate}>Possible duplicate · review before outreach</span>}
            </div>
            {o.route_reason&&<p className={styles.reason}>{o.route_reason}</p>}
            <div className={styles.actions}>
              {o.official_url&&<a href={o.official_url} target="_blank" rel="noreferrer">Official source</a>}
              <button disabled={busy===o.opportunity_id} onClick={()=>draft(o.opportunity_id)}>{busy===o.opportunity_id?"Generating…":o.latest_draft_id?"Regenerate draft":"Create invitation draft"}</button>
            </div>
            {o.latest_draft_id&&<details className={styles.draft}><summary>Latest invitation draft · not sent</summary><div><b>{o.latest_draft_subject}</b><pre>{o.latest_draft_body}</pre></div></details>}
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
