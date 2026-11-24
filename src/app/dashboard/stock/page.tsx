import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowLeft,Warehouse} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import StockManager from "./stock-manager";

export default async function StockPage(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))redirect("/dashboard");
 const [{data:stock},{data:services},{data:installations}]=await Promise.all([
  supabase.from("part_stock_entries").select("id,supplier_name,part_name,part_number,quantity_received,quantity_available,supplier_unit_price,supply_cost_total,unit_landed_cost,purchase_date,notes,created_at").order("purchase_date",{ascending:false}).order("created_at",{ascending:false}),
  supabase.from("service_records").select("id,status,vehicles(plate,brand,model)").neq("status","cancelled").order("created_at",{ascending:false}).limit(250),
  supabase.from("part_installations").select("id,part_name,supplier_name,quantity,unit_landed_cost,installed_at,service_records(id,vehicles(plate,brand,model))").order("installed_at",{ascending:false}).limit(100)
 ]);
 return <main className="form-page"><header className="form-top"><Link href="/dashboard" className="back-link"><ArrowLeft size={17}/> Panele dön</Link><span className="eyebrow">FERAH OTOMOTİV · DEPO</span></header><section className="detail-content"><p className="eyebrow">TEDARİK VE STOK TAKİBİ</p><h1><Warehouse size={26} style={{verticalAlign:"-4px",marginRight:9}}/>Depo stok yönetimi</h1><p className="muted">Tedarikçi alımlarını kaydedin, tedarik masrafını maliyete ekleyin ve parçaları takıldıkları servis kaydına bağlayın.</p><StockManager initialStock={(stock??[]) as any} services={(services??[]) as any} initialInstallations={(installations??[]) as any}/></section></main>;
}
