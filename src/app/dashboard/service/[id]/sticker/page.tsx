import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft,Printer} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import {createClient} from "@/lib/supabase/server";
import StickerPrintButton from "./sticker-print-button";

export default async function VehicleStickerPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active)redirect("/login");
 const {data:record}=await supabase.from("service_records").select("tracking_token,vehicles(plate,brand,model)").eq("id",id).maybeSingle();
 if(!record)notFound();
 const vehicle=record.vehicles as unknown as {plate:string;brand:string;model:string}|null;
 if(!vehicle||!record.tracking_token)notFound();
 const trackingUrl=process.env.NEXT_PUBLIC_SITE_URL
  ? new URL("/tracking?token="+record.tracking_token,process.env.NEXT_PUBLIC_SITE_URL).toString()
  : "https://ferah-otomotiv-servis.vercel.app/tracking?token="+record.tracking_token;
 return <main className="sticker-page">
  <header className="sticker-toolbar">
   <Link href={"/dashboard/service/"+id} className="back-link"><ArrowLeft size={16}/> Servis dosyasına dön</Link>
   <StickerPrintButton/>
  </header>
  <section className="vehicle-sticker" aria-label="Araç servis takip QR etiketi">
   <div className="sticker-brand">FERAH <b>OTOMOTİV</b></div>
   <div className="sticker-caption">SERVİS TAKİP ETİKETİ</div>
   <div className="sticker-qr"><QRCodeSVG value={trackingUrl} size={230} level="H" includeMargin={true} title="Bu araca özel servis takip QR kodu"/></div>
   <div className="sticker-plate">{vehicle.plate}</div>
   <div className="sticker-vehicle">{vehicle.brand} {vehicle.model}</div>
   <div className="sticker-instruction">Servis sürecini takip etmek için QR kodu okutun.</div>
   <div className="sticker-footer">Bu QR kod yalnızca bu servis kaydına aittir.</div>
  </section>
  <p className="sticker-hint">Yazdır penceresinde gerçek boyut veya %100 ölçek seçeneğini kullanın. Etiket yaklaşık 80 × 80 mm olarak hazırlanmıştır.</p>
 </main>;
}
