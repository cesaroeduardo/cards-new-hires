<template>
  <div
    class="w-60 h-80 text-white rounded-lg shadow-lg transform transition-transform duration-500 ease-in-out cursor-pointer perspective mx-2 my-2 scale-105"
    @click="toggleFlip"
    :class="!canFlip ? 'pointer-events-none' : ''"
  >
    <div class="relative w-full h-full rounded-lg transform-style-preserve-3d transition-transform duration-500 ease-in-out" :class="localIsFlipped ? 'rotate-y-180' : ''">
      <!-- Frente da Carta -->
      <div class="absolute w-full h-full bg-[#1e1e1e] rounded-lg backface-hidden flex flex-col justify-center items-center">
        <span class="absolute top-2 right-2 text-lg font-bold">{{ cardNumber }}</span>
        <span class="absolute bottom-2 left-2 text-lg font-bold">{{ cardNumber }}</span>
        <div class="w-32 h-16 flex justify-center items-center">
          <img src="../assets/logo.svg" alt="Logo Azion" class="w-full h-full" />
        </div>
      </div>

      <!-- Verso da Carta -->
      <div class="absolute w-full h-full bg-[#1e1e1e] rounded-lg transform rotate-y-180 backface-hidden flex flex-col justify-center items-center">
        <p class="text-xl font-medium text-white mb-4 text-center">{{ backContent }}</p>
        <img :src="backImage" alt="Imagem do Conteúdo" class="w-32 h-32 object-cover rounded-lg" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    cardNumber: {
      type: Number,
      default: 1
    },
    backContent: {
      type: String,
      default: 'Conteúdo'
    },
    backImage: {
      type: String,
      default: ''
    },
    canFlip: {
      type: Boolean,
      default: true
    },
    isFlipped: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localIsFlipped: this.isFlipped, // Sincroniza o valor inicial
    };
  },
  watch: {
    isFlipped(newVal) {
      this.localIsFlipped = newVal; // Atualiza o valor local quando a prop mudar
    }
  },
  methods: {
    toggleFlip() {
      if (this.canFlip) {
        this.localIsFlipped = !this.localIsFlipped;
        this.$emit('flip-card'); // Emite um evento para notificar o componente pai
      }
    }
  }
};
</script>

<style scoped>
.perspective {
  perspective: 1000px;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}

.transform-style-preserve-3d {
  transform-style: preserve-3d;
}

.card {
  transition: transform 0.6s;
}
</style>
