<template>
    <div class="bg-gray-100 rounded-lg p-4 my-4">
      <h2 class="text-xl font-semibold mb-2">Usuários Conectados:</h2>
      <ul>
        <li v-for="user in users" :key="user.id" class="text-lg">
          {{ user.name }} - {{ user.name === creatorId ? 'Criador' : 'Participante' }}
        </li>
      </ul>
    </div>
  </template>
  
  <script>
  export default {
    props: {
      users: {
        type: Array,
        required: true
      },
      creatorId: {
        type: String,
        required: true
      }
    }
  };
  </script>
  