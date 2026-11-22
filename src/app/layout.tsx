import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={
 title:"Ferah Otomotiv | Servis Yönetim",
 description:"Ferah Otomotiv dijital servis, teklif ve araç takip sistemi.",
 applicationName:"Ferah Otomotiv"
};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="tr"><body>{children}</body></html>;
}
