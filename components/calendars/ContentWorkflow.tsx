'use client';
import { Check, FilePenLine, Users, ShieldCheck, Send, Radio, LockKeyhole } from 'lucide-react';
import { calendarWorkflow, type WorkflowPost } from '@/lib/calendarWorkflow';
const steps = [
  {label:'Create',icon:FilePenLine,tab:'content'},
  {label:'Internal review',icon:ShieldCheck,tab:'internal'},
  {label:'Client review',icon:Users,tab:'client'},
  {label:'Publish',icon:Send,tab:'publishing'},
  {label:'Live',icon:Radio,tab:'publishing'},
] as const;
export default function ContentWorkflow({post,onNavigate,dark=false}:{post:WorkflowPost;onNavigate:(tab:'content'|'internal'|'client'|'publishing')=>void;dark?:boolean}) {
 const workflow=calendarWorkflow(post);
 return <section aria-label="Content delivery progress" className={`relative overflow-hidden rounded-2xl border p-4 sm:rounded-3xl sm:p-6 ${dark?'border-blue-900 bg-slate-900 text-white':'border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900'}`}>
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-blue-500">Content journey</p><h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-2xl">{workflow.label}</h3><p className={`mt-1 max-w-xl text-xs leading-5 sm:text-sm ${dark?'text-slate-300':'text-slate-500'}`}>{workflow.detail}</p></div>
   <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold ${dark?'bg-slate-800 text-slate-300':'bg-white text-slate-600 ring-1 ring-slate-100'}`}><LockKeyhole size={12}/>{post.internalReviewStatus==='APPROVED'?'Ready for client access':'Team only'}</span>
  </div>
  <ol className="mt-5 grid grid-cols-5 gap-1 sm:gap-3">
   {steps.map((step,index)=>{const complete=index<workflow.stage||workflow.stage===4;const current=index===workflow.stage;const Icon=complete?Check:step.icon;return <li key={step.label} aria-current={current?'step':undefined}>
    <button type="button" onClick={()=>onNavigate(step.tab)} className={`group flex w-full flex-col items-start gap-2 rounded-xl px-0.5 py-1.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 sm:p-3 ${current?(dark?'bg-blue-950':'bg-white shadow-sm ring-1 ring-blue-100'):'hover:bg-blue-500/5'}`} aria-label={`${step.label}: ${complete?'complete':current?'current stage':'upcoming'}`}>
     <span className={`flex h-8 w-8 items-center justify-center rounded-full sm:h-10 sm:w-10 ${complete?'bg-emerald-500 text-white':current?'bg-blue-600 text-white shadow-sm':dark?'bg-slate-800 text-slate-500':'bg-slate-100 text-slate-400'}`}><Icon size={16}/></span>
     <span className={`text-[10px] font-semibold leading-4 [overflow-wrap:normal] sm:text-xs ${current?'text-blue-500':complete?'text-emerald-600':'text-slate-400'}`}>{step.label}</span>
     <span className={`hidden h-1 w-full rounded-full sm:block ${complete?'bg-emerald-400':current?'bg-blue-500':'bg-slate-200/50'}`}/>
    </button>
   </li>})}
  </ol>
 </section>;
}
