import {NextResponse} from "next/server";
import {SupabaseRestClient} from "../../../../../../src/supabase-rest";

export const runtime="nodejs";

function publicOfficial(title:string,role:string){
  return /(minister|mayor|president|prime minister|ambassador|governor|secretary[- ]general|member of parliament|senator|congress|장관|시장|대통령|총리|대사|주지사|의원)/i.test(title+" "+role);
}
function draftFor(o:any){
  const name=o.person_name||"Guest";
  const event=o.event_title||"your upcoming engagement in Korea";
  const when=o.start_at?new Intl.DateTimeFormat("en-US",{year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Seoul"}).format(new Date(o.start_at)):"your upcoming visit";
  const place=[o.venue,o.city].filter(Boolean).join(", ")||"Korea";
  const route=o.recommended_contact_route||"HOST_FIRST";
  const official=publicOfficial(o.person_title||"",o.role_at_event||"");
  const subject=`Invitation inquiry during your Korea schedule — ${name}`;
  const opening=official
    ? "We are reaching out with a neutral institutional inquiry regarding a possible educational exchange during your scheduled engagement in Korea."
    : "We are reaching out to explore whether your schedule in Korea might permit a brief educational exchange.";
  const body=[
    `Dear ${name},`,
    "",
    opening,
    "",
    `We learned from the official event information for “${event}” that you are scheduled to participate on or around ${when} at ${place}.`,
    "",
    "If your schedule permits, we would be grateful to explore the possibility of a short lecture, student roundtable, or brief meeting with university students and institutional partners in Korea. The format and timing would be arranged entirely around your availability and through the appropriate official channel.",
    "",
    `Our current recommended contact route is ${route.replaceAll("_"," ").toLowerCase()}, and this message is a draft for human review only. No message has been sent.`,
    "",
    "Thank you for considering the inquiry. We would be pleased to provide a concise program outline if appropriate.",
    "",
    "Sincerely,",
    "Korea VIP Radar Team"
  ].join("\n");
  return {subject,body,official};
}

export async function POST(_req:Request,ctx:{params:Promise<{id:string}>}){
  try{
    const {id}=await ctx.params;
    const db=new SupabaseRestClient();
    const list=await db.rpc<any[]>("list_opportunity_briefs",{});
    const o=list.find(x=>x.opportunity_id===id);
    if(!o)return NextResponse.json({error:"Opportunity not found"},{status:404});
    const {subject,body,official}=draftFor(o);
    const prev=await db.select<any>("outreach_actions",`opportunity_id=eq.${encodeURIComponent(id)}&action_type=eq.DRAFT&select=id,draft_version&order=occurred_at.desc&limit=1`);
    const version=(prev[0]?.draft_version??0)+1;
    const rows=await db.insert<any>("outreach_actions",{
      opportunity_id:id,contact_route:o.recommended_contact_route||"HOST_FIRST",action_type:"DRAFT",
      payload_summary:official?"Neutral draft for public-official/institutional review; human approval required.":"Neutral invitation draft; human approval required.",
      gate_override:false,message_subject:subject,message_body:body,draft_version:version
    },"id,occurred_at,message_subject,message_body,draft_version,contact_route,payload_summary");
    return NextResponse.json({draft:rows[0],sent:false,humanApprovalRequired:true});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:String(error)},{status:422});}
}
