import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
import {createClient} from "@/lib/supabase/server";
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
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Servis kaydı güncellenemedi."},{status:400});}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const sessionClient=await createClient();
  const {data:{user}}=await sessionClient.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await sessionClient.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Servis kaydını yalnızca yönetici veya supervisor silebilir."},{status:403});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)return NextResponse.json({error:"Sunucu veritabanı anahtarı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:record,error:readError}=await admin.from("service_records").select("id,customer_signature_path,service_images(storage_path)").eq("id",id).maybeSingle();
  if(readError)throw readError;if(!record)return NextResponse.json({error:"Servis kaydı bulunamadı."},{status:404});
  const {error:deleteError}=await admin.from("service_records").delete().eq("id",id);
  if(deleteError)throw deleteError;
  const paths=[record.customer_signature_path,...(record.service_images||[]).map((image:{storage_path:string})=>image.storage_path)].filter((path):path is string=>!!path);
  let storageWarning:string|undefined;
  if(paths.length){const {error:storageError}=await admin.storage.from("service-media").remove([...new Set(paths)]);if(storageError)storageWarning="Servis kaydı silindi ancak bazı görseller depolamadan kaldırılamadı.";}
  return NextResponse.json({success:true,storageWarning});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Servis kaydı silinemedi."},{status:400});}
}
