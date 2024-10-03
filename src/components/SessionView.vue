<template>
  <div class="container mx-auto py-8">
    <div v-if="!userName" class="flex flex-col items-center">
      <h2 class="text-3xl font-bold mb-4">Digite seu nome para entrar na sessão</h2>
      <input v-model="userNameInput" placeholder="Seu nome" class="border p-2 rounded-lg mb-4" />
      <button @click="joinSession" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
        Entrar na Sessão
      </button>
    </div>

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

      <div class="flex flex-wrap justify-center mt-10">
        <Card v-for="(card, index) in cards" :key="index" :frontContent="card.front" :backContent="card.back" @flip-card="flipCard(index)" />
      </div>
    </div>
  </div>
</template>

<script>
import Card from './Card.vue';
import { supabase } from '../utils/supabase';
import { onMounted, ref } from 'vue';

export default {
  components: { Card },
  setup() {
    const sessionCode = ref('');
    const userName = ref('');
    const userNameInput = ref(''); // Variável temporária para capturar o nome do usuário
    const currentUser = ref('');
    const isCreator = ref(false);
    const currentRound = ref(1);
    const sessionId = ref('');
    const isCurrentUser = ref(false);
    const cards = ref([
      { front: 'Alice Souza', back: 'Desenvolvedora Frontend. Curiosidade: Gosta de trilhas.' },
      { front: 'Carlos Pereira', back: 'Analista de Dados. Curiosidade: Fã de jogos de tabuleiro.' },
      { front: 'Bruna Silva', back: 'UX Designer. Curiosidade: Participou de 5 maratonas.' },
      { front: 'Pedro Lima', back: 'Engenheiro de Software. Curiosidade: Tem uma banda de rock.' }
    ]);
    const showNameInput = ref(true); // Controla se deve exibir o input do nome

    // Função para salvar o nome do usuário no sessionStorage
    const saveUserData = (name) => {
      sessionStorage.setItem(`userName-${sessionCode.value}`, name);
      userName.value = name;
    };

    // Carrega o nome do usuário ao entrar na sessão
    const loadUserName = () => {
      const storedName = sessionStorage.getItem(`userName-${sessionCode.value}`);
      if (storedName) {
        userName.value = storedName;
        showNameInput.value = false; // Não mostrar o input se o nome já estiver salvo
      }
    };

    // Função para verificar se o usuário é o criador da sessão
    const checkIfCreator = async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('creator_id, session_id')
        .eq('session_code', sessionCode.value)
        .single();

      if (!error) {
        isCreator.value = data.creator_id === userName.value;
        sessionId.value = data.session_id;
      }
    };

    // Função para entrar na sessão
    const joinSession = async () => {
      if (userNameInput.value.trim() === '') return;
      saveUserData(userNameInput.value); // Salva o nome do usuário no sessionStorage

      // Verifica se o usuário já está registrado na sessão
      const { data, error } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('name', userNameInput.value)
        .eq('session_id', sessionId.value);

      if (!error && data.length > 0) {
        showNameInput.value = false;
        return; // Usuário já registrado
      }

      // Registra o usuário na tabela `users` com `session_id`
      const { error: userError } = await supabase
        .from('users')
        .insert([{ name: userNameInput.value, session_id: sessionId.value }]);

      if (!userError) {
        showNameInput.value = false; // Esconde o input após a inserção
        userName.value = userNameInput.value;
      }
    };

    // Inscrição para mudanças em tempo real no Supabase
    const subscribeToChanges = () => {
      const sessionChannel = supabase
        .channel('realtime-session-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `session_id=eq.${sessionId.value}` },
          (payload) => {
            currentRound.value = payload.new.current_round;
            currentUser.value = payload.new.current_user;
            isCurrentUser.value = userName.value === currentUser.value;
          }
        )
        .subscribe();
    };

    onMounted(async () => {
      sessionCode.value = this.$route.params.sessionCode || '';
      loadUserName(); // Carrega o nome do usuário ao iniciar
      await checkIfCreator(); // Verifica se é o criador da sessão
      subscribeToChanges(); // Inscreve-se nas mudanças
    });

    return {
      sessionCode,
      userName,
      userNameInput,
      currentUser,
      isCreator,
      currentRound,
      sessionId,
      isCurrentUser,
      cards,
      showNameInput,
      saveUserData,
      joinSession,
      loadUserName,
    };
  }
};
</script>


