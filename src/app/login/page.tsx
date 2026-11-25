"use client";
import {useEffect,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {ShieldCheck,UserRound,Trash2} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
export default function LoginPage(){
 const router=useRouter();const [username,setUsername]=useState("");const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [remember,setRemember]=useState(true);
 const [savedUsers,setSavedUsers]=useState<string[]>([]);const [resuming,setResuming]=useState("");
 useEffect(()=>{
  try{const stored=JSON.parse(localStorage.getItem("ferah-remembered-users")||"[]");if(Array.isArray(stored))setSavedUsers(stored.filter((v):v is string=>typeof v==="string").slice(0,8));}catch{setSavedUsers([]);}
 },[]);
 function saveRememberedUser(value:string){
  const normalized=value.trim().toLowerCase();if(!normalized)return;
  setSavedUsers(current=>{const next=[normalized,...current.filter(x=>x!==normalized)].slice(0,8);localStorage.setItem("ferah-remembered-users",JSON.stringify(next));return next;});
 }
 function forgetRememberedUser(value:string){
  setSavedUsers(current=>{const next=current.filter(x=>x!==value);localStorage.setItem("ferah-remembered-users",JSON.stringify(next));return next;});
 }
 async function continueAsSavedUser(value:string){
  setResuming(value);setError("");
  try{
   const supabase=createClient();const {data:{user},error}=await supabase.auth.getUser();
   if(error||!user)throw new Error("Bu cihazda açık oturum bulunamadı. Devam etmek için şifrenizi girin.");
   const email=(user.email||"").toLowerCase();const expected=value.includes("@")?value:value+"@staff.ferahotomotiv.com";
   if(email!==expected)throw new Error("Açık oturum farklı bir kullanıcıya ait. Güvenlik için şifrenizi girerek hesap değiştirin.");
   router.replace("/dashboard");router.refresh();
  }catch(err){setUsername(value);setPassword("");setError(err instanceof Error?err.message:"Kayıtlı oturum devam ettirilemedi.");}
  finally{setResuming("");}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{const supabase=createClient();const loginId=username.trim().toLowerCase();const email=loginId.includes("@")?loginId:loginId+"@staff.ferahotomotiv.com";const {error:authError}=await supabase.auth.signInWithPassword({email,password});
   if(authError)throw authError;if(remember)saveRememberedUser(loginId);router.replace("/dashboard");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Giriş yapılamadı.");}
  finally{setBusy(false);}
 }
 return <main className="login-page">
  <div className="login-card"><div className="login-brand-logo"><img src="/assets/FERAH%20OTOMOT%C4%B0V%20Metalik%20Logo.png" alt="Ferah Otomotiv"/></div>
   <p className="eyebrow">FERAH OTOMOTİV</p><h1>Servis yönetim<br/><span>merkezi.</span></h1>
   <p className="muted">Devam etmek için personel hesabınızla giriş yapın.</p>
   <form onSubmit={submit} className="login-form">
    <label>Kullanıcı adı<input type="text" autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="kullanici.adi" autoCapitalize="none"/></label>
    <label>Şifre<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"/></label>
    <label className="remember-login-option"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Bu cihazda kullanıcı adımı hatırla</label>
    {error&&<p className="form-error">{error}</p>}
    <button className="primary-button" type="submit" disabled={busy}>{busy?"Giriş yapılıyor...":"Güvenli giriş yap"}</button>
   </form>
   <div className="secure-note"><ShieldCheck size={16}/> Yetkili personel erişimi · Güvenli oturum</div>
   <a className="text-link" href="/tracking">Müşteri araç takip paneli <span>→</span></a>
  </div>
  <div className="login-aside"><div className="aside-glow"/>
   <p className="eyebrow">ATÖLYE OPERASYONLARI</p><h2>Her servis kaydı,<br/>tek bir merkezde.</h2>
   <p>Tekliften teslimata kadar tüm süreci şeffaf, izlenebilir ve kontrollü yönetin.</p>
   <div className="aside-foot"><span className="live-dot"/> Servis operasyon sistemi</div>
  </div>
 </main>;
}
