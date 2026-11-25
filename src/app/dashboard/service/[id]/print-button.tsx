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
    clone.style.width = "794px";
    clone.style.maxWidth = "794px";
    clone.style.background = "#ffffff";
    clone.style.zIndex = "-1";
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
        margin: [8, 8, 8, 8],
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

  const createPdf = () => {
    if (window.FerahAndroid?.printPdf) {
      window.FerahAndroid.printPdf();
      return;
    }
    window.print();
  };

  return (
    <div className="quote-share-actions">
      <button type="button" className="primary-button" onClick={shareOnWhatsApp} disabled={sharing || !customerPhone}>
        {sharing ? <LoaderCircle size={16} className="spin" /> : <MessageCircle size={16} />}
        {sharing ? "PDF hazırlanıyor…" : "PDF'yi WhatsApp'ta gönder"}
      </button>
      <button type="button" className="outline-button print-quote-button" onClick={createPdf}>
        <FileDown size={16} /> PDF oluştur / yazdır
      </button>
    </div>
  );
}
