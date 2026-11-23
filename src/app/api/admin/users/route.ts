import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import type {AppRole} from "@/lib/types";
const allowedRoles:AppRole[]=["admin","supervisor","usta"];
const usernamePattern=/^[a-z0-9][a-z0-9._-]{2,29}$/;
const authEmail=(username:string)=>username+"@staff.ferahotomotiv.com";
async function getAdminActor(){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return {user:null,ok:false};
 const {data:actor}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 return {user,ok:actor?.role==="admin"&&actor.is_active===true};
}
function getServiceAdmin(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error("Sunucu yönetim anahtarı yapılandırılmamış.");
 return createSupabaseClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export async function POST(request:Request){
 try{
  const {ok}=await getAdminActor();if(!ok)return NextResponse.json({error:"Bu işlem yalnızca Merkez Yönetici tarafından yapılabilir."},{status:403});
  const body=await request.json();const username=String(body.username||"").trim().toLowerCase();
  const password=String(body.password||"");const fullName=String(body.full_name||"").trim();const role=body.role as AppRole;
  if(!usernamePattern.test(username)||password.length<12||!fullName||!allowedRoles.includes(role))
   return NextResponse.json({error:"Kullanıcı adı 3-30 karakter olmalı (harf, rakam, nokta, tire veya alt çizgi); şifre en az 12 karakter olmalıdır."},{status:400});
  const admin=getServiceAdmin();const email=authEmail(username);
  const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName,username}});
  if(createError||!created.user)throw createError||new Error("Personel oluşturulamadı.");
  const {error:profileError}=await admin.from("profiles").insert({id:created.user.id,full_name:fullName,username,role,is_active:true});
  if(profileError){await admin.auth.admin.deleteUser(created.user.id);throw profileError;}
  return NextResponse.json({id:created.user.id,username,full_name:fullName,role},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Personel oluşturulamadı."},{status:400});}
}
export async function PATCH(request:Request){
 try{
  const {ok,user}=await getAdminActor();
  if(!ok||!user)return NextResponse.json({error:"Bu işlem yalnızca Merkez Yönetici tarafından yapılabilir."},{status:403});
  const body=await request.json();const id=String(body.user_id||"");
  const role=body.role as AppRole;const fullName=String(body.full_name||"").trim();
  const username=String(body.username||"").trim().toLowerCase();const password=String(body.password||"");
  const active=body.is_active!==false;
  if(!id||!allowedRoles.includes(role)||!fullName||!usernamePattern.test(username))
   return NextResponse.json({error:"Kullanıcı adı, ad soyad ve geçerli görev rolü zorunludur."},{status:400});
  if(password&&password.length<12)return NextResponse.json({error:"Yeni şifre en az 12 karakter olmalıdır."},{status:400});
  if(id===user.id&&(role!=="admin"||!active))return NextResponse.json({error:"Kendi yönetici hesabınızı devre dışı bırakamaz veya rolünü düşüremezsiniz."},{status:400});
  const admin=getServiceAdmin();
  const {data:duplicate,error:duplicateError}=await admin.from("profiles").select("id").ilike("username",username).neq("id",id).maybeSingle();
  if(duplicateError)throw duplicateError;
  if(duplicate)return NextResponse.json({error:"Bu kullanıcı adı başka bir personele atanmış."},{status:409});
  const authUpdate:{email:string;email_confirm:boolean;password?:string}={email:authEmail(username),email_confirm:true};
  if(password)authUpdate.password=password;
  const {error:authError}=await admin.auth.admin.updateUserById(id,authUpdate);
  if(authError)throw authError;
  const {error:profileError}=await admin.from("profiles").update({username,full_name:fullName,role,is_active:active,updated_at:new Date().toISOString()}).eq("id",id);
  if(profileError)throw profileError;
  return NextResponse.json({success:true,username});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Personel bilgileri güncellenemedi."},{status:400});}
}
