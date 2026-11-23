import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getGoogleAccessToken,
  getGoogleDriveAdminClient,
  getGoogleDriveConnection,
} from "@/lib/google-drive";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let imageId: string | null = null;
  let stage = "yetkilendirme";
  let admin: Awaited<ReturnType<typeof getGoogleDriveAdminClient>> | null = null;

  try {
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return jsonError("Oturum gerekli.", 401);

    const { data: profile } = await session
      .from("profiles")
      .select("role,is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_active || !["admin", "supervisor"].includes(profile.role)) {
      return jsonError("Fotoğrafları Drive'a aktarma yetkiniz yok.", 403);
    }

    const body = await request.json() as { serviceRecordId?: string; storagePath?: string };
    const serviceRecordId = body.serviceRecordId?.trim();
    const storagePath = body.storagePath?.trim();
    if (!serviceRecordId || !storagePath || !storagePath.startsWith(serviceRecordId + "/")) {
      return jsonError("Geçersiz servis kaydı veya görsel yolu.", 400);
    }

    stage = "Supabase servis görseli kaydını okuma";
    admin = await getGoogleDriveAdminClient();
    const { data: image, error: imageError } = await admin
      .from("service_images")
      .select("id,service_record_id,storage_path,caption,google_drive_file_id")
      .eq("service_record_id", serviceRecordId)
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (imageError) throw imageError;
    if (!image) return jsonError("Servis görseli bulunamadı.", 404);
    imageId = image.id;

    if (image.google_drive_file_id) {
      return NextResponse.json({
        success: true,
        alreadySynced: true,
        fileId: image.google_drive_file_id,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    stage = "Google Drive bağlantısını ve hedef klasörü kontrol etme";
    const connection = await getGoogleDriveConnection();
    if (!connection?.drive_folder_id) {
      return jsonError("Google Drive hedef klasörü henüz seçilmemiş.", 409);
    }

    stage = "Orijinal fotoğrafı Supabase Storage'dan okuma";
    const { data: file, error: downloadError } = await admin.storage
      .from("service-media")
      .download(storagePath);
    if (downloadError || !file) {
      throw new Error("Orijinal görsel Supabase Storage üzerinden okunamadı.");
    }

    stage = "Google OAuth erişim anahtarını yenileme";
    const accessToken = await getGoogleAccessToken();
    const originalName = storagePath.split("/").pop() || "service-image";
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const mimeType = file.type || "application/octet-stream";
    const driveName = `${serviceRecordId}_${safeName}`;
    const boundary = "ferah_drive_" + crypto.randomUUID().replace(/-/g, "");
    const metadata = {
      name: driveName,
      mimeType,
      parents: [connection.drive_folder_id],
      description: `Ferah Otomotiv servis kaydı: ${serviceRecordId}`,
    };

    const multipartBody = new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ]);

    stage = "Fotoğrafı Google Drive klasörüne yükleme";
    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );

    const uploaded = await uploadResponse.json().catch(() => null) as {
      id?: string;
      name?: string;
      webViewLink?: string;
      error?: { message?: string; errors?: { reason?: string }[] };
    } | null;

    if (!uploadResponse.ok || !uploaded?.id) {
      const reason = uploaded?.error?.errors?.[0]?.reason;
      const detail = uploaded?.error?.message || "Google Drive geçerli bir yanıt döndürmedi.";
      throw new Error("Google Drive HTTP " + uploadResponse.status + (reason ? " (" + reason + ")" : "") + ": " + detail);
    }

    stage = "Drive dosya kimliğini Supabase'e kaydetme";
    const { error: updateError } = await admin
      .from("service_images")
      .update({
        google_drive_file_id: uploaded.id,
        google_drive_web_view_link: uploaded.webViewLink || null,
        google_drive_synced_at: new Date().toISOString(),
        google_drive_sync_error: null,
      })
      .eq("id", image.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      fileId: uploaded.id,
      name: uploaded.name || driveName,
      webViewLink: uploaded.webViewLink || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Bilinmeyen hata.";
    const message = stage + " aşamasında hata: " + detail;
    if (admin && imageId) {
      await admin.from("service_images")
        .update({ google_drive_sync_error: message.slice(0, 1000) })
        .eq("id", imageId);
    }
    return jsonError(message, 502);
  }
}
