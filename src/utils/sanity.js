// src/sanity.js
import sanityClient from '@sanity/client'

export default sanityClient({
  projectId: 'o9wz7e8q', // Substitua pelo ID do seu projeto
  dataset: 'production',       // Ou outro dataset, se aplicável
  apiVersion: '2023-02-15', // defina uma versão
  useCdn: true,                // true para usar a CDN (mais rápido) em produção
})