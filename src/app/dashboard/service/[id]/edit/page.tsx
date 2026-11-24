import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {ArrowLeft} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import EditServiceForm from "./edit-service-form";
type Part={id:string;part_name:string;quantity:number;unit_price:number};
type Team={profile_id:string};
export default async function EditServicePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))redirect("/dashboard");
 const [{data:raw},{data:members}]=await Promise.all([
  supabase.from("service_records").select("id,quote_date,quote_provider,intake_odometer_km,customers(full_name,phone,email),vehicles(plate,brand,model),service_parts(id,part_name,quantity,unit_price),service_team(profile_id)").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("id,full_name,role").eq("is_active",true).in("role",["usta","supervisor","admin"]).order("full_name")
 ]);
 if(!raw)notFound();
 const record=raw as unknown as {id:string;quote_date:string;quote_provider:string|null;customers:{full_name:string;phone:string|null;email:string|null}|null;vehicles:{plate:string;brand:string;model:string}|null;service_parts:Part[];service_team:Team[]};
 return <main className="form-page"><header className="form-top"><Link href={"/dashboard/service/"+id} className="back-link"><ArrowLeft size={17}/> Servis dosyasına dön</Link><span className="eyebrow">FERAH OTOMOTİV · KAYIT DÜZENLEME</span></header>
  <section className="form-content"><p className="eyebrow">SERVİS DOSYASI</p><h1>Kayıt bilgilerini düzenle</h1><p className="muted">Yalnızca yönetici ve supervisor bu bilgileri düzenleyebilir. Önceki servis gelişme notları korunur.</p>
   <EditServiceForm record={{...record,tc_identity_number:identity?.tc_identity_number||""}} members={members??[]}/>
  </section></main>;
}
