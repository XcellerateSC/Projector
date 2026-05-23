import { createClient } from "@supabase/supabase-js";

export type SystemRole = "employee" | "project_lead" | "portfolio_manager";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  system_role: SystemRole;
  professional_grade: string | null;
  business_unit: string | null;
  location: string | null;
  is_active: boolean;
};

export function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}
