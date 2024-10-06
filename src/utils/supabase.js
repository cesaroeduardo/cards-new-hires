import { createClient } from '@supabase/supabase-js';

// Definir diretamente as variáveis de ambiente dentro do código
const SUPABASE_URL = 'https://ixylwuzuagvphjhmtdqb.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eWx3dXp1YWd2cGhqaG10ZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc5NjI3MDEsImV4cCI6MjA0MzUzODcwMX0.lXV9T4sHSnPw8UETRasi1SbD06U9NbochPPvyE0ByVc';

// Criar a instância do Supabase com as variáveis definidas
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
