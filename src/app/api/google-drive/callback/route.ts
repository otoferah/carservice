import { NextResponse } from "next/server";
import {
  ensureGoogleDriveFolder,
  getGoogleDriveAdminClient,
  getGoogleDriveConnection,
  requireGoogleDriveAdmin,
  saveGoogleDriveTokens,
} from "@/lib/google-drive";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = new URL("/dashboard/google-drive", url.origin);
  const stateCookie = request.headers.get("cookie")?.split(";").map((item) => item.trim())
    .find((item) => item.startsWith("google_drive_oauth_state="))
    ?.slice("google_drive_oauth_state=".length);

  const finish = (status: string) => {
    base.searchParams.set("status", status);
    const response = NextResponse.redirect(base);
    response.cookies.set("google_drive_oauth_state", "", {
      httpOnly: true, secure: url.protocol === "https:", sameSite: "lax",
      path: "/api/google-drive/callback", maxAge: 0,
    });
    return response;
  };

  if (url.searchParams.get("error")) return finish("denied");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stateCookie || decodeURIComponent(stateCookie) !== state) {
    return finish("invalid_state");
  }

  const access = await requireGoogleDriveAdmin();
  if (!access.authorized) return finish("session_expired");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return finish("configuration_error");

  const redirectUri = new URL("/api/google-drive/callback", url.origin).toString();
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const tokens = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  if (!tokenResponse.ok || !tokens.access_token) return finish("token_exchange_failed");

  const previous = await getGoogleDriveConnection();
  const refreshToken = tokens.refresh_token || previous?.refresh_token;
  if (!refreshToken) return finish("missing_refresh_token");

  await saveGoogleDriveTokens({
    access_token: tokens.access_token,
    refresh_token: refreshToken,
    token_type: tokens.token_type,
    scope: tokens.scope,
    expires_in: tokens.expires_in,
  });

  try {
    await ensureGoogleDriveFolder(tokens.access_token);
  } catch {
    return finish("connected_folder_error");
  }

  // Touch the server-only client here to fail clearly if token storage is misconfigured.
  await getGoogleDriveAdminClient();
  return finish("connected");
}
