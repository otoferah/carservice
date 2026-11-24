import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  // Public browser configuration must be embedded at build time.
  // Worker runtime bindings alone are not available to client-side bundles.
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://ozwdxxoekvsntdriyvkg.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x9T5OgeHpDjbk7ClYh1nTA_-g93Q0eB",
    NEXT_PUBLIC_GOOGLE_API_KEY: "AIzaSyBmJQKQ1oFSZHAccHLWjk_QvILAiG7V80U",
    NEXT_PUBLIC_GOOGLE_APP_ID: "264712238919",
  },
};

export default nextConfig;
