"use client";
import {useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ShieldCheck,UserRound,Trash2} from "lucide-react";
import {createClient} from "@/lib/supabase/client";

const SAVED_USERS_KEY="ferah-login-usernames";
export default function LoginPage(){
 const router=useRouter();
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [savedUsers,setSavedUsers]=useState<string[]>([]);
 const [rememberUser,setRememberUser]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{
  try{
   const raw=localStorage.getItem(SAVED_USERS_KEY);
   if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))setSavedUsers(parsed.filter((v):v is string=>typeof v==="string").slice(0,5));}
  }catch{localStorage.removeItem(SAVED_USERS_KEY);}
 },[]);

 function persistUsers(next:string[]){
  setSavedUsers(next);
  try{localStorage.setItem(SAVED_USERS_KEY,JSON.stringify(next));}catch{}
 }
 function removeSavedUser(value:string){
  const next=savedUsers.filter(item=>item!==value);
  persistUsers(next);
  if(username===value)setUsername("");
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{
   const loginId=username.trim().toLowerCase();
   const email=loginId.includes("@")?loginId:loginId+"@staff.ferahotomotiv.com";
   const supabase=createClient();
   const {error:authError}=await supabase.auth.signInWithPassword({email,password});
   if(authError)throw authError;
   if(rememberUser){
    const next=[loginId,...savedUsers.filter(item=>item!==loginId)].slice(0,5);
    persistUsers(next);
   }
   setPassword("");
   router.replace("/dashboard");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Giriş yapılamadı.");}
  finally{setBusy(false);}
 }
 return <main className="login-page">
  <div className="login-card"><div className="login-brand-logo"><img src="/assets/FERAH%20OTOMOT%C4%B0V%20Metalik%20Logo.png" alt="Ferah Otomotiv"/></div>
   <p className="eyebrow">FERAH OTOMOTİV</p><h1>Servis yönetim<br/><span>merkezi.</span></h1>
   <p className="muted">Devam etmek için personel hesabınızla giriş yapın.</p>
   {savedUsers.length>0&&<section className="saved-login-users" aria-label="Kayıtlı kullanıcılar">
    <div className="saved-login-heading"><span>Kayıtlı kullanıcılar</span><small>Hesap seçerek kullanıcı adını doldurun</small></div>
    <div className="saved-login-list">{savedUsers.map(value=><div className={"saved-login-user"+(username===value?" selected":"")} key={value}>
     <button type="button" className="saved-login-select" onClick={()=>{setUsername(value);setPassword("");setError("");}}><UserRound size={16}/><span>{value}</span></button>
     <button type="button" className="saved-login-remove" aria-label={value+" hesabını listeden kaldır"} title="Kayıtlı kullanıcıyı kaldır" onClick={()=>removeSavedUser(value)}><Trash2 size={14}/></button>
    </div>)}</div>
   </section>}
   <form onSubmit={submit} className="login-form">
    <label>Kullanıcı adı<input type="text" name="username" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="kullanici.adi" autoCapitalize="none"/></label>
    <label>Şifre<input type="password" name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"/></label>
    <label className="remember-login-option"><input type="checkbox" checked={rememberUser} onChange={e=>setRememberUser(e.target.checked)}/> Bu cihazda kullanıcı adımı hatırla</label>
    {error&&<p className="form-error">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy?"Giriş yapılıyor...":"Güvenli giriş yap"}</button>
   </form>
   <div className="secure-note"><ShieldCheck size={16}/> Şifreler uygulamada saklanmaz · Güvenli oturum</div>
   <a className="text-link" href="/tracking">Müşteri araç takip paneli <span>→</span></a>
  </div>
  <div className="login-aside"><div className="aside-glow"/>
   <p className="eyebrow">ATÖLYE OPERASYONLARI</p><h2>Her servis kaydı,<br/>tek bir merkezde.</h2>
   <p>Tekliften teslimata kadar tüm süreci şeffaf, izlenebilir ve kontrollü yönetin.</p>
   <div className="aside-foot"><span className="live-dot"/> Servis operasyon sistemi</div>
  </div>
 </main>;
}
