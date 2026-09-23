import {NextResponse} from "next/server";
import {safeFetch} from "../../../../src/safe-fetcher";
import {segmentHtml} from "../../../../src/dom-segmenter";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

export async function GET(){
  const url="https://english.seoul.go.kr/";
  try{
    const fetched=await safeFetch(url);
    const segmentation=segmentHtml(fetched.body);
    return NextResponse.json({
      ok:true,
      source:"Seoul Metropolitan Government English",
      finalUrl:fetched.finalUrl,
      httpStatus:fetched.status,
      bytes:fetched.byteLength,
      contentHash:fetched.sha256,
      title:segmentation.title,
      evidenceUnitCount:segmentation.units.length,
      sampleUnits:segmentation.units.slice(0,3).map(u=>({id:u.unitId,type:u.blockType,text:u.text.slice(0,220)}))
    });
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
