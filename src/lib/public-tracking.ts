// Canonical customer-facing tracking host for the live Cloudflare Production Worker.
export const PUBLIC_TRACKING_ORIGIN =
  "https://ferah-otomotiv-servis.otoferah.workers.dev";

export function publicTrackingUrl(token: string) {
  return `${PUBLIC_TRACKING_ORIGIN}/tracking?token=${encodeURIComponent(token)}`;
}
