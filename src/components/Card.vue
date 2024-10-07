<template>
  <div
    class="card-container w-[185px] h-[300px] md:w-[224px] md:h-[300px] text-white rounded-lg transform transition-transform duration-500 ease-in-out cursor-pointer perspective mx-2 my-2"
    @click="toggleFlip"
    @mousemove="handleMouseMove"
    @mouseleave="resetCard"
    ref="cardElement"
  >
    <div
      class="relative w-full h-full rounded-lg transform-style-preserve-3d transition-transform duration-500 ease-in-out"
      :class="localIsFlipped ? 'rotate-y-180' : ''"
    >
      <!-- Frente da Carta -->
      <div
        class="absolute w-full h-full bg-white/80 dark:bg-[#222] border border-[#1e1e1e10] dark:border-white/10 hover:border-[#1e1e1e30] hover:dark:border-white/20 rounded-lg backface-hidden text-black dark:text-white flex flex-col justify-center items-center card-front"
      >
        <span class="absolute top-4 right-4 text-sm opacity-30 font-mono">{{
          cardNumber
        }}</span>
        <span class="absolute bottom-4 left-4 text-sm opacity-30 font-mono">{{
          cardNumber
        }}</span>
        <div class="w-10 flex justify-center items-center">
          <img
            src="../assets/logo.svg"
            alt="Logo Azion"
            class="w-full h-full"
          />
        </div>
      </div>

      <!-- Verso da Carta -->
      <div
        class="absolute w-full h-full bg-white/80 dark:bg-[#222] border border-[#1e1e1e10] dark:border-white/10 overflow-hidden hover:border-[#1e1e1e30] hover:dark:border-white/20 text-black dark:text-white rounded-lg transform rotate-y-180 backface-hidden flex flex-col justify-start items-center gap-3 card-back"
      >
        <img
          :src="backImage"
          alt="Imagem do Conteúdo"
          class="w-full max-h-44 object-cover border-b border-[#1e1e1e05] dark:border-white/10"
        />
        <div
          class="flex flex-col justify-center h-full items-center px-3 text-balance gap-2"
        >
          <span class="text-sm font-medium mb-2 text-center font-mono">{{
            backTitle
          }}</span>
          <p class="text-xs mb-4 text-center opacity-70 leading-normal">
            {{ backContent }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    cardNumber: {
      type: Number,
      default: 1,
    },
    backTitle: {
      type: String,
      default: 'Título',
    },
    backContent: {
      type: String,
      default: 'Conteúdo',
    },
    backImage: {
      type: String,
      default: '',
    },
    canFlip: {
      type: Boolean,
      default: true,
    },
    isFlipped: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      localIsFlipped: this.isFlipped, // Sincroniza o valor inicial
    };
  },
  watch: {
    isFlipped(newVal) {
      this.localIsFlipped = newVal; // Atualiza o valor local quando a prop mudar
    },
  },
  methods: {
    toggleFlip() {
      if (this.canFlip) {
        this.localIsFlipped = !this.localIsFlipped;
        this.$emit('flip-card', this.cardNumber, this.localIsFlipped);
      }
    },
    handleMouseMove(event) {
      const card = this.$refs.cardElement;
      const imgFront = card.querySelector('.card-front');
      const imgRect = card.getBoundingClientRect();
      const width = imgRect.width;
      const height = imgRect.height;
      const mouseX = event.offsetX;
      const mouseY = event.offsetY;

      // Calcular rotação com base na posição do mouse apenas para a frente da carta
      const rotateY = this.map(mouseX, 0, width, -15, 15);
      const rotateX = this.map(mouseY, 0, height, 15, -15);

      imgFront.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    resetCard() {
      const card = this.$refs.cardElement;
      const imgFront = card.querySelector('.card-front');

      // Resetar transformações apenas para a frente da carta
      imgFront.style.transform = 'rotateX(0deg) rotateY(0deg)';
    },
    map(val, minA, maxA, minB, maxB) {
      return minB + ((val - minA) * (maxB - minB)) / (maxA - minA);
    },
  },
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

.card3d:hover {
  z-index: 10;
  transform: scale(1.05); /* Efeito de zoom */
}

.card-front {
  z-index: 2;
}

.card-back {
  z-index: 1;
}

.card-front,
.card-back {
  box-shadow: 0px 10px 20px #00000010;
  transition: transform 250ms ease-out, filter 250ms ease-out;
  pointer-events: auto; /* Permitir clique em ambas as faces */
}
</style>
