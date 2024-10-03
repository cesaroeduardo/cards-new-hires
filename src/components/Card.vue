<template>
    <div class="card-container" @click="toggleFlip">
      <div :class="['card', isFlipped ? 'flipped' : '']">
        <!-- Frente da Carta -->
        <div class="card-front flex justify-center items-center">
          <h1 class="text-4xl font-bold text-white">{{ frontContent }}</h1>
        </div>
  
        <!-- Verso da Carta -->
        <div class="card-back flex justify-center items-center">
          <p class="text-xl font-medium text-white">{{ backContent }}</p>
        </div>
      </div>
    </div>
  </template>

<script>
export default {
  props: {
    frontContent: {
      type: String,
      default: 'Front'
    },
    backContent: {
      type: String,
      default: 'Back'
    }
  },
  data() {
    return {
      isFlipped: false
    };
  },
  methods: {
    toggleFlip() {
      this.isFlipped = !this.isFlipped;
    }
  }
};
</script>
  
  <style scoped>
  .card-container {
    perspective: 1000px;
    width: 300px;
    height: 400px;
    margin: 20px;
  }
  
  .card {
    width: 100%;
    height: 100%;
    transition: transform 0.6s;
    transform-style: preserve-3d;
    position: relative;
    cursor: pointer;
  }
  
  .card.flipped {
    transform: rotateY(180deg);
  }
  
  .card-front,
  .card-back {
    width: 100%;
    height: 100%;
    position: absolute;
    backface-visibility: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 15px;
  }
  
  .card-front {
    background: linear-gradient(135deg, #007cf0 0%, #00dfd8 100%);
  }
  
  .card-back {
    background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
    transform: rotateY(180deg);
  }
  </style>
  