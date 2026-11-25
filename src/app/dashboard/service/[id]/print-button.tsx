"use client";

import { FileDown } from "lucide-react";

declare global { interface Window { FerahDesktop?: { openWhatsApp: () => Promise<{opened:boolean}>; openWhatsAppChat: (phone:string,message?:string) => Promise<{opened:boolean}>; savePdf: (customerName?:string,plate?:string) => Promise<{canceled:boolean;filePath?:string}>; revealFile: (filePath:string) => Promise<{opened:boolean}>; }; FerahAndroid?: { printPdf: () => void; }; } }

export default function PrintQuoteButton({customerName,plate}:{customerName:string;plate:string}) {
  const createPdf = () => {
    // Native Android WebView does not implement window.print().
    // The installed Ferah app exposes a native PrintManager bridge.
    if (window.FerahAndroid?.printPdf) {
      window.FerahAndroid.printPdf();
      return;
    }

    if (window.FerahDesktop?.savePdf) {
      void window.FerahDesktop.savePdf(customerName,plate);
      return;
    }

    // Chrome, including Android Chrome, opens the system print dialog.
    // Users can select "Save as PDF" to create the quote PDF.
    const previousTitle=document.title;
    document.title=[customerName||"Müşteri",plate||"Plaka","Teklif"].join(" - ");
    window.print();
    document.title=previousTitle;
  };

  return (
    <button
      type="button"
      className="outline-button print-quote-button"
      onClick={createPdf}
    >
      <FileDown size={16} />
      PDF oluştur / indir
    </button>
  );
}
