import { NextResponse } from "next/server";
import { getGoogleAccessToken, requireGoogleDriveAdmin } from "@/lib/google-drive";

export async function GET() {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json({ error: "Bu işlem için yönetici oturumu gerekiyor." }, { status: access.status });
  }

  try {
    // Picker needs a short-lived access token in the admin's browser.
    // The long-lived refresh token remains server-side in Supabase.
    const accessToken = await getGoogleAccessToken();
    return NextResponse.json({ accessToken }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch {
    return NextResponse.json({ error: "Google Drive erişim anahtarı alınamadı." }, { status: 500 });
  }
}
