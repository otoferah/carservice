"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Activity,ClipboardList,HardDrive,Search,Users,Wallet} from "lucide-react";

type Props={role:string};
export default function MobileDashboardNav({role}:Props){
 const path=usePathname();
 const manager=["admin","supervisor"].includes(role);
 const items=[
  {href:"/dashboard",label:"Genel Bakış",short:"Ana Sayfa",icon:Activity,show:true},
  {href:"/tracking",label:"Araç Sorgulama",short:"Sorgula",icon:Search,show:true},
  {href:"/dashboard/new",label:"Yeni Servis Kaydı",short:"Yeni Kayıt",icon:ClipboardList,show:manager},
  {href:"/dashboard/users",label:"Personel Yönetimi",short:"Personel",icon:Users,show:role==="admin"},
  {href:"/dashboard/google-drive",label:"Google Drive",short:"Drive",icon:HardDrive,show:role==="admin"},
  {href:"/dashboard/expenses",label:"Gider Yönetimi",short:"Giderler",icon:Wallet,show:manager}
 ].filter(x=>x.show);
 return <nav className="mobile-bottom-nav" aria-label="Mobil ana navigasyon" style={{gridTemplateColumns:`repeat(${items.length},minmax(0,1fr))`}}>
  {items.map(item=>{const active=item.href==="/dashboard"?path==="/dashboard":path===item.href||path.startsWith(item.href+"/");const Icon=item.icon;return <Link key={item.href} href={item.href} className={active?"active":""} aria-label={item.label} aria-current={active?"page":undefined} title={item.label}><Icon size={20} strokeWidth={active?2.3:1.8}/><span>{item.short}</span></Link>;})}
 </nav>;
}
