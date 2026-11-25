"use client";
import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {Plus,Trash2,Save,ImagePlus,X} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
type Part={id?:string;part_name:string;quantity:number;unit_price:number};
type Member={id:string;full_name:string;role:string};
type ExistingImage={id:string;storage_path:string;caption:string|null;google_drive_file_id:string|null;url:string};
type RecordData={id:string;quote_date:string;quote_provider:string|null;customers:{full_name:string;phone:string|null;email:string|null}|null;vehicles:{plate:string;brand:string;model:string}|null;service_parts:Part[];service_team:{profile_id:string}[]};
export default function EditServiceForm({record,members,images}:{record:RecordData;members:Member[];images:ExistingImage[]}){
 const [customer,setCustomer]=useState(record.customers?.full_name||"");const [phone,setPhone]=useState(record.customers?.phone||"");const [email,setEmail]=useState(record.customers?.email||"");
 const [plate,setPlate]=useState(record.vehicles?.plate||"");const [brand,setBrand]=useState(record.vehicles?.brand||"");const [model,setModel]=useState(record.vehicles?.model||"");
 const [quoteDate,setQuoteDate]=useState(record.quote_date);const [provider,setProvider]=useState(record.quote_provider||"");
 const [parts,setParts]=useState<Part[]>(record.service_parts.length?record.service_parts.map(p=>({...p})): [{part_name:"",quantity:1,unit_price:0}]);
 const [team,setTeam]=useState<string[]>(record.service_team.map(m=>m.profile_id));
 const [currentImages,setCurrentImages]=useState(images);const [newFiles,setNewFiles]=useState<File[]>([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [saved,setSaved]=useState(false);const [notice,setNotice]=useState("");
 const total=useMemo(()=>parts.reduce((sum,p)=>sum+(Number(p.quantity)||0)*(Number(p.unit_price)||0),0),[parts]);
 function patchPart(index:number,key:keyof Part,value:string){setParts(old=>old.map((p,i)=>i===index?{...p,[key]:key==="part_name"?value:Number(value)}:p));}
 function toggleMember(id:string){setTeam(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
 async function removeImage(image:ExistingImage){
  if(!window.confirm("Bu araç görseli tekliften ve servis kaydından kaldırılsın mı?"))return;
  setError("");setNotice("");
  try{
   const response=await fetch("/api/services/"+record.id+"/images/"+image.id,{method:"DELETE"});
   const data=await response.json();if(!response.ok)throw new Error(data.error||"Görsel kaldırılamadı.");
   setCurrentImages(old=>old.filter(item=>item.id!==image.id));
   setNotice("Araç görseli kaldırıldı.");
  }catch(err){setError(err instanceof Error?err.message:"Görsel kaldırılamadı.");}
 }
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setNotice("");setSaved(false);
  try{
   const res=await fetch("/api/services/"+record.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_name:customer,phone,email,plate,brand,model,quote_date:quoteDate,quote_provider:provider,parts:parts.filter(p=>p.part_name.trim()).map((p,i)=>({part_name:p.part_name,quantity:p.quantity,unit_price:p.unit_price,sort_order:i})),team})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Kayıt güncellenemedi.");
   const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();const warnings:string[]=[];const uploaded:ExistingImage[]=[];
   for(const file of newFiles){
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const path=record.id+"/"+crypto.randomUUID()+"-"+safeName;
    const {error:uploadError}=await supabase.storage.from("service-media").upload(path,file,{contentType:file.type,upsert:false});
    if(uploadError){warnings.push(file.name+": "+uploadError.message);continue;}
    const {data:row,error:insertError}=await supabase.from("service_images").insert({service_record_id:record.id,storage_path:path,caption:file.name,uploaded_by:user?.id}).select("id,storage_path,caption,google_drive_file_id").single();
    if(insertError){await supabase.storage.from("service-media").remove([path]);warnings.push(file.name+": "+insertError.message);continue;}
    try{
     const mirror=await fetch("/api/google-drive/mirror-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({serviceRecordId:record.id,storagePath:path})});
     if(!mirror.ok){const result=await mirror.json().catch(()=>({}));warnings.push(file.name+": Supabase'e kaydedildi ancak Google Drive aktarımı tamamlanamadı ("+(result.error||"aktarım hatası")+")");}
    }catch{warnings.push(file.name+": Supabase'e kaydedildi ancak Google Drive aktarımına ulaşılamadı.");}
    const {data:signed}=await supabase.storage.from("service-media").createSignedUrl(path,3600);
    if(signed?.signedUrl)uploaded.push({...row,url:signed.signedUrl});
   }
   setCurrentImages(old=>[...old,...uploaded]);setNewFiles([]);
   const picker=document.getElementById("edit-service-images") as HTMLInputElement|null;if(picker)picker.value="";
   setSaved(true);setNotice(warnings.length?"Kayıt güncellendi. "+warnings.join(" · "):"Kayıt ve görsel değişiklikleri başarıyla kaydedildi.");
  }catch(err){setError(err instanceof Error?err.message:"Kayıt güncellenemedi.");}finally{setBusy(false);}
 }
 return <form className="service-form" onSubmit={submit}>
  <div className="form-section"><h2>01 · Müşteri ve araç bilgileri</h2><div className="field-grid">
   <label className="field full">Araç sahibi adı ve soyadı<input required value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label className="field">Telefon<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="field">E-posta<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Plaka<input required value={plate} onChange={e=>setPlate(e.target.value.toLocaleUpperCase("tr-TR"))}/></label><label className="field">Marka<input required value={brand} onChange={e=>setBrand(e.target.value)}/></label><label className="field">Model<input required value={model} onChange={e=>setModel(e.target.value)}/></label><label className="field">Teklif tarihi<input type="date" required value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></label><label className="field full">Teklifi veren<input value={provider} onChange={e=>setProvider(e.target.value)}/></label>
  </div></div>
  <div className="form-section"><div className="section-title-row"><h2>02 · Parça ve işlemler</h2><button type="button" className="outline-button" onClick={()=>setParts(old=>[...old,{part_name:"",quantity:1,unit_price:0}])}><Plus size={15}/> Parça ekle</button></div>
   {parts.map((p,i)=><div className="part-row" key={p.id||i}><label className="field">Parça / işlem<input value={p.part_name} onChange={e=>patchPart(i,"part_name",e.target.value)}/></label><label className="field quantity">Adet<input type="number" min="0.01" step="0.01" value={p.quantity} onChange={e=>patchPart(i,"quantity",e.target.value)}/></label><label className="field price">Birim fiyat (₺)<input type="number" min="0" step="0.01" value={p.unit_price} onChange={e=>patchPart(i,"unit_price",e.target.value)}/></label><div className="part-total">{(p.quantity*p.unit_price).toLocaleString("tr-TR")} ₺</div><button type="button" className="icon-button" aria-label="Parçayı sil" onClick={()=>setParts(old=>old.filter((_,j)=>i!==j))}><Trash2 size={16}/></button></div>)}
   <div className="total-row"><span>Güncel teklif toplamı</span><strong>{total.toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</strong></div>
  </div>
  <div className="form-section"><h2>03 · Araç görselleri</h2>
   {currentImages.length?<div className="edit-image-grid">{currentImages.map(image=><div className="edit-image-card" key={image.id}><img src={image.url} alt={image.caption||"Araç görseli"}/><div><span>{image.caption||"Araç görseli"}</span><button type="button" className="outline-button danger-button" onClick={()=>void removeImage(image)}><X size={14}/> Görseli kaldır</button></div></div>)}</div>:<p className="muted small-copy">Bu servis kaydına henüz araç görseli eklenmemiş. Buradan sonradan ekleyebilirsiniz.</p>}
   <label className="field photo-picker"><span><ImagePlus size={17}/> Yeni araç görseli ekle</span><input id="edit-service-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e=>setNewFiles(Array.from(e.target.files||[]))}/><small>{newFiles.length?newFiles.map(file=>file.name).join(", "):"JPEG, PNG veya WebP · Birden fazla görsel seçebilirsiniz."}</small></label>
  </div>
  <div className="form-section"><h2>04 · İlgilenen ekip</h2><div className="team-grid">{members.map(m=><label key={m.id} className="team-option"><input type="checkbox" checked={team.includes(m.id)} onChange={()=>toggleMember(m.id)}/><span><b>{m.full_name}</b><small>{m.role==="admin"?"Yönetici":m.role==="supervisor"?"Supervisor":"Usta"}</small></span></label>)}</div></div>
  {error&&<p className="form-error">{error}</p>}{notice&&<p className={saved?"success-message":"muted"}>{notice}</p>}
  <div className="edit-actions"><button type="submit" className="primary-button" disabled={busy}><Save size={15}/>{busy?"Kaydediliyor...":"Değişiklikleri kaydet"}</button><Link className="outline-button" href={"/dashboard/service/"+record.id}>Vazgeç</Link></div>
 </form>;
}
