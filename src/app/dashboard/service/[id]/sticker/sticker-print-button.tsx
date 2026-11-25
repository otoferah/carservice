"use client";
import {Printer} from "lucide-react";
declare global { interface Window { FerahDesktop?: {
  openWhatsApp: () => Promise<{opened:boolean}>;
  openWhatsAppChat: (phone:string,message?:string) => Promise<{opened:boolean}>;
  savePdf: (customerName?:string) => Promise<{canceled:boolean;filePath?:string}>;
  revealFile: (filePath:string) => Promise<{opened:boolean}>;
};> } } }
export default function StickerPrintButton(){
 const print=()=>{if(window.FerahDesktop?.savePdf){void window.FerahDesktop.savePdf();}else{window.print();}};
 return <button type="button" className="primary-button sticker-print-button" onClick={print}><Printer size={16}/> QR sticker yazdır / PDF kaydet</button>;
}
