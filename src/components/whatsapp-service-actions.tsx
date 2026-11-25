"use client";
import {useEffect,useState} from "react";
import {MessageCircle,FileDown,Share2} from "lucide-react";
import {buildPrintHtml} from "@/app/dashboard/service/[id]/print-button";

declare global {
  interface Window {
    FerahDesktop?: {
      openWhatsApp: () => Promise<{opened:boolean}>;
      openWhatsAppChat: (phone:string,message?:string) => Promise<{opened:boolean}>;
      savePdf: (customerName?:string,plate?:string,html?:string) => Promise<{canceled:boolean;filePath?:string}>;
      revealFile: (filePath:string) => Promise<{opened:boolean}>;
    };
    FerahAndroid?: {
      printPdf: () => void;
      savePdfAndOpenWhatsApp: (phone:string,message:string,html:string,fileName:string) => void;
      shareLatestPdf: (message:string) => void;
      openWhatsAppChat: (phone:string,message:string) => void;
    };
  }
}

type Props={phone:string;customerName:string;plate:string;quoteTotal:number;trackingUrl:string};
export default function WhatsAppServiceActions({phone,customerName,plate,quoteTotal,trackingUrl}:Props){
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [isAndroid,setIsAndroid]=useState(false);
  useEffect(()=>setIsAndroid(!!window.FerahAndroid),[]);
  const message="Merhaba "+customerName+", "+plate+" plakalı aracınızın servis teklifi hazır. Teklif tutarı: "+quoteTotal.toLocaleString("tr-TR",{minimumFractionDigits:2})+" TL. Araç servis durumunu buradan takip edebilirsiniz: "+trackingUrl;

  const openChat=async()=>{
    setBusy(true);setError("");setStatus("");
    try{
      if(window.FerahAndroid?.openWhatsAppChat){
        window.FerahAndroid.openWhatsAppChat(phone,message);
      }else if(window.FerahDesktop?.openWhatsAppChat){
        await window.FerahDesktop.openWhatsAppChat(phone,message);
      }else{
        const digits=phone.replace(/\D/g,"");
        const normalized=digits.startsWith("0")?"90"+digits.slice(1):digits.startsWith("90")?digits:digits.length===10?"90"+digits:"";
        if(!/^90[0-9]{10}$/.test(normalized))throw new Error("Müşterinin telefon numarası geçerli değil.");
        window.open("https://wa.me/"+normalized+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
      }
      setStatus("Müşterinin WhatsApp sohbeti açılıyor. Mesajı kontrol edip kendiniz gönderebilirsiniz.");
    }catch(e){setError(e instanceof Error?e.message:"WhatsApp açılamadı.");}
    finally{setBusy(false);}
  };

  const saveAndOpen=async()=>{
    setBusy(true);setError("");setStatus("");
    try{
      if(window.FerahAndroid?.savePdfAndOpenWhatsApp){
        const html=buildPrintHtml(customerName,plate);
        const safe=(customerName+"-"+plate+"-Teklif").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-zA-Z0-9._-]+/g,"_");
        window.FerahAndroid.savePdfAndOpenWhatsApp(phone,message,html,safe+".pdf");
        setStatus("PDF hazırlanıyor ve telefona kaydediliyor. Ardından müşterinin WhatsApp sohbeti açılacak.");
        return;
      }
      if(!window.FerahDesktop?.savePdf||!window.FerahDesktop?.openWhatsAppChat||!window.FerahDesktop?.revealFile){
        throw new Error("Bu özellik yalnızca Ferah Otomotiv Windows ve Android uygulamalarında kullanılabilir.");
      }
      const html=buildPrintHtml(customerName,plate);
      const saved=await window.FerahDesktop.savePdf(customerName,plate,html);
      if(saved.canceled||!saved.filePath){setStatus("PDF kaydetme işlemi iptal edildi.");return;}
      await window.FerahDesktop.openWhatsAppChat(phone,message);
      await window.FerahDesktop.revealFile(saved.filePath);
      setStatus("PDF kaydedildi. WhatsApp sohbeti ve dosyanın bulunduğu klasör açıldı. PDF'yi sohbete ekleyip Gönder'e basabilirsiniz.");
    }catch(e){setError(e instanceof Error?e.message:"PDF veya WhatsApp işlemi tamamlanamadı.");}
    finally{setBusy(false);}
  };

  const sharePdf=()=>{
    setError("");setStatus("");
    if(!window.FerahAndroid?.shareLatestPdf){
      setError("Önce Android uygulamasında teklif PDF'sini kaydedin.");
      return;
    }
    window.FerahAndroid.shareLatestPdf(message);
    setStatus("Android paylaşım menüsü açılıyor. WhatsApp'ı seçerek PDF'yi paylaşabilirsiniz.");
  };

  return <section className="detail-panel">
    <h2><MessageCircle size={17}/> WhatsApp ile müşteri iletişimi</h2>
    <p className="muted small-copy">Kayıtlı müşteri numarası: {phone||"Telefon numarası yok"}</p>
    <div style={{display:"grid",gap:8}}>
      <button type="button" className="outline-button" onClick={openChat} disabled={busy||!phone}><MessageCircle size={16}/> WhatsApp sohbetini aç</button>
      <button type="button" className="primary-button" onClick={saveAndOpen} disabled={busy||!phone}><FileDown size={16}/> {busy?"Hazırlanıyor…":"Teklif PDF'sini kaydet ve WhatsApp'ta hazırla"}</button>
      {isAndroid&&<button type="button" className="outline-button" onClick={sharePdf} disabled={busy}><Share2 size={16}/> Kaydedilen PDF'yi paylaş</button>}
    </div>
    {status&&<p className="small-copy" role="status" style={{color:"#55c99a",marginTop:10}}>{status}</p>}
    {error&&<p className="small-copy" role="alert" style={{color:"#e6a15b",marginTop:10}}>{error}</p>}
    {isAndroid&&<p className="muted small-copy">PDF, İndirilenler/Ferah Otomotiv klasörüne kaydedilir. WhatsApp sohbeti müşteri numarasıyla açılır; dosyayı paylaşmak için ayrıca “Kaydedilen PDF'yi paylaş” seçeneğini kullanabilirsiniz.</p>}
  </section>;
}
