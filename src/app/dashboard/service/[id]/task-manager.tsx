"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ClipboardCheck,Plus,CheckCircle2,Clock3,UserRound} from "lucide-react";
type Task={id:string;title:string;description:string|null;status:"assigned"|"completed";completion_note:string|null;created_at:string;completed_at:string|null;assigned_to:string|null;assigned_to_name:string|null;assigned_by_name:string|null;profiles:{full_name:string}|null};
type Person={id:string;full_name:string};
export default function TaskManager({recordId,tasks,people,canManage}:{recordId:string;tasks:Task[];people:Person[];canManage:boolean}){
 const router=useRouter();const [title,setTitle]=useState("");const [description,setDescription]=useState("");const [assignedTo,setAssignedTo]=useState(people[0]?.id||"");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 async function createTask(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  try{const response=await fetch("/api/services/"+recordId+"/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,description,assigned_to:assignedTo})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Görev atanamadı.");setTitle("");setDescription("");setMessage("Görev personele atandı.");router.refresh();}
  catch(err){setError(err instanceof Error?err.message:"Görev atanamadı.");}finally{setBusy(false);}
 }
 return <section className="detail-panel service-task-panel">
  <div className="task-panel-heading"><h2><ClipboardCheck size={17}/> Servis görevleri <span className="count-pill">{tasks.length}</span></h2><span className="muted small-copy">{tasks.filter(t=>t.status==="completed").length}/{tasks.length} tamamlandı</span></div>
  {canManage&&<form className="service-task-form" onSubmit={createTask}>
   <label className="field">Görev başlığı<input required minLength={3} maxLength={140} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Örn. Ön fren balatalarını değiştir"/></label>
   <label className="field">Görevlendirilecek usta<select required value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}><option value="">Usta seçin</option>{people.map(p=><option key={p.id} value={p.id}>{p.full_name}</option>)}</select></label>
   <label className="field task-description-field">Görev açıklaması <span className="muted small-copy">(İsteğe bağlı)</span><textarea rows={2} maxLength={1200} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Yapılacak işlemin ayrıntıları..."/></label>
   <button className="primary-button" disabled={busy||!assignedTo||title.trim().length<3}><Plus size={15}/>{busy?"Atanıyor...":"Görevi ata"}</button>
   {!people.length&&<p className="muted small-copy">Görev atamak için önce aktif bir Usta hesabı oluşturun.</p>}
   {error&&<p className="form-error">{error}</p>}{message&&<p className="success-message">{message}</p>}
  </form>}
  <div className="service-task-list">
   {tasks.length?tasks.map(task=><TaskCard key={task.id} task={task} recordId={recordId}/>):<p className="muted small-copy">{canManage?"Henüz görev atanmamış.":"Bu servis için size atanmış bir görev bulunmuyor."}</p>}
  </div>
 </section>;
}
function TaskCard({task,recordId}:{task:Task;recordId:string}){
 const router=useRouter();const [note,setNote]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function complete(){
  setBusy(true);setError("");
  try{const response=await fetch("/api/services/"+recordId+"/tasks/"+task.id+"/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({completion_note:note})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Görev tamamlanamadı.");router.refresh();}
  catch(err){setError(err instanceof Error?err.message:"Görev tamamlanamadı.");}finally{setBusy(false);}
 }
 return <article className={"service-task-card "+(task.status==="completed"?"is-completed":"")}>
  <div className="service-task-card-top"><div><b>{task.title}</b><small><UserRound size={12}/>{task.profiles?.full_name||task.assigned_to_name||"Atanan usta"}</small></div><span className={"task-status "+(task.status==="completed"?"done":"pending")}>{task.status==="completed"?<><CheckCircle2 size={13}/> Tamamlandı</>:<><Clock3 size={13}/> Bekliyor</>}</span></div>
  {task.description&&<p className="service-task-description">{task.description}</p>}
  {task.status==="completed"?<div className="task-completion-note">{task.completion_note||"Görev tamamlandı."}<small>{task.completed_at?new Date(task.completed_at).toLocaleString("tr-TR"):""}</small></div>:<div className="task-complete-form"><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Yapılan işlemi / sonucu yazın (isteğe bağlı)"/><button type="button" className="primary-button" disabled={busy} onClick={()=>void complete()}><CheckCircle2 size={14}/>{busy?"Kaydediliyor...":"Görevi tamamla ve kaydet"}</button>{error&&<p className="form-error">{error}</p>}</div>}
 </article>;
}
