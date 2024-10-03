<template>
  <div class="container mx-auto py-8">
    <div v-if="!userName" class="flex flex-col items-center">
      <h2 class="text-3xl font-bold mb-4">Digite seu nome para entrar na sessão</h2>
      <input v-model="userNameInput" placeholder="Seu nome" class="border p-2 rounded-lg mb-4" />
      <button @click="saveUserName" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
        Entrar na Sessão
      </button>
    </div>

    <div v-else>
      <h3 class="text-2xl font-semibold mb-4">Turno de: <span class="text-blue-600">{{ currentUser }}</span></h3>
      <h3 class="text-2xl font-semibold mb-4">Round Atual: {{ currentRound }}</h3>
      <p v-if="isCurrentUser" class="bg-green-200 p-2 rounded-lg">É o seu turno de virar uma carta!</p>
      <p v-else class="bg-red-200 p-2 rounded-lg">É o turno de {{ currentUser }}. Aguarde seu turno para virar uma carta.</p>

      <button v-if="isCreator" @click="endSession" class="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
        Encerrar Sessão
      </button>

      <!-- Lista de usuários conectados -->
      <ul class="bg-gray-100 rounded-lg p-4 my-4">
        <h2 class="text-xl font-semibold mb-2">Usuários Conectados:</h2>
        <li v-for="user in connectedUsers" :key="user.id" :class="{'font-bold': user.name === currentUser}">
          {{ user.name }} <span v-if="user.name === creatorId">(Criador)</span>
        </li>
      </ul>

      <!-- Container para exibir as cartas lado a lado -->
      <div class="flex justify-center flex-wrap gap-4 mt-10">
        <Card
          v-for="(card, index) in cards"
          :key="index"
          :title="card.title"
          :content="card.content"
          :image="card.image"
          :cardNumber="index + 1"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import UserList from './UserList.vue';
import cardsData from '../data/cards.json';
import { supabase } from '../utils/supabase';

export default {
  components: {
    Card,
    UserList
  },
  data() {
    return {
      cards: cardsData.contentCards || [],
      sessionCode: '',
      currentRound: 1,
      userName: null,
      userNameInput: '',  // Input temporário para o nome do usuário
      currentUser: '',
      isCreator: false,
      isCurrentUser: false,
      sessionId: '',
      creatorId: '',  // ID do criador da sessão
      turnIndex: 0,  // Índice do turno atual
      connectedUsers: [],
      cards: []
    };
  },
  async created() {
    this.sessionCode = this.$route.params.sessionCode;
    this.userName = localStorage.getItem(`userName-${this.sessionCode}`);
    this.sessionId = localStorage.getItem(`sessionId-${this.sessionCode}`);

    // Carregar as cartas do arquivo JSON externo
    this.cards = cardsData;

    if (this.userName && this.sessionId) {
      await this.joinSession();
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
        let sessionId = localStorage.getItem(`sessionId-${this.sessionCode}`);

        if (!sessionId) {
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

          sessionId = data.id;
          localStorage.setItem(`sessionId-${this.sessionCode}`, sessionId);
        }

        this.sessionId = sessionId;
        this.creatorId = (await supabase.from('sessions').select('creator_id').eq('id', this.sessionId).single()).data.creator_id;

        const userExists = await supabase
          .from('users')
          .select('*')
          .eq('session_id', this.sessionId)
          .eq('name', this.userName)
          .single();

        if (!userExists.data) {
          await supabase
            .from('users')
            .insert([{ name: this.userName, session_id: this.sessionId }]);
        }

        await this.loadConnectedUsers();
        this.subscribeToChanges();
      } catch (error) {
        console.error('Erro inesperado ao entrar na sessão:', error.message);
        this.message = `Erro inesperado ao entrar na sessão: ${error.message}`;
      }
    },
    async loadConnectedUsers() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('session_id', this.sessionId);

      if (error) {
        console.error('Erro ao carregar usuários conectados:', error.message);
      } else {
        this.connectedUsers = data;
      }
    },
    async flipCard(index) {
      if (!this.isCurrentUser || this.cards[index].flipped) return;

      this.cards[index].flipped = true;

      const { error } = await supabase
        .from('sessions')
        .update({ [`card_${index}_flipped`]: true })
        .eq('id', this.sessionId);

      if (!error) {
        this.nextRound();
      }
    },
    async nextRound() {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('name')
        .eq('session_id', this.sessionId);

      if (usersError) {
        console.error('Erro ao carregar usuários:', usersError.message);
        return;
      }

      this.turnIndex = (this.turnIndex + 1) % users.length;
      const nextUser = users[this.turnIndex].name;

      const { error: roundError } = await supabase
        .from('sessions')
        .update({ current_round: this.currentRound + 1, current_user: nextUser, turn_index: this.turnIndex })
        .eq('id', this.sessionId);

      if (roundError) {
        console.error('Erro ao atualizar o round:', roundError.message);
      } else {
        this.currentRound += 1;
        this.currentUser = nextUser;
        this.isCurrentUser = this.userName === this.currentUser;
      }
    },
    subscribeToChanges() {
      const sessionChannel = supabase
        .channel('realtime-session-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${this.sessionId}` },
          (payload) => {
            this.currentRound = payload.new.current_round;
            this.currentUser = payload.new.current_user;
            this.turnIndex = payload.new.turn_index;
            this.isCurrentUser = this.userName === this.currentUser;

            this.cards.forEach((card, index) => {
              if (payload.new[`card_${index}_flipped`] !== undefined) {
                this.cards[index].flipped = payload.new[`card_${index}_flipped`];
              }
            });
          }
        )
        .subscribe();

      this.subscription = [sessionChannel];
    }
  }
};
</script>
