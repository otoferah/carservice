"use client";

import { FileDown } from "lucide-react";

declare global {
  interface Window {
    FerahDesktop?: { savePdf: (customerName?: string) => Promise<{canceled:boolean;filePath?:string}> };
    FerahAndroid?: {
      printPdf: () => void;
    };
  }
}

export default function PrintQuoteButton({customerName}:{customerName:string}) {
  const createPdf = () => {
    // Native Android WebView does not implement window.print().
    // The installed Ferah app exposes a native PrintManager bridge.
    if (window.FerahAndroid?.printPdf) {
      window.FerahAndroid.printPdf();
      return;
    }

    if (window.FerahDesktop?.savePdf) {
      void window.FerahDesktop.savePdf(customerName);
      return;
    }

    // Chrome, including Android Chrome, opens the system print dialog.
    // Users can select "Save as PDF" to create the quote PDF.
    const previousTitle=document.title;\n    document.title=(customerName||"Müşteri").replace(/[^\\p{L}\\p{N} -]/gu,"").trim()+" - Servis Teklifi";\n    window.print();\n    document.title=previousTitle;
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
