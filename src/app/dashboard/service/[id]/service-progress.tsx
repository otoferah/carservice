"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {Activity,Clock3,Send} from "lucide-react";
import {statusLabels,type ServiceStatus} from "@/lib/types";
type Update={id:string;status:ServiceStatus;note:string;created_at:string;profiles:{full_name:string;role:string}|null};
const stages:ServiceStatus[]=["waiting","repairing","testing","ready","delivered"];
export default function ServiceProgress({recordId,currentStatus,updates,canUpdate,canDeliver,viewerName}:{recordId:string;currentStatus:ServiceStatus;updates:Update[];canUpdate:boolean;canDeliver:boolean;viewerName:string}){
 const router=useRouter();const [status,setStatus]=useState<ServiceStatus>(currentStatus==="delivered"?"delivered":currentStatus);
 const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{const response=await fetch("/api/services/"+recordId+"/updates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,note})});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Gelişme kaydedilemedi.");
   setNote("");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Kayıt başarısız.");}
  finally{setBusy(false);}
 }
 return <section className="detail-panel progress-panel"><h2><Activity size={17}/> Servis gelişmeleri</h2>
  {canUpdate?<form className="update-form" onSubmit={submit}><label className="field">Yeni servis aşaması<select value={status} onChange={e=>setStatus(e.target.value as ServiceStatus)}>{stages.filter(s=>s!=="delivered"||canDeliver).map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}</select></label><label className="field">Gelişme notu<textarea required value={note} onChange={e=>setNote(e.target.value)} placeholder="Yapılan işlemi ve tespitleri açıklayın..." rows={3}/></label>{error&&<p className="form-error">{error}</p>}<button className="primary-button" disabled={busy||!note.trim()}><Send size={15}/>{busy?"Kaydediliyor...":"Gelişmeyi kaydet"}</button></form>:<p className="muted small-copy">Bu servis kaydına atanmış değilsiniz. Not eklemek için yöneticiyle görüşün.</p>}
  <div className="timeline">{updates.map(item=><article className="timeline-item" key={item.id}><span className="timeline-dot"/><div><div className="timeline-top"><b>{statusLabels[item.status]||item.status}</b><small><Clock3 size={12}/>{new Date(item.created_at).toLocaleString("tr-TR")}</small></div><p>{item.note}</p><small className="timeline-author">{item.profiles?.full_name||"Ferah Otomotiv"} tarafından kaydedildi</small></div></article>)}</div>
 </section>;
}
