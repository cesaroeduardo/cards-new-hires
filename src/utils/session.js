import { supabase } from './supabase';

// Função para criar uma nova sessão
export async function createSession(sessionCode, userName) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ creator_id: userName.trim(), session_code: sessionCode }])
      .select();

    if (error || data.length === 0) {
      throw new Error(`Erro ao criar sessão: ${error ? error.message : 'Dados inválidos'}`);
    }

    return data[0]; // Retorna os dados da sessão criada
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Função para registrar um usuário na sessão
export async function registerUser(userName, sessionId) {
  try {
    const { error } = await supabase
      .from('users')
      .insert([{ name: userName.trim(), session_id: sessionId }]);

    if (error) {
      throw new Error(`Erro ao registrar usuário: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// Outras funções relacionadas a sessão podem ser adicionadas aqui
