import type {Metadata,Viewport} from "next";
import PWARegister from "./pwa-register";
import "./globals.css";

export const metadata:Metadata={
 title:"Ferah Otomotiv | Servis Yönetim",
 description:"Ferah Otomotiv dijital servis, teklif ve araç takip sistemi.",
 applicationName:"Ferah Otomotiv",
 manifest:"/manifest.webmanifest",
 appleWebApp:{
  capable:true,
  title:"Ferah Servis",
  statusBarStyle:"black-translucent"
 },
 icons:{
  icon:[{url:"/ferah-app-icon.svg",type:"image/svg+xml"}],
  apple:[{url:"/ferah-app-icon.svg",type:"image/svg+xml"}]
 },
 formatDetection:{telephone:false}
};

export const viewport:Viewport={
 width:"device-width",
 initialScale:1,
 viewportFit:"cover",
 themeColor:"#08090B"
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="tr"><body><PWARegister/>{children}</body></html>;
}
