"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {Plus,Trash2,Wallet} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
type Expense={id:string;description:string;category:string;amount:number;expense_date:string;notes:string|null;created_at:string};
export default function ExpenseManager({initialExpenses}:{initialExpenses:Expense[]}){
 const [items,setItems]=useState(initialExpenses);const [description,setDescription]=useState("");const [category,setCategory]=useState("Genel");const [amount,setAmount]=useState("");const [date,setDate]=useState(new Date().toISOString().slice(0,10));const [notes,setNotes]=useState("");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const router=useRouter();const supabase=createClient();
 async function addExpense(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setMessage("");
  const value=Number(amount);if(!description.trim()||!Number.isFinite(value)||value<=0){setError("Açıklama ve sıfırdan büyük bir tutar girin.");setBusy(false);return;}
  const {data:{user}}=await supabase.auth.getUser();
  const {data,error}=await supabase.from("expenses").insert({description:description.trim(),category,amount:value,expense_date:date,notes:notes.trim()||null,created_by:user?.id}).select("id,description,category,amount,expense_date,notes,created_at").single();
  if(error){setError("Gider kaydedilemedi: "+error.message);setBusy(false);return;}
  setItems(old=>[data as Expense,...old]);setDescription("");setAmount("");setNotes("");setMessage("Gider kaydı eklendi.");setBusy(false);router.refresh();
 }
 async function removeExpense(id:string){if(!window.confirm("Bu gider kaydını silmek istediğinize emin misiniz?"))return;setError("");const {error}=await supabase.from("expenses").delete().eq("id",id);if(error){setError("Gider silinemedi: "+error.message);return;}setItems(old=>old.filter(x=>x.id!==id));router.refresh();}
 const total=items.reduce((s,x)=>s+Number(x.amount),0);
 return <div className="expense-manager">
  <section className="panel expense-form-panel"><div className="panel-heading"><div><h2><Plus size={17}/> Yeni gider ekle</h2><p>İşletme giderlerini manuel olarak kaydedin.</p></div></div>
   <form className="expense-form" onSubmit={addExpense}>
    <label className="field">Gider açıklaması<input required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Örn. Yedek parça, kira, elektrik"/></label>
    <label className="field">Kategori<select value={category} onChange={e=>setCategory(e.target.value)}>{["Genel","Yedek parça","Personel","Kira","Fatura","Bakım ve onarım","Lojistik","Vergi ve resmi","Diğer"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="field">Tutar (₺)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label>
    <label className="field">Gider tarihi<input required type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
    <label className="field expense-notes">Not (isteğe bağlı)<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ek açıklama"/></label>
    <button className="primary-button" disabled={busy}><Plus size={16}/>{busy?"Kaydediliyor...":"Gideri kaydet"}</button>
   </form>
   {error&&<p className="form-error expense-alert">{error}</p>}{message&&<p className="success-message">{message}</p>}
  </section>
  <section className="panel"><div className="panel-heading"><div><h2><Wallet size={17}/> Kayıtlı giderler</h2><p>{items.length} kayıt · Listelenen toplam gider</p></div><strong className="expense-total">{total.toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</strong></div>
   <div className="table-scroll"><table><thead><tr><th>TARİH</th><th>AÇIKLAMA</th><th>KATEGORİ</th><th>TUTAR</th><th>İŞLEM</th></tr></thead><tbody>{items.length?items.map(x=><tr key={x.id}><td>{new Date(x.expense_date+"T12:00:00").toLocaleDateString("tr-TR")}</td><td><b>{x.description}</b>{x.notes&&<small>{x.notes}</small>}</td><td>{x.category}</td><td className="money-negative">-{Number(x.amount).toLocaleString("tr-TR",{minimumFractionDigits:2})} ₺</td><td><button className="expense-delete" onClick={()=>removeExpense(x.id)} aria-label="Gideri sil"><Trash2 size={15}/></button></td></tr>):<tr><td colSpan={5} className="empty-cell">Henüz gider eklenmedi.</td></tr>}</tbody></table></div>
  </section>
 </div>;
}
