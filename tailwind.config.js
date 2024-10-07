module.exports = {
  content: [
    './src/**/*.vue',
    './src/**/*.js',
    './public/index.html'
  ],
  theme: {
    extend: {},
    fontFamily: {
      'sans': ['Roboto', 'sans-serif'],
      'mono': ['Roboto Mono', 'monospace'],
    }
  },
  darkMode: 'class', // Adicione esta linha para usar a classe `dark`
  plugins: [],
}
