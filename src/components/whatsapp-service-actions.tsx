"use client";
import {useState} from "react";
import {MessageCircle,FileDown} from "lucide-react";

declare global { interface Window { FerahDesktop?: { openWhatsApp: () => Promise<{opened:boolean}>; openWhatsAppChat: (phone:string,message?:string) => Promise<{opened:boolean}>; savePdf: (customerName?:string) => Promise<{canceled:boolean;filePath?:string}>; revealFile: (filePath:string) => Promise<{opened:boolean}>; } } }

type Props={phone:string;customerName:string;plate:string;quoteTotal:number;trackingUrl:string};
export default function WhatsAppServiceActions({phone,customerName,plate,quoteTotal,trackingUrl}:Props){
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const message=`Merhaba ${customerName}, ${plate} plakalı aracınızın servis teklifi hazır. Teklif tutarı: ${quoteTotal.toLocaleString("tr-TR",{minimumFractionDigits:2})} TL. Araç servis durumunu buradan takip edebilirsiniz: ${trackingUrl}`;
  const openChat=async()=>{
    setBusy(true);setError("");setStatus("");
    try{
      if(window.FerahDesktop?.openWhatsAppChat){
        await window.FerahDesktop.openWhatsAppChat(phone,message);
      }else{
        const digits=phone.replace(/\D/g,"");
        const normalized=digits.startsWith("0")?"90"+digits.slice(1):digits.startsWith("90")?digits:digits.length===10?"90"+digits:"";
        if(!/^90[0-9]{10}$/.test(normalized))throw new Error("Müşterinin telefon numarası geçerli değil.");
        window.open("https://wa.me/"+normalized+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");
      }
      setStatus("WhatsApp sohbeti açıldı. Mesajı kontrol edip kendiniz gönderebilirsiniz.");
    }catch(e){setError(e instanceof Error?e.message:"WhatsApp açılamadı.");}
    finally{setBusy(false);}
  };
  const saveAndOpen=async()=>{
    setBusy(true);setError("");setStatus("");
    try{
      if(!window.FerahDesktop?.savePdf||!window.FerahDesktop?.openWhatsAppChat||!window.FerahDesktop?.revealFile){
        throw new Error("PDF'yi kaydedip WhatsApp Desktop'a hazırlama özelliği yalnızca Ferah Otomotiv Windows uygulamasında kullanılabilir.");
      }
      const saved=await window.FerahDesktop.savePdf(customerName);
      if(saved.canceled||!saved.filePath){setStatus("PDF kaydetme işlemi iptal edildi.");return;}
      await window.FerahDesktop.openWhatsAppChat(phone,message);
      await window.FerahDesktop.revealFile(saved.filePath);
      setStatus("PDF kaydedildi. WhatsApp sohbeti ve dosyanın bulunduğu klasör açıldı. PDF'yi sohbete ekleyip Gönder'e basabilirsiniz.");
    }catch(e){setError(e instanceof Error?e.message:"PDF veya WhatsApp işlemi tamamlanamadı.");}
    finally{setBusy(false);}
  };
  return <section className="detail-panel">
    <h2><MessageCircle size={17}/> WhatsApp ile müşteri iletişimi</h2>
    <p className="muted small-copy">Kayıtlı müşteri numarası: {phone||"Telefon numarası yok"}</p>
    <div style={{display:"grid",gap:8}}>
      <button type="button" className="outline-button" onClick={openChat} disabled={busy||!phone}><MessageCircle size={16}/> WhatsApp sohbetini aç</button>
      <button type="button" className="primary-button" onClick={saveAndOpen} disabled={busy||!phone}><FileDown size={16}/> {busy?"Hazırlanıyor…":"Teklif PDF'sini kaydet ve WhatsApp'ta hazırla"}</button>
    </div>
    {status&&<p className="small-copy" role="status" style={{color:"#55c99a",marginTop:10}}>{status}</p>}
    {error&&<p className="small-copy" role="alert" style={{color:"#e6a15b",marginTop:10}}>{error}</p>}
  </section>;
}
