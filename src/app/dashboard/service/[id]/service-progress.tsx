"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {useRouter} from "next/navigation";
import {Activity,Clock3,Send,Save,Pencil,X} from "lucide-react";
import {statusLabels,type ServiceStatus} from "@/lib/types";
type Update={id:string;status:ServiceStatus;note:string;created_at:string;edited_at?:string|null;profiles:{full_name:string;role:string}|null};
const stages:ServiceStatus[]=["waiting","repairing","testing","ready"];
export default function ServiceProgress({recordId,currentStatus,updates,canUpdate,canDeliver,canEditHistory,viewerName}:{recordId:string;currentStatus:ServiceStatus;updates:Update[];canUpdate:boolean;canDeliver:boolean;canEditHistory:boolean;viewerName:string}){
 const router=useRouter();const [status,setStatus]=useState<ServiceStatus>(currentStatus);const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const [editingId,setEditingId]=useState<string|null>(null);const [editNote,setEditNote]=useState("");const [editBusy,setEditBusy]=useState(false);const [editError,setEditError]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{const response=await fetch("/api/services/"+recordId+"/updates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,note})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Gelişme kaydedilemedi.");setNote("");router.refresh();}
  catch(err){setError(err instanceof Error?err.message:"Kayıt başarısız.");}finally{setBusy(false);}
 }
 function beginEdit(item:Update){setEditingId(item.id);setEditNote(item.note);setEditError("");}
 function cancelEdit(){setEditingId(null);setEditNote("");setEditError("");}
 async function saveEdit(itemId:string){
  if(!editNote.trim()){setEditError("Not boş bırakılamaz.");return;}setEditBusy(true);setEditError("");
  try{const response=await fetch("/api/services/"+recordId+"/updates/"+itemId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({note:editNote})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Not güncellenemedi.");cancelEdit();router.refresh();}
  catch(err){setEditError(err instanceof Error?err.message:"Not güncellenemedi.");}finally{setEditBusy(false);}
 }
 return <section className="detail-panel progress-panel"><h2><Activity size={17}/> Servis gelişmeleri</h2>
  {canUpdate?<form className="update-form" onSubmit={submit}>
   <label className="field">Yeni servis aşaması<select value={status} onChange={e=>setStatus(e.target.value as ServiceStatus)}>{stages.map(s=><option key={s} value={s}>{statusLabels[s]}</option>)}{currentStatus==="delivered"&&<option value="delivered" disabled>Teslim edildi</option>}</select></label>
   <label className="field">Gelişme notu<textarea required value={note} onChange={e=>setNote(e.target.value)} placeholder="Yapılan işlemi ve tespitleri açıklayın..." rows={3}/></label>
   {error&&<p className="form-error">{error}</p>}<button className="primary-button" disabled={busy||!note.trim()}><Send size={15}/>{busy?"Kaydediliyor...":"Gelişmeyi kaydet"}</button>
  </form>:<p className="muted small-copy">Bu servis kaydına atanmış değilsiniz. Not eklemek için yöneticiyle görüşün.</p>}
  <div className="timeline">{updates.map(item=><article className="timeline-item" key={item.id}><span className="timeline-dot"/><div>
   <div className="timeline-top"><b>{statusLabels[item.status]||item.status}</b><small><Clock3 size={12}/>{new Date(item.created_at).toLocaleString("tr-TR")}</small></div>
   {editingId===item.id?<div className="history-edit"><textarea rows={3} value={editNote} onChange={e=>setEditNote(e.target.value)} aria-label="Servis notunu düzenle"/>{editError&&<p className="form-error">{editError}</p>}<div className="history-edit-actions"><button className="primary-button" type="button" disabled={editBusy||!editNote.trim()} onClick={()=>void saveEdit(item.id)}><Save size={14}/>{editBusy?"Kaydediliyor...":"Notu kaydet"}</button><button className="outline-button" type="button" disabled={editBusy} onClick={cancelEdit}><X size={14}/> Vazgeç</button></div></div>:<p>{item.note}</p>}
   <div className="timeline-meta"><small className="timeline-author">{item.profiles?.full_name||"Ferah Otomotiv"} tarafından kaydedildi</small>{item.edited_at&&<small className="timeline-edited">Düzenlendi · {new Date(item.edited_at).toLocaleString("tr-TR")}</small>}{canEditHistory&&editingId!==item.id&&<button className="text-small-button" type="button" onClick={()=>beginEdit(item)}><Pencil size={12}/> Düzenle</button>}</div>
  </div></article>)}</div>
  {canDeliver&&currentStatus==="ready"&&<form action={"/api/services/"+recordId+"/deliver"} method="post" className="delivery-action"><button className="primary-button" type="submit">Aracı teslim et</button></form>}
 </section>;
}
