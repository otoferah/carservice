import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

type GoogleDriveConnection = {
  id: number;
  access_token: string | null;
  refresh_token: string;
  token_type: string | null;
  scope: string | null;
  expires_at: string | null;
  drive_folder_id: string | null;
  connected_at: string;
  updated_at: string;
};

export async function getGoogleDriveAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase sunucu anahtarı yapılandırılmamış.");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireGoogleDriveAdmin() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return { authorized: false as const, status: 401 as const };

  const { data: profile, error } = await session
    .from("profiles")
    .select("role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.is_active || profile.role !== "admin") {
    return { authorized: false as const, status: 403 as const };
  }
  return { authorized: true as const, user };
}

export async function getGoogleDriveConnection(): Promise<GoogleDriveConnection | null> {
  const admin = await getGoogleDriveAdminClient();
  const { data, error } = await admin
    .from("google_drive_connections")
    .select("id,access_token,refresh_token,token_type,scope,expires_at,drive_folder_id,connected_at,updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error("Google Drive bağlantı kaydı okunamadı: " + error.message);
  return data as GoogleDriveConnection | null;
}

export async function saveGoogleDriveTokens(tokens: {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}) {
  const admin = await getGoogleDriveAdminClient();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  const { error } = await admin.from("google_drive_connections").upsert({
    id: 1,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_type: tokens.token_type || "Bearer",
    scope: tokens.scope || "https://www.googleapis.com/auth/drive.file",
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (error) throw new Error("Google Drive yetkilendirme bilgileri kaydedilemedi: " + error.message);
}

export async function getGoogleAccessToken(): Promise<string> {
  const connection = await getGoogleDriveConnection();
  if (!connection?.refresh_token) {
    throw new Error("Google Drive henüz bağlanmamış. Önce Google hesabını bağlayın.");
  }

  const expiresAt = connection.expires_at ? Date.parse(connection.expires_at) : 0;
  if (connection.access_token && expiresAt > Date.now() + 60_000) {
    return connection.access_token;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth anahtarları yapılandırılmamış.");

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: connection.refresh_token,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const tokens = await response.json() as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    error?: string;
  };

  if (!response.ok || !tokens.access_token) {
    const reason = tokens.error || "unknown_error";
    throw new Error("Google OAuth token yenileme hatası (" + reason + "). Google hesabı bağlantısını yeniden kurmanız gerekebilir.");
  }

  const admin = await getGoogleDriveAdminClient();
  const { error } = await admin.from("google_drive_connections").update({
    access_token: tokens.access_token,
    token_type: tokens.token_type || connection.token_type || "Bearer",
    scope: tokens.scope || connection.scope,
    expires_at: tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);

  if (error) throw new Error("Yenilenen Google erişim anahtarı kaydedilemedi: " + error.message);
  return tokens.access_token;
}

export async function saveGoogleDriveFolderId(folderId: string) {
  const admin = await getGoogleDriveAdminClient();
  const { error } = await admin.from("google_drive_connections").update({
    drive_folder_id: folderId,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) throw new Error("Google Drive klasör bilgisi kaydedilemedi: " + error.message);
}
