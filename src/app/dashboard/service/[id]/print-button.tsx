"use client";

import { useState } from "react";
import { FileDown, MessageCircle, LoaderCircle } from "lucide-react";

type PdfWorker = {
  set: (options: Record<string, unknown>) => PdfWorker;
  from: (element: HTMLElement) => PdfWorker;
  toPdf: () => PdfWorker;
  get: (key: string) => Promise<{ output: (type: string) => Promise<Blob> }>;
};

declare global {
  interface Window {
    FerahAndroid?: { printPdf: () => void };
    html2pdf?: () => PdfWorker;
  }
}

const PDF_LIBRARY_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.3/html2pdf.bundle.min.js";

function loadPdfLibrary() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ferah-pdf="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("PDF kütüphanesi yüklenemedi.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = PDF_LIBRARY_URL;
    script.async = true;
    script.dataset.ferahPdf = "true";
    script.onload = () => window.html2pdf ? resolve() : reject(new Error("PDF oluşturucu başlatılamadı."));
    script.onerror = () => reject(new Error("PDF oluşturucu yüklenemedi. İnternet bağlantınızı kontrol edin."));
    document.head.appendChild(script);
  });
}

function normalizePhone(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "90" + digits.slice(1);
  else if (digits.length === 10) digits = "90" + digits;
  return digits;
}

export default function PrintQuoteButton({ customerPhone }: { customerPhone: string | null }) {
  const [sharing, setSharing] = useState(false);
  const [creatingPdf, setCreatingPdf] = useState(false);

  const createPdfBlob = async () => {
    const source = document.querySelector<HTMLElement>(".print-only-quote");
    if (!source) throw new Error("Teklif formu bulunamadı.");

    await loadPdfLibrary();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.display = "block";
    clone.style.visibility = "visible";
    clone.style.position = "fixed";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    clone.classList.add("ferah-pdf-export");
    clone.style.cssText = [
      "display:block",
      "visibility:visible",
      "position:fixed",
      "left:-10000px",
      "top:0",
      "width:210mm",
      "max-width:210mm",
      "min-width:210mm",
      "box-sizing:border-box",
      "margin:0",
      "padding:10mm",
      "background:#ffffff",
      "color:#17251e",
      "z-index:-1",
      "font-family:Arial,Helvetica,sans-serif",
      "font-size:9pt",
      "line-height:1.3"
    ].join(";");
    const exportStyle = document.createElement("style");
    exportStyle.textContent = `
      .ferah-pdf-export, .ferah-pdf-export * { box-sizing:border-box !important; }
      .ferah-pdf-export { display:block !important; width:210mm !important; min-width:210mm !important; max-width:210mm !important; min-height:0 !important; height:auto !important; margin:0 !important; padding:10mm !important; border:0 !important; outline:0 !important; box-shadow:none !important; background:#fff !important; color:#17251e !important; overflow:visible !important; }
      .ferah-pdf-export .quote-document-header { display:grid !important; grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr) !important; gap:4mm !important; padding-bottom:5mm !important; border-bottom:1.2mm solid #176b4b !important; }
      .ferah-pdf-export .quote-document-header.has-vehicle-photo { grid-template-columns:27mm minmax(0,1fr) minmax(0,1.2fr) auto !important; }
      .ferah-pdf-export .quote-vehicle-photo { width:27mm !important; height:22mm !important; overflow:hidden !important; }
      .ferah-pdf-export .quote-vehicle-photo img { width:100% !important; height:100% !important; object-fit:cover !important; }
      .ferah-pdf-export .quote-customer-grid { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:3mm !important; margin:5mm 0 !important; }
      .ferah-pdf-export .quote-info-card { min-width:0 !important; padding:3mm !important; overflow-wrap:anywhere !important; }
      .ferah-pdf-export .quote-premium-table { display:table !important; width:100% !important; table-layout:fixed !important; border-collapse:collapse !important; margin:0 !important; }
      .ferah-pdf-export .quote-premium-table th { background:#173b2d !important; color:#fff !important; padding:2.5mm 2mm !important; font-size:7pt !important; }
      .ferah-pdf-export .quote-premium-table td { color:#27352d !important; padding:2.5mm 2mm !important; font-size:8pt !important; overflow-wrap:anywhere !important; }
      .ferah-pdf-export .quote-total-panel { display:flex !important; justify-content:space-between !important; align-items:center !important; gap:4mm !important; margin:4mm 0 !important; padding:4mm !important; background:#f0f5f1 !important; }
      .ferah-pdf-export .quote-bottom-row { display:grid !important; grid-template-columns:minmax(0,1fr) 42mm !important; gap:5mm !important; margin-top:5mm !important; padding-top:4mm !important; }
      .ferah-pdf-export .quote-tracking-qr { display:flex !important; width:42mm !important; padding:2mm !important; }
      .ferah-pdf-export .quote-qr-frame svg { width:30mm !important; height:30mm !important; }
      .ferah-pdf-export .quote-document-footer { display:flex !important; justify-content:space-between !important; gap:3mm !important; margin-top:5mm !important; padding-top:2mm !important; border-top:.25mm solid #dce5df !important; }
      .ferah-pdf-export img { max-width:100% !important; }
      .ferah-pdf-export .quote-premium-table { break-inside:auto !important; page-break-inside:auto !important; }
      .ferah-pdf-export .quote-premium-table thead { display:table-header-group !important; }
      .ferah-pdf-export .quote-premium-table tr, .ferah-pdf-export .quote-customer-grid, .ferah-pdf-export .quote-total-panel, .ferah-pdf-export .quote-bottom-row { break-inside:avoid !important; page-break-inside:avoid !important; }
    `;
    clone.prepend(exportStyle);
    document.body.appendChild(clone);

    try {
      const images = Array.from(clone.querySelectorAll("img"));
      await Promise.all(images.map(img => {
        img.crossOrigin = "anonymous";
        if (img.complete) return Promise.resolve();
        return new Promise<void>(resolve => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }));

      const worker = window.html2pdf!().set({
        margin: [0, 0, 0, 0],
        filename: "Ferah-Otomotiv-Teklif.pdf",
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] }
      }).from(clone).toPdf();
      const pdf = await worker.get("pdf");
      return await pdf.output("blob");
    } finally {
      clone.remove();
    }
  };

  const shareOnWhatsApp = async () => {
    const phone = customerPhone ? normalizePhone(customerPhone) : "";
    if (!phone || phone.length < 10) {
      window.alert("Müşterinin kayıtlı telefon numarası geçerli değil. Önce müşteri telefonunu kontrol edin.");
      return;
    }

    setSharing(true);
    try {
      const blob = await createPdfBlob();
      const file = new File([blob], "Ferah-Otomotiv-Teklif.pdf", { type: "application/pdf" });
      const message = "Merhaba, Ferah Otomotiv servis teklif formunuz ekte yer almaktadır.";

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Ferah Otomotiv Teklif Formu", text: message });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

      const whatsappUrl = "https://wa.me/" + phone + "?text=" + encodeURIComponent(message + " PDF dosyasını birazdan ekleyebilirsiniz.");
      window.alert("PDF indirildi. WhatsApp sohbetinde dosyayı ekleyip Gönder tuşuna dokunun.");
      window.location.assign(whatsappUrl);
      window.alert("PDF cihazınıza indirildi. WhatsApp sohbeti açıldığında indirilen PDF dosyasını mesaja ekleyip Gönder'e dokunun.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      window.alert(error instanceof Error ? error.message : "PDF hazırlanırken bir hata oluştu.");
    } finally {
      setSharing(false);
    }
  };

  const createPdf = async () => {
    if (window.FerahAndroid?.printPdf) {
      window.FerahAndroid.printPdf();
      return;
    }

    setCreatingPdf(true);
    try {
      const blob = await createPdfBlob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "Ferah-Otomotiv-Teklif.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "PDF oluşturulurken bir hata oluştu.");
    } finally {
      setCreatingPdf(false);
    }
  };

  return (
    <div className="quote-share-actions">
      <button type="button" className="primary-button" onClick={shareOnWhatsApp} disabled={sharing || !customerPhone}>
        {sharing ? <LoaderCircle size={16} className="spin" /> : <MessageCircle size={16} />}
        {sharing ? "PDF hazırlanıyor…" : "PDF'yi WhatsApp'ta gönder"}
      </button>
      <button type="button" className="outline-button print-quote-button" onClick={createPdf} disabled={creatingPdf}>
        {creatingPdf ? <LoaderCircle size={16} className="spin" /> : <FileDown size={16} />}
        {creatingPdf ? "PDF hazırlanıyor…" : "PDF oluştur / indir"}
      </button>
    </div>
  );
}
