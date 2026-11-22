import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import type {AppRole} from "@/lib/types";
const allowedRoles:AppRole[]=["admin","supervisor","usta"];
export async function POST(request:Request){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:actor}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(actor?.role!=="admin"||!actor.is_active)return NextResponse.json({error:"Bu işlem yalnızca yöneticilere açıktır."},{status:403});
  const body=await request.json();const email=String(body.email||"").trim().toLowerCase();
  const password=String(body.password||"");const fullName=String(body.full_name||"").trim();const role=body.role as AppRole;
  if(!email||!email.includes("@")||password.length<10||!fullName||!allowedRoles.includes(role))
   return NextResponse.json({error:"Geçerli e-posta, ad soyad, rol ve en az 10 karakterli şifre girilmelidir."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return NextResponse.json({error:"Sunucu yönetim anahtarı yapılandırılmamış."},{status:503});
  const admin=createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName}});
  if(createError||!created.user)throw createError||new Error("Kullanıcı oluşturulamadı.");
  const {error:profileError}=await admin.from("profiles").insert({id:created.user.id,full_name:fullName,role,is_active:true});
  if(profileError){await admin.auth.admin.deleteUser(created.user.id);throw profileError;}
  return NextResponse.json({id:created.user.id,email,full_name:fullName,role},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"İşlem tamamlanamadı."},{status:400});}
}

export async function PATCH(request:Request){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:actor}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(actor?.role!=="admin"||!actor.is_active)return NextResponse.json({error:"Bu işlem yalnızca yöneticilere açıktır."},{status:403});
  const body=await request.json();
  const {error}=await supabase.rpc("update_profile_role",{
   p_user_id:body.user_id,p_role:body.role,p_full_name:body.full_name||null,p_active:body.is_active!==false
  });
  if(error)throw error;
  return NextResponse.json({success:true});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Kullanıcı güncellenemedi."},{status:400});}
}
