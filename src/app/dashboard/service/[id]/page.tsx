import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,CarFront,ClipboardList,Users,Wrench,Printer} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {statusLabels,type ServiceStatus} from "@/lib/types";
import ServiceProgress from "./service-progress";
import TaskManager from "./task-manager";
import PrintQuoteButton from "./print-button";
import {QRCodeSVG} from "qrcode.react";
import DeleteServiceButton from "./delete-service-button";
import {publicTrackingUrl} from "@/lib/public-tracking";
type Person={full_name:string;role:string};
type Update={id:string;status:ServiceStatus;note:string;created_at:string;edited_at:string|null;profiles:Person|null};
type Part={id:string;part_name:string;quantity:number;unit_price:number;line_total:number};
type ImageRow={id:string;storage_path:string;caption:string|null};
export default async function ServiceDetailPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active,full_name").eq("id",user.id).maybeSingle();if(!profile?.is_active)redirect("/login");
 const manager=["admin","supervisor"].includes(profile.role);
 const {data:raw}=await supabase.from("service_records").select("id,status,quote_date,quote_total,tracking_token,quote_provider,customer_signature_path,created_at,customers(full_name,phone,email),vehicles(plate,brand,model),service_images(id,storage_path,caption),service_parts(id,part_name,quantity,unit_price,line_total),service_team(profile_id,member_name,assignment_role,profiles!service_team_profile_id_fkey(full_name,role)),service_updates(id,status,note,created_at,edited_at,profiles!service_updates_created_by_fkey(full_name,role))").eq("id",id).maybeSingle();
 if(!raw)notFound();
 const record=raw as unknown as {id:string;status:ServiceStatus;quote_date:string;quote_total:number;tracking_token:string;quote_provider:string|null;customer_signature_path:string|null;customers:{full_name:string;phone:string|null;email:string|null}|null;vehicles:{plate:string;brand:string;model:string}|null;service_images:ImageRow[];service_parts:Part[];service_team:{profile_id:string|null;member_name:string|null;assignment_role:string;profiles:Person|null}[];service_updates:Update[]};
 const {data:taskRows}=await supabase.from("service_tasks").select("id,title,description,status,completion_note,created_at,completed_at,assigned_to,profiles!service_tasks_assigned_to_fkey(full_name)").eq("service_record_id",id).order("created_at",{ascending:false});
 const {data:peopleRows}=manager?await supabase.from("profiles").select("id,full_name").eq("role","usta").eq("is_active",true).order("full_name"):{data:[]};
 const tasks=(taskRows??[]) as unknown as {id:string;title:string;description:string|null;status:"assigned"|"completed";completion_note:string|null;created_at:string;completed_at:string|null;assigned_to:string|null;assigned_to_name:string|null;assigned_by_name:string|null;profiles:{full_name:string}|null}[];
 const people=(peopleRows??[]) as {id:string;full_name:string}[];
 const assigned=record.service_team.some(m=>m.profile_id===user.id)||tasks.some(t=>t.assigned_to===user.id);
 const updates=[...record.service_updates].sort((a,b)=>b.created_at.localeCompare(a.created_at));
 const imageUrls=await Promise.all((record.service_images??[]).map(async image=>{const {data}=await supabase.storage.from("service-media").createSignedUrl(image.storage_path,3600);return data?.signedUrl?{url:data.signedUrl,caption:image.caption}:null;}));
 const photos=imageUrls.filter((image):image is {url:string;caption:string|null}=>!!image);
 const {data:signatureData}=record.customer_signature_path?await supabase.storage.from("service-media").createSignedUrl(record.customer_signature_path,3600):{data:null};
 const signatureUrl=signatureData?.signedUrl||null;
 const trackingUrl=publicTrackingUrl(record.tracking_token);
 const publicTrackingUrlValue=trackingUrl;
 const formattedDate=new Date(record.quote_date+"T12:00:00").toLocaleDateString("tr-TR");
 return <main className="form-page"><header className="form-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={17}/> Panele dön</Link><span className="eyebrow">FERAH OTOMOTİV · SERVİS DOSYASI</span></header>
  <section className="detail-content"><div className="detail-heading"><div><p className="eyebrow">SERVİS KAYDI</p><h1>{record.vehicles?.plate||"Araç"} <span className="status-tag">{statusLabels[record.status]}</span></h1><p className="muted">{record.vehicles?.brand} {record.vehicles?.model} · {record.customers?.full_name||"Müşteri bilgisi"}</p></div><div className="detail-heading-actions">{manager&&<><Link className="outline-button" href={"/dashboard/service/"+id+"/edit"}>Servis kaydını düzenle</Link><DeleteServiceButton recordId={id} plate={record.vehicles?.plate||"Bu araç"}/></>}{manager&&<div className="detail-total"><small>TEKLİF TOPLAMI</small><b>{Number(record.quote_total).toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</b></div>}</div></div>
   <div className="detail-grid"><div className="detail-main">
    <section className="detail-panel"><h2><ClipboardList size={17}/> Kullanılan parçalar / işlemler</h2><div className="table-scroll"><table><thead><tr><th>AÇIKLAMA</th><th>ADET</th>{manager&&<><th>BİRİM FİYAT</th><th>TOPLAM</th></>}</tr></thead><tbody>{record.service_parts.map(p=><tr key={p.id}><td>{p.part_name}</td><td>{p.quantity}</td>{manager&&<><td>{Number(p.unit_price).toLocaleString("tr-TR")} ₺</td><td>{Number(p.line_total).toLocaleString("tr-TR")} ₺</td></>}</tr>)}{!record.service_parts.length&&<tr><td colSpan={manager?4:2}>Parça kalemi eklenmemiş.</td></tr>}</tbody></table></div></section>
    {(photos.length>0||signatureUrl)&&<section className="detail-panel"><h2><CarFront size={17}/> Araç görselleri ve müşteri imzası</h2><div className="service-photo-grid">{photos.map((photo,i)=><a href={photo.url} target="_blank" rel="noreferrer" key={i}><img src={photo.url} alt={photo.caption||"Araç görseli"}/><small>{photo.caption||"Araç görseli"}</small></a>)}</div>{signatureUrl&&<div className="service-signature"><small>Müşteri imzası</small><img src={signatureUrl} alt="Müşteri imzası"/></div>}</section>}
    <section className="detail-panel"><h2><Users size={17}/> İlgilenen ekip</h2><div className="detail-team">{record.service_team.map((m,i)=><div className="detail-team-item" key={i}><span className="avatar">{(m.profiles?.full_name||"P").slice(0,1)}</span><div><b>{m.profiles?.full_name||m.member_name||"Personel"}</b><small>{m.assignment_role==="admin"?"Yönetici":m.assignment_role==="supervisor"?"Supervisor":"Usta"}</small></div></div>)}</div></section>
    <TaskManager recordId={id} tasks={tasks} people={people} canManage={manager}/>
    <ServiceProgress recordId={id} currentStatus={record.status} updates={updates} canUpdate={manager||assigned} canDeliver={manager} canEditHistory={manager} viewerName={profile.full_name}/>
   </div><aside className="detail-aside"><div className="detail-panel"><h2><CarFront size={17}/> Araç özeti</h2><dl><dt>Plaka</dt><dd>{record.vehicles?.plate}</dd><dt>Marka / Model</dt><dd>{record.vehicles?.brand} {record.vehicles?.model}</dd><dt>Müşteri</dt><dd>{record.customers?.full_name}</dd><dt>Telefon</dt><dd>{record.customers?.phone||"—"}</dd><dt>E-posta</dt><dd>{record.customers?.email||"—"}</dd>{manager&&<><dt>Teklif tarihi</dt><dd>{formattedDate}</dd><dt>Teklifi veren</dt><dd>{record.quote_provider||"—"}</dd></>}</dl></div>
    <div className="detail-panel"><h2><Wrench size={17}/> Müşteri takip bağlantısı</h2><p className="muted small-copy">Bu kayıt için oluşturulmuş tekil takip bağlantısı.</p><Link className="outline-button" href={trackingUrl} target="_blank">Müşteri görünümünü aç ↗</Link><p className="token-text">{record.tracking_token}</p></div>
    {manager&&<div className="detail-panel quote-actions"><h2><Printer size={17}/> Teklif çıktısı</h2><p className="muted small-copy">Teklif formunu yazdırabilir veya PDF olarak bilgisayarınıza kaydedebilirsiniz.</p><PrintQuoteButton /></div>}<div className="detail-panel sticker-actions"><h2><CarFront size={17}/> Araca özel QR sticker</h2><p className="muted small-copy">Bu servis kaydına özel QR kodu etiket olarak yazdırın veya PDF kaydedip sticker baskısına gönderin.</p><Link className="primary-button sticker-open-button" href={"/dashboard/service/"+id+"/sticker"}>QR sticker oluştur / yazdır ↗</Link></div>
   </aside></div>
   {manager&&<div className="print-only-quote">
    <header className="quote-document-header">
     <div className="quote-brand-lockup"><span className="quote-brand-symbol">F</span><div><b>FERAH OTOMOTİV</b><small>SERVİS YÖNETİMİ</small></div></div>
     <div className="quote-document-title"><span>SERVİS TEKLİFİ</span><h2>Teklif Formu</h2><p>Servis işlemleri ve parça maliyetleri</p></div>
     <div className="quote-document-date"><small>TEKLİF TARİHİ</small><b>{formattedDate}</b></div>
    </header>
    <section className="quote-customer-grid">
     <div className="quote-info-card"><small>MÜŞTERİ</small><b>{record.customers?.full_name||"—"}</b><span>{record.customers?.phone||record.customers?.email||"Müşteri bilgisi"}</span></div>
     <div className="quote-info-card"><small>ARAÇ</small><b>{record.vehicles?.brand||""} {record.vehicles?.model||""}</b><span>Plaka: {record.vehicles?.plate||"—"}</span></div>
     <div className="quote-info-card"><small>TEKLİFİ HAZIRLAYAN</small><b>{record.quote_provider||"—"}</b><span>Ferah Otomotiv servis ekibi</span></div>
    </section>
    <div className="quote-table-heading"><div><span>01</span><b>İşlem ve parça dökümü</b></div><small>FİYATLANDIRMA</small></div>
    <table className="quote-premium-table"><thead><tr><th>PARÇA / İŞLEM AÇIKLAMASI</th><th>ADET</th><th>BİRİM FİYAT</th><th>TOPLAM</th></tr></thead><tbody>{record.service_parts.map(p=><tr key={p.id}><td>{p.part_name}</td><td>{p.quantity}</td><td>{Number(p.unit_price).toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</td><td>{Number(p.line_total).toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</td></tr>)}{!record.service_parts.length&&<tr><td colSpan={4}>Bu teklif için işlem veya parça kalemi bulunmuyor.</td></tr>}</tbody></table>
    <section className="quote-total-panel"><div><small>TEKLİF GENEL TOPLAMI</small><span>Belirtilen işlemler için toplam tutar</span></div><strong>{Number(record.quote_total).toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</strong></section>
    <div className="quote-bottom-row">
     <div className="quote-signature-block"><div className="quote-approval-title">Müşteri onayı</div><p>Teklif kapsamını ve belirtilen tutarı onaylıyorum.</p>{signatureUrl?<img src={signatureUrl} alt="Müşteri imzası" className="quote-signature"/>:<div className="quote-signature-line"/>}<small>Müşteri imzası</small><div className="quote-provider-line">Teklifi hazırlayan: <b>{record.quote_provider||"Ferah Otomotiv"}</b></div></div>
     <div className="quote-tracking-qr"><div className="quote-qr-frame"><QRCodeSVG value={publicTrackingUrlValue} size={200} level="M" includeMargin={true}/></div><b>Servis durumunu takip edin</b><small>Güncel servis bilgilerini görüntülemek için QR kodu telefonunuzla okutun.</small></div>
    </div>
    <footer className="quote-document-footer"><span>FERAH OTOMOTİV · SERVİS YÖNETİMİ</span><span>Bu teklif, ilgili servis kaydı için hazırlanmıştır.</span></footer>
   </div>}
  </section></main>;
}
