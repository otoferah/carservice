import {NextResponse} from "next/server";
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
