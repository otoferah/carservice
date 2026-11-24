import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "ferah-otomotiv-servis",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-23",
    observability: {
      enabled: true,
      logs: { enabled: true },
    },
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      // Keep public runtime variables in source configuration so deployments
      // do not attempt to remove dashboard-managed values.
      GOOGLE_CLIENT_ID: bindings.text("264712238919-gih000o60cctfmrilnujlt8ai2nrpic1.apps.googleusercontent.com"),
      NEXT_PUBLIC_GOOGLE_API_KEY: bindings.text("AIzaSyBmJQKQ1oFSZHAccHLWjk_QvILAiG7V80U"),
      NEXT_PUBLIC_GOOGLE_APP_ID: bindings.text("264712238919"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: bindings.text("sb_publishable_x9T5OgeHpDjbk7ClYh1nTA_-g93Q0eB"),
      NEXT_PUBLIC_SUPABASE_URL: bindings.text("https://ozwdxxoekvsntdriyvkg.supabase.co"),
    },
  }),
});
