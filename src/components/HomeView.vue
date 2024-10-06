<template>
  <div class="container mx-auto py-8">
    <h1 class="text-4xl font-bold text-center mb-8">Cards New Hires</h1>
    <p class="text-center mb-4">
      Crie ou entre em uma sessão existente para conhecer os novos contratados!
    </p>
    <div class="flex justify-center">
      <button
        @click="createSession"
        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Criar Nova Sessão
      </button>
    </div>

    <!-- Feedback de erro ou sucesso -->
    <div
      v-if="message"
      class="mt-4 text-center text-red-500"
      v-html="message"
    ></div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../utils/supabase';

export default {
  data() {
    return {
      message: '', // Mensagem de feedback para o usuário
    };
  },
  methods: {
    async createSession() {
      this.message = ''; // Limpa a mensagem de feedback

      const sessionId = uuidv4();
      const sessionCode = this.generateSessionCode();

      try {
        // Insere a nova sessão na tabela `sessions` sem `creator_id`
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .insert([
            {
              id: sessionId,
              session_code: sessionCode,
            },
          ])
          .select();

        if (sessionError || sessionData.length === 0) {
          console.error('Erro ao criar sessão:', sessionError.message);
          this.message = `Erro ao criar sessão: ${sessionError.message}`;
          return;
        }

        // Redireciona o usuário diretamente para a sessão criada
        this.$router.push(`/session/${sessionCode}`);
      } catch (error) {
        console.error('Erro inesperado ao criar a sessão:', error);
        this.message = `Erro inesperado ao criar a sessão: ${error.message}`;
      }
    },

    generateSessionCode() {
      // Gera um código de sessão único com letras e números
      return Math.random().toString(36).substring(2, 12).toUpperCase();
    },
  },
};
</script>
