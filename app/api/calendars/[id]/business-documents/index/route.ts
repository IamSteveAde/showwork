import { NextRequest, NextResponse } from "next/server";
import { getCurrentCreator } from "@/lib/auth";
import { hasCalendarPermission } from "@/lib/calendarPermissions";
import { indexStatus, knowledgeSql } from "@/lib/knowledge/hybrid/store";
import { embeddingConfig, hybridEnabled } from "@/lib/knowledge/hybrid/config";
export async function GET(_req:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const {id}=await params;const creator=await getCurrentCreator();
  if(!creator || !await hasCalendarPermission(creator.id,id,'knowledge.view'))return NextResponse.json({error:'Access denied.'},{status:403});
  if(!hybridEnabled(id))return NextResponse.json({enabled:false,status:'disabled'});
  try {
    const config=embeddingConfig();
    const sources=await indexStatus(knowledgeSql,id);
    const ready=sources.filter(s=>s.status==='READY'&&s.indexKey===config.key).length;
    const failed=sources.filter(s=>s.status==='FAILED').length;
    return NextResponse.json({enabled:true,status:ready===sources.length?'ready':'partial',total:sources.length,ready,failed,pending:sources.length-ready-failed});
  } catch {return NextResponse.json({enabled:true,status:'unavailable',message:'Semantic indexing is unavailable. Content generation will use lexical retrieval.'});}
}
