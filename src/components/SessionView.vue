<template>
  <div class="container mx-auto py-8">
    <!-- Se o nome do usuário não estiver definido, exibir input para o nome -->
    <div v-if="!userName" class="flex flex-col items-center">
      <h2 class="text-3xl font-bold mb-4">Digite seu nome para entrar na sessão</h2>
      <input v-model="userNameInput" placeholder="Seu nome" class="border p-2 rounded-lg mb-4" />
      <button @click="saveUserName" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
        Entrar na Sessão
      </button>
    </div>

    <!-- Se o nome do usuário estiver definido, exibir a sessão -->
    <div v-else>
      <h2 class="text-3xl font-bold mb-6">Sessão: {{ sessionCode }}</h2>
      <h3 class="text-2xl font-semibold mb-4">Round de: {{ currentUser }}</h3>
      <h3 class="text-2xl font-semibold mb-4">Round Atual: {{ currentRound }}</h3>
      <p v-if="isCurrentUser">É o seu turno de virar uma carta!</p>
      <p v-else>É o turno de {{ currentUser }}. Aguarde seu turno para virar uma carta.</p>

      <button v-if="isCreator" @click="endSession" class="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
        Encerrar Sessão
      </button>

      <button v-if="isCreator" @click="nextRound" class="mt-6 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
        Próximo Round
      </button>

      <!-- Exibir cartas para todos os usuários -->
      <div class="flex flex-wrap justify-center mt-10">
        <Card v-for="(card, index) in cards" :key="index" :frontContent="card.front" :backContent="card.back" @flip-card="flipCard(index)" />
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import { supabase } from '../utils/supabase';

export default {
  components: {
    Card
  },
  data() {
    return {
      sessionCode: '',
      currentRound: 1,
      userName: null,
      userNameInput: '',  // Input temporário para o nome do usuário
      currentUser: '',
      isCreator: false,
      isCurrentUser: false,
      sessionId: '',
      cards: [
        { front: 'Alice Souza', back: 'Desenvolvedora Frontend. Curiosidade: Gosta de trilhas.' },
        { front: 'Carlos Pereira', back: 'Analista de Dados. Curiosidade: Fã de jogos de tabuleiro.' },
        { front: 'Bruna Silva', back: 'UX Designer. Curiosidade: Participou de 5 maratonas.' },
        { front: 'Pedro Lima', back: 'Engenheiro de Software. Curiosidade: Tem uma banda de rock.' }
      ]
    };
  },
  created() {
    this.sessionCode = this.$route.params.sessionCode;

    // Recupera o nome do usuário do Local Storage
    this.userName = localStorage.getItem(`userName-${this.sessionCode}`);

    if (this.userName) {
      // Se o nome já estiver salvo, realiza as operações de entrada na sessão automaticamente
      this.joinSession();
    }
  },
  methods: {
    async saveUserName() {
      if (!this.userNameInput.trim()) {
        alert('Por favor, insira um nome válido.');
        return;
      }
      this.userName = this.userNameInput.trim();
      localStorage.setItem(`userName-${this.sessionCode}`, this.userName);
      await this.joinSession();
    },
    async joinSession() {
      try {
        // Verifica se o código da sessão existe no Supabase
        const { data, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('session_code', this.sessionCode.trim())
          .single();

        if (error || !data) {
          console.error('Sessão não encontrada:', error ? error.message : 'Código inválido');
          this.message = 'Sessão não encontrada. Verifique o código e tente novamente.';
          return;
        }

        // Define o ID da sessão
        this.sessionId = data.id;

        // Registra o usuário na tabela `users` com `session_id` UUID
        const { error: userError } = await supabase
          .from('users')
          .insert([{ name: this.userName, session_id: this.sessionId }]);

        if (userError) {
          console.error('Erro ao registrar usuário na sessão:', userError.message);
          this.message = `Erro ao registrar usuário: ${userError.message}`;
        } else {
          console.log('Usuário registrado com sucesso na sessão.');
          this.isCurrentUser = true;
        }
      } catch (error) {
        console.error('Erro inesperado ao entrar na sessão:', error.message);
        this.message = `Erro inesperado ao entrar na sessão: ${error.message}`;
      }
    }
  }
};
</script>
