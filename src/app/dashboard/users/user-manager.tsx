"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {UserPlus,ShieldCheck,Users,Save,Trash2} from "lucide-react";
type Role="admin"|"supervisor"|"usta";
type Member={id:string;full_name:string;username:string|null;role:Role;is_active:boolean;created_at:string};
const roleLabel:Record<Role,string>={admin:"Yönetici",supervisor:"Supervisor",usta:"Usta"};
async function manageStaff(payload:Record<string,unknown>){
 const supabase=createClient();
 const {data,error}=await supabase.functions.invoke("manage-staff",{body:payload});
 if(error){
  let message=error.message;
  try{const detail=await (error as {context?:Response}).context?.json();if(detail?.error)message=detail.error;}catch{/* keep SDK message */}
  throw new Error(message);
 }
 if(data?.error)throw new Error(data.error);
 return data;
}
export default function UserManager({users,currentUserId,actorRole}:{users:Member[];currentUserId:string;actorRole:Role}){
 const router=useRouter();const canManageAccounts=actorRole==="admin";const [name,setName]=useState("");const [username,setUsername]=useState("");const [password,setPassword]=useState("");const [role,setRole]=useState<Role>("usta");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function createUser(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");setError("");
  try{await manageStaff({action:"create",full_name:name,username,password,role});
   setName("");setUsername("");setPassword("");setRole("usta");setMessage("Personel hesabı oluşturuldu. Kullanıcı adı ve şifreyi personele güvenli şekilde iletin.");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"İşlem başarısız.");}finally{setBusy(false);}
 }
 async function deleteMember(member:Member){
  if(!window.confirm(member.full_name+" personel hesabı kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?"))return;
  setBusy(true);setError("");setMessage("");
  try{await manageStaff({action:"delete",user_id:member.id});setMessage(member.full_name+" hesabı kalıcı olarak silindi.");router.refresh();}
  catch(err){setError(err instanceof Error?err.message:"Personel silinemedi.");}finally{setBusy(false);}
 }
 async function updateMember(member:Member,nextRole:Role,nextActive:boolean,nextUsername:string,nextPassword:string){
  setError("");setMessage("");
  try{await manageStaff({action:"update",user_id:member.id,full_name:member.full_name,username:nextUsername,password:nextPassword,role:nextRole,is_active:nextActive});setMessage(member.full_name+" bilgileri güncellendi.");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"İşlem başarısız.");}
 }
 return <div className="user-manager">{canManageAccounts&&<section className="detail-panel"><h2><UserPlus size={17}/> Yeni personel hesabı</h2><form className="user-create-form" onSubmit={createUser}>
  <label className="field">Adı soyadı<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Personel adı soyadı"/></label>
  <label className="field">Kullanıcı adı<input required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} placeholder="ornek.kullanici" autoCapitalize="none" autoComplete="off"/></label>
  <label className="field">İlk şifre (en az 12 karakter)<input type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Merkez yöneticinin belirlediği şifre" autoComplete="new-password"/></label>
  <label className="field">Görev rolü<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="usta">Usta</option><option value="supervisor">Supervisor</option><option value="admin">Yönetici (tam yetki)</option></select></label>
  <button className="primary-button" disabled={busy}><UserPlus size={15}/>{busy?"Hesap oluşturuluyor...":"Personel oluştur"}</button>
 </form><p className="user-form-hint">Personel e-posta adresi gerekmez. Girişte yalnızca burada belirlenen kullanıcı adı ve şifre kullanılır.</p>{error&&<p className="form-error user-message">{error}</p>}{message&&<p className="success-message">{message}</p>}</section>}
 <section className="detail-panel"><h2><Users size={17}/> Kayıtlı personel <span className="count-pill">{users.length}</span></h2><div className="user-list">{users.map(m=><UserRow key={m.id} member={m} currentUserId={currentUserId} canManageAccounts={canManageAccounts} onUpdate={updateMember} onDelete={deleteMember}/>)}</div></section>
 <p className="privacy-note"><ShieldCheck size={16}/> Personel hesapları ve yönetici yetkileri, aktif yönetici hesapları tarafından yönetilir.</p>
 </div>;
}
function UserRow({member,currentUserId,canManageAccounts,onUpdate,onDelete}:{member:Member;currentUserId:string;canManageAccounts:boolean;onUpdate:(member:Member,role:Role,active:boolean,username:string,password:string)=>void;onDelete:(member:Member)=>void}){
 const [role,setRole]=useState<Role>(member.role);const [active,setActive]=useState(member.is_active);const [username,setUsername]=useState(member.username||"");const [password,setPassword]=useState("");const [editing,setEditing]=useState(false);
 return <div className="user-row user-row-editable">
  <div className="user-row-avatar">{member.full_name.slice(0,1).toUpperCase()}</div>
  <div className="user-row-info"><b>{member.full_name}</b><small>{member.username?"@"+member.username+" · ":"Kullanıcı adı atanmadı · "}{roleLabel[member.role]} · {member.is_active?"Aktif":"Erişimi kapalı"}</small></div>
  {member.id===currentUserId?<span className="muted small-copy">Bu oturumdaki hesabınız</span>:<div className="user-row-actions">{canManageAccounts&&<button className="outline-button" type="button" onClick={()=>setEditing(!editing)}>{editing?"Kapat":"Hesap bilgilerini düzenle"}</button>}{member.username!==null&&<button className="outline-button danger-button" type="button" onClick={()=>onDelete(member)}><Trash2 size={14}/> Kalıcı sil</button>}</div>}
  {canManageAccounts&&<div className={"user-row-controls"+(editing?" is-open":"")}>
   <label className="field">Kullanıcı adı<input value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" placeholder="kullanici.adi"/></label>
   <label className="field">Yeni şifre <span className="muted small-copy">(Değiştirmeyeceksen boş bırak)</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={password?12:undefined} placeholder="En az 12 karakter" autoComplete="new-password"/></label>
   <label className="field">Görev rolü<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="usta">Usta</option><option value="supervisor">Supervisor</option><option value="admin">Yönetici (tam yetki)</option></select></label>
   <label className="active-toggle"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Aktif</label>
   <button className="primary-button" type="button" onClick={()=>{onUpdate(member,role,active,username,password);setPassword("");}}><Save size={14}/> Değişiklikleri kaydet</button>
  </div>}
 </div>;
}
