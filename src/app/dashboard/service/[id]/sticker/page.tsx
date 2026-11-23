import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {ArrowLeft} from "lucide-react";
import {QRCodeSVG} from "qrcode.react";
import StickerPrintButton from "./sticker-print-button";
import {createClient} from "@/lib/supabase/server";
import {publicTrackingUrl} from "@/lib/public-tracking";

export default async function VehicleStickerPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active)redirect("/login");
 const {data:record}=await supabase.from("service_records").select("tracking_token").eq("id",id).maybeSingle();
 if(!record?.tracking_token)notFound();
 const trackingUrl="https://ferah-otomotiv-servis.vercel.app/tracking?token="+record.tracking_token;
 return <main className="sticker-page sticker-plain-page">
  <header className="sticker-toolbar">
   <Link href={"/dashboard/service/"+id} className="back-link"><ArrowLeft size={16}/> Servis dosyasına dön</Link>
   <StickerPrintButton/>
  </header>
  <section className="plain-qr-print" aria-label="Bu servis kaydına özel QR kod">
   <QRCodeSVG value={trackingUrl} size={420} level="H" includeMargin={true} title="Araç servis takip QR kodu"/>
  </section>
  <p className="sticker-hint">QR kodu okutan müşteri doğrudan bu aracın servis takip panelini görür.</p>
 </main>;
}
