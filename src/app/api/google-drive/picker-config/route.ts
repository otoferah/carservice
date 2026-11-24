import { NextResponse } from "next/server";
import { requireGoogleDriveAdmin } from "@/lib/google-drive";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici oturumu gerekiyor." },
      { status: access.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

  if (!apiKey || !appId) {
    return NextResponse.json(
      { error: "Google Picker yapılandırması sunucuda bulunamadı. NEXT_PUBLIC_GOOGLE_API_KEY ve NEXT_PUBLIC_GOOGLE_APP_ID değerlerini Preview Runtime ortamında kontrol edin." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { apiKey, appId },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
