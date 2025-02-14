export const cards = {
    name: 'card',
    title: 'Card',
    type: 'document',
    fields: [
      {
        name: 'number',
        title: 'Número',
        type: 'number'
      },
      {
        name: 'backTitle',
        title: 'Título (verso)',
        type: 'string'
      },
      {
        name: 'backContent',
        title: 'Conteúdo (verso)',
        type: 'text'
      },
      {
        name: 'backImage',
        title: 'Imagem (verso)',
        type: 'image',
        options: {
          hotspot: true
        }
      }
    ],
    preview: {
      select: {
        title: 'backTitle',
        subtitle: 'number'
      }
    }
  }
  