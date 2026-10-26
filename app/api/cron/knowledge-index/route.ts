import { NextRequest, NextResponse } from "next/server";
import { processIndexBatch } from "@/lib/knowledge/hybrid/store";
export const maxDuration=60;
export async function POST(req:NextRequest) {
  if(!process.env.CRON_SECRET || req.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401});
  if(process.env.KNOWLEDGE_INDEXING_ENABLED!=='true')return NextResponse.json({enabled:false});
  try {return NextResponse.json(await processIndexBatch());}
  catch {return NextResponse.json({error:'Knowledge indexing is unavailable.'},{status:503});}
}
