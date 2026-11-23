"use client";
import {useState} from "react";
import Link from "next/link";
import {Activity,CarFront,ClipboardList,HardDrive,LogOut,Menu,Search,ShieldCheck,Users,Wallet,X} from "lucide-react";

type Props={role:string;fullName:string;roleName:string};
export default function MobileDashboardNav({role,fullName,roleName}:Props){
 const [open,setOpen]=useState(false);
 const manager=["admin","supervisor"].includes(role);
 const close=()=>setOpen(false);
 return <>
  <button type="button" className="mobile-menu-trigger" aria-label="Menüyü aç" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={21}/></button>
  {open&&<div className="mobile-drawer-layer">
   <button className="mobile-drawer-backdrop" aria-label="Menüyü kapat" onClick={close}/>
   <aside className="mobile-drawer" aria-label="Mobil navigasyon">
    <div className="mobile-drawer-head"><img src="/assets/FERAH%20OTOMOT%C4%B0V%20Metalik%20Logo.png" alt="Ferah Otomotiv"/><button type="button" onClick={close} aria-label="Kapat"><X size={21}/></button></div>
    <div className="mobile-drawer-section"><span>ÇALIŞMA ALANI</span>
     <Link href="/dashboard" onClick={close}><Activity/>Genel Bakış</Link>
     <Link href="/tracking" onClick={close}><Search/>Araç Sorgulama</Link>
    </div>
    {manager&&<div className="mobile-drawer-section"><span>YÖNETİM</span>
     <Link href="/dashboard/new" onClick={close}><ClipboardList/>Yeni Servis Kaydı</Link>
     {role==="admin"&&<><Link href="/dashboard/users" onClick={close}><Users/>Personel Yönetimi</Link><Link href="/dashboard/google-drive" onClick={close}><HardDrive/>Google Drive</Link></>}
     <Link href="/dashboard/expenses" onClick={close}><Wallet/>Gider Yönetimi</Link>
    </div>}
    <div className="mobile-drawer-footer"><div className="mobile-drawer-user"><span className="mobile-drawer-avatar">{(fullName||"F").slice(0,1).toUpperCase()}</span><span><b>{fullName}</b><small>{roleName}</small></span><ShieldCheck size={17}/></div><form action="/api/auth/signout" method="post"><button type="submit"><LogOut size={17}/> Güvenli çıkış</button></form></div>
   </aside>
  </div>}
 </>;
}
