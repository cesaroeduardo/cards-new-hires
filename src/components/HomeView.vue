<template>
  <div
    class="container mx-auto py-8 gap-4 text-black dark:text-white flex flex-col justify-center max-w-[480px]"
  >
    <h1 class="text-2xl font-medium text-black dark:text-white font-mono">Cards New Hires</h1>
    <p class="text-center mb-4 opacity-60 text-sm leading-relaxed text-balance">
      Crie uma sessão para iniciar a dinâmica, após, compartilhe o link da
      sessão com os convidados!
    </p>
    <div class="flex justify-center mt-4">
      <button
        @click="createSession"
        class="bg-orange-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-orange-500 transition font-medium"
      >
        Criar nova sessão
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
      this.message = '';
      const sessionId = uuidv4();
      const sessionCode = this.generateSessionCode();

      // Definir a data de expiração como 6 horas após a criação
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 6);

      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .insert([
            {
              id: sessionId,
              session_code: sessionCode,
              expires_at: expiresAt.toISOString(), // Definindo o valor de expires_at
            },
          ])
          .select();

        if (sessionError || sessionData.length === 0) {
          console.error('Erro ao criar sessão:', sessionError.message);
          this.message = `Erro ao criar sessão: ${sessionError.message}`;
          return;
        }

        this.message = 'Sessão criada com sucesso! Redirecionando...';
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
