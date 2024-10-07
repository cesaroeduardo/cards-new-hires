<template>
  <div class="max-w-7xl mx-auto py-2 lg:px-8 px-4">
    <!-- Tela de entrada -->
    <div v-if="!userName" class="flex flex-col items-center gap-5 w-full">
      <h2 class="text-xl font-medium text-black dark:text-white font-mono">
        Digite seu nome para entrar na sessão
      </h2>
      <input
        v-model="userNameInput"
        placeholder="Seu nome"
        class="border text-sm p-2 rounded-md min-w-60"
      />
      <button
        @click="saveUserName"
        class="bg-orange-600 text-white px-4 py-2 text-sm rounded-md hover:bg-orange-500 transition font-medium"
      >
        Entrar na Sessão
      </button>
      <div v-if="message" class="text-red-500 mt-4">{{ message }}</div>
    </div>

    <!-- Tela da sessão -->
    <div
      @mousemove="updateMousePosition"
      v-else
      class="flex justify-center items-start flex-col lg:flex-col gap-10 relative"
    >
      <div class="flex flex-col md:flex-row gap-12 w-full lg:w-full">
        <!-- Lista de usuários conectados -->
        <ul
          class="flex min-w-[280px] w-full md:max-w-[320px] flex-col h-auto justify-start rounded-lg p-4 text-black dark:text-white bg-[#1e1e1e05] dark:bg-white/5 border border-[#1e1e1e15] dark:border-white/10 gap-2"
        >
          <div class="flex flex-row items-center w-full px-2">
            <h2
              class="text-[10px] w-full text-left font-mono opacity-35 font-medium uppercase tracking-[.2rem]"
            >
              Participantes
            </h2>
            <!-- Botão de Compartilhamento -->
            <button
              @click="shareLink"
              class="text-black text-[10px] dark:text-white px-2 !w-auto py-2 opacity-40 rounded-lg dark:hover:bg-white/10 transition font-medium flex items-center gap-2"
            >
              <svg
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 14 14"
              >
                <path
                  fill-rule="evenodd"
                  d="M9.706 4.923a1.763 1.763 0 1 0-1.743-1.499l-2.817 2.04a1.763 1.763 0 1 0-.006 3.089l2.827 2.002a1.763 1.763 0 1 0 .756-1.178L6 7.447a1.766 1.766 0 0 0 .002-.876l2.705-1.958c.284.195.628.31 1 .31Z"
                />
              </svg>
            </button>
          </div>
          <li
            v-if="connectedUsers.length > 0"
            v-for="user in connectedUsers"
            :key="user.id"
            class="text-sm font-mono opacity-70 text-left px-2"
          >
            {{ user.name }}
          </li>
          <p
            v-else
            class="text-xs text-left px-2 py-1 dark:text-white text-black font-mono opacity-20"
          >
            Carregando participantes...
          </p>
        </ul>

        <!-- Boas vindas e instruções -->
        <div class="flex flex-col items-start gap-3 max-w-[440px]">
          <h3 class="text-2xl font-medium text-black dark:text-white font-mono">
            Boas-vindas à equipe
            <span class="text-orange-600">{{ userName }}!</span>
          </h3>
          <p
            class="text-[10px] w-full text-left font-mono opacity-35 text-black dark:text-white font-medium uppercase tracking-[.2rem]"
          >
            Instruções
          </p>
          <p
            class="text-xs flex-col text-left text-pretty dark:text-white text-black font-mono opacity-70 leading-relaxed"
          >
            Durante a dinâmica, cada um terá a oportunidade de se apresentar ao
            virar uma carta. O facilitador irá guiar as rodadas, e a cada turno,
            um novo participante será chamado para revelar sua carta.
            <br /><br /><span class="text-orange-500 font-bold text-md"
              >Atenção: Espere o facilitador chamar a sua vez para clicar nas
              cartas.</span
            >
          </p>
        </div>
      </div>

      <!-- Container para exibir as cartas -->
      <div
        class="flex flex-wrap w-full items-start justify-between gap-1 lg:justify-start gap-y-1"
      >
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

      <!-- Exibição dos ponteiros dos outros usuários -->
      <div
        v-for="pointer in userPointers"
        :key="pointer.user_name"
        class="absolute"
        :style="{ top: pointer.y - 55 + 'px', left: pointer.x - 95 + 'px' }"
      >
        <span class="bg-orange-600 text-white rounded-full px-2 py-1 text-xs">
          {{ pointer.user_name }}
        </span>
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
      userName: null,
      userNameInput: '',
      sessionId: '',
      connectedUsers: [],
      userPointers: [], // Lista para armazenar a posição do mouse dos usuários
      message: '',
    };
  },
  async created() {
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      this.userName = savedUserName;
    }
    this.sessionCode = this.$route.params.sessionCode;
    if (this.userName && this.sessionCode) {
      await this.joinSession();
      this.subscribeToMousePositionUpdates(); // Inscrever-se para atualizações de posição do mouse
      this.subscribeToCardUpdates(); // Inscreve-se para atualizações de cartas
      this.subscribeToUserUpdates(); // Inscreve-se para atualizações de usuários
    }
  },
  methods: {
    applyFlippedCards(flippedCards) {
      // Método para aplicar o estado das cartas
      this.cards.forEach((card) => {
        const cardState = flippedCards.find((c) => c.cardNumber === card.number);
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
      localStorage.setItem('userName', this.userName);
      this.message = '';
      await this.joinSession();
      this.subscribeToMousePositionUpdates();
      this.subscribeToCardUpdates();
      this.subscribeToUserUpdates();
    },
    async joinSession() {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('id, flipped_cards')
          .eq('session_code', this.sessionCode.trim())
          .single();

        if (error || !data) {
          this.message =
            'Sessão não encontrada. Verifique o código e tente novamente.';
          return;
        }

        this.sessionId = data.id;
        if (data.flipped_cards) this.applyFlippedCards(data.flipped_cards);

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

        await this.loadConnectedUsers();
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

      if (!error) {
        this.connectedUsers = data;
      } else {
        console.error('Erro ao carregar usuários conectados:', error.message);
      }
    },
    async updateMousePosition(event) {
      const x = event.clientX;
      const y = event.clientY;

      try {
        const { error } = await supabase
          .from('mouse_positions')
          .upsert({ user_name: this.userName, session_id: this.sessionId, x, y })
          .eq('user_name', this.userName)
          .eq('session_id', this.sessionId);

        if (error) {
          console.error('Erro ao atualizar posição do mouse:', error.message);
        }
      } catch (err) {
        console.error('Erro ao chamar a função updateMousePosition:', err.message);
      }
    },
    subscribeToMousePositionUpdates() {
      const mousePositionChannel = supabase
        .channel(`mouse-positions-${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'mouse_positions',
            filter: `session_id=eq.${this.sessionId}`,
          },
          (payload) => {
            this.updateUserPointer(payload.new);
          }
        )
        .subscribe();

      this.subscription = [mousePositionChannel];
    },
    subscribeToCardUpdates() {
      supabase
        .channel(`session-updates-${this.sessionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
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
    subscribeToUserUpdates() {
      const userChannel = supabase
        .channel('realtime-users-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'users',
            filter: `session_id=eq.${this.sessionId}`,
          },
          (payload) => {
            this.connectedUsers.push(payload.new);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'users',
            filter: `session_id=eq.${this.sessionId}`,
          },
          (payload) => {
            this.connectedUsers = this.connectedUsers.filter(
              (user) => user.id !== payload.old.id
            );
          }
        )
        .subscribe();

      this.subscription = [userChannel];
    },
    updateUserPointer(pointer) {
      const index = this.userPointers.findIndex(
        (p) => p.user_name === pointer.user_name
      );
      if (index !== -1) {
        this.userPointers[index] = pointer;
      } else {
        this.userPointers.push(pointer);
      }
    },
    async shareLink() {
      const link = window.location.href;
      try {
        await navigator.clipboard.writeText(link);
        alert('Link copiado para a área de transferência!');
      } catch (err) {
        console.error('Erro ao copiar o link:', err);
      }
    },
    async flipCard(index) {
      this.cards[index].flipped = !this.cards[index].flipped;
      const updatedFlippedCards = this.cards.map((card) => ({
        cardNumber: card.number,
        isFlipped: card.flipped,
      }));
      try {
        await supabase
          .from('sessions')
          .update({ flipped_cards: updatedFlippedCards })
          .eq('id', this.sessionId);
      } catch (error) {
        console.error('Erro ao atualizar flipped_cards no Supabase:', error.message);
      }
    },
  },
};
</script>

<style scoped>
.pointer-indicator {
  z-index: 10;
  pointer-events: none;
}
</style>
