import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const allowedRoles = ["admin", "supervisor", "usta"] as const;
type Role = typeof allowedRoles[number];
const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const authEmail = (username: string) => username + "@staff.ferahotomotiv.com";
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Yalnızca POST isteği kabul edilir." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return reply({ error: "Personel yönetimi sunucu yapılandırması eksik." }, 500);
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token || token === authHeader) return reply({ error: "Oturum doğrulanamadı. Yeniden giriş yapın." }, 401);
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return reply({ error: "Oturum geçersiz veya süresi dolmuş." }, 401);
    const actorId = authData.user.id;
    const { data: actor, error: actorError } = await admin.from("profiles").select("role,is_active").eq("id", actorId).maybeSingle();
    if (actorError) throw actorError;
    if (actor?.role !== "admin" || actor.is_active !== true) return reply({ error: "Bu işlem yalnızca aktif Merkez Yönetici tarafından yapılabilir." }, 403);
    const body = await req.json();
    if (body.action === "create") {
      const fullName = String(body.full_name ?? "").trim();
      const username = String(body.username ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = body.role as Role;
      if (!fullName || !usernamePattern.test(username) || password.length < 12 || !allowedRoles.includes(role))
        return reply({ error: "Ad soyad, geçerli kullanıcı adı, görev rolü ve en az 12 karakterli şifre zorunludur." }, 400);
      const { data: existing, error: existingError } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return reply({ error: "Bu kullanıcı adı zaten kullanılıyor." }, 409);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: authEmail(username), password, email_confirm: true,
        user_metadata: { full_name: fullName, username },
      });
      if (createError || !created.user) throw createError ?? new Error("Personel hesabı oluşturulamadı.");
      const { error: profileError } = await admin.from("profiles").insert({
        id: created.user.id, full_name: fullName, username, role, is_active: true,
      });
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw profileError;
      }
      return reply({ success: true, id: created.user.id, username, full_name: fullName, role }, 201);
    }
    if (body.action === "update") {
      const id = String(body.user_id ?? "");
      const fullName = String(body.full_name ?? "").trim();
      const username = String(body.username ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = body.role as Role;
      const active = body.is_active !== false;
      if (!id || !fullName || !usernamePattern.test(username) || !allowedRoles.includes(role))
        return reply({ error: "Kullanıcı adı, ad soyad ve geçerli görev rolü zorunludur." }, 400);
      if (password && password.length < 12) return reply({ error: "Yeni şifre en az 12 karakter olmalıdır." }, 400);
      if (id === actorId && (role !== "admin" || !active))
        return reply({ error: "Kendi Merkez Yönetici hesabınızı devre dışı bırakamaz veya rolünü düşüremezsiniz." }, 400);
      const { data: target, error: targetError } = await admin.from("profiles").select("id,role").eq("id", id).maybeSingle();
      if (targetError) throw targetError;
      if (!target) return reply({ error: "Personel hesabı bulunamadı." }, 404);
      if (target.role === "admin" && (role !== "admin" || !active)) {
        const { count, error: countError } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("is_active", true);
        if (countError) throw countError;
        if ((count ?? 0) <= 1) return reply({ error: "Son aktif yönetici hesabı devre dışı bırakılamaz veya rolü düşürülemez." }, 400);
      }
      const { data: duplicate, error: duplicateError } = await admin.from("profiles").select("id").ilike("username", username).neq("id", id).maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return reply({ error: "Bu kullanıcı adı başka bir personele atanmış." }, 409);
      const authUpdate: { email: string; email_confirm: boolean; password?: string; ban_duration: string } = {
        email: authEmail(username), email_confirm: true, ban_duration: active ? "none" : "876000h",
      };
      if (password) authUpdate.password = password;
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, authUpdate);
      if (authUpdateError) throw authUpdateError;
      const { error: profileError } = await admin.from("profiles").update({
        username, full_name: fullName, role, is_active: active, updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (profileError) throw profileError;
      return reply({ success: true, username });
    }
    return reply({ error: "Geçersiz personel işlemi." }, 400);
  } catch (error) {
    console.error("manage-staff error:", error);
    return reply({ error: error instanceof Error ? error.message : "Personel işlemi tamamlanamadı." }, 400);
  }
});
