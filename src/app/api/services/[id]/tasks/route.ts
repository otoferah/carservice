import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Oturum gerekli."},{status:401});
  const {data:actor}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
  if(!actor?.is_active||!["admin","supervisor"].includes(actor.role))return NextResponse.json({error:"Görev atama yetkiniz bulunmuyor."},{status:403});
  const body=await request.json();const title=String(body.title||"").trim();const description=String(body.description||"").trim();const assignedTo=String(body.assigned_to||"");
  if(title.length<3||title.length>140||description.length>1200||!assignedTo)return NextResponse.json({error:"Görev başlığı, açıklama sınırı ve usta seçimi kontrol edilmeli."},{status:400});
  const {data:person}=await supabase.from("profiles").select("id,role,is_active").eq("id",assignedTo).maybeSingle();
  if(!person||person.role!=="usta"||!person.is_active)return NextResponse.json({error:"Yalnızca aktif Usta hesaplarına görev atanabilir."},{status:400});
  const {data,error}=await supabase.from("service_tasks").insert({service_record_id:id,assigned_to:assignedTo,title,description:description||null,assigned_by:user.id}).select("id").single();
  if(error)throw error;
  return NextResponse.json({success:true,id:data.id},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Görev atanamadı."},{status:400});}
}
