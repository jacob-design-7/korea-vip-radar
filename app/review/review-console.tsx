"use client";
import {useEffect,useMemo,useState} from "react";
import styles from "./review-console.module.css";

type Source={id:string;name:string;source_type:string;base_url:string;authority_tier:string;fetch_mode:string};
type Job={id:string;status:string;model:string;created_at:string;warnings:string[]};
type Detail={job:any;snapshot:any;candidates:any[];units:any[]};
type Overview={review:number;approved:number;rejected:number;vips:number;events:number;booked:number;opportunities:number;activeSources:number};

function Icon({name}:{name:string}){
  const common={width:17,height:17,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  const paths:Record<string,React.ReactNode>={
    overview:<><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    review:<><path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 3.5h8"/></>,
    source:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a8 8 0 10-14.8 0"/><path d="M5 19h14"/></>,
    jobs:<><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="2"/></>,
    refresh:<><path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/></>,
    shield:<><path d="M12 3l7 3v5c0 4.8-2.9 8.1-7 10-4.1-1.9-7-5.2-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></>,
    calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    pin:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/></>,
    external:<><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 13v6a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h6"/></>,
    spark:<><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/></>,
    check:<><path d="M5 12l4 4L19 6"/></>,
    x:<><path d="M6 6l12 12M18 6L6 18"/></>,
    arrow:<><path d="M5 12h14M13 6l6 6-6 6"/></>
  };
  return <svg {...common}>{paths[name]??paths.overview}</svg>;
}

function unitCode(u:any){return "U"+String(u?.unit_index??0).padStart(4,"0");}
function statusClass(status:string){
  if(status==="APPROVED")return styles.approved;
  if(status==="REJECTED")return styles.rejected;
  return styles.proposed;
}
function initials(name?:string){return (name??"?").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();}
function fmtDate(value?:string){
  if(!value)return "날짜 미확인";
  try{return new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"short",day:"numeric"}).format(new Date(value+"T00:00:00"));}
  catch{return value;}
}

async function api(path:string,init?:RequestInit){
  const r=await fetch(path,{...init,headers:{"Content-Type":"application/json",...(init?.headers??{})}});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error??("HTTP "+r.status));
  return b;
}

export default function ReviewConsole(){
  const [sources,setSources]=useState<Source[]>([]);
  const [jobs,setJobs]=useState<Job[]>([]);
  const [overview,setOverview]=useState<Overview>({review:0,approved:0,rejected:0,vips:0,events:0,booked:0,opportunities:0,activeSources:0});
  const [sourceId,setSourceId]=useState("");
  const [url,setUrl]=useState("");
  const [detail,setDetail]=useState<Detail|null>(null);
  const [selectedJobId,setSelectedJobId]=useState("");
  const [selectedEvidence,setSelectedEvidence]=useState("");
  const [busy,setBusy]=useState(false);
  const [reviewing,setReviewing]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");

  async function refreshOverview(){
    const o=await api("/api/radar/overview");
    setOverview(o);
  }

  async function load(id:string){
    setError("");setMessage("");setSelectedJobId(id);
    try{setDetail(await api("/api/radar/jobs/"+id));}
    catch(e:any){setError(e.message);}
  }

  async function refresh(autoLoad=true){
    const [s,j,o]=await Promise.all([
      api("/api/radar/sources"),
      api("/api/radar/jobs"),
      api("/api/radar/overview")
    ]);
    setSources(s.sources??[]);
    setJobs(j.jobs??[]);
    setOverview(o);
    if(!sourceId&&s.sources?.[0]){
      setSourceId(s.sources[0].id);
      setUrl(s.sources[0].base_url);
    }
    if(autoLoad&&!detail&&j.jobs?.[0]) await load(j.jobs[0].id);
  }

  useEffect(()=>{refresh().catch(e=>setError(e.message));},[]);

  function choose(id:string){
    setSourceId(id);
    const s=sources.find(x=>x.id===id);
    if(s)setUrl(s.base_url);
  }

  async function run(){
    setBusy(true);setError("");setMessage("");
    try{
      const r=await api("/api/radar/run",{method:"POST",body:JSON.stringify({source_id:sourceId,url})});
      await refresh(false);
      await load(r.jobId);
      await refreshOverview();
      setMessage("수집과 추출이 완료되었습니다. 아래 근거를 검토해 주세요.");
    }catch(e:any){setError(e.message);}
    finally{setBusy(false);}
  }

  async function approve(c:any){
    if(!confirm("이 후보를 정식 Radar 데이터로 승인할까요?"))return;
    setReviewing(c.id);setError("");setMessage("");
    try{
      await api("/api/radar/candidates/"+c.id+"/approve",{method:"POST",body:JSON.stringify({review_note:"Approved in Evidence Review Console"})});
      await load(c.job_id);await refresh(false);await refreshOverview();
      setMessage("승인 완료. Event, Person, Appearance, Evidence, Opportunity가 정식 저장되었습니다.");
    }catch(e:any){setError(e.message);}
    finally{setReviewing(null);}
  }

  async function reject(c:any){
    const reason=prompt("거절 사유를 입력해 주세요.");
    if(reason===null)return;
    if(!reason.trim()){setError("거절 사유가 필요합니다.");return;}
    setReviewing(c.id);setError("");setMessage("");
    try{
      await api("/api/radar/candidates/"+c.id+"/reject",{method:"POST",body:JSON.stringify({review_note:reason.trim()})});
      await load(c.job_id);await refresh(false);await refreshOverview();
      setMessage("후보를 거절했습니다.");
    }catch(e:any){setError(e.message);}
    finally{setReviewing(null);}
  }

  function getUnit(code?:string){
    if(!code)return null;
    return detail?.units.find(u=>unitCode(u)===code)??null;
  }

  function jumpEvidence(code?:string){
    if(!code)return;
    setSelectedEvidence(code);
    const el=document.getElementById("evidence-"+code);
    if(el)el.scrollIntoView({behavior:"smooth",block:"center"});
  }

  const currentMode=detail?.job?.model??jobs[0]?.model??"mock";

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandMark}/>
        <div>
          <div className={styles.brandTitle}>Korea VIP Radar</div>
          <div className={styles.brandSub}>Visit intelligence</div>
        </div>
      </div>

      <nav className={styles.navGroup}>
        <div className={styles.navLabel}>Workspace</div>
        <a className={styles.navLink} href="#overview"><span className={styles.navIcon}><Icon name="overview"/></span>Overview</a>
        <a className={styles.navLink+" "+styles.navActive} href="#review"><span className={styles.navIcon}><Icon name="review"/></span>Review queue{overview.review>0&&<span className={styles.navCount}>{overview.review}</span>}</a>
        <a className={styles.navLink} href="#sources"><span className={styles.navIcon}><Icon name="source"/></span>Sources</a>
        <a className={styles.navLink} href="#jobs"><span className={styles.navIcon}><Icon name="jobs"/></span>Jobs</a>
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.footerLabel}>Production</div>
        <div className={styles.footerDomain}>vipradar.practicalaidesk.com</div>
      </div>
    </aside>

    <div className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.breadcrumb}><span>Radar</span><span>/</span><strong>Evidence review</strong></div>
        <div className={styles.topActions}>
          <span className={styles.modeBadge}><span className={styles.dot}/>{currentMode==="mock"?"Mock extraction":"AI extraction"}</span>
        </div>
      </header>

      <main className={styles.content}>
        <section id="overview" className={styles.section}>
          <div className={styles.hero}>
            <div>
              <div className={styles.eyebrow}>Korea Visit Intelligence</div>
              <h1 className={styles.title}>Evidence before outreach.</h1>
              <p className={styles.subtitle}>한국 방문 가능성이 있는 해외 인사를 공식 출처에서 발견하고, 날짜·장소·참석 근거를 사람이 확인한 뒤 정식 Radar 데이터로 승인합니다.</p>
            </div>
            <div className={styles.heroMeta}>Evidence-first · Human approval required</div>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricTop}><span>Needs review</span><Icon name="review"/></div>
              <div className={styles.metricValue}>{overview.review}</div>
              <div className={styles.metricHint}>승인 대기 후보</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTop}><span>Approved VIPs</span><Icon name="spark"/></div>
              <div className={styles.metricValue}>{overview.vips}</div>
              <div className={styles.metricHint}>{overview.approved}개 후보 승인</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTop}><span>Events</span><Icon name="calendar"/></div>
              <div className={styles.metricValue}>{overview.events}</div>
              <div className={styles.metricHint}>정식 저장 행사</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTop}><span>Active sources</span><Icon name="source"/></div>
              <div className={styles.metricValue}>{overview.activeSources}</div>
              <div className={styles.metricHint}>공식 모니터링 출처</div>
            </div>
          </div>
        </section>

        <section id="sources" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Official source scan</h2>
              <div className={styles.sectionHelp}>공식 페이지 URL을 입력해 Snapshot과 Evidence Unit을 생성합니다.</div>
            </div>
          </div>
          <div className={styles.panel+" "+styles.sourcePanel}>
            <div className={styles.sourceGrid}>
              <label>
                <span className={styles.fieldLabel}>Source</span>
                <select className={styles.select} value={sourceId} onChange={e=>choose(e.target.value)}>
                  {sources.map(s=><option key={s.id} value={s.id}>{s.name} · {s.authority_tier.replace("_OFFICIAL_"," · ")}</option>)}
                </select>
              </label>
              <label>
                <span className={styles.fieldLabel}>Official page URL</span>
                <input className={styles.input} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://official-site.example/event"/>
              </label>
              <button className={styles.primaryButton} disabled={busy||!sourceId||!url} onClick={run}>
                <Icon name="spark"/>{busy?"Scanning…":"Scan & extract"}
              </button>
            </div>
            <div className={styles.securityNote}><Icon name="shield"/>선택한 Source 도메인만 허용하며 사설 IP와 비표준 포트를 차단합니다.</div>
          </div>
        </section>

        <section id="review" className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Review queue</h2>
              <div className={styles.sectionHelp}>AI 제안은 근거와 함께 검토된 뒤에만 승인됩니다.</div>
            </div>
          </div>

          {message&&<div className={styles.notice+" "+styles.noticeSuccess}><Icon name="check"/><span>{message}</span></div>}
          {error&&<div className={styles.notice+" "+styles.noticeError}><Icon name="x"/><span>{error}</span></div>}

          <div className={styles.workspace}>
            <aside id="jobs" className={styles.panel+" "+styles.jobsPanel}>
              <div className={styles.jobsHead}>
                <div className={styles.jobsTitle}>Recent jobs</div>
                <button className={styles.iconButton} title="새로고침" onClick={()=>refresh(false)}><Icon name="refresh"/></button>
              </div>
              <div className={styles.jobsList}>
                {jobs.map(j=><button key={j.id} className={styles.job+(selectedJobId===j.id?" "+styles.jobActive:"")} onClick={()=>load(j.id)}>
                  <div className={styles.jobTop}>
                    <span className={styles.jobStatus}>{j.status.replaceAll("_"," ")}</span>
                    <span className={styles.jobTime}>{new Date(j.created_at).toLocaleDateString("ko-KR",{month:"short",day:"numeric"})}</span>
                  </div>
                  <div className={styles.jobMeta}><span>{j.model}</span><span>{new Date(j.created_at).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</span></div>
                </button>)}
                {!jobs.length&&<div className={styles.emptyText} style={{padding:12}}>아직 실행한 Job이 없습니다.</div>}
              </div>
            </aside>

            <div className={styles.canvas}>
              {!detail&&<div className={styles.empty}>
                <div className={styles.emptyIcon}><Icon name="review"/></div>
                <div className={styles.emptyTitle}>검토할 Job을 선택하세요</div>
                <div className={styles.emptyText}>공식 페이지를 Scan하거나 왼쪽의 최근 Job을 선택하면 Evidence가 표시됩니다.</div>
              </div>}

              {detail&&<>
                <div className={styles.panel+" "+styles.snapshot}>
                  <div className={styles.snapshotUrl}>
                    <div className={styles.snapshotLabel}>Source snapshot</div>
                    <div className={styles.snapshotValue}>{detail.snapshot?.source_url}</div>
                  </div>
                  <div className={styles.snapshotStats}>
                    <span className={styles.miniStat}>{detail.units.length} evidence units</span>
                    <span className={styles.miniStat}>{detail.candidates.length} candidates</span>
                    <span className={styles.miniStat}>{detail.job?.model}</span>
                  </div>
                </div>

                {detail.candidates.map((c:any)=>{
                  const x=c.edited_json??c.extracted_json;
                  const person=x?.appearances?.[0];
                  const name=person?.person_name_en??person?.person_name_original??"Unnamed candidate";
                  const attendanceCode=person?.attendance_unit_ids?.[0];
                  const roleCode=person?.role_unit_ids?.[0];
                  const dateCode=x?.date_unit_ids?.[0];
                  const venueCode=x?.venue_unit_ids?.[0];
                  const presenceCode=person?.presence_unit_ids?.[0];
                  const evidence=[
                    {kind:"ATTENDANCE",code:attendanceCode,unit:getUnit(attendanceCode),missing:"참석 근거가 아직 없습니다."},
                    {kind:"DATE",code:dateCode,unit:getUnit(dateCode),missing:"날짜 근거가 아직 없습니다."},
                    {kind:"VENUE",code:venueCode,unit:getUnit(venueCode),missing:"장소 근거가 아직 없습니다."},
                    {kind:"ROLE",code:roleCode,unit:getUnit(roleCode),missing:"역할 근거가 아직 없습니다."},
                    {kind:"PHYSICAL PRESENCE",code:presenceCode,unit:getUnit(presenceCode),missing:"현장 참석을 직접 확인하는 근거가 없어 UNKNOWN으로 유지합니다."}
                  ];

                  return <article key={c.id} className={styles.candidate}>
                    <div className={styles.candidateHead}>
                      <div className={styles.personRow}>
                        <div className={styles.avatar}>{initials(name)}</div>
                        <div>
                          <div className={styles.personName}>{name}</div>
                          <div className={styles.personRole}>{person?.role_at_event??"Role not confirmed"}</div>
                          <div className={styles.personOrg}>{person?.title_at_event??""}{person?.organization_at_event?" · "+person.organization_at_event:""}</div>
                        </div>
                      </div>
                      <span className={styles.statusBadge+" "+statusClass(c.status)}>{c.status}</span>
                    </div>

                    <div className={styles.candidateBody}>
                      <div className={styles.eventBlock}>
                        <div className={styles.eventTitle}>{x?.event_name??"Event name not confirmed"}</div>
                        <div className={styles.eventMeta}>
                          <span className={styles.metaItem}><Icon name="calendar"/>{fmtDate(x?.start_date)}{x?.end_date&&x.end_date!==x.start_date?" — "+fmtDate(x.end_date):""}</span>
                          <span className={styles.metaItem}><Icon name="pin"/>{x?.venue??"장소 미확인"}</span>
                          {x?.official_url&&<a className={styles.metaItem} href={x.official_url} target="_blank" rel="noreferrer"><Icon name="external"/>Official source</a>}
                        </div>
                      </div>

                      <div className={styles.evidenceTitleRow}>
                        <div className={styles.evidenceTitle}>Evidence</div>
                        <div className={styles.evidenceHint}>근거를 클릭하면 원문 Evidence Unit으로 이동합니다.</div>
                      </div>

                      <div className={styles.evidenceList}>
                        {evidence.map(e=><button key={e.kind} className={styles.evidenceRow} onClick={()=>e.code&&jumpEvidence(e.code)} disabled={!e.code}>
                          <span className={styles.evidenceKind}>{e.kind}</span>
                          <span className={styles.evidenceText+(e.unit?"":" "+styles.evidenceTextMuted)}>{e.unit?.exact_text??e.missing}</span>
                          <span className={styles.evidenceUnit+(e.unit?"":" "+styles.evidenceMissing)}>{e.code??"UNKNOWN"}</span>
                        </button>)}
                      </div>

                      <div className={styles.presenceLine}>Physical presence <span className={styles.presenceBadge}>{person?.presence_hint??"UNKNOWN"}</span><span>별도 현장 참석 근거 없이는 자동 승격하지 않습니다.</span></div>

                      {c.review_note&&<div className={styles.reviewNote}>Review note · {c.review_note}</div>}

                      {c.status==="PROPOSED"&&<div className={styles.actions}>
                        <button className={styles.dangerButton} disabled={reviewing===c.id} onClick={()=>reject(c)}>Reject</button>
                        <button className={styles.primaryButton} disabled={reviewing===c.id} onClick={()=>approve(c)}>
                          <Icon name="check"/>{reviewing===c.id?"Processing…":"Approve candidate"}
                        </button>
                      </div>}

                      <details className={styles.technical}>
                        <summary>Technical details · raw extraction JSON</summary>
                        <pre className={styles.code}>{JSON.stringify(x,null,2)}</pre>
                      </details>
                    </div>
                  </article>
                })}

                {!detail.candidates.length&&<div className={styles.empty}>
                  <div className={styles.emptyIcon}><Icon name="spark"/></div>
                  <div className={styles.emptyTitle}>이 Snapshot에서는 후보가 발견되지 않았습니다.</div>
                  <div className={styles.emptyText}>Evidence 저장은 정상일 수 있습니다. 행사·인물 상세 페이지에서 다시 Scan해 보세요.</div>
                </div>}

                <details className={styles.unitsDetails} open={Boolean(selectedEvidence)}>
                  <summary>Evidence Units · {detail.units.length}</summary>
                  <div className={styles.unitsList}>
                    {detail.units.slice(0,140).map((u:any)=>{
                      const code=unitCode(u);
                      return <div id={"evidence-"+code} key={u.id} className={styles.unitRow+(selectedEvidence===code?" "+styles.unitHighlight:"")}>
                        <div className={styles.unitMeta}><span className={styles.unitCode}>{code}</span><span>{u.unit_type}</span>{u.section_heading&&<span>· {u.section_heading}</span>}</div>
                        <div className={styles.unitText}>{u.exact_text}</div>
                      </div>
                    })}
                  </div>
                </details>
              </>}
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>;
}
