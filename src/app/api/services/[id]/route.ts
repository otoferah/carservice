import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken} from "@/lib/google-drive";

function describeError(error: unknown, fallback: string) {
 if (error instanceof Error) return { message: error.message };
 if (error && typeof error === "object") {
  const value = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
  const message = typeof value.message === "string" ? value.message : fallback;
  return {
   message,
   ...(typeof value.code === "string" ? { code: value.code } : {}),
   ...(typeof value.details === "string" && value.details ? { details: value.details } : {}),
   ...(typeof value.hint === "string" && value.hint ? { hint: value.hint } : {}),
  };
 }
 return { message: fallback };
}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Servis kaydını yalnızca yönetici veya supervisor düzenleyebilir."},{status:403});
  const body=await request.json();
  const {error}=await supabase.rpc("update_service_record",{
   p_service_record_id:id,p_customer_name:body.customer_name,p_phone:body.phone||null,
   p_email:body.email||null,p_plate:body.plate,p_brand:body.brand,p_model:body.model,
   p_quote_date:body.quote_date,p_quote_provider:body.quote_provider||null,
   p_parts:Array.isArray(body.parts)?body.parts:[],p_team:Array.isArray(body.team)?body.team:[]
  });
  if(error)throw error;
  return NextResponse.json({success:true});
 }catch(error){return NextResponse.json({error:describeError(error,"Servis kaydı güncellenemedi.").message},{status:400});}
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const sessionClient=await createClient();
  const {data:{user}}=await sessionClient.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await sessionClient.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Servis kaydını yalnızca yönetici veya supervisor silebilir."},{status:403});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)return NextResponse.json({error:"Sunucu veritabanı anahtarı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:record,error:readError}=await admin.from("service_records")
   .select("id,customer_signature_path,service_images(storage_path,google_drive_file_id)")
   .eq("id",id).maybeSingle();
  if(readError)throw readError;
  if(!record)return NextResponse.json({error:"Servis kaydı bulunamadı."},{status:404});

  const images=(record.service_images||[]) as {storage_path:string;google_drive_file_id:string|null}[];
  const driveFileIds=[...new Set(images.map(image=>image.google_drive_file_id).filter((fileId):fileId is string=>!!fileId))];

  // Önce Drive kopyalarını kaldır. Drive silme başarısız olursa servis kaydını koru.
  if(driveFileIds.length){
   const accessToken=await getGoogleAccessToken();
   const failures:string[]=[];
   for(const fileId of driveFileIds){
    const response=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId),{
     method:"DELETE",
     headers:{Authorization:"Bearer "+accessToken},
    });
    // 404: dosya zaten silinmiş; bu da istenen son durumdur.
    if(!response.ok&&response.status!==404){
     const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
     failures.push(body?.error?.message||"HTTP "+response.status);
    }
   }
   if(failures.length){
    return NextResponse.json({
     error:"Google Drive'daki görsellerin tamamı silinemedi. Servis kaydı korunuyor; tekrar deneyin.",
     details:failures,
    },{status:502});
   }
  }

  const {error:deleteError}=await admin.from("service_records").delete().eq("id",id);
  if(deleteError)throw deleteError;

  const paths=[record.customer_signature_path,...images.map(image=>image.storage_path)]
   .filter((path):path is string=>!!path);
  let storageWarning:string|undefined;
  if(paths.length){
   const {error:storageError}=await admin.storage.from("service-media").remove([...new Set(paths)]);
   if(storageError)storageWarning="Servis kaydı ve Google Drive kopyaları silindi ancak bazı Supabase Storage dosyaları kaldırılamadı: "+storageError.message;
  }
  return NextResponse.json({success:true,storageWarning});
 }catch(error){
  const info=describeError(error,"Servis kaydı silinemedi.");
  return NextResponse.json({error:info.message,...(info.code?{code:info.code}:{}),...(info.details?{details:info.details}:{}),...(info.hint?{hint:info.hint}:{})},{status:400});
 }
}
