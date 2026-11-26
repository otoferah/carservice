import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken} from "@/lib/google-drive";

export const runtime="nodejs";

function errorMessage(error: unknown): string {
 if(error instanceof Error)return error.message;
 if(error&&typeof error==="object"){
  const value=error as {message?:unknown;code?:unknown;details?:unknown;hint?:unknown};
  const parts=[
   typeof value.message==="string"?value.message:null,
   typeof value.code==="string"?"Kod: "+value.code:null,
   typeof value.details==="string"&&value.details?"Detay: "+value.details:null,
   typeof value.hint==="string"&&value.hint?"İpucu: "+value.hint:null,
  ].filter(Boolean);
  if(parts.length)return parts.join(" · ");
 }
 return "Ayrıntısı okunamayan bir sunucu hatası oluştu.";
}

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;imageId:string}>}){
 let stage="istek ve oturum kontrolü";
 try{
  const {id,imageId}=await params;
  const session=await createClient();
  const {data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile,error:profileError}=await session.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(profileError)throw profileError;
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Araç görsellerini yalnızca yönetici veya supervisor silebilir."},{status:403});

  stage="Supabase sunucu bağlantısını hazırlama";
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)return NextResponse.json({error:"Supabase sunucu anahtarı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});

  stage="araç görseli kaydını bulma";
  const {data:image,error:readError}=await admin.from("service_images")
   .select("id,service_record_id,storage_path,google_drive_file_id")
   .eq("id",imageId).eq("service_record_id",id).maybeSingle();
  if(readError)throw readError;
  if(!image)return NextResponse.json({error:"Araç görseli bulunamadı."},{status:404});

  if(image.google_drive_file_id){
   stage="Google Drive erişimini yenileme";
   const token=await getGoogleAccessToken();
   stage="görseli Google Drive'dan silme";
   const response=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(image.google_drive_file_id),{
    method:"DELETE",headers:{Authorization:"Bearer "+token}
   });
   if(!response.ok&&response.status!==404){
    const body=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
    throw new Error("Google Drive HTTP "+response.status+": "+(body?.error?.message||"Dosya silme isteği reddedildi."));
   }
  }

  stage="görsel kaydını veritabanından silme";
  const {error:deleteError}=await admin.from("service_images").delete().eq("id",imageId).eq("service_record_id",id);
  if(deleteError)throw deleteError;

  stage="orijinal görseli Supabase Storage'dan silme";
  const {error:storageError}=await admin.storage.from("service-media").remove([image.storage_path]);
  return NextResponse.json({success:true,storageWarning:storageError?errorMessage(storageError):null});
 }catch(error){
  const detail=errorMessage(error);
  return NextResponse.json({error:"Silme işlemi şu aşamada başarısız oldu ("+stage+"): "+detail},{status:500});
 }
}
