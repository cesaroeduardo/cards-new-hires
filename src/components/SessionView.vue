<template>
  <div class="max-w-7xl mx-auto py-8">
    <!-- Tela de entrada -->
    <div v-if="!userName" class="flex flex-col items-center gap-5">
      <h2 class="text-2xl font-medium text-black dark:text-white font-mono">
        Digite seu nome para entrar na sessão
      </h2>
      <input
        v-model="userNameInput"
        placeholder="Seu nome"
        class="border p-2 rounded-lg"
      />
      <button
        @click="saveUserName"
        class="bg-orange-600 text-white px-4 py-2 text-sm rounded-lg hover:bg-orange-500 transition font-medium"
      >
        Entrar na Sessão
      </button>
      <div v-if="message" class="text-red-500 mt-4">{{ message }}</div>
    </div>

    <!-- Tela da sessão -->
    <div v-else class="flex justify-center items-center flex-col gap-8">
      <h3 class="text-2xl font-medium text-black dark:text-white font-mono">
        Boas-vindas! <span class="text-orange-600">{{ userName }}</span>
      </h3>

      <!-- Lista de usuários conectados -->
      <ul class="flex w-auto px-10 flex-col justify-center rounded-lg p-4 text-black dark:text-white bg-[#1e1e1e05] dark:bg-white/5 border border-[#1e1e1e15] dark:border-white/10 gap-2 max-w-screen-md">
        <h2 class="text-[10px] font-mono opacity-35 font-medium uppercase tracking-[.2rem]">Participantes</h2>
        <li v-for="user in connectedUsers" :key="user.id" class="text-md font-mono opacity-70">
          {{ user.name }}
        </li>
      </ul>

      <!-- Container para exibir as cartas -->
      <div class="flex justify-center flex-wrap gap-4">
        <Card
          v-for="(card, index) in cards"
          :key="index"
          :cardNumber="card.number"
          :backTitle="card.backTitle"
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
      cards: cardsData.map((card) => ({ ...card, flipped: false })),
      sessionCode: '',
      userName: null, // Nome do usuário atual
      userNameInput: '', // Input de nome do usuário para entrar na sessão
      sessionId: '',
      connectedUsers: [],
      message: '',
    };
  },
  async created() {
    // Recupera o nome do usuário do local storage, se existir
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      this.userName = savedUserName;
    }

    // Recupera o código da sessão da URL
    this.sessionCode = this.$route.params.sessionCode;

    // Se o nome do usuário e o código da sessão estão disponíveis, entra na sessão automaticamente
    if (this.userName && this.sessionCode) {
      await this.joinSession();
    }
  },
  methods: {
    applyFlippedCards(flippedCards) {
      this.cards.forEach((card) => {
        const cardState = flippedCards.find(
          (c) => c.cardNumber === card.number
        );
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

      // Salva o nome do usuário no local storage para futuras sessões
      localStorage.setItem('userName', this.userName);
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
          console.error(
            'Sessão não encontrada:',
            error ? error.message : 'Código inválido'
          );
          this.message =
            'Sessão não encontrada. Verifique o código e tente novamente.';
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

      const updatedFlippedCards = this.cards.map((card) => ({
        cardNumber: card.number,
        isFlipped: card.flipped,
      }));

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
      supabase
        .channel(`session-updates-${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${this.sessionId}`,
          },
          (payload) => {
            if (payload.new && payload.new.flipped_cards) {
              this.applyFlippedCards(payload.new.flipped_cards);
            }
          }
        )
        .subscribe();
    },
    async endSession() {
      await supabase.from('sessions').delete().eq('id', this.sessionId);
      this.message = 'Sessão encerrada.';
    },
  },
};
</script>
