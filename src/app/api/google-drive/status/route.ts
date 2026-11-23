import { NextResponse } from "next/server";
import { getGoogleDriveConnection, requireGoogleDriveAdmin } from "@/lib/google-drive";

export async function GET() {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json({ error: "Bu işlem için yönetici oturumu gerekiyor." }, { status: access.status });
  }
  try {
    const connection = await getGoogleDriveConnection();
    return NextResponse.json({
      connected: !!connection?.refresh_token,
      folderReady: !!connection?.drive_folder_id,
      connectedAt: connection?.connected_at || null,
    });
  } catch {
    return NextResponse.json({ error: "Google Drive bağlantı durumu okunamadı." }, { status: 500 });
  }
}
