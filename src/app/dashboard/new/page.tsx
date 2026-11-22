import {redirect} from "next/navigation";
import Link from "next/link";
import {ArrowLeft} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import ServiceForm from "./service-form";
export default async function NewServicePage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))redirect("/dashboard");
 const {data:members}=await supabase.from("profiles").select("id,full_name,role").eq("is_active",true).in("role",["usta","supervisor","admin"]).order("full_name");
 return <main className="form-page"><header className="form-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={17}/> Panele dön</Link><span className="eyebrow">FERAH OTOMOTİV · SERVİS KABUL</span></header><section className="form-content"><p className="eyebrow">YENİ KAYIT</p><h1>Servis teklif formu</h1><p className="muted">Araç ve müşteri bilgilerini girin. Kayıt oluşturulduğunda araç servise alınır ve QR takip kodu üretilir.</p><ServiceForm members={members??[]}/></section></main>;
}
