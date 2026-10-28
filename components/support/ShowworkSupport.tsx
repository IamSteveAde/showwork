"use client";
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {isClientView} from '@/lib/support/visibility';
import RandyAssistant from './RandyAssistant';
import WhatsAppSupport from './WhatsAppSupport';
export default function ShowworkSupport(){
 const path=usePathname()||'/';
 const [hostname,setHostname]=useState<string|null>(null);
 useEffect(()=>{setHostname(window.location.hostname);},[]);
 if(hostname===null)return null;
 return <><WhatsAppSupport/>{!isClientView(path,hostname)&&<RandyAssistant/>}</>;
}
