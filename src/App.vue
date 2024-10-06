<template>
  <div id="app" class="!font-sans">
    <router-view></router-view>
  </div>
</template>

<script>
export default {
  name: 'App',
  async created() {
    // Chama a função para deletar as sessões expiradas assim que o componente for criado
    await this.deleteExpiredSessions();
  },
  methods: {
    async deleteExpiredSessions() {
      try {
        const { error } = await supabase.rpc('delete_expired_sessions');
        if (error) {
          console.error('Erro ao deletar sessões expiradas:', error.message);
        } else {
          console.log('Sessões expiradas deletadas com sucesso.');
        }
      } catch (err) {
        console.error('Erro ao chamar a função delete_expired_sessions:', err.message);
      }
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
