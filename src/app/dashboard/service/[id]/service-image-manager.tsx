"use client";
import {useRef,useState,type ChangeEvent} from "react";
import {createClient} from "@/lib/supabase/client";
import {ImagePlus,RefreshCw,Trash2,LoaderCircle} from "lucide-react";

type ImageItem={id:string;url:string;caption:string|null};
export default function ServiceImageManager({recordId,initialImages}:{recordId:string;initialImages:ImageItem[]}){
 const [images,setImages]=useState(initialImages);
 const [busyId,setBusyId]=useState<string|null>(null);
 const [notice,setNotice]=useState("");
 const [error,setError]=useState("");
 const [pendingReplace,setPendingReplace]=useState<string|null>(null);
 const addInput=useRef<HTMLInputElement>(null);
 const replaceInput=useRef<HTMLInputElement>(null);
 const supabase=createClient();

 async function upload(file:File,oldImage?:ImageItem){
  setBusyId(oldImage?.id||"new");setError("");setNotice("");
  try{
   if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Yalnızca JPEG, PNG veya WebP görselleri yükleyebilirsiniz.");
   if(file.size>15*1024*1024)throw new Error("Görsel boyutu 15 MB sınırını aşamaz.");
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error("Oturum süreniz dolmuş. Yeniden giriş yapın.");
   const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
   const path=recordId+"/"+crypto.randomUUID()+"-"+safeName;
   const {error:uploadError}=await supabase.storage.from("service-media").upload(path,file,{contentType:file.type,upsert:false});
   if(uploadError)throw new Error("Görsel yüklenemedi: "+uploadError.message);
   const {data:row,error:insertError}=await supabase.from("service_images").insert({
    service_record_id:recordId,storage_path:path,caption:oldImage?.caption||file.name,uploaded_by:user.id
   }).select("id,storage_path,caption").single();
   if(insertError){
    await supabase.storage.from("service-media").remove([path]);
    throw new Error("Görsel kaydı oluşturulamadı: "+insertError.message);
   }
   const mirror=await fetch("/api/google-drive/mirror-image",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({serviceRecordId:recordId,storagePath:path})
   });
   if(!mirror.ok){
    const result=await mirror.json().catch(()=>({}));
    await supabase.from("service_images").delete().eq("id",row.id);
    await supabase.storage.from("service-media").remove([path]);
    throw new Error("Yeni görsel Google Drive'a eşitlenemedi; eski görsel korunarak işlem iptal edildi. "+(result.error||"Drive aktarım hatası"));
   }
   const {data:signed,error:signedError}=await supabase.storage.from("service-media").createSignedUrl(path,3600);
   if(signedError||!signed?.signedUrl)throw new Error("Görsel kaydedildi ancak önizleme bağlantısı oluşturulamadı. Sayfayı yenileyin.");
   const newImage:ImageItem={id:row.id,url:signed.signedUrl,caption:row.caption};
   if(oldImage){
    const remove=await fetch("/api/services/"+recordId+"/images/"+oldImage.id,{method:"DELETE"});
    const result=await remove.json().catch(()=>({}));
    if(!remove.ok){
     setImages(current=>[...current,newImage]);
     throw new Error("Yeni görsel yüklendi fakat eski görsel kaldırılamadı: "+(result.error||"Silme işlemi başarısız."));
    }
    setImages(current=>[...current.filter(image=>image.id!==oldImage.id),newImage]);
    setNotice("Araç görseli yenilendi. Eski görsel Supabase ve Google Drive'dan kaldırıldı.");
    if(result.storageWarning)setNotice("Araç görseli yenilendi. Uyarı: "+result.storageWarning);
   }else{
    setImages(current=>[...current,newImage]);
    setNotice("Araç görseli eklendi ve Google Drive ile eşitlendi.");
   }
  }catch(err){setError(err instanceof Error?err.message:"Görsel işlemi tamamlanamadı.");}
  finally{setBusyId(null);setPendingReplace(null);if(addInput.current)addInput.current.value="";if(replaceInput.current)replaceInput.current.value="";}
 }
 async function remove(image:ImageItem){
  if(!window.confirm("Bu araç görselini Supabase ve Google Drive'dan kalıcı olarak silmek istiyor musunuz?"))return;
  setBusyId(image.id);setError("");setNotice("");
  try{
   const response=await fetch("/api/services/"+recordId+"/images/"+image.id,{method:"DELETE"});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Görsel silinemedi.");
   setImages(current=>current.filter(item=>item.id!==image.id));
   setNotice(result.storageWarning?"Görsel kaydı silindi. "+result.storageWarning:"Araç görseli Supabase ve Google Drive'dan silindi.");
  }catch(err){setError(err instanceof Error?err.message:"Görsel silinemedi.");}
  finally{setBusyId(null);}
 }
 function onAdd(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(file)void upload(file);}
 function onReplace(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(file&&pendingReplace){const old=images.find(image=>image.id===pendingReplace);if(old)void upload(file,old);}}
 return <section className="detail-panel service-image-manager">
  <div className="service-image-manager-heading"><h2><ImagePlus size={17}/> Araç görselleri</h2>
   <label className="outline-button service-image-add"><ImagePlus size={14}/> Görsel ekle<input ref={addInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={onAdd} disabled={!!busyId}/></label>
  </div>
  <p className="muted small-copy">Mevcut görselleri değiştirebilir, yeni görsel ekleyebilir veya silebilirsiniz. Değişiklikler Google Drive ile de eşitlenir.</p>
  {images.length>0?<div className="service-photo-grid">{images.map(image=><article className="service-image-item" key={image.id}>
    <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.caption||"Araç görseli"}/><small>{image.caption||"Araç görseli"}</small></a>
    <div className="service-image-actions">
     <button type="button" className="outline-button" disabled={!!busyId} onClick={()=>{setPendingReplace(image.id);replaceInput.current?.click();}}>{busyId===image.id?<LoaderCircle size={13} className="spin"/>:<RefreshCw size={13}/>} Değiştir</button>
     <button type="button" className="outline-button danger-button" disabled={!!busyId} onClick={()=>void remove(image)}><Trash2 size={13}/> Sil</button>
    </div>
   </article>)}</div>:<p className="empty-cell">Henüz araç görseli eklenmemiş.</p>}
  <input ref={replaceInput} className="service-image-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={onReplace}/>
  {busyId&&<p className="muted small-copy">Görsel işleniyor, lütfen bekleyin...</p>}
  {error&&<p className="form-error">{error}</p>}{notice&&<p className="success-message">{notice}</p>}
 </section>;
}
