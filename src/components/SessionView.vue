<template>
  <div class="container mx-auto py-8">
    <div v-if="!userName" class="flex flex-col items-center">
      <h2 class="text-3xl font-bold mb-4">Digite seu nome para entrar na sessão</h2>
      <input
        v-model="userNameInput"
        placeholder="Seu nome"
        class="border p-2 rounded-lg mb-4"
      />
      <button
        @click="saveUserName"
        class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Entrar na Sessão
      </button>
      <div v-if="message" class="text-red-500 mt-4">{{ message }}</div>
    </div>

    <div v-else>
      <h3 class="text-2xl font-semibold mb-4">Bem-vindo, <span class="text-blue-600">{{ userName }}</span></h3>

      <!-- <button
        @click="endSession"
        class="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
      >
        Encerrar Sessão
      </button> -->

      <!-- Lista de usuários conectados -->
      <ul class="bg-gray-100 rounded-lg p-4 my-4">
        <h2 class="text-xl font-semibold mb-2">Usuários Conectados:</h2>
        <li v-for="user in connectedUsers" :key="user.id">
          {{ user.name }}
        </li>
      </ul>

      <!-- Container para exibir as cartas -->
      <div class="flex justify-center flex-wrap gap-4 mt-10">
        <Card
          v-for="(card, index) in cards"
          :key="index"
          :cardNumber="card.number"
          :backContent="card.backContent"
          :backImage="card.backImage"
          :canFlip="!card.flipped"
          :isFlipped="card.flipped"
          @flip-card="flipCard(index)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import { supabase } from '../utils/supabase';
import cardsData from '../data/cards.json';

export default {
  components: { Card },
  data() {
    return {
      cards: cardsData.map(card => ({ ...card, flipped: false })),
      sessionCode: '',
      userName: null,
      userNameInput: '',
      sessionId: '',
      connectedUsers: [],
      message: '',
    };
  },
  async created() {
    this.sessionCode = this.$route.params.sessionCode;
    if (this.userName && this.sessionCode) {
      await this.joinSession();
    }
  },
  methods: {
    applyFlippedCards(flippedCards) {
      this.cards.forEach(card => {
        const cardState = flippedCards.find(c => c.cardNumber === card.number);
        if (cardState) {
          card.flipped = cardState.isFlipped;
        }
      });
    },
    async saveUserName() {
      if (!this.userNameInput.trim()) {
        this.message = 'Por favor, insira um nome válido.';
        return;
      }
      this.userName = this.userNameInput.trim();
      this.message = '';
      await this.joinSession();
    },
    async joinSession() {
      try {
        // Passo 1: Buscar a sessão no Supabase usando o sessionCode
        const { data, error } = await supabase
          .from('sessions')
          .select('id, flipped_cards')
          .eq('session_code', this.sessionCode.trim())
          .single();

        if (error || !data) {
          console.error('Sessão não encontrada:', error ? error.message : 'Código inválido');
          this.message = 'Sessão não encontrada. Verifique o código e tente novamente.';
          return;
        }

        this.sessionId = data.id;

        // Passo 2: Aplicar o estado das cartas armazenado no Supabase
        if (data.flipped_cards) {
          this.applyFlippedCards(data.flipped_cards);
        }

        // Passo 3: Verificar se o usuário já está registrado na sessão
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('session_id', this.sessionId)
          .eq('name', this.userName)
          .single();

        if (!existingUser) {
          await supabase
            .from('users')
            .insert([{ name: this.userName, session_id: this.sessionId }]);
        }

        // Passo 4: Carregar usuários conectados e inscrever-se para mudanças
        await this.loadConnectedUsers();
        this.subscribeToCardUpdates();
      } catch (error) {
        console.error('Erro ao entrar na sessão:', error.message);
        this.message = `Erro ao entrar na sessão: ${error.message}`;
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
      if (this.cards[index].flipped === undefined) return;

      this.cards[index].flipped = !this.cards[index].flipped;

      const updatedFlippedCards = this.cards.map(card => ({
        cardNumber: card.number,
        isFlipped: card.flipped,
      }));

      console.log('Session ID antes de atualizar a carta:', this.sessionId); // Verificação crítica

      if (!this.sessionId) {
        console.error('Erro: sessionId não está definido!');
        return;
      }

      try {
        const { error } = await supabase
          .from('sessions')
          .update({ flipped_cards: updatedFlippedCards })
          .eq('id', this.sessionId);

        if (error) {
          console.error('Erro ao atualizar flipped_cards:', error.message);
        } else {
          console.log('flipped_cards atualizado com sucesso!');
        }
      } catch (error) {
        console.error('Erro ao atualizar flipped_cards no Supabase:', error);
      }
    },
    async subscribeToCardUpdates() {
      const sessionChannel = supabase
        .channel(`realtime-session-updates`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${this.sessionId}`,
          },
          (payload) => {
            // Atualiza as cartas conforme os valores recebidos em tempo real
            this.cards.forEach((card, index) => {
              if (payload.new[`card_${index}_flipped`] !== undefined) {
                this.cards[index].flipped = payload.new[`card_${index}_flipped`];
              }
            });
          }
        )
        .subscribe();

      this.subscription = [sessionChannel];
    },
    async endSession() {
      await supabase.from('sessions').delete().eq('id', this.sessionId);
      this.message = 'Sessão encerrada.';
    },
  },
};
</script>
