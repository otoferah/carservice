import { NextResponse } from "next/server";
import { requireGoogleDriveAdmin } from "@/lib/google-drive";

export async function GET(request: Request) {
  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.status === 401 ? "Oturum açmanız gerekiyor." : "Google Drive bağlantısını yalnızca yönetici başlatabilir." },
      { status: access.status },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json({ error: "Google OAuth anahtarları Cloudflare'da yapılandırılmamış." }, { status: 500 });
  }

  const url = new URL(request.url);
  const redirectUri = new URL("/api/google-drive/callback", url.origin).toString();
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set("google_drive_oauth_state", state, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/api/google-drive/callback",
    maxAge: 600,
  });
  return response;
}
