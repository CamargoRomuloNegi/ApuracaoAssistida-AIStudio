import { createClient } from '@supabase/supabase-js';

export const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('As credenciais do Supabase (SUPABASE_URL e SUPABASE_ANON_KEY) não estão configuradas nas variáveis de ambiente.');
  }

  return createClient(supabaseUrl, supabaseAnonKey);
};
