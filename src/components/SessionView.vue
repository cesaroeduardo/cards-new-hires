<template>
  <div class="container mx-auto py-8">
    <div v-if="!userName" class="flex flex-col items-center">
      <h2 class="text-3xl font-bold mb-4">Digite seu nome para entrar na sessão</h2>
      <input v-model="userNameInput" placeholder="Seu nome" class="border p-2 rounded-lg mb-4" />
      <button @click="saveUserName" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
        Entrar na Sessão
      </button>
      <div v-if="message" class="text-red-500 mt-4">{{ message }}</div>
    </div>

    <div v-else>
      <h3 class="text-2xl font-semibold mb-4">Bem-vindo, <span class="text-blue-600">{{ userName }}</span></h3>

      <button v-if="isCreator" @click="endSession" class="mt-6 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition">
        Encerrar Sessão
      </button>

      <!-- Lista de usuários conectados -->
      <ul class="bg-gray-100 rounded-lg p-4 my-4">
        <h2 class="text-xl font-semibold mb-2">Usuários Conectados:</h2>
        <li v-for="user in connectedUsers" :key="user.id">
          {{ user.name }} <span v-if="user.name === creatorId">(Criador)</span>
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
      isCreator: false,
      sessionId: '',
      creatorId: '',
      connectedUsers: [],
      message: ''
    };
  },
  async created() {
    this.sessionCode = this.$route.params.sessionCode;
    this.userName = localStorage.getItem(`userName-${this.sessionCode}`);
    this.sessionId = localStorage.getItem(`sessionId-${this.sessionCode}`);
    console.log("sessionId após carregar do localStorage:", this.sessionId);

    if (this.userName && this.sessionId) {
      await this.joinSession();
    }
  },
  methods: {
    async saveUserName() {
      if (!this.userNameInput.trim()) {
        this.message = 'Por favor, insira um nome válido.';
        return;
      }
      this.userName = this.userNameInput.trim();
      localStorage.setItem(`userName-${this.sessionCode}`, this.userName);
      this.message = '';
      await this.joinSession();
    },
    async joinSession() {
      try {
        // Tenta buscar o sessionId do localStorage com base no sessionCode
        let sessionId = localStorage.getItem(`sessionId-${this.sessionCode}`);

        // Caso não encontre, busca no Supabase com base no sessionCode
        if (!sessionId) {
          const { data, error } = await supabase
            .from('sessions')
            .select('id, creator_id')
            .eq('session_code', this.sessionCode.trim())
            .single();

          // Caso ocorra erro ou não encontre a sessão, exibe a mensagem e para a execução
          if (error || !data) {
            console.error('Sessão não encontrada:', error ? error.message : 'Código inválido');
            this.message = 'Sessão não encontrada. Verifique o código e tente novamente.';
            return;
          }

          // Atribui o sessionId encontrado e salva no localStorage
          sessionId = data.id;
          localStorage.setItem(`sessionId-${this.sessionCode}`, sessionId);
        }

        // Atribui o sessionId ao estado da instância e verifica se está correto
        this.sessionId = sessionId;
        console.log("Session ID recuperado com sucesso:", this.sessionId);

        // Caso o sessionId ainda esteja indefinido após todas as tentativas
        if (!this.sessionId) {
          console.error('Erro: sessionId não foi definido corretamente após recuperação!');
          this.message = 'Erro ao recuperar a sessão. Por favor, recarregue a página e tente novamente.';
          return;
        }

        // Carrega o `creatorId` da sessão com base no sessionId
        const { data: sessionData } = await supabase
          .from('sessions')
          .select('creator_id')
          .eq('id', this.sessionId)
          .single();

        // Atribui o creatorId ao estado da instância
        this.creatorId = sessionData.creator_id;

        // Verifica se o usuário já está registrado na sessão
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('session_id', this.sessionId)
          .eq('name', this.userName)
          .single();

        // Caso o usuário não esteja registrado, realiza o registro no Supabase
        if (!existingUser) {
          await supabase
            .from('users')
            .insert([{ name: this.userName, session_id: this.sessionId }]);
        }

        // Carrega os usuários conectados e define isCreator para verificar se o usuário atual é o criador
        await this.loadConnectedUsers();
        this.isCreator = this.userName === this.creatorId;

        // Inscreve-se para mudanças em tempo real
        this.subscribeToChanges();
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
        isFlipped: card.flipped
      }));

      console.log("Session ID antes de atualizar a carta:", this.sessionId); // Verificação crítica

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
            filter: `id=eq.${this.sessionId}`
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
      await supabase
        .from('sessions')
        .delete()
        .eq('id', this.sessionId);

      this.message = 'Sessão encerrada.';
    }
  }
};
</script>
