"use client";

import { Printer } from "lucide-react";

export default function PrintQuoteButton() {
  return (
    <button
      type="button"
      className="outline-button print-quote-button"
      onClick={() => window.print()}
    >
      <Printer size={16} />
      Teklifi yazdır / PDF kaydet
    </button>
  );
}
