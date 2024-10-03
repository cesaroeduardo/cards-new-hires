import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Exemplo de criação de canal
const sessionChannel = supabase
  .channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'sessions' },
    (payload) => {
      console.log('Nova sessão inserida!', payload);
    }
  )
  .subscribe();
