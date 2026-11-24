"use client";

import { FileDown } from "lucide-react";

declare global {
  interface Window {
    FerahAndroid?: {
      printPdf: () => void;
    };
  }
}

export default function PrintQuoteButton() {
  const createPdf = () => {
    // Native Android WebView does not implement window.print().
    // The installed Ferah app exposes a native PrintManager bridge.
    if (window.FerahAndroid?.printPdf) {
      window.FerahAndroid.printPdf();
      return;
    }

    // Chrome, including Android Chrome, opens the system print dialog.
    // Users can select "Save as PDF" to create the quote PDF.
    window.print();
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
