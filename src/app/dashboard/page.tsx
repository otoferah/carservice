import Link from "next/link";
import {redirect} from "next/navigation";
import {Activity,ArrowUpRight,CarFront,ClipboardList,LogOut,Plus,Search,ShieldCheck,Users,Wrench} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {statusLabels,type ServiceStatus} from "@/lib/types";
type ServiceRow={id:string;status:ServiceStatus;quote_total:number;quote_date:string;created_at:string;customers:{full_name:string}|null;vehicles:{plate:string;brand:string;model:string}|null};
export default async function DashboardPage(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const [{data:profile},{data:records},{count:staffCount}]=await Promise.all([
  supabase.from("profiles").select("full_name,role,is_active").eq("id",user.id).maybeSingle(),
  supabase.from("service_records").select("id,status,quote_total,quote_date,created_at,customers(full_name),vehicles(plate,brand,model)").order("created_at",{ascending:false}).limit(100),
  supabase.from("profiles").select("*",{count:"exact",head:true}).eq("is_active",true)
 ]);
 if(!profile?.is_active)redirect("/login");
 const rows=(records??[]) as unknown as ServiceRow[];
 const active=rows.filter(r=>!["delivered","cancelled"].includes(r.status)).length;
 const ready=rows.filter(r=>r.status==="ready").length;
 const total=rows.reduce((sum,r)=>sum+Number(r.quote_total||0),0);
 const roleName=profile.role==="admin"?"Yönetici":profile.role==="supervisor"?"Supervisor":"Usta";
 return <main className="app-shell">
  <aside className="sidebar">
   <Link href="/dashboard" className="side-brand"><span className="brand-icon"><Wrench size={20}/></span><span>FERAH <b>OTOMOTİV</b><small>SERVİS YÖNETİMİ</small></span></Link>
   <div className="side-section">ÇALIŞMA ALANI</div>
   <Link className="side-link active" href="/dashboard"><Activity size={18}/> Genel Bakış</Link>
   <Link className="side-link" href="/tracking"><Search size={18}/> Araç Sorgulama</Link>
   <div className="side-section">YÖNETİM</div>
   {["admin","supervisor"].includes(profile.role)&&<Link className="side-link" href="/dashboard/new"><ClipboardList size={18}/> Yeni Servis Kaydı</Link>}
   {profile.role==="admin"&&<Link className="side-link" href="/dashboard/users"><Users size={18}/> Personel Yönetimi</Link>}
   <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(profile.full_name||"F").slice(0,1).toUpperCase()}</div><div><b>{profile.full_name}</b><small>{roleName}</small></div><ShieldCheck size={16}/></div><form action="/api/auth/signout" method="post"><button className="side-link signout" type="submit"><LogOut size={17}/> Güvenli çıkış</button></form></div>
  </aside>
  <section className="main-area"><header className="topbar"><div><span className="breadcrumb">Ferah Otomotiv /</span> Genel Bakış</div><div className="top-actions"><span className="status-pill"><i/> Sistem aktif</span><span className="top-avatar">{(profile.full_name||"F").slice(0,1).toUpperCase()}</span></div></header>
   <div className="content-wrap">
    <div className="page-heading"><div><p className="eyebrow">SERVİS OPERASYONLARI</p><h1>Hoş geldin, {profile.full_name?.split(" ")[0]||"Ekibimiz"}.</h1><p className="muted">Atölyedeki araçları ve servis süreçlerini buradan takip et.</p></div>{["admin","supervisor"].includes(profile.role)&&<Link className="primary-button action-link" href="/dashboard/new"><Plus size={18}/> Yeni servis kaydı</Link>}</div>
    <div className="stats-grid">
     <article className="stat-card"><div className="stat-top"><span>Aktif servis</span><span className="stat-icon"><CarFront size={18}/></span></div><strong>{active}</strong><small>Henüz teslim edilmemiş araç</small></article>
     <article className="stat-card"><div className="stat-top"><span>Teslime hazır</span><span className="stat-icon green"><ShieldCheck size={18}/></span></div><strong>{ready}</strong><small>Yetkili teslim onayı bekliyor</small></article>
     <article className="stat-card"><div className="stat-top"><span>Personel</span><span className="stat-icon"><Users size={18}/></span></div><strong>{["admin","supervisor"].includes(profile.role)?(staffCount??"—"):"—"}</strong><small>Aktif ekip üyesi</small></article>
     <article className="stat-card"><div className="stat-top"><span>Teklif toplamı</span><span className="stat-icon"><ClipboardList size={18}/></span></div><strong>{total.toLocaleString("tr-TR")} ₺</strong><small>Son 100 servis kaydının toplamı</small></article>
    </div>
    <section className="panel"><div className="panel-heading"><div><h2>Son servis kayıtları</h2><p>En son oluşturulan araçlar</p></div>{["admin","supervisor"].includes(profile.role)&&<Link href="/dashboard/new" className="subtle-link">Kayıt oluştur <ArrowUpRight size={15}/></Link>}</div>
     <div className="table-scroll"><table><thead><tr><th>ARAÇ</th><th>MÜŞTERİ</th><th>TEKLİF TARİHİ</th><th>DURUM</th><th>TUTAR</th><th>İŞLEM</th></tr></thead><tbody>
      {rows.length?rows.map(r=><tr key={r.id}><td><b>{r.vehicles?.plate||"—"}</b><small>{r.vehicles?.brand} {r.vehicles?.model}</small></td><td>{r.customers?.full_name||"—"}</td><td>{new Date(r.quote_date+"T12:00:00").toLocaleDateString("tr-TR")}</td><td><span className={"status-tag status-"+r.status}>{statusLabels[r.status]||r.status}</span></td><td>{Number(r.quote_total).toLocaleString("tr-TR")} ₺</td><td><Link href={"/dashboard/service/"+r.id} className="subtle-link">Dosyayı aç <ArrowUpRight size={14}/></Link></td></tr>):<tr><td colSpan={6} className="empty-cell">Henüz servis kaydı bulunmuyor. İlk kaydı oluşturarak başlayın.</td></tr>}
     </tbody></table></div>
    </section>
    <div className="bottom-hint"><Wrench size={16}/> Teklif, servis aşamaları, ekip görevlendirme ve QR takip akışı tek platformda.</div>
   </div>
  </section>
 </main>;
}
