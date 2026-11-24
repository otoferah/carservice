// Canonical customer-facing tracking host for the current Cloudflare Preview deployment.
// Keep QR codes and shared links pointed at the current premium tracking experience.
export const PUBLIC_TRACKING_ORIGIN =
  "https://feat-google-drive-oauth-ferah-otomotiv-servis.otoferah.workers.dev";

export function publicTrackingUrl(token: string) {
  return `${PUBLIC_TRACKING_ORIGIN}/tracking?token=${encodeURIComponent(token)}`;
}
