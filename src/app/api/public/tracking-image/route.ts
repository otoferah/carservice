import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export async function GET(request:Request){
 try{
  const {searchParams}=new URL(request.url);const token=searchParams.get("token")||"";const plate=(searchParams.get("plate")||"").trim();
  if(!token&&!plate)return NextResponse.json({imageUrl:null});
  if(token&&!isUuid(token))return NextResponse.json({error:"Geçersiz takip kodu."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)return NextResponse.json({error:"Servis bağlantısı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  let query=admin.from("service_records").select("id,created_at,vehicles!inner(plate)");
  if(token)query=query.eq("tracking_token",token);
  else query=query.not("status","in","(delivered,cancelled)").ilike("vehicles.plate",plate);
  const {data:records,error}=await query.order("created_at",{ascending:false}).limit(1);
  if(error)throw error;
  const record=records?.[0];if(!record)return NextResponse.json({imageUrl:null});
  const {data:images,error:imageError}=await admin.from("service_images").select("storage_path").eq("service_record_id",record.id).order("created_at",{ascending:true}).limit(1);
  if(imageError)throw imageError;
  const path=images?.[0]?.storage_path;if(!path)return NextResponse.json({imageUrl:null});
  const {data:signed,error:signedError}=await admin.storage.from("service-media").createSignedUrl(path,1800);
  if(signedError)throw signedError;
  return NextResponse.json({imageUrl:signed.signedUrl},{headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Araç görseli alınamadı."},{status:400});}
}
