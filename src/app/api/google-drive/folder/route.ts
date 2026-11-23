import { NextResponse } from "next/server";
import { getGoogleAccessToken, requireGoogleDriveAdmin, saveGoogleDriveFolderId } from "@/lib/google-drive";

export async function POST(request: Request) {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json({ error: "Bu işlem için yönetici oturumu gerekiyor." }, { status: access.status });
  }

  const body = await request.json().catch(() => null) as { folderId?: string } | null;
  const folderId = body?.folderId?.trim();
  if (!folderId || !/^[a-zA-Z0-9_-]{10,}$/.test(folderId)) {
    return NextResponse.json({ error: "Geçerli bir klasör seçilmedi." }, { status: 400 });
  }

  try {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(folderId) + "?fields=id,name,mimeType",
      { headers: { Authorization: "Bearer " + accessToken } },
    );
    const file = await response.json() as { id?: string; name?: string; mimeType?: string };
    if (!response.ok || file.mimeType !== "application/vnd.google-apps.folder" || file.id !== folderId) {
      return NextResponse.json({ error: "Seçilen klasöre erişilemiyor veya seçim bir klasör değil." }, { status: 400 });
    }

    await saveGoogleDriveFolderId(folderId);
    return NextResponse.json({ saved: true, folderName: file.name || "Google Drive klasörü" });
  } catch {
    return NextResponse.json({ error: "Seçilen klasör kaydedilemedi." }, { status: 500 });
  }
}
