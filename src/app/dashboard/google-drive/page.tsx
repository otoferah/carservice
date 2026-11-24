import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Cloud, HardDrive, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGoogleDriveConnection } from "@/lib/google-drive";
import GoogleDriveFolderPicker from "./folder-picker";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function GoogleDrivePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles")
    .select("full_name,role,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.role !== "admin") redirect("/dashboard");

  const query = await searchParams;
  let connection: Awaited<ReturnType<typeof getGoogleDriveConnection>> = null;
  let loadError = false;
  try {
    connection = await getGoogleDriveConnection();
  } catch {
    loadError = true;
  }

  const connected = !!connection?.refresh_token;
  const statusMessages: Record<string, string> = {
    connected: "Google hesabı bağlandı. Şimdi mevcut servis görselleri klasörünü seçin.",
    disconnected: "Google Drive bağlantısı kaldırıldı.",
    denied: "Google izin ekranında bağlantı reddedildi.",
    invalid_state: "Güvenlik doğrulaması başarısız oldu. Bağlantıyı yeniden başlatın.",
    session_expired: "Oturum süresi doldu. Yeniden giriş yapıp deneyin.",
    configuration_error: "Google OAuth ayarları eksik.",
    token_exchange_failed: "Google token işlemi başarısız oldu. OAuth istemcisinin ayarlarını kontrol edin.",
    oauth_invalid_client: "Google OAuth istemcisi kabul edilmedi. GOOGLE_CLIENT_ID ile GOOGLE_CLIENT_SECRET aynı OAuth istemcisine ait olmalı.",
    oauth_invalid_grant: "Google yetkilendirme kodunu kabul etmedi. Kod süresi dolmuş veya redirect URI eşleşmiyor olabilir. Bağlantıyı yeniden başlatın.",
    oauth_unauthorized_client: "Google OAuth istemcisinin bu yetkilendirme işlemi için izni yok. OAuth istemci türünü ve kapsam ayarlarını kontrol edin.",
    missing_refresh_token: "Google yenileme anahtarı göndermedi. Bağlantıyı yeniden başlatıp izin ekranını onaylayın.",
  };

  return (
    <main className="content-wrap" style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <Link href="/dashboard" className="subtle-link"><ArrowLeft size={15}/> Ana panele dön</Link>
      <div className="page-heading" style={{ marginTop: 28 }}>
        <div className="hero-copy">
          <p className="eyebrow">ENTEGRASYONLAR</p>
          <h1>Google Drive bağlantısı</h1>
          <p className="muted">Servis araçlarına ait görselleri Ferah Otomotiv Drive alanında güvenle saklayın.</p>
        </div>
      </div>

      {query.status && <div className="panel" role="status" style={{ marginBottom: 20 }}>
        {statusMessages[query.status] || "İşlem tamamlandı."}
      </div>}

      <section className="panel" style={{ padding: 28 }}>
        <div className="panel-heading">
          <div><h2><HardDrive size={19} style={{ verticalAlign: "middle", marginRight: 8 }}/>Google Drive</h2>
            <p>Ferah Otomotiv - Servis Araç Görselleri</p>
          </div>
          <span className="status-pill"><i/> {loadError ? "Kontrol edilemedi" : connected ? "Bağlı" : "Bağlı değil"}</span>
        </div>

        {loadError ? <p className="form-error">Bağlantı kaydı okunamadı. Veritabanı migration işlemi uygulanmış mı kontrol edin.</p> :
          connected ? <div>
            <p className="muted"><CheckCircle2 size={16} style={{ verticalAlign: "middle", marginRight: 7 }}/> Google hesabı yetkilendirildi.</p>
            <p className="muted small-copy">{connection?.drive_folder_id ? "Servis görselleri klasörü seçildi." : "Henüz bir servis görselleri klasörü seçilmedi."}</p>
            <GoogleDriveFolderPicker currentFolderId={connection?.drive_folder_id || null} />
            <form action="/api/google-drive/disconnect" method="post">
              <button className="outline-button" type="submit">Google Drive bağlantısını kaldır</button>
            </form>
          </div> :
          <div>
            <p className="muted">Bağlantı yalnızca yönetici hesabıyla kurulabilir. Google giriş ekranında Ferah Otomotiv'in Drive erişimine izin vermeniz gerekecek.</p>
            <a className="primary-button" href="/api/google-drive/connect"><Cloud size={16}/> Google hesabını bağla</a>
          </div>
        }
        <p className="muted small-copy" style={{ marginTop: 18 }}>Not: Google OAuth uygulaması Testing durumundayken Drive yenileme izni 7 gün sonra sona erebilir. Kalıcı kullanım öncesinde yayın ve doğrulama gerekliliklerini tamamlayın.</p>
        <div className="bottom-hint" style={{ marginTop: 22 }}><ShieldCheck size={16}/> Uzun ömürlü yenileme anahtarı sunucuda saklanır. Klasör seçimi sırasında yalnızca kısa ömürlü erişim anahtarı yönetici tarayıcısına verilir.</div>
      </section>
    </main>
  );
}
