import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,Wallet} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import ExpenseManager from "./expense-manager";
export default async function ExpensesPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))redirect("/dashboard");
 const {data}=await supabase.from("expenses").select("id,description,category,amount,expense_date,notes,created_at").order("expense_date",{ascending:false}).order("created_at",{ascending:false});
 return <main className="form-page"><header className="form-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={17}/> Panele dön</Link><span className="eyebrow">FERAH OTOMOTİV · FİNANS</span></header><section className="detail-content"><p className="eyebrow">GELİR VE GİDER TAKİBİ</p><h1>Gider yönetimi</h1><p className="muted">İşletme giderlerini manuel ekleyin ve finansal durumu ana ekrandan takip edin.</p><ExpenseManager initialExpenses={(data??[]) as any}/></section></main>;
}
