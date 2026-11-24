import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function POST(request:Request){
 try{
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!profile?.is_active||!["admin","supervisor"].includes(profile.role))
   return NextResponse.json({error:"Servis kaydı oluşturma yetkiniz yok."},{status:403});
  const body=await request.json();
  const {data:id,error}=await supabase.rpc("create_service_record",{
   p_customer_name:body.customer_name,p_phone:body.phone||null,p_email:body.email||null,
   p_plate:body.plate,p_brand:body.brand,p_model:body.model,p_quote_date:body.quote_date,
   p_quote_provider:body.quote_provider||profile.role,p_parts:Array.isArray(body.parts)?body.parts:[],
   p_team:Array.isArray(body.team)?body.team:[],p_photo_paths:Array.isArray(body.photo_paths)?body.photo_paths:[],
   p_signature_path:body.signature_path||null
  });
  if(error)throw error;
  const {error:intakeError}=await supabase.rpc("set_service_intake_details",{
   p_service_record_id:id,
   p_intake_odometer_km:body.intake_odometer_km===null||body.intake_odometer_km===undefined?null:Number(body.intake_odometer_km),
   p_tc_identity_number:body.tc_identity_number||null
  });
  if(intakeError)throw intakeError;
  const {data:record,error:recordError}=await supabase.from("service_records").select("id,tracking_token,status,quote_total").eq("id",id).single();
  if(recordError)throw recordError;
  return NextResponse.json(record,{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Servis kaydı oluşturulamadı."},{status:400});}
}
