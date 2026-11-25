"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {Boxes,Plus,PackageCheck,Truck,CarFront,ArrowDownToLine,Pencil,Trash2,X,Save} from "lucide-react";
type Stock={id:string;supplier_name:string;part_name:string;part_number:string|null;quantity_received:number;quantity_available:number;supplier_unit_price:number;supply_cost_total:number;unit_landed_cost:number;purchase_date:string;notes:string|null;created_at:string};
type Service={id:string;status:string;vehicles:{plate:string;brand:string;model:string}|null};
type Installation={id:string;part_name:string;supplier_name:string;quantity:number;unit_landed_cost:number;installed_at:string;service_records:{id:string;vehicles:{plate:string;brand:string;model:string}|null}|null};
const money=(v:number)=>Number(v||0).toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})+" ₺";
export default function StockManager({initialStock,services,initialInstallations}:{initialStock:Stock[];services:Service[];initialInstallations:Installation[]}){
 const [stock,setStock]=useState(initialStock);const [installations,setInstallations]=useState(initialInstallations);
 const [supplier,setSupplier]=useState("");const [part,setPart]=useState("");const [partNumber,setPartNumber]=useState("");const [quantity,setQuantity]=useState("1");const [unitPrice,setUnitPrice]=useState("");const [supplyCost,setSupplyCost]=useState("0");const [purchaseDate,setPurchaseDate]=useState(new Date().toISOString().slice(0,10));const [notes,setNotes]=useState("");
 const [selectedStock,setSelectedStock]=useState("");const [selectedService,setSelectedService]=useState("");const [installQuantity,setInstallQuantity]=useState("1");
 const [editing,setEditing]=useState<Stock|null>(null);
 const [editSupplier,setEditSupplier]=useState("");const [editPart,setEditPart]=useState("");const [editPartNumber,setEditPartNumber]=useState("");
 const [editReceived,setEditReceived]=useState("");const [editAvailable,setEditAvailable]=useState("");
 const [editUnitPrice,setEditUnitPrice]=useState("");const [editSupplyCost,setEditSupplyCost]=useState("");
 const [editPurchaseDate,setEditPurchaseDate]=useState("");const [editNotes,setEditNotes]=useState("");
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const router=useRouter();const supabase=createClient();
 useEffect(()=>{setStock(initialStock);},[initialStock]);useEffect(()=>{setInstallations(initialInstallations);},[initialInstallations]);
 const totalPieces=stock.reduce((n,x)=>n+Number(x.quantity_available),0);
 const inventoryValue=stock.reduce((n,x)=>n+Number(x.quantity_available)*Number(x.unit_landed_cost),0);
 const purchaseValue=stock.reduce((n,x)=>n+Number(x.quantity_received)*Number(x.unit_landed_cost),0);
 const selected=stock.find(x=>x.id===selectedStock);
 const perUnitFee=Number(quantity)>0?Number(supplyCost||0)/Number(quantity):0;
 const landed=Number(unitPrice||0)+perUnitFee;
 const available=useMemo(()=>stock.filter(x=>Number(x.quantity_available)>0),[stock]);
 async function addPurchase(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const qty=Number(quantity),price=Number(unitPrice),fee=Number(supplyCost||0);
  if(!supplier.trim()||!part.trim()||!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<0||!Number.isFinite(fee)||fee<0){setError("Firma, parça, geçerli adet ve fiyat bilgilerini girin.");setBusy(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  const {data,error}=await supabase.from("part_stock_entries").insert({supplier_name:supplier.trim(),part_name:part.trim(),part_number:partNumber.trim()||null,quantity_received:qty,quantity_available:qty,supplier_unit_price:price,supply_cost_total:fee,purchase_date:purchaseDate,notes:notes.trim()||null,created_by:user?.id}).select("id,supplier_name,part_name,part_number,quantity_received,quantity_available,supplier_unit_price,supply_cost_total,unit_landed_cost,purchase_date,notes,created_at").single();
  if(error){setError("Stok alışı kaydedilemedi: "+error.message);setBusy(false);return;}
  setStock(old=>[data as Stock,...old]);setSupplier("");setPart("");setPartNumber("");setQuantity("1");setUnitPrice("");setSupplyCost("0");setNotes("");setMessage("Parça alışı depoya eklendi.");setBusy(false);router.refresh();
 }
 function startEdit(item:Stock){
  setEditing(item);setEditSupplier(item.supplier_name);setEditPart(item.part_name);setEditPartNumber(item.part_number||"");
  setEditReceived(String(item.quantity_received));setEditAvailable(String(item.quantity_available));
  setEditUnitPrice(String(item.supplier_unit_price));setEditSupplyCost(String(item.supply_cost_total));
  setEditPurchaseDate(item.purchase_date);setEditNotes(item.notes||"");setError("");setMessage("");
 }
 function cancelEdit(){setEditing(null);}
 async function saveEdit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editing)return;
  setBusy(true);setError("");setMessage("");
  const received=Number(editReceived),availableQty=Number(editAvailable),price=Number(editUnitPrice),fee=Number(editSupplyCost);
  if(!editSupplier.trim()||!editPart.trim()||!Number.isFinite(received)||received<=0||!Number.isFinite(availableQty)||availableQty<0||availableQty>received||!Number.isFinite(price)||price<0||!Number.isFinite(fee)||fee<0){
   setError("Bilgileri kontrol edin. Alınan adet sıfırdan büyük, kalan adet ise 0 ile alınan adet arasında olmalıdır.");setBusy(false);return;
  }
  const {data,error}=await supabase.from("part_stock_entries").update({
   supplier_name:editSupplier.trim(),part_name:editPart.trim(),part_number:editPartNumber.trim()||null,
   quantity_received:received,quantity_available:availableQty,supplier_unit_price:price,supply_cost_total:fee,
   purchase_date:editPurchaseDate,notes:editNotes.trim()||null,updated_at:new Date().toISOString()
  }).eq("id",editing.id).select("id,supplier_name,part_name,part_number,quantity_received,quantity_available,supplier_unit_price,supply_cost_total,unit_landed_cost,purchase_date,notes,created_at").single();
  if(error){setError("Stok kaydı güncellenemedi: "+error.message);setBusy(false);return;}
  setStock(old=>old.map(x=>x.id===editing.id?data as Stock:x));
  if(selectedStock===editing.id&&Number(data.quantity_available)<=0)setSelectedStock("");
  setEditing(null);setMessage("Stok alım kaydı güncellendi.");setBusy(false);router.refresh();
 }
 async function deleteStock(item:Stock){
  const used=Number(item.quantity_received)-Number(item.quantity_available);
  if(!window.confirm(`“${item.part_name}” / ${item.supplier_name} stok alım kaydını kalıcı olarak silmek istiyor musunuz? Bu işlem geri alınamaz.`))return;
  setBusy(true);setError("");setMessage("");
  const {count,error:checkError}=await supabase.from("part_installations").select("id",{count:"exact",head:true}).eq("stock_entry_id",item.id);
  if(checkError){setError("Parça kullanım geçmişi kontrol edilemedi: "+checkError.message);setBusy(false);return;}
  if((count||0)>0){
   setError(`Bu stok partisinden ${used.toLocaleString("tr-TR")} adet araca takılmış. Servis geçmişi bozulmaması için bu kayıt kalıcı olarak silinemez. Kalan adedi 0 yaparak stoktan kaldırabilirsiniz.`);
   setBusy(false);return;
  }
  const {error}=await supabase.from("part_stock_entries").delete().eq("id",item.id);
  if(error){setError(error.message.includes("foreign key")?"Bu stok kaydı parça kullanım geçmişine bağlı olduğu için silinemiyor.":"Stok kaydı silinemedi: "+error.message);setBusy(false);return;}
  setStock(old=>old.filter(x=>x.id!==item.id));if(selectedStock===item.id)setSelectedStock("");
  setMessage("Stok alım kaydı kalıcı olarak silindi.");setBusy(false);router.refresh();
 }
 async function installPart(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const qty=Number(installQuantity);
  if(!selectedStock||!selectedService||!Number.isFinite(qty)||qty<=0){setError("Depo parçası, servis kaydı ve geçerli adet seçin.");setBusy(false);return;}
  const {data,error}=await supabase.rpc("install_part_from_stock",{p_stock_entry_id:selectedStock,p_service_record_id:selectedService,p_quantity:qty});
  if(error){setError("Parça araca kaydedilemedi: "+error.message);setBusy(false);return;}
  const item=stock.find(x=>x.id===selectedStock);const vehicle=services.find(x=>x.id===selectedService);
  if(item&&vehicle){setStock(old=>old.map(x=>x.id===item.id?{...x,quantity_available:Number(x.quantity_available)-qty}:x));setInstallations(old=>[{id:String(data),part_name:item.part_name,supplier_name:item.supplier_name,quantity:qty,unit_landed_cost:Number(item.unit_landed_cost),installed_at:new Date().toISOString(),service_records:vehicle},...old]);}
  setMessage("Parça servis kaydına eklendi ve stoktan düşüldü.");setInstallQuantity("1");setBusy(false);router.refresh();
 }
 return <div className="stock-manager">
  <div className="stock-summary-grid"><article className="stat-card"><div className="stat-top"><span>Depodaki parça adedi</span><span className="stat-icon"><Boxes size={18}/></span></div><strong>{totalPieces.toLocaleString("tr-TR")}</strong><small>Mevcut toplam stok miktarı</small></article><article className="stat-card"><div className="stat-top"><span>Mevcut stok maliyeti</span><span className="stat-icon"><PackageCheck size={18}/></span></div><strong>{money(inventoryValue)}</strong><small>Depoda kalan parçaların maliyeti</small></article><article className="stat-card"><div className="stat-top"><span>Toplam alım maliyeti</span><span className="stat-icon"><Truck size={18}/></span></div><strong>{money(purchaseValue)}</strong><small>Tedarik masrafı dahil kayıtlı alımlar</small></article></div>
  <div className="stock-forms-grid">
   <section className="panel stock-form-panel"><div className="panel-heading"><div><h2><Plus size={17}/> Yeni parça alışı</h2><p>Tedarikçi ve maliyet bilgilerini kaydet.</p></div></div>
    <form className="stock-form" onSubmit={addPurchase}>
     <label className="field">Tedarikçi firma adı<input required value={supplier} onChange={e=>setSupplier(e.target.value)} placeholder="Örn. ABC Otomotiv"/></label>
     <label className="field">Parça adı<input required value={part} onChange={e=>setPart(e.target.value)} placeholder="Örn. Yağ filtresi"/></label>
     <label className="field">Parça kodu (isteğe bağlı)<input value={partNumber} onChange={e=>setPartNumber(e.target.value)} placeholder="OEM / ürün kodu"/></label>
     <div className="stock-field-row"><label className="field">Alınan adet<input required type="number" min="0.01" step="0.01" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="field">Firma birim fiyatı (₺)<input required type="number" min="0" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} placeholder="0,00"/></label></div>
     <label className="field">Toplam tedarik masrafı (₺)<input type="number" min="0" step="0.01" value={supplyCost} onChange={e=>setSupplyCost(e.target.value)}/><small>Bu alımın toplam nakliye / tedarik masrafı.</small></label>
     <div className="stock-cost-preview"><span>Birim tedarik masrafı: <b>{money(perUnitFee)}</b></span><span>Gerçek birim maliyet: <strong>{money(landed)}</strong></span></div>
     <div className="stock-field-row"><label className="field">Alış tarihi<input type="date" required value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)}/></label><label className="field">Not (isteğe bağlı)<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Fatura / açıklama"/></label></div>
     <button className="primary-button" disabled={busy}><Plus size={16}/>{busy?"Kaydediliyor...":"Alışı depoya kaydet"}</button>
    </form>
   </section>
   <section className="panel stock-form-panel"><div className="panel-heading"><div><h2><CarFront size={17}/> Parçayı araca tak</h2><p>Stoktan düş ve servis geçmişine işle.</p></div></div>
    <form className="stock-form" onSubmit={installPart}>
     <label className="field">Depodan parça seç<select required value={selectedStock} onChange={e=>setSelectedStock(e.target.value)}><option value="">Stok kalemi seçin</option>{available.map(x=><option key={x.id} value={x.id}>{x.part_name} · {x.supplier_name} · Kalan: {x.quantity_available}</option>)}</select></label>
     {selected&&<div className="stock-selected-info"><b>{selected.part_name}</b><span>{selected.supplier_name}</span><small>Gerçek birim maliyet: {money(Number(selected.unit_landed_cost))}</small></div>}
     <label className="field">Takılacağı araç / servis kaydı<select required value={selectedService} onChange={e=>setSelectedService(e.target.value)}><option value="">Araç / servis kaydı seçin</option>{services.map(x=><option key={x.id} value={x.id}>{x.vehicles?.plate||"Plaka yok"} · {x.vehicles?.brand||""} {x.vehicles?.model||""} · {x.status}</option>)}</select></label>
     <label className="field">Takılacak adet<input required type="number" min="0.01" step="0.01" max={selected?Number(selected.quantity_available):undefined} value={installQuantity} onChange={e=>setInstallQuantity(e.target.value)}/></label>
     <div className="stock-cost-preview"><span>Çıkış toplam maliyeti</span><strong>{money((selected?Number(selected.unit_landed_cost):0)*Number(installQuantity||0))}</strong></div>
     <button className="primary-button" disabled={busy||!available.length||!services.length}><ArrowDownToLine size={16}/>{busy?"İşleniyor...":"Araca takıldı · stoktan düş"}</button>
    </form>
   </section>
  </div>
  {error&&<p className="form-error stock-alert">{error}</p>}{message&&<p className="success-message">{message}</p>}
  {editing&&<section className="panel stock-form-panel stock-edit-panel"><div className="panel-heading"><div><h2><Pencil size={17}/> Stok alımını düzenle</h2><p>{editing.supplier_name} · {editing.part_name}</p></div><button type="button" className="outline-button" onClick={cancelEdit}><X size={15}/> Vazgeç</button></div>
   <form className="stock-form" onSubmit={saveEdit}>
    <label className="field">Tedarikçi firma adı<input required value={editSupplier} onChange={e=>setEditSupplier(e.target.value)}/></label>
    <label className="field">Parça adı<input required value={editPart} onChange={e=>setEditPart(e.target.value)}/></label>
    <label className="field">Parça kodu<input value={editPartNumber} onChange={e=>setEditPartNumber(e.target.value)}/></label>
    <div className="stock-field-row"><label className="field">Alınan adet<input required type="number" min="0.01" step="0.01" value={editReceived} onChange={e=>setEditReceived(e.target.value)}/></label><label className="field">Kalan adet<input required type="number" min="0" step="0.01" max={editReceived||undefined} value={editAvailable} onChange={e=>setEditAvailable(e.target.value)}/></label></div>
    <div className="stock-field-row"><label className="field">Firma birim fiyatı (₺)<input required type="number" min="0" step="0.01" value={editUnitPrice} onChange={e=>setEditUnitPrice(e.target.value)}/></label><label className="field">Toplam tedarik masrafı (₺)<input required type="number" min="0" step="0.01" value={editSupplyCost} onChange={e=>setEditSupplyCost(e.target.value)}/></label></div>
    <div className="stock-cost-preview"><span>Birim maliyet</span><strong>{money(Number(editUnitPrice||0)+(Number(editReceived)>0?Number(editSupplyCost||0)/Number(editReceived):0))}</strong></div>
    <div className="stock-field-row"><label className="field">Alış tarihi<input type="date" required value={editPurchaseDate} onChange={e=>setEditPurchaseDate(e.target.value)}/></label><label className="field">Not<input value={editNotes} onChange={e=>setEditNotes(e.target.value)}/></label></div>
    <button className="primary-button" disabled={busy}><Save size={16}/>{busy?"Kaydediliyor...":"Değişiklikleri kaydet"}</button>
   </form>
  </section>}
  <section className="panel stock-table-panel"><div className="panel-heading"><div><h2><Boxes size={17}/> Depo stok listesi</h2><p>{stock.length} alım kalemi · Tedarikçi bazında parti takibi</p></div></div><div className="table-scroll"><table><thead><tr><th>ALIŞ TARİHİ</th><th>TEDARİKÇİ</th><th>PARÇA</th><th>ALINAN</th><th>KALAN</th><th>FİRMA FİYATI</th><th>TEDARİK MASRAFI</th><th>BİRİM MALİYET</th><th>İŞLEMLER</th></tr></thead><tbody>{stock.length?stock.map(x=><tr key={x.id}><td>{new Date(x.purchase_date+"T12:00:00").toLocaleDateString("tr-TR")}</td><td><b>{x.supplier_name}</b></td><td><b>{x.part_name}</b>{x.part_number&&<small>{x.part_number}</small>}</td><td>{x.quantity_received}</td><td><span className={Number(x.quantity_available)>0?"stock-available":"stock-empty"}>{x.quantity_available}</span></td><td>{money(Number(x.supplier_unit_price))}</td><td>{money(Number(x.supply_cost_total))}</td><td><b>{money(Number(x.unit_landed_cost))}</b></td><td><div className="stock-row-actions"><button type="button" className="outline-button" onClick={()=>startEdit(x)} disabled={busy}><Pencil size={14}/> Düzenle</button><button type="button" className="outline-button danger-button" onClick={()=>deleteStock(x)} disabled={busy}><Trash2 size={14}/> Sil</button></div></td></tr>):<tr><td colSpan={9} className="empty-cell">Henüz depoya parça alışı eklenmedi.</td></tr>}</tbody></table></div></section>
  <section className="panel stock-table-panel"><div className="panel-heading"><div><h2><CarFront size={17}/> Araca takılan parçalar</h2><p>Servis dosyalarına işlenen son 100 parça çıkışı</p></div></div><div className="table-scroll"><table><thead><tr><th>TAKILMA TARİHİ</th><th>ARAÇ</th><th>PARÇA</th><th>TEDARİKÇİ</th><th>ADET</th><th>BİRİM MALİYET</th><th>TOPLAM MALİYET</th></tr></thead><tbody>{installations.length?installations.map(x=><tr key={x.id}><td>{new Date(x.installed_at).toLocaleString("tr-TR")}</td><td><b>{x.service_records?.vehicles?.plate||"—"}</b><small>{x.service_records?.vehicles?.brand} {x.service_records?.vehicles?.model}</small></td><td>{x.part_name}</td><td>{x.supplier_name}</td><td>{x.quantity}</td><td>{money(Number(x.unit_landed_cost))}</td><td><b>{money(Number(x.quantity)*Number(x.unit_landed_cost))}</b></td></tr>):<tr><td colSpan={7} className="empty-cell">Henüz araca takılan parça bulunmuyor.</td></tr>}</tbody></table></div></section>
 </div>;
}
