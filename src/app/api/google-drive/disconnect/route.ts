import { NextResponse } from "next/server";
import { getGoogleDriveAdminClient, getGoogleDriveConnection, requireGoogleDriveAdmin } from "@/lib/google-drive";

export async function POST() {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json({ error: "Bu işlem için yönetici oturumu gerekiyor." }, { status: access.status });
  }

  try {
    const connection = await getGoogleDriveConnection();
    if (connection?.refresh_token) {
      await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(connection.refresh_token), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    }
    const admin = await getGoogleDriveAdminClient();
    const { error } = await admin.from("google_drive_connections").delete().eq("id", 1);
    if (error) throw error;
    return NextResponse.redirect(new URL("/dashboard/google-drive?status=disconnected", process.env.NEXT_PUBLIC_APP_URL || "https://ferah-otomotiv-servis.otoferah.workers.dev"));
  } catch {
    return NextResponse.json({ error: "Google Drive bağlantısı kaldırılamadı." }, { status: 500 });
  }
}
