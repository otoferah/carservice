import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import UserManager from "./user-manager";
export default async function UsersPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:actor}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(actor?.role!=="admin"||!actor.is_active)redirect("/dashboard");
 const {data:users}=await supabase.from("profiles").select("id,full_name,username,role,is_active,created_at").order("created_at",{ascending:false});
 return <main className="form-page"><header className="form-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={17}/> Panele dön</Link><span className="eyebrow">FERAH OTOMOTİV · PERSONEL</span></header><section className="detail-content"><p className="eyebrow">ERİŞİM VE YETKİLER</p><h1>Personel yönetimi</h1><p className="muted">Yeni personel hesabı oluşturun, görev rolünü veya erişim durumunu yönetin.</p><UserManager users={users??[]} currentUserId={user.id}/></section></main>;
}
