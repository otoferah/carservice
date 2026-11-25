"use client";
import {useMemo,useRef,useState,type FormEvent,type PointerEvent} from "react";
import Link from "next/link";
import {QRCodeSVG} from "qrcode.react";
import {Plus,Trash2,Printer,CheckCircle2,PenLine,ImagePlus,RotateCcw} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {publicTrackingUrl} from "@/lib/public-tracking";
declare global { interface Window { FerahDesktop?: { savePdf: (customerName?: string) => Promise<{canceled:boolean;filePath?:string}> } } }
type Member={id:string;full_name:string;role:string};
type Part={part_name:string;quantity:number;unit_price:number};
type Saved={id:string;tracking_token:string;status:string;quote_total:number};
export default function ServiceForm({members}:{members:Member[]}){
 const [customer,setCustomer]=useState("");const [phone,setPhone]=useState("");const [email,setEmail]=useState("");
 const [tcIdentity,setTcIdentity]=useState("");const [intakeKm,setIntakeKm]=useState("");
 const [plate,setPlate]=useState("");const [brand,setBrand]=useState("");const [model,setModel]=useState("");
 const [quoteDate,setQuoteDate]=useState(new Date().toISOString().slice(0,10));const [provider,setProvider]=useState("");
 const [parts,setParts]=useState<Part[]>([{part_name:"",quantity:1,unit_price:0}]);const [team,setTeam]=useState<string[]>([]);
 const [photoFiles,setPhotoFiles]=useState<File[]>([]);const [photoUrls,setPhotoUrls]=useState<string[]>([]);
 const [signatureUrl,setSignatureUrl]=useState("");const signatureRef=useRef<HTMLCanvasElement>(null);const drawingRef=useRef(false);
 const [hasSignature,setHasSignature]=useState(false);const [uploadWarning,setUploadWarning]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [saved,setSaved]=useState<Saved|null>(null);
 const total=useMemo(()=>parts.reduce((sum,p)=>sum+(Number(p.quantity)||0)*(Number(p.unit_price)||0),0),[parts]);
 function patchPart(index:number,key:keyof Part,value:string){setParts(old=>old.map((p,i)=>i===index?{...p,[key]:key==="part_name"?value:Number(value)}:p));}
 function toggleMember(id:string){setTeam(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
 function point(e:PointerEvent<HTMLCanvasElement>){const rect=e.currentTarget.getBoundingClientRect();return{x:(e.clientX-rect.left)*e.currentTarget.width/rect.width,y:(e.clientY-rect.top)*e.currentTarget.height/rect.height};}
 function startSignature(e:PointerEvent<HTMLCanvasElement>){
  const ctx=e.currentTarget.getContext("2d");if(!ctx)return;const p=point(e);
  ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineWidth=3;ctx.lineCap="round";ctx.lineJoin="round";ctx.strokeStyle="#17201e";
  e.currentTarget.setPointerCapture(e.pointerId);drawingRef.current=true;setHasSignature(true);
 }
 function drawSignature(e:PointerEvent<HTMLCanvasElement>){
  if(!drawingRef.current)return;const ctx=e.currentTarget.getContext("2d");if(!ctx)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();
 }
 function endSignature(){drawingRef.current=false;}
 function clearSignature(){const canvas=signatureRef.current;if(!canvas)return;canvas.getContext("2d")?.clearRect(0,0,canvas.width,canvas.height);setHasSignature(false);}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setUploadWarning("");
  try{
   const response=await fetch("/api/services",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
    customer_name:customer,phone,email,tc_identity_number:tcIdentity,intake_odometer_km:intakeKm===""?null:Number(intakeKm),plate,brand,model,quote_date:quoteDate,quote_provider:provider,
    parts:parts.filter(p=>p.part_name.trim()).map((p,i)=>({...p,sort_order:i})),team
   })});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Servis kaydı oluşturulamadı.");
   setSaved(data as Saved);
   const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();
   const warnings:string[]=[];const uploadedUrls:string[]=[];
   for(const file of photoFiles){
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
    const path=data.id+"/"+crypto.randomUUID()+"-"+safeName;
    const {error:uploadError}=await supabase.storage.from("service-media").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){warnings.push(file.name+": "+uploadError.message);continue;}
    const {error:insertError}=await supabase.from("service_images").insert({service_record_id:data.id,storage_path:path,caption:file.name,uploaded_by:user?.id});
    if(insertError){warnings.push(file.name+": "+insertError.message);continue;}
    try{
     const mirrorResponse=await fetch("/api/google-drive/mirror-image",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({serviceRecordId:data.id,storagePath:path})
     });
     if(!mirrorResponse.ok){
      const mirrorResult=await mirrorResponse.json().catch(()=>({}));
      warnings.push(file.name+": Supabase'e kaydedildi ancak Google Drive kopyası oluşturulamadı ("+(mirrorResult.error||"aktarım hatası")+")");
     }
    }catch{
     warnings.push(file.name+": Supabase'e kaydedildi ancak Google Drive aktarımına ulaşılamadı.");
    }
    const {data:signed}=await supabase.storage.from("service-media").createSignedUrl(path,3600);
    if(signed?.signedUrl)uploadedUrls.push(signed.signedUrl);
   }
   setPhotoUrls(uploadedUrls);
   const canvas=signatureRef.current;
   if(hasSignature&&canvas){
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
    if(blob){
     const path=data.id+"/customer-signature-"+crypto.randomUUID()+".png";
     const {error:signatureError}=await supabase.storage.from("service-media").upload(path,blob,{contentType:"image/png",upsert:false});
     if(signatureError)warnings.push("Müşteri imzası: "+signatureError.message);
     else{
      const {error:updateError}=await supabase.from("service_records").update({customer_signature_path:path}).eq("id",data.id);
      if(updateError)warnings.push("İmza kaydı: "+updateError.message);
      else{const {data:signed}=await supabase.storage.from("service-media").createSignedUrl(path,3600);if(signed?.signedUrl)setSignatureUrl(signed.signedUrl);}
     }
    }
   }
   setUploadWarning(warnings.join(" · "));
  }catch(err){setError(err instanceof Error?err.message:"Kayıt oluşturulamadı.");}
  finally{setBusy(false);}
 }
 const qrUrl=saved?publicTrackingUrl(saved.tracking_token):"";
 return <div className="service-form-layout">
  <form className="service-form" onSubmit={submit}>
   <div className="form-section"><h2>01 · Müşteri ve araç bilgileri</h2><div className="field-grid">
    <label className="field full">Araç sahibi adı ve soyadı<input required value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Müşteri adı soyadı"/></label>
    <label className="field">Telefon<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Telefon numarası"/></label>
    <label className="field">TC kimlik numarası<input inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" value={tcIdentity} onChange={e=>setTcIdentity(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="11 haneli TC kimlik no"/><small>Yalnızca yönetici ve supervisor görüntüleyebilir.</small></label>
    <label className="field">E-posta<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-posta adresi"/></label>
    <label className="field">Plaka<input required value={plate} onChange={e=>setPlate(e.target.value.toLocaleUpperCase("tr-TR"))} placeholder="33 ABC 33"/></label>
    <label className="field">Marka<input required value={brand} onChange={e=>setBrand(e.target.value)} placeholder="Mercedes-Benz"/></label>
    <label className="field">Model<input required value={model} onChange={e=>setModel(e.target.value)} placeholder="W124 200 E"/></label>
    <label className="field">Teslim alınan kilometre (KM)<input type="number" min="0" step="1" inputMode="numeric" value={intakeKm} onChange={e=>setIntakeKm(e.target.value)} placeholder="Örn. 125000"/></label>
    <label className="field">Teklif tarihi<input type="date" required value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></label>
    <label className="field full">Teklifi veren<input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="Personel adı"/></label>
   </div></div>
   <div className="form-section"><div className="section-title-row"><h2>02 · Kullanılan parçalar</h2><button type="button" className="outline-button" onClick={()=>setParts(old=>[...old,{part_name:"",quantity:1,unit_price:0}])}><Plus size={15}/> Parça ekle</button></div>
    {parts.map((p,i)=><div className="part-row" key={i}><label className="field">Parça adı<input value={p.part_name} onChange={e=>patchPart(i,"part_name",e.target.value)} placeholder="Parça / işçilik açıklaması"/></label><label className="field quantity">Adet<input type="number" min="0.01" step="0.01" value={p.quantity} onChange={e=>patchPart(i,"quantity",e.target.value)}/></label><label className="field price">Birim fiyat (₺)<input type="number" min="0" step="0.01" value={p.unit_price} onChange={e=>patchPart(i,"unit_price",e.target.value)}/></label><div className="part-total">{(p.quantity*p.unit_price).toLocaleString("tr-TR")} ₺</div><button type="button" className="icon-button" aria-label="Parçayı sil" onClick={()=>setParts(old=>old.filter((_,j)=>i!==j))}><Trash2 size={16}/></button></div>)}
    <div className="total-row"><span>Teklif toplamı</span><strong>{total.toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</strong></div>
   </div>
   <div className="form-section"><h2>03 · Araç görselleri ve müşteri imzası</h2>
    <label className="field photo-picker"><span><ImagePlus size={17}/> Araç fotoğrafı ekle (birden fazla seçilebilir)</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setPhotoFiles(Array.from(e.target.files||[]))}/><small>{photoFiles.length?photoFiles.map(f=>f.name).join(", "):"JPEG, PNG veya WebP · Dosyalar özel servis alanında saklanır."}</small></label>
    <div className="signature-box"><div className="signature-heading"><span><PenLine size={16}/> Müşteri imzası</span><button type="button" className="outline-button" onClick={clearSignature}><RotateCcw size={14}/> Temizle</button></div><canvas ref={signatureRef} width={640} height={180} className="signature-canvas" onPointerDown={startSignature} onPointerMove={drawSignature} onPointerUp={endSignature} onPointerCancel={endSignature}/><small>Parmağınızla veya fareyle imza alanına imzalayın.</small></div>
   </div>
   <div className="form-section"><h2>04 · İlgilenen ekip</h2><p className="muted small-copy">Aracın bakım ve onarımında görev alacak personeli seçin. Ekip üyeleri servis notu girebilir.</p>
    <div className="team-grid">{members.map(m=><label key={m.id} className="team-option"><input type="checkbox" checked={team.includes(m.id)} onChange={()=>toggleMember(m.id)}/><span><b>{m.full_name}</b><small>{m.role==="admin"?"Yönetici":m.role==="supervisor"?"Supervisor":"Usta"}</small></span></label>)}</div>
   </div>
   {error&&<p className="form-error">{error}</p>}
   <button type="submit" className="primary-button submit-service" disabled={busy||!!saved}>{busy?"Kayıt ve dosyalar kaydediliyor...":saved?"Servis kaydı oluşturuldu":"Teklifi kaydet ve servise al"}</button>
  </form>
  {saved&&<aside className="saved-card"><div className="saved-success"><CheckCircle2 size={18}/> Servis kaydı oluşturuldu</div><p className="muted">Araç otomatik olarak “Araç beklemede” durumuyla servis listesine alındı.</p><div className="qr-frame"><QRCodeSVG value={qrUrl} size={180} level="H" includeMargin/></div><b className="qr-caption">{plate.toLocaleUpperCase("tr-TR")}</b><small className="muted">Bu QR kod yalnızca bu servis kaydını temsil eder.</small>
   <div className="print-quote"><h2>FERAH OTOMOTİV · SERVİS TEKLİF FORMU</h2><p><b>Araç sahibi:</b> {customer}</p><p><b>Plaka:</b> {plate.toLocaleUpperCase("tr-TR")} &nbsp; <b>Marka / Model:</b> {brand} {model}</p><p><b>Teklif tarihi:</b> {new Date(quoteDate+"T12:00:00").toLocaleDateString("tr-TR")}</p>{photoUrls[0]&&<img className="quote-photo" src={photoUrls[0]} alt="Araç görseli"/>}<table><thead><tr><th>PARÇA / İŞLEM</th><th>ADET</th><th>BİRİM FİYAT</th><th>TOPLAM</th></tr></thead><tbody>{parts.filter(p=>p.part_name.trim()).map((p,i)=><tr key={i}><td>{p.part_name}</td><td>{p.quantity}</td><td>{Number(p.unit_price).toLocaleString("tr-TR")} ₺</td><td>{(p.quantity*p.unit_price).toLocaleString("tr-TR")} ₺</td></tr>)}</tbody></table><h3>Genel toplam: {total.toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</h3><p><b>Teklifi veren:</b> {provider||"Ferah Otomotiv"}</p><p><b>Müşteri imzası:</b></p>{signatureUrl?<img className="quote-signature" src={signatureUrl} alt="Müşteri imzası"/>:<p>__________________________</p>}</div>
   {uploadWarning&&<p className="form-error upload-warning">Kayıt oluşturuldu ancak bazı dosya işlemleri tamamlanamadı: {uploadWarning}</p>}
   <button className="outline-button print-button" type="button" onClick={()=>{if(window.FerahDesktop?.savePdf){void window.FerahDesktop.savePdf();}else{window.print();}}}><Printer size={16}/> Teklif / QR yazdır · PDF kaydet</button><Link className="primary-button" href={"/dashboard/service/"+saved.id}>Servis kaydını aç</Link><Link className="text-link" href="/dashboard">Ana panele dön <span>→</span></Link></aside>}
 </div>;
}
