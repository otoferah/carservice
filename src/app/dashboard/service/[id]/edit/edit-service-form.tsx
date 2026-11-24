"use client";
import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import {Plus,Trash2,Save} from "lucide-react";
type Part={id?:string;part_name:string;quantity:number;unit_price:number};
type Member={id:string;full_name:string;role:string};
type RecordData={id:string;quote_date:string;quote_provider:string|null;intake_odometer_km:number|null;tc_identity_number:string;customers:{full_name:string;phone:string|null;email:string|null}|null;vehicles:{plate:string;brand:string;model:string}|null;service_parts:Part[];service_team:{profile_id:string}[]};
export default function EditServiceForm({record,members}:{record:RecordData;members:Member[]}){
 const [customer,setCustomer]=useState(record.customers?.full_name||"");const [phone,setPhone]=useState(record.customers?.phone||"");const [email,setEmail]=useState(record.customers?.email||"");
 const [tcIdentity,setTcIdentity]=useState(record.tc_identity_number);const [intakeKm,setIntakeKm]=useState(record.intake_odometer_km===null?"":String(record.intake_odometer_km));
 const [plate,setPlate]=useState(record.vehicles?.plate||"");const [brand,setBrand]=useState(record.vehicles?.brand||"");const [model,setModel]=useState(record.vehicles?.model||"");
 const [quoteDate,setQuoteDate]=useState(record.quote_date);const [provider,setProvider]=useState(record.quote_provider||"");
 const [parts,setParts]=useState<Part[]>(record.service_parts.length?record.service_parts.map(p=>({...p})): [{part_name:"",quantity:1,unit_price:0}]);
 const [team,setTeam]=useState<string[]>(record.service_team.map(m=>m.profile_id));
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [saved,setSaved]=useState(false);
 const total=useMemo(()=>parts.reduce((sum,p)=>sum+(Number(p.quantity)||0)*(Number(p.unit_price)||0),0),[parts]);
 function patchPart(index:number,key:keyof Part,value:string){setParts(old=>old.map((p,i)=>i===index?{...p,[key]:key==="part_name"?value:Number(value)}:p));}
 function toggleMember(id:string){setTeam(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);}
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setSaved(false);
  try{const res=await fetch("/api/services/"+record.id,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer_name:customer,phone,email,tc_identity_number:tcIdentity,intake_odometer_km:intakeKm===""?null:Number(intakeKm),plate,brand,model,quote_date:quoteDate,quote_provider:provider,parts:parts.filter(p=>p.part_name.trim()).map((p,i)=>({part_name:p.part_name,quantity:p.quantity,unit_price:p.unit_price,sort_order:i})),team})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Kayıt güncellenemedi.");setSaved(true);
  }catch(err){setError(err instanceof Error?err.message:"Kayıt güncellenemedi.");}finally{setBusy(false);}
 }
 return <form className="service-form" onSubmit={submit}>
  <div className="form-section"><h2>01 · Müşteri ve araç bilgileri</h2><div className="field-grid">
   <label className="field full">Araç sahibi adı ve soyadı<input required value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label className="field">Telefon<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label className="field">TC kimlik numarası<input inputMode="numeric" autoComplete="off" maxLength={11} pattern="[0-9]{11}" value={tcIdentity} onChange={e=>setTcIdentity(e.target.value.replace(/\D/g,"").slice(0,11))} placeholder="11 haneli TC kimlik no"/><small>Yalnızca yönetici ve supervisor görüntüleyebilir.</small></label><label className="field">E-posta<input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Plaka<input required value={plate} onChange={e=>setPlate(e.target.value.toLocaleUpperCase("tr-TR"))}/></label><label className="field">Marka<input required value={brand} onChange={e=>setBrand(e.target.value)}/></label><label className="field">Model<input required value={model} onChange={e=>setModel(e.target.value)}/></label><label className="field">Teslim alınan kilometre (KM)<input type="number" min="0" step="1" inputMode="numeric" value={intakeKm} onChange={e=>setIntakeKm(e.target.value)} placeholder="Örn. 125000"/></label><label className="field">Teklif tarihi<input type="date" required value={quoteDate} onChange={e=>setQuoteDate(e.target.value)}/></label><label className="field full">Teklifi veren<input value={provider} onChange={e=>setProvider(e.target.value)}/></label>
  </div></div>
  <div className="form-section"><div className="section-title-row"><h2>02 · Parça ve işlemler</h2><button type="button" className="outline-button" onClick={()=>setParts(old=>[...old,{part_name:"",quantity:1,unit_price:0}])}><Plus size={15}/> Parça ekle</button></div>
   {parts.map((p,i)=><div className="part-row" key={p.id||i}><label className="field">Parça / işlem<input value={p.part_name} onChange={e=>patchPart(i,"part_name",e.target.value)}/></label><label className="field quantity">Adet<input type="number" min="0.01" step="0.01" value={p.quantity} onChange={e=>patchPart(i,"quantity",e.target.value)}/></label><label className="field price">Birim fiyat (₺)<input type="number" min="0" step="0.01" value={p.unit_price} onChange={e=>patchPart(i,"unit_price",e.target.value)}/></label><div className="part-total">{(p.quantity*p.unit_price).toLocaleString("tr-TR")} ₺</div><button type="button" className="icon-button" aria-label="Parçayı sil" onClick={()=>setParts(old=>old.filter((_,j)=>i!==j))}><Trash2 size={16}/></button></div>)}
   <div className="total-row"><span>Güncel teklif toplamı</span><strong>{total.toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</strong></div>
  </div>
  <div className="form-section"><h2>03 · İlgilenen ekip</h2><div className="team-grid">{members.map(m=><label key={m.id} className="team-option"><input type="checkbox" checked={team.includes(m.id)} onChange={()=>toggleMember(m.id)}/><span><b>{m.full_name}</b><small>{m.role==="admin"?"Yönetici":m.role==="supervisor"?"Supervisor":"Usta"}</small></span></label>)}</div></div>
  {error&&<p className="form-error">{error}</p>}{saved&&<p className="success-message">Servis dosyası başarıyla güncellendi. Önceki servis geçmişi korunmuştur.</p>}
  <div className="edit-actions"><button type="submit" className="primary-button" disabled={busy}><Save size={15}/>{busy?"Kaydediliyor...":"Değişiklikleri kaydet"}</button><Link className="outline-button" href={"/dashboard/service/"+record.id}>Vazgeç</Link></div>
 </form>;
}
