<template>
  <div class="container mx-auto py-8">
    <h1 class="text-4xl font-bold text-center mb-8">Cards New Hires</h1>
    <p class="text-center mb-4">Crie ou entre em uma sessão existente para conhecer os novos contratados!</p>
    <div class="flex justify-center">
      <button @click="createSession" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
        Criar Nova Sessão
      </button>
    </div>
    <div class="flex justify-center mt-6">
      <input v-model="sessionCode" placeholder="Código da Sessão" class="border p-2 rounded-lg" />
      <button @click="joinSession" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
        Entrar na Sessão
      </button>
    </div>

    <!-- Feedback de erro ou sucesso -->
    <div v-if="message" class="mt-4 text-center text-red-500" v-html="message"></div>
  </div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid'; // Importa o gerador de UUID
import { supabase } from '../utils/supabase'; // Verifique o caminho se está correto

export default {
  data() {
    return {
      sessionCode: '',  // Código da sessão inserido pelo usuário
      userName: '',     // Nome do usuário inserido pelo usuário
      message: ''       // Mensagem de feedback para o usuário
    };
  },
  methods: {
    async createSession() {
      this.message = ''; // Limpa a mensagem de feedback

      const userName = prompt("Digite seu nome para criar a sessão:");
      if (!userName || userName.trim() === '') {
        this.message = 'Nome inválido. Tente novamente.';
        return;
      }

      this.userName = userName.trim();
      const sessionId = uuidv4();
      const sessionCode = this.generateSessionCode();

      try {
        // Insere a nova sessão na tabela `sessions`
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .insert([{ id: sessionId, creator_id: this.userName, session_code: sessionCode, current_user: this.userName }])
          .select();

        // Verifica se a sessão foi criada com sucesso
        if (sessionError || sessionData.length === 0) {
          console.error('Erro ao criar sessão:', sessionError.message);
          this.message = `Erro ao criar sessão: ${sessionError.message}`;
          return;
        }

        console.log('Sessão criada com sucesso:', sessionData);

        // Aguarda um curto período para garantir que a inserção na tabela sessions tenha sido concluída
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Registra o criador da sessão na tabela `users`
        const { error: userError } = await supabase
          .from('users')
          .insert([{ name: this.userName, session_id: sessionId }]);

        if (userError) {
          console.error('Erro ao registrar usuário na sessão:', userError.message);
          this.message = `Erro ao registrar usuário: ${userError.message}`;
        } else {
          this.message = 'Sessão criada com sucesso e usuário registrado! Redirecionando...';
          console.log('Usuário registrado com sucesso na sessão.');
          setTimeout(() => {
            this.$router.push(`/session/${sessionCode}`);
          }, 1000);
        }
      } catch (error) {
        console.error('Erro inesperado ao criar a sessão:', error);
        this.message = `Erro inesperado ao criar a sessão: ${error.message}`;
      }
    },

    async endSession() {
      // Verifica se o usuário atual é o criador
      if (!this.isCreator) {
        this.message = 'Apenas o criador da sessão pode encerrá-la.';
        return;
      }

      try {
        // Deleta a sessão e todos os registros relacionados
        await supabase
          .from('users')
          .delete()
          .eq('session_id', this.sessionCode); // Usa o sessionCode para deletar os usuários

        const { error: sessionDeleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('session_code', this.sessionCode);

        if (sessionDeleteError) {
          console.error('Erro ao encerrar a sessão:', sessionDeleteError.message);
          this.message = `Erro ao encerrar a sessão: ${sessionDeleteError.message}`;
          return;
        }

        this.message = 'Sessão encerrada com sucesso.';
        console.log('Sessão encerrada com sucesso.');
        this.$router.push('/'); // Redireciona para a página inicial ou outra página desejada
      } catch (error) {
        console.error('Erro inesperado ao encerrar a sessão:', error);
        this.message = `Erro inesperado ao encerrar a sessão: ${error.message}`;
      }
    },

    async joinSession() {
      this.message = ''; // Limpa a mensagem de feedback

      if (this.sessionCode.trim() === '') {
        this.message = 'Digite um código de sessão válido.';
        return;
      }

      // Pergunta o nome do usuário ao entrar na sessão
      const userName = prompt("Digite seu nome para entrar na sessão:");
      if (!userName || userName.trim() === '') {
        this.message = 'Nome inválido. Tente novamente.';
        return;
      }

      this.userName = userName.trim();

      // Verifica se o código da sessão existe no Supabase
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', this.sessionCode.trim());

      if (error || data.length === 0) {
        console.error('Sessão não encontrada:', error ? error.message : 'Código inválido');
        this.message = 'Sessão não encontrada. Verifique o código e tente novamente.';
        return;
      }

      // Obtém o `session_id` correspondente ao `session_code`
      const sessionId = data[0].session_id;

      // Registra o usuário na tabela `users` com `session_id` UUID
      const { error: userError } = await supabase
        .from('users')
        .insert([{ name: this.userName, session_id: sessionId }]);

      if (userError) {
        console.error('Erro ao registrar usuário na sessão:', userError.message);
        this.message = `Erro ao registrar usuário: ${userError.message}`;
      } else {
        // Redireciona para a sessão e armazena o nome do usuário no localStorage
        localStorage.setItem(`userName-${this.sessionCode}`, this.userName);
        this.message = 'Entrando na sessão...';
        setTimeout(() => {
          this.$router.push(`/session/${this.sessionCode}`);
        }, 1000);
      }
    },
    generateSessionCode() {
      // Gera um código de sessão único com letras e números
      return Math.random().toString(36).substring(2, 12).toUpperCase();
    }
  }
};
</script>
