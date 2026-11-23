import {NextResponse} from "next/server";
import {createClient as createSupabaseClient} from "@supabase/supabase-js";

const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
const normalizePlate=(value:string)=>value.toLocaleUpperCase("en-US").replace(/[^A-Z0-9]/g,"");

export async function GET(request:Request){
 try{
  const {searchParams}=new URL(request.url);
  const token=searchParams.get("token")||"";
  const plate=searchParams.get("plate")||"";
  if(!token&&!plate.trim())return NextResponse.json({imageUrl:null},{headers:{"Cache-Control":"no-store"}});
  if(token&&!isUuid(token))return NextResponse.json({error:"Geçersiz takip kodu."},{status:400});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret=process.env.SUPABASE_SECRET_KEY;
  if(!url||!secret)return NextResponse.json({error:"Servis bağlantısı yapılandırılmamış."},{status:500});
  const admin=createSupabaseClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  let recordId:string|null=null;
  if(token){
   const {data:record,error}=await admin.from("service_records").select("id").eq("tracking_token",token).maybeSingle();
   if(error)throw error;
   recordId=record?.id??null;
  }else{
   const normalized=normalizePlate(plate);
   const {data:vehicles,error:vehicleError}=await admin.from("vehicles").select("id,plate");
   if(vehicleError)throw vehicleError;
   const vehicle=vehicles?.find(item=>normalizePlate(item.plate)===normalized);
   if(vehicle){
    const {data:record,error}=await admin.from("service_records").select("id").eq("vehicle_id",vehicle.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(error)throw error;
    recordId=record?.id??null;
   }
  }
  if(!recordId)return NextResponse.json({imageUrl:null},{headers:{"Cache-Control":"no-store"}});
  const {data:images,error:imageError}=await admin.from("service_images").select("storage_path").eq("service_record_id",recordId).order("created_at",{ascending:true}).limit(1);
  if(imageError)throw imageError;
  const path=images?.[0]?.storage_path;
  if(!path)return NextResponse.json({imageUrl:null},{headers:{"Cache-Control":"no-store"}});
  const {data:signed,error:signedError}=await admin.storage.from("service-media").createSignedUrl(path,1800);
  if(signedError)throw signedError;
  return NextResponse.json({imageUrl:signed.signedUrl},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  return NextResponse.json({error:error instanceof Error?error.message:"Araç görseli alınamadı."},{status:400,headers:{"Cache-Control":"no-store"}});
 }
}
