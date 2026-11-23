import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Browser client. Uses only the public anon key; Row Level Security protects the data. */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
