"use client";
import {useState} from "react";
import {MessageCircle} from "lucide-react";

declare global { interface Window { FerahDesktop?: { openWhatsApp: () => Promise<{opened:boolean}>; openWhatsAppChat: (phone:string,message?:string) => Promise<{opened:boolean}>; savePdf: (customerName?:string,plate?:string,html?:string) => Promise<{canceled:boolean;filePath?:string}>; revealFile: (filePath:string) => Promise<{opened:boolean}>; } } }

export default function WhatsAppLauncher(){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const open=async()=>{
    setBusy(true);setError("");
    try{
      if(!window.FerahDesktop?.openWhatsApp){
        window.open("https://web.whatsapp.com/","_blank","noopener,noreferrer");
      }else{
        await window.FerahDesktop.openWhatsApp();
      }
    }catch(e){
      setError(e instanceof Error?e.message:"WhatsApp Desktop açılamadı. Bilgisayarda kurulu olduğundan emin olun.");
    }finally{setBusy(false);}
  };
  return <div>
    <button type="button" className="side-link" onClick={open} disabled={busy} style={{width:"100%",border:0,background:"transparent",textAlign:"left",cursor:"pointer"}}>
      <MessageCircle size={18}/> {busy?"WhatsApp açılıyor…":"WhatsApp"}
    </button>
    {error&&<small style={{display:"block",color:"#e6a15b",padding:"0 12px 8px"}}>{error}</small>}
  </div>;
}
