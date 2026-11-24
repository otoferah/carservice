import type {ReactNode} from "react";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import MobileDashboardNav from "./mobile-dashboard-nav";

export default async function DashboardLayout({children}:{children:ReactNode}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("role,is_active").eq("id",user.id).maybeSingle();
 if(!profile?.is_active)redirect("/login");
 return <>{children}<MobileDashboardNav role={profile.role}/></>;
}
