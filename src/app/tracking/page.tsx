"use client";
import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
import {ArrowLeft,CarFront,CheckCircle2,Clock3,Search,ShieldCheck,History} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {statusLabels,type ServiceStatus} from "@/lib/types";
type TrackingResult={plate:string;brand:string;model:string;status:ServiceStatus;quote_date:string;updated_at:string;latest_note:string|null;latest_note_at:string|null};
type HistoryItem={note:string|null;note_status:ServiceStatus|null;note_created_at:string|null};
const isToken=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export default function TrackingPage(){
 const [query,setQuery]=useState("");const [result,setResult]=useState<TrackingResult|null>(null);
 const [history,setHistory]=useState<HistoryItem[]>([]);const [imageUrl,setImageUrl]=useState<string|null>(null);const [resolvedQuery,setResolvedQuery]=useState("");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");

 async function lookup(value:string){
  setBusy(true);setMessage("");setResult(null);setHistory([]);setImageUrl(null);setResolvedQuery("");
  try{
   const v=value.trim();if(!v)throw new Error("QR takip kodunu veya plakanızı girin.");
   const token=isToken(v);const params={p_token:token?v:null,p_plate:token?null:v};const supabase=createClient();
   const {data,error}=await supabase.rpc("get_public_vehicle_tracking",params);
   if(error)throw error;const row=Array.isArray(data)?data[0]:null;
   if(!row)throw new Error("Bu plaka veya takip kodu için servis kaydı bulunamadı.");
   setResult(row as TrackingResult);
   const imageParams=new URLSearchParams(token?{token:v}:{plate:v});
   const imageResponse=await fetch("/api/public/tracking-image?"+imageParams.toString());
   if(imageResponse.ok){const imageData=await imageResponse.json();setImageUrl(imageData.imageUrl||null);}
   const {data:historyRows}=await supabase.rpc("get_public_vehicle_tracking_history",params);
   setHistory(Array.isArray(historyRows)?historyRows.filter((item:HistoryItem)=>!!item.note):[]);
   setResolvedQuery(v);
  }catch(err){setMessage(err instanceof Error?err.message:"Sorgulama yapılamadı.");}
  finally{setBusy(false);}
 }
 async function search(event:FormEvent<HTMLFormElement>){event.preventDefault();await lookup(query);}
 useEffect(()=>{
  const token=new URLSearchParams(window.location.search).get("token");
  if(token){setQuery(token);void lookup(token);}
 },[]);
 useEffect(()=>{
  if(!resolvedQuery)return;
  const timer=window.setInterval(async()=>{
   const token=isToken(resolvedQuery);const params={p_token:token?resolvedQuery:null,p_plate:token?null:resolvedQuery};
   const supabase=createClient();
   const {data,error}=await supabase.rpc("get_public_vehicle_tracking",params);
   const row=Array.isArray(data)?data[0]:null;
   if(!error&&row)setResult(row as TrackingResult);
   const imageParams=new URLSearchParams(token?{token:resolvedQuery}:{plate:resolvedQuery});
   const imageResponse=await fetch("/api/public/tracking-image?"+imageParams.toString());
   if(imageResponse.ok){const imageData=await imageResponse.json();setImageUrl(imageData.imageUrl||null);}
   const {data:historyRows}=await supabase.rpc("get_public_vehicle_tracking_history",params);
   if(Array.isArray(historyRows))setHistory(historyRows.filter((item:HistoryItem)=>!!item.note));
  },30000);
  return()=>window.clearInterval(timer);
 },[resolvedQuery]);
 const stages:ServiceStatus[]=["waiting","repairing","testing","ready","delivered"];
 const progress=result?Math.max(1,(stages.indexOf(result.status)+1)/stages.length*100):0;
 return <main className="tracking-page">
  <header className="tracking-header"><Link href="/login" className="back-link"><ArrowLeft size={17}/> Personel girişi</Link><Link href="/" className="side-brand tracking-brand"><img className="side-brand-logo" src="/assets/ferah-logo.jpg" alt="Ferah Otomotiv"/></Link></header>
  <section className="tracking-content"><div className="tracking-symbol"><CarFront size={28}/></div><p className="eyebrow">MÜŞTERİ BİLGİLENDİRME</p>
   <h1>Aracınızın servis<br/><span>sürecini takip edin.</span></h1>
   <p className="muted">Servis formunuzdaki QR kodu okutun veya araç plakanızı girerek güncel servis aşamasını görüntüleyin.</p>
   <form className="tracking-form" onSubmit={search}><label htmlFor="tracking-query">QR takip kodu veya plaka</label><div className="tracking-input"><Search size={19}/><input id="tracking-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Örn. 33 ABC 33" autoCapitalize="characters"/><button disabled={busy}>{busy?"Aranıyor...":"Sorgula"}</button></div></form>
   {message&&<p className="form-error tracking-error">{message}</p>}
   {result&&<article className="tracking-result">{<div className={"tracking-vehicle-photo"+(!imageUrl?" tracking-photo-empty":"")}>{imageUrl?<img src={imageUrl} alt={result.plate+" araç fotoğrafı"}/>:<span>Araç görseli servis kaydına eklenmemiş.</span>}</div>}<div className="result-top"><div><span className="result-label">ARAÇ</span><h2>{result.plate}</h2><p>{result.brand} {result.model}</p></div><span className={"status-tag status-"+result.status}>{statusLabels[result.status]}</span></div>
    <div className="progress-track"><span style={{width:progress+"%"}}/></div>
    <div className="result-note"><div className="note-icon"><Clock3 size={17}/></div><div><b>Son servis bilgilendirmesi</b><p>{result.latest_note||statusLabels[result.status]}</p><small>{new Date(result.latest_note_at||result.updated_at).toLocaleString("tr-TR")}</small></div></div>
    {history.length>0&&<section className="customer-history"><h3><History size={16}/> Servis geçmişi</h3><div className="customer-history-list">{history.map((item,index)=><div className="customer-history-item" key={index}><span className="customer-history-dot"/><div><div className="customer-history-top"><b>{item.note_status?statusLabels[item.note_status]: "Servis gelişmesi"}</b><small>{item.note_created_at?new Date(item.note_created_at).toLocaleString("tr-TR"):""}</small></div><p>{item.note}</p></div></div>)}</div></section>}
    <div className="privacy-note"><ShieldCheck size={16}/> Bu ekranda yalnızca aracınızın servis durumu ve gelişme notları paylaşılır. Bilgiler 30 saniyede bir yenilenir.</div>
   </article>}
   <div className="tracking-foot"><CheckCircle2 size={16}/> Ferah Otomotiv tarafından güvenli servis takibi</div>
  </section>
 </main>;
}
