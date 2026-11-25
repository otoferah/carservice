import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createClient} from "@/lib/supabase/server";
import {getGoogleAccessToken} from "@/lib/google-drive";

export async function DELETE(_request:Request,{params}:{params:Promise<{id:string;imageId:string}>}){
 try{
  const {id,imageId}=await params;
  const session=await createClient();
  const {data:{user}}=await session.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await session.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Araç görsellerini yalnızca yönetici veya supervisor kaldırabilir."},{status:403});

  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!secret)return NextResponse.json({error:"Sunucu veritabanı anahtarı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:image,error:readError}=await admin.from("service_images")
   .select("id,service_record_id,storage_path,google_drive_file_id")
   .eq("id",imageId).eq("service_record_id",id).maybeSingle();
  if(readError)throw readError;
  if(!image)return NextResponse.json({error:"Araç görseli bulunamadı."},{status:404});

  if(image.google_drive_file_id){
   const accessToken=await getGoogleAccessToken();
   const response=await fetch("https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(image.google_drive_file_id),{
    method:"DELETE",headers:{Authorization:"Bearer "+accessToken}
   });
   if(!response.ok&&response.status!==404){
    const result=await response.json().catch(()=>null) as {error?:{message?:string}}|null;
    return NextResponse.json({error:"Google Drive görseli silinemedi; servis görseli korundu. "+(result?.error?.message||"HTTP "+response.status)},{status:502});
   }
  }

  const {error:deleteError}=await admin.from("service_images").delete().eq("id",imageId).eq("service_record_id",id);
  if(deleteError)throw deleteError;
  const {error:storageError}=await admin.storage.from("service-media").remove([image.storage_path]);
  return NextResponse.json({success:true,storageWarning:storageError?.message||null});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Araç görseli kaldırılamadı."},{status:400});
 }
}
