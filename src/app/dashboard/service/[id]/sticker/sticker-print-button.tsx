"use client";
import {Printer} from "lucide-react";
export default function StickerPrintButton(){
 return <button type="button" className="primary-button sticker-print-button" onClick={()=>window.print()}><Printer size={16}/> QR sticker yazdır / PDF kaydet</button>;
}
