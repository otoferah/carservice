"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {UserPlus,ShieldCheck,Users} from "lucide-react";
type Role="admin"|"supervisor"|"usta";
type Member={id:string;full_name:string;role:Role;is_active:boolean;created_at:string};
const roleLabel:Record<Role,string>={admin:"Yönetici",supervisor:"Supervisor",usta:"Usta"};
export default function UserManager({users}:{users:Member[]}){
 const router=useRouter();const [name,setName]=useState("");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [role,setRole]=useState<Role>("usta");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function createUser(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");setError("");
  try{const res=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({full_name:name,email,password,role})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Kullanıcı oluşturulamadı.");
   setName("");setEmail("");setPassword("");setRole("usta");setMessage("Personel hesabı oluşturuldu.");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"İşlem başarısız.");}finally{setBusy(false);}
 }
 async function updateMember(member:Member,nextRole:Role,nextActive:boolean){
  setError("");setMessage("");
  try{const res=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({user_id:member.id,full_name:member.full_name,role:nextRole,is_active:nextActive})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Kullanıcı güncellenemedi.");setMessage(member.full_name+" güncellendi.");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"İşlem başarısız.");}
 }
 return <div className="user-manager"><section className="detail-panel"><h2><UserPlus size={17}/> Yeni personel hesabı</h2><form className="user-create-form" onSubmit={createUser}>
  <label className="field">Adı soyadı<input required value={name} onChange={e=>setName(e.target.value)} placeholder="Personel adı soyadı"/></label>
  <label className="field">E-posta<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="personel@ferahotomotiv.com"/></label>
  <label className="field">İlk şifre (en az 12 karakter)<input type="password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Güvenli bir şifre"/></label>
  <label className="field">Görev rolü<select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="usta">Usta</option><option value="supervisor">Supervisor</option><option value="admin">Yönetici</option></select></label>
  <button className="primary-button" disabled={busy}><UserPlus size={15}/>{busy?"Hesap oluşturuluyor...":"Personel oluştur"}</button>
 </form>{error&&<p className="form-error user-message">{error}</p>}{message&&<p className="success-message">{message}</p>}</section>
 <section className="detail-panel"><h2><Users size={17}/> Kayıtlı personel <span className="count-pill">{users.length}</span></h2><div className="user-list">{users.map(m=><UserRow key={m.id} member={m} onUpdate={updateMember}/>)}</div></section>
 <p className="privacy-note"><ShieldCheck size={16}/> Personel hesapları yalnızca yönetici tarafından oluşturulabilir ve yönetilebilir.</p>
 </div>;
}
function UserRow({member,onUpdate}:{member:Member;onUpdate:(member:Member,role:Role,active:boolean)=>void}){
 const [role,setRole]=useState<Role>(member.role);const [active,setActive]=useState(member.is_active);
 return <div className="user-row"><div className="user-row-avatar">{member.full_name.slice(0,1).toUpperCase()}</div><div className="user-row-info"><b>{member.full_name}</b><small>{roleLabel[member.role]} · {member.is_active?"Aktif":"Erişimi kapalı"}</small></div><select value={role} onChange={e=>setRole(e.target.value as Role)} aria-label={member.full_name+" rolü"}><option value="usta">Usta</option><option value="supervisor">Supervisor</option><option value="admin">Yönetici</option></select><label className="active-toggle"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/> Aktif</label><button className="outline-button" type="button" onClick={()=>onUpdate(member,role,active)}>Kaydet</button></div>;
}
