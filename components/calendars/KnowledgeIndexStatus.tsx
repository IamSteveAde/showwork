"use client";
import { useEffect, useState } from "react";
interface Status { enabled:boolean;status:string;ready?:number;total?:number;failed?:number }
export default function KnowledgeIndexStatus({calendarId,revision}:{calendarId:string;revision:string}) {
  const [status,setStatus]=useState<Status|null>(null);
  useEffect(()=>{
    const abort=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const read=async()=>{
      try {
        const response=await fetch(`/api/calendars/${encodeURIComponent(calendarId)}/business-documents/index`,{signal:abort.signal,cache:'no-store'});
        if(!response.ok)return;
        const next=await response.json() as Status;
        if(abort.signal.aborted)return;
        setStatus(next);
        if(next.enabled && next.status!=='ready')timer=setTimeout(read,15000);
      }catch{/* Existing knowledge controls remain usable when status is unavailable. */}
    };void read();
    return ()=>{abort.abort();if(timer)clearTimeout(timer);};
  },[calendarId,revision]);
  if(!status?.enabled)return null;
  return <p role="status" className="my-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-900">
    {status.status==='ready'?`Semantic knowledge ready · ${status.ready} sources indexed.`:
      status.status==='unavailable'?'Semantic indexing is unavailable. Content generation can still use keyword retrieval.':
      `Semantic knowledge: ${status.ready} of ${status.total} sources ready${status.failed?` · ${status.failed} need indexing retry`:''}. Content generation also searches current source text while indexing completes.`}
  </p>;
}
