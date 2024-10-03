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
import { onUnmounted } from 'vue';

export default {
  components: {
    Card
  },
  data() {
    return {
      sessionCode: '',
      currentRound: 1,
      userName: null,
      userNameInput: '',
      currentUser: '',
      isCreator: false,
      isCurrentUser: false,
      subscription: null,
      sessionId: '', // Adiciona a variável sessionId aqui
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
    this.userName = localStorage.getItem(`userName-${this.sessionCode}`) || 'Desconhecido';

    // Verifica se o usuário atual é o criador
    this.checkIfCreator().then(() => {
      // Removido: this.loadConnectedUsers(); // Não carrega mais a lista de usuários conectados
    });

    // Chama a função para assinar as mudanças em tempo real
    this.subscribeToChanges();
  },

  methods: {
    async checkIfCreator() {
      const { data, error } = await supabase
        .from('sessions')
        .select('creator_id, session_id') // Certifique-se de obter também o session_id
        .eq('session_code', this.sessionCode)
        .single();

      if (error) {
        console.error('Erro ao verificar criador da sessão:', error.message);
        return;
      }

      this.isCreator = data.creator_id === this.userName;
      this.sessionId = data.session_id; // Define sessionId aqui
    },
    async joinSession() {
      this.message = ''; // Limpa a mensagem de feedback

      if (this.sessionCode.trim() === '') {
        this.message = 'Digite um código de sessão válido.';
        return;
      }

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

      // Verifica se o usuário já está registrado na sessão
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact' })
        .eq('name', this.userName)
        .eq('session_id', sessionId);

      if (count > 0) {
        this.message = 'Você já está registrado nesta sessão.';
        return;
      }

      // Registra o usuário na tabela `users` com `session_id`
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
    async endSession() {
      if (!this.isCreator) {
        this.message = 'Apenas o criador da sessão pode encerrá-la.';
        return;
      }

      try {
        await supabase
          .from('users')
          .delete()
          .eq('session_id', this.sessionId); // Usando sessionId agora

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
        this.$router.push('/');
      } catch (error) {
        console.error('Erro inesperado ao encerrar a sessão:', error);
        this.message = `Erro inesperado ao encerrar a sessão: ${error.message}`;
      }
    },
    async nextRound() {
      if (!this.isCreator) return;

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('name')
        .eq('session_id', this.sessionId); // Use sessionId aqui

      if (usersError) {
        console.error('Erro ao carregar usuários:', usersError.message);
        return;
      }

      if (!users || users.length === 0) {
        console.error('Nenhum usuário encontrado na sessão');
        return;
      }

      console.log('Usuários encontrados para o próximo round:', users);

      const nextUser = users[(this.currentRound % users.length)].name;

      const { error: roundError } = await supabase
        .from('sessions')
        .update({ current_round: this.currentRound + 1, current_user: nextUser })
        .eq('session_code', this.sessionCode);

      if (roundError) {
        console.error('Erro ao atualizar o round:', roundError.message);
      } else {
        this.currentRound += 1;
        this.currentUser = nextUser;
        this.isCurrentUser = this.userName === this.currentUser;
        console.log(`Round atualizado para ${this.currentRound} e usuário atual é ${this.currentUser}`);
      }
    },
    async flipCard(index) {
      if (!this.isCurrentUser) return;

      this.$set(this.flippedCards, index, true);

      const { error } = await supabase
        .from('sessions')
        .update({ [`card_${index}_flipped`]: true })
        .eq('session_code', this.sessionCode);

      if (error) {
        console.error('Erro ao virar a carta:', error.message);
      } else {
        console.log(`Carta ${index} virada com sucesso!`);
      }
    },
    subscribeToChanges() {
      // Cria um canal para a tabela `sessions`
      const sessionChannel = supabase
        .channel('realtime-session-updates')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `session_id=eq.${this.sessionId}` },
          (payload) => {
            console.log('Atualização de sessão recebida em tempo real:', payload);
            this.currentRound = payload.new.current_round;
            this.currentUser = payload.new.current_user;
            this.isCurrentUser = this.userName === this.currentUser;
          }
        )
        .subscribe();

      // Cria um canal para a tabela `users`
      const userChannel = supabase
        .channel('realtime-user-updates')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'users', filter: `session_id=eq.${this.sessionId}` },
          (payload) => {
            console.log('Novo usuário conectado em tempo real:', payload.new);
            this.connectedUsers.push(payload.new);
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'users', filter: `session_id=eq.${this.sessionId}` },
          (payload) => {
            console.log('Usuário desconectado em tempo real:', payload.old);
            this.connectedUsers = this.connectedUsers.filter(user => user.id !== payload.old.id);
          }
        )
        .subscribe();

      // Salva a referência das assinaturas
      this.subscription = [sessionChannel, userChannel];
    }

  },
  beforeUnmount() {
    if (this.subscription) {
      supabase.removeSubscription(this.subscription);
      console.log('Assinatura removida com sucesso');
    }
  }
};
</script>
