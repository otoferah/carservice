"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {Wrench,ShieldCheck} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
export default function LoginPage(){
 const router=useRouter();const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");
  try{const supabase=createClient();const {error:authError}=await supabase.auth.signInWithPassword({email,password});
   if(authError)throw authError;router.replace("/dashboard");router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"Giriş yapılamadı.");}
  finally{setBusy(false);}
 }
 return <main className="login-page">
  <div className="login-card"><div className="brand-mark"><Wrench size={24}/></div>
   <p className="eyebrow">FERAH OTOMOTİV</p><h1>Servis yönetim<br/><span>merkezi.</span></h1>
   <p className="muted">Devam etmek için personel hesabınızla giriş yapın.</p>
   <form onSubmit={submit} className="login-form">
    <label>E-posta adresi<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="personel@ferahotomotiv.com"/></label>
    <label>Şifre<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••"/></label>
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
