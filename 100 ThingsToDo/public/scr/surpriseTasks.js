// scr/surpriseTasks.js (VERSIÓN AMPLIADA)

const tasks = [
  { 
    emoji: '🍿', 
    text: 'Maratón de vuestra saga de películas favorita.',
    subtasks: [
      { icon: 'clipboard', title: 'Elegir la saga de películas' },
      { icon: 'pizza', title: 'Preparar palomitas y snacks' },
      { icon: '✨', title: 'Crear un ambiente cómodo con mantas' },
      { icon: 'movie', title: '¡Disfrutar de la primera película!' }
    ]
  },
  { 
    emoji: '🍪', 
    text: 'Hornear galletas o un postre juntos.',
    subtasks: [
      { icon: 'book', title: 'Buscar una receta que os guste a los dos' },
      { icon: 'money', title: 'Comprar los ingredientes necesarios' },
      { icon: 'house', 'title': 'Poner música y empezar a cocinar' },
      { icon: 'cup', title: 'Probar el resultado con un café o té' }
    ]
  },
  { 
    emoji: '🗺️', 
    text: 'Dar un paseo en coche o a pie sin un destino fijo.',
    subtasks: [
      { icon: 'music', title: 'Preparar una buena playlist para el camino' },
      { icon: 'car', title: 'Llenar el depósito o preparar calzado cómodo' },
      { icon: 'camera', title: 'Salir y dejar que el azar os guíe' },
      { icon: 'star', title: 'Parar en algún lugar que os llame la atención' }
    ]
  },
  { 
    emoji: '📸', 
    text: 'Recrear una foto vuestra de cuando empezasteis.',
    subtasks: [
      { icon: 'camera', title: 'Buscar la foto original' },
      { icon: 'gift_box', title: 'Conseguir ropa y un lugar parecidos' },
      { icon: 'estrellas', title: '¡Posar e intentar imitar la foto!' },
      { icon: 'laptop', title: 'Comparar la foto antigua y la nueva' }
    ]
  },
  { 
    emoji: '🎲', 
    text: 'Noche de juegos de mesa.',
    subtasks: [
      { icon: 'game', title: 'Elegir 2 o 3 juegos de mesa' },
      { icon: 'pizza', title: 'Pedir comida o preparar algo fácil' },
      { icon: 'music', title: 'Poner música de fondo' },
      { icon: 'gamepad', title: '¡Que empiece la competición amistosa!' }
    ]
  }
];

export function getRandomTask() {
  const randomIndex = Math.floor(Math.random() * tasks.length);
  return tasks[randomIndex];
}
