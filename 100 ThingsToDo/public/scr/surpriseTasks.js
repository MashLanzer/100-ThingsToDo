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
  },
    {
        emoji: '🎨',
        text: 'Pintar un cuadro juntos, cada uno empezando en un lado.',
        subtasks: [
            { icon: 'money', title: 'Comprar un lienzo, pinturas y pinceles' },
            { icon: 'house', title: 'Preparar el espacio de trabajo con periódicos' },
            { icon: 'music', title: 'Poner música inspiradora de fondo' },
            { icon: 'brush', title: 'Empezar a pintar sin un plan fijo' },
            { icon: 'star', title: 'Firmar vuestra obra de arte conjunta' }
        ]
    },
    {
        emoji: '🏺',
        text: 'Tomar una clase de cerámica o alfarería.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar un taller de cerámica cercano' },
            { icon: 'phone', title: 'Reservar una clase para dos personas' },
            { icon: 'car', title: 'Ir al taller con ropa que se pueda manchar' },
            { icon: 'cup', title: 'Intentar hacer un tazón o una taza' },
            { icon: 'camera', title: 'Hacer una foto de vuestras creaciones (¡y de vuestras manos sucias!)' }
        ]
    },
    {
        emoji: '📸',
        text: 'Hacer una sesión de fotos temática en casa.',
        subtasks: [
            { icon: 'clipboard', title: 'Elegir un tema (ej: años 80, blanco y negro, superhéroes)' },
            { icon: 'gift_box', title: 'Buscar ropa y accesorios para el tema' },
            { icon: 'house', title: 'Preparar un rincón de la casa como estudio' },
            { icon: 'camera', title: 'Turnaros para ser el fotógrafo y el modelo' },
            { icon: 'laptop', title: 'Elegir y editar las mejores fotos juntos' }
        ]
    },
    {
        emoji: '📝',
        text: 'Escribir una historia corta juntos, un párrafo cada uno.',
        subtasks: [
            { icon: 'cup', title: 'Preparar una bebida caliente y sentarse cómodamente' },
            { icon: 'notepad', title: 'Uno escribe el primer párrafo para empezar la historia' },
            { icon: 'estrellas', title: 'El otro continúa la historia donde la dejó el anterior' },
            { icon: 'gamepad', title: 'Seguir turnándose hasta llegar a un final sorprendente' },
            { icon: 'book', title: 'Leer la historia completa en voz alta' }
        ]
    },
    {
        emoji: '🎵',
        text: 'Componer una canción tonta sobre vuestra relación.',
        subtasks: [
            { icon: 'guitar', title: 'Buscar un instrumento (o usar una app de piano/guitarra)' },
            { icon: 'notepad', title: 'Hacer una lluvia de ideas de momentos graciosos' },
            { icon: 'music', title: 'Crear un estribillo pegadizo y fácil de recordar' },
            { icon: 'estrellas', title: 'Escribir dos estrofas sobre cómo os conocisteis' },
            { icon: 'phone', title: 'Grabar la canción con el móvil como recuerdo' }
        ]
    },
    {
        emoji: '✂️',
        text: 'Crear un collage o "vision board" de vuestros sueños futuros.',
        subtasks: [
            { icon: 'money', title: 'Conseguir cartulinas, pegamento y revistas viejas' },
            { icon: 'laptop', title: 'Imprimir imágenes que representen vuestras metas' },
            { icon: 'house', title: 'Recortar palabras e imágenes que os inspiren' },
            { icon: 'star', title: 'Pegar todo en la cartulina de forma creativa' },
            { icon: 'gift', title: 'Colgar el collage en un lugar visible de la casa' }
        ]
    },
    // --- Cocina y Gastronomía ---
    {
        emoji: '🍕',
        text: 'Hacer pizzas caseras, cada uno con sus ingredientes favoritos.',
        subtasks: [
            { icon: 'money', title: 'Comprar masa de pizza (o ingredientes para hacerla)' },
            { icon: 'clipboard', title: 'Elegir y preparar los toppings (salsa, queso, etc.)' },
            { icon: 'pizza', title: 'Montar cada uno su mitad de la pizza o una pizza entera' },
            { icon: 'house', title: 'Hornear las pizzas hasta que estén doradas' },
            { icon: 'movie', title: 'Comer las pizzas viendo una película' }
        ]
    },
    {
        emoji: '🍣',
        text: 'Intentar hacer sushi por primera vez.',
        subtasks: [
            { icon: 'laptop', title: 'Ver un tutorial de YouTube sobre cómo hacer sushi' },
            { icon: 'money', title: 'Comprar un kit de sushi o los ingredientes por separado' },
            { icon: 'house', title: 'Cocinar el arroz y preparar los rellenos' },
            { icon: 'sushi', title: 'Intentar enrollar los makis sin que se desarmen' },
            { icon: 'cup', title: 'Probar vuestras creaciones con salsa de soja y wasabi' }
        ]
    },
    {
        emoji: '🍹',
        text: 'Noche de cócteles: inventar una bebida que os represente.',
        subtasks: [
            { icon: 'money', title: 'Comprar un par de licores, zumos y frutas' },
            { icon: 'cup', title: 'Buscar recetas de cócteles clásicos para inspirarse' },
            { icon: 'estrellas', title: 'Mezclar ingredientes y probar hasta encontrar el sabor perfecto' },
            { icon: 'notepad', title: 'Ponerle un nombre divertido a vuestro cóctel' },
            { icon: 'music', title: 'Disfrutar de vuestra creación con buena música' }
        ]
    },
    {
        emoji: '🍰',
        text: 'Hacer una cata a ciegas de chocolates o postres.',
        subtasks: [
            { icon: 'money', title: 'Comprar 4-5 tipos diferentes de chocolate o postres pequeños' },
            { icon: 'gift_box', title: 'Preparar los trozos en platos sin que el otro vea las marcas' },
            { icon: 'game', title: 'Vendar los ojos a uno y darle a probar cada tipo' },
            { icon: 'notepad', title: 'Adivinar qué es y puntuar del 1 al 5' },
            { icon: 'estrellas', title: 'Cambiar los roles y comparar vuestros favoritos' }
        ]
    },
    {
        emoji: '🌍',
        text: 'Cocinar una cena temática de un país que queráis visitar.',
        subtasks: [
            { icon: 'travel', title: 'Elegir un país (ej: Italia, México, Japón)' },
            { icon: 'book', title: 'Buscar recetas de un plato principal y un postre de ese país' },
            { icon: 'money', title: 'Comprar los ingredientes específicos' },
            { icon: 'music', title: 'Poner música de ese país mientras cocináis' },
            { icon: 'house', title: 'Decorar la mesa con los colores de la bandera o algo típico' }
        ]
    },
    // --- Aventura y Aire Libre ---
    {
        emoji: '🌲',
        text: 'Hacer una ruta de senderismo fácil en un parque natural cercano.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar una ruta de menos de 2 horas' },
            { icon: 'car', title: 'Preparar una mochila con agua, snacks y un pequeño botiquín' },
            { icon: 'sun', title: 'Ponerse calzado cómodo y protección solar' },
            { icon: 'camera', title: 'Disfrutar del paisaje y hacer fotos' },
            { icon: 'cup', title: 'Terminar la ruta con una bebida refrescante en un bar cercano' }
        ]
    },
    {
        emoji: '🧺',
        text: 'Preparar un picnic elaborado y buscar un lugar bonito para comer.',
        subtasks: [
            { icon: 'clipboard', title: 'Planificar un menú fácil de transportar (bocadillos, fruta, etc.)' },
            { icon: 'house', title: 'Preparar la comida y guardarla en tuppers' },
            { icon: 'money', title: 'No olvidar la manta, platos, servilletas y una bolsa de basura' },
            { icon: 'car', title: 'Buscar un parque, playa o mirador tranquilo' },
            { icon: 'sun', title: 'Disfrutar de la comida y una buena conversación al aire libre' }
        ]
    },
    {
        emoji: '⭐',
        text: 'Noche de observar las estrellas lejos de la ciudad.',
        subtasks: [
            { icon: 'laptop', title: 'Consultar el pronóstico del tiempo para una noche despejada' },
            { icon: 'car', title: 'Buscar un lugar con poca contaminación lumínica' },
            { icon: 'house', title: 'Preparar mantas y un termo con bebida caliente' },
            { icon: 'phone', title: 'Descargar una app para identificar constelaciones' },
            { icon: 'star', title: 'Tumbarse, mirar hacia arriba y buscar estrellas fugaces' }
        ]
    },
    {
        emoji: '🚲',
        text: 'Alquilar bicicletas y recorrer un carril bici o un paseo marítimo.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar un servicio de alquiler de bicicletas cercano' },
            { icon: 'car', title: 'Ponerse ropa y calzado deportivo cómodo' },
            { icon: 'sun', title: 'Hacer una ruta escénica sin prisas' },
            { icon: 'camera', title: 'Parar a mitad de camino para hacer fotos y beber agua' },
            { icon: 'ice_cream', title: 'Terminar el paseo con un helado o un granizado' }
        ]
    },
    {
        emoji: '🛶',
        text: 'Alquilar un kayak o una barca de pedales en un lago o en el mar.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar un lugar que ofrezca alquiler de kayaks/barcas' },
            { icon: 'sun', title: 'Ponerse bañador, gorra y protección solar' },
            { icon: 'money', title: 'Alquilar la embarcación por una hora' },
            { icon: 'estrellas', title: 'Remar y explorar la zona desde el agua' },
            { icon: 'cup', title: 'Tomar algo en un chiringuito al terminar' }
        ]
    },
    // --- Cultura y Aprendizaje ---
    {
        emoji: '🏛️',
        text: 'Visitar un museo o una exposición de arte que no conozcáis.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar museos o galerías con exposiciones interesantes' },
            { icon: 'phone', title: 'Comprobar los horarios y precios de las entradas' },
            { icon: 'clipboard', title: 'Elegir una obra de arte cada uno y explicar por qué os gusta' },
            { icon: 'camera', title: 'Hacer una foto en la entrada como recuerdo' },
            { icon: 'cup', title: 'Comentar la visita en una cafetería cercana' }
        ]
    },
    {
        emoji: '📚',
        text: 'Ir a una librería y elegir un libro para el otro.',
        subtasks: [
            { icon: 'car', title: 'Ir a una librería grande y bonita' },
            { icon: 'book', title: 'Separarse y buscar un libro que creas que le gustará al otro' },
            { icon: 'gift', title: 'Comprar los libros sin revelar cuál es cada uno' },
            { icon: 'cup', title: 'Ir a una cafetería e intercambiar los regalos' },
            { icon: 'notepad', title: 'Escribir una dedicatoria en la primera página' }
        ]
    },
    {
        emoji: '🗣️',
        text: 'Aprender 10 frases básicas de un idioma nuevo juntos.',
        subtasks: [
            { icon: 'travel', title: 'Elegir un idioma que os llame la atención' },
            { icon: 'laptop', title: 'Buscar en YouTube un vídeo de "frases para principiantes"' },
            { icon: 'notepad', title: 'Apuntar "Hola", "Adiós", "Gracias", "Te quiero", etc.' },
            { icon: 'game', title: 'Practicar las frases manteniendo una mini-conversación' },
            { icon: 'estrellas', title: 'Intentar usar una de las frases al día siguiente' }
        ]
    },
    {
        emoji: '🗺️',
        text: 'Planificar unas vacaciones de ensueño, aunque no las hagáis pronto.',
        subtasks: [
            { icon: 'travel', title: 'Elegir un destino soñado por los dos' },
            { icon: 'laptop', title: 'Investigar vuelos, hoteles y precios aproximados' },
            { icon: 'clipboard', title: 'Hacer una lista de 5 actividades que haríais allí' },
            { icon: 'money', title: 'Calcular un presupuesto aproximado para el viaje' },
            { icon: 'star', title: 'Guardar el plan como una meta a largo plazo' }
        ]
    },
    {
        emoji: '🧐',
        text: 'Ver un documental sobre un tema que os interese a ambos.',
        subtasks: [
            { icon: 'tv', title: 'Buscar en Netflix/HBO/etc. documentales interesantes' },
            { icon: 'clipboard', title: 'Elegir uno por consenso (naturaleza, historia, ciencia...)' },
            { icon: 'pizza', title: 'Preparar un bol de palomitas o snacks' },
            { icon: 'house', title: 'Ver el documental con atención' },
            { icon: 'cup', title: 'Comentar lo que habéis aprendido o lo que más os ha sorprendido' }
        ]
    },
    // --- Juegos y Diversión ---
    {
        emoji: '🎲',
        text: 'Noche de juegos de mesa con apuestas divertidas.',
        subtasks: [
            { icon: 'game', title: 'Elegir 2 o 3 juegos de mesa que os gusten' },
            { icon: 'notepad', title: 'Pactar las apuestas (ej: el perdedor lava los platos, da un masaje...)' },
            { icon: 'pizza', title: 'Pedir pizza o vuestra comida rápida favorita' },
            { icon: 'gamepad', title: 'Jugar las partidas con competitividad sana' },
            { icon: 'gift', title: '¡El perdedor cumple su apuesta!' }
        ]
    },
    {
        emoji: '🧩',
        text: 'Empezar un puzzle de 1000 piezas juntos.',
        subtasks: [
            { icon: 'money', title: 'Comprar un puzzle con una imagen que os guste a los dos' },
            { icon: 'house', title: 'Buscar una mesa o superficie donde poder dejarlo montado' },
            { icon: 'clipboard', title: 'Separar las piezas de los bordes' },
            { icon: 'game', title: 'Montar el marco del puzzle juntos' },
            { icon: 'music', title: 'Poner un podcast o música y empezar a encajar piezas' }
        ]
    },
    {
        emoji: '🎮',
        text: 'Jugar a un videojuego cooperativo.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar un juego cooperativo (ej: Overcooked, It Takes Two)' },
            { icon: 'gamepad', title: 'Instalar o preparar el juego y los mandos' },
            { icon: 'pizza', title: 'Tener a mano bebidas y snacks' },
            { icon: 'estrellas', title: 'Superar los primeros niveles trabajando en equipo' },
            { icon: 'heart', title: '¡Chocar los cinco después de cada victoria!' }
        ]
    },
    {
        emoji: '🎳',
        text: 'Ir a jugar a los bolos.',
        subtasks: [
            { icon: 'car', title: 'Buscar una bolera cercana' },
            { icon: 'money', title: 'Alquilar los zapatos y una pista' },
            { icon: 'notepad', title: 'Poner vuestros nombres (o apodos graciosos) en la pantalla' },
            { icon: 'game', title: 'Jugar una partida completa animando al otro' },
            { icon: 'cup', title: 'Tomar un refresco o batido al terminar' }
        ]
    },
    {
        emoji: '🎤',
        text: 'Noche de karaoke en casa.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en YouTube "karaoke" + vuestras canciones favoritas' },
            { icon: 'phone', title: 'Conectar el ordenador a un altavoz o a la TV' },
            { icon: 'brush', title: 'Usar un cepillo o una botella como micrófono' },
            { icon: 'music', title: 'Cantar a dúo una canción clásica de amor' },
            { icon: 'camera', title: 'Grabar un vídeo corto de vuestra mejor actuación' }
        ]
    },
    // --- Relajación y Bienestar ---
    {
        emoji: '💆',
        text: 'Tarde de spa en casa: masajes y mascarillas.',
        subtasks: [
            { icon: 'money', title: 'Comprar aceite de masaje y mascarillas faciales' },
            { icon: 'music', title: 'Poner música relajante y encender algunas velas' },
            { icon: 'bath', title: 'Aplicarse la mascarilla facial el uno al otro' },
            { icon: 'estrellas', title: 'Darse un masaje de 15 minutos cada uno (espalda, hombros...)' },
            { icon: 'cup', title: 'Terminar con una infusión relajante' }
        ]
    },
    {
        emoji: '🧘',
        text: 'Hacer una sesión de yoga o meditación guiada para parejas.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en YouTube "yoga para parejas" o "meditación en pareja"' },
            { icon: 'house', title: 'Buscar un espacio tranquilo en casa y poner esterillas o toallas' },
            { icon: 'music', title: 'Ponerse ropa cómoda' },
            { icon: 'sun', title: 'Seguir la clase intentando sincronizar la respiración' },
            { icon: 'heart', title: 'Terminar con un abrazo largo y en silencio' }
        ]
    },
    {
        emoji: '🛁',
        text: 'Preparar un baño relajante con espuma y velas.',
        subtasks: [
            { icon: 'money', title: 'Comprar sales de baño o bombas de espuma' },
            { icon: 'house', title: 'Limpiar la bañera a fondo' },
            { icon: 'music', title: 'Poner velas alrededor y bajar la intensidad de la luz' },
            { icon: 'bath', title: 'Llenar la bañera con agua caliente y añadir la espuma' },
            { icon: 'cup', title: 'Disfrutar del baño con una copa de vino o una infusión' }
        ]
    },
    {
        emoji: '📵',
        text: 'Tener una tarde "sin tecnología": móviles apagados.',
        subtasks: [
            { icon: 'phone', title: 'Poner los móviles en modo avión o apagarlos' },
            { icon: 'gift_box', title: 'Guardar los móviles en un cajón durante al menos 3 horas' },
            { icon: 'book', title: 'Elegir una actividad sin pantallas (leer, hablar, jugar...)' },
            { icon: 'cup', title: 'Preparar un té o café y simplemente charlar' },
            { icon: 'heart', title: 'Comentar al final cómo os habéis sentido sin distracciones' }
        ]
    },
    {
        emoji: '💤',
        text: 'Día de pereza total: desayuno en la cama y películas.',
        subtasks: [
            { icon: 'cup', title: 'Preparar un desayuno especial (tostadas, fruta, café...)' },
            { icon: 'house', title: 'Llevar el desayuno a la cama en una bandeja' },
            { icon: 'tv', title: 'Elegir una película o serie para ver desde la cama' },
            { icon: 'estrellas', title: 'Quedarse en pijama todo el día sin remordimientos' },
            { icon: 'pizza', title: 'Pedir comida a domicilio para no tener que cocinar' }
        ]
    },
    // --- Nostalgia y Recuerdos ---
    {
        emoji: '🎞️',
        text: 'Ver vuestros vídeos antiguos juntos.',
        subtasks: [
            { icon: 'laptop', title: 'Recopilar vídeos de viajes, fiestas o momentos importantes' },
            { icon: 'tv', title: 'Conectar el ordenador o el móvil a la televisión' },
            { icon: 'pizza', title: 'Preparar palomitas como si fuerais al cine' },
            { icon: 'camera', title: 'Comentar los recuerdos y las anécdotas de cada vídeo' },
            { icon: 'heart', title: 'Terminar hablando de vuestro recuerdo favorito' }
        ]
    },
    {
        emoji: '💌',
        text: 'Leer cartas o mensajes antiguos que os hayáis enviado.',
        subtasks: [
            { icon: 'phone', title: 'Buscar en WhatsApp o email las primeras conversaciones' },
            { icon: 'envelope', title: 'Sacar las cartas o postales que os hayáis regalado' },
            { icon: 'cup', title: 'Sentarse juntos en el sofá' },
            { icon: 'book', title: 'Leer en voz alta algunos de los mensajes más divertidos o tiernos' },
            { icon: 'heart', title: 'Recordar cómo os sentíais en ese momento' }
        ]
    },
    {
        emoji: '🎶',
        text: 'Escuchar la música que oíais cuando empezasteis a salir.',
        subtasks: [
            { icon: 'laptop', title: 'Crear una playlist en Spotify/YouTube con esas canciones' },
            { icon: 'music', title: 'Incluir canciones de vuestra primera cita o primer beso' },
            { icon: 'house', title: 'Poner la música de fondo durante la cena o una tarde' },
            { icon: 'estrellas', title: 'Contar las anécdotas asociadas a cada canción' },
            { icon: 'gamepad', title: 'Bailar una de las canciones lentas' }
        ]
    },
    {
        emoji: '🖼️',
        text: 'Crear un álbum de fotos digital del último año.',
        subtasks: [
            { icon: 'phone', title: 'Seleccionar las 50 mejores fotos del último año en vuestros móviles' },
            { icon: 'laptop', title: 'Pasar las fotos a una carpeta en el ordenador' },
            { icon: 'clipboard', title: 'Organizarlas por orden cronológico o por eventos' },
            { icon: 'estrellas', title: 'Usar Google Fotos o un software para crear un álbum digital' },
            { icon: 'tv', title: 'Ver el resultado final en la televisión como una presentación' }
        ]
    },
    {
        emoji: '📍',
        text: 'Visitar el lugar de vuestra primera cita.',
        subtasks: [
            { icon: 'heart', title: 'Recordar exactamente dónde fue la primera cita' },
            { icon: 'car', title: 'Ir a ese bar, parque, cine o restaurante' },
            { icon: 'cup', title: 'Pedir lo mismo que pedisteis aquella vez (si es posible)' },
            { icon: 'camera', title: 'Recrear una foto que os hicisteis ese día (o hacer una nueva)' },
            { icon: 'notepad', title: 'Hablar sobre qué pensabais el uno del otro en ese momento' }
        ]
    },
    // --- Proyectos en Casa ---
    {
        emoji: '🪴',
        text: 'Plantar algo juntos: una planta, hierbas aromáticas o un pequeño huerto.',
        subtasks: [
            { icon: 'money', title: 'Comprar una maceta, tierra y semillas o una planta pequeña' },
            { icon: 'house', title: 'Buscar un lugar con buena luz en casa' },
            { icon: 'sun', title: 'Llenar la maceta con tierra y plantar las semillas' },
            { icon: 'cup', title: 'Regar la planta por primera vez' },
            { icon: 'notepad', title: 'Ponerle un nombre a la planta y crear un calendario de riego' }
        ]
    },
    {
        emoji: '🔨',
        text: 'Montar un mueble de IKEA (o similar) juntos.',
        subtasks: [
            { icon: 'book', title: 'Desempaquetar todo y leer las instrucciones primero' },
            { icon: 'clipboard', title: 'Organizar y contar todos los tornillos y piezas' },
            { icon: 'game', title: 'Asignar roles: uno lee las instrucciones, el otro monta' },
            { icon: 'estrellas', title: 'Intentar montarlo sin discutir (¡el verdadero reto!)' },
            { icon: 'heart', title: 'Admirar vuestro trabajo en equipo una vez terminado' }
        ]
    },
    {
        emoji: '📦',
        text: 'Hacer limpieza profunda de una habitación y donar lo que no usáis.',
        subtasks: [
            { icon: 'house', title: 'Elegir una habitación (ej: el armario, el trastero)' },
            { icon: 'music', title: 'Poner música animada para motivarse' },
            { icon: 'clipboard', title: 'Crear tres montones: guardar, tirar y donar' },
            { icon: 'gift', title: 'Llevar las cosas para donar a una organización benéfica' },
            { icon: 'star', title: 'Disfrutar del espacio limpio y ordenado' }
        ]
    },
    {
        emoji: '🎨',
        text: 'Pintar una pared de la casa de un color nuevo y atrevido.',
        subtasks: [
            { icon: 'money', title: 'Elegir y comprar el color de la pintura y los materiales' },
            { icon: 'house', title: 'Cubrir los muebles y el suelo con plásticos o sábanas' },
            { icon: 'brush', title: 'Pintar primero los bordes y luego los rodillos' },
            { icon: 'pizza', title: 'Pedir comida para celebrar mientras se seca la pintura' },
            { icon: 'camera', title: 'Hacer una foto del "antes" y el "después"' }
        ]
    },
    {
        emoji: '🖼️',
        text: 'Crear una pared de galería con vuestras fotos y cuadros favoritos.',
        subtasks: [
            { icon: 'camera', title: 'Seleccionar las fotos, láminas o cuadros que queréis colgar' },
            { icon: 'money', title: 'Comprar marcos de diferentes tamaños pero de estilo similar' },
            { icon: 'clipboard', title: 'Planificar la disposición en el suelo antes de hacer agujeros' },
            { icon: 'house', title: 'Medir, nivelar y colgar los cuadros en la pared' },
            { icon: 'star', title: 'Dar un paso atrás y admirar vuestra nueva galería personal' }
        ]
    },
    // --- Conversación y Conexión ---
    {
        emoji: '❓',
        text: 'Hacer un test de "36 preguntas para enamorarse".',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en internet las "36 preguntas de Arthur Aron"' },
            { icon: 'cup', title: 'Preparar una copa de vino o una bebida que os guste' },
            { icon: 'phone', title: 'Apagar la tele y poner los móviles en silencio' },
            { icon: 'game', title: 'Turnaros para hacer las preguntas y responder con sinceridad' },
            { icon: 'heart', title: 'Terminar el test mirándose a los ojos durante 4 minutos, como sugiere el estudio' }
        ]
    },
    {
        emoji: '❤️‍🔥',
        text: 'Hablar sobre vuestros "lenguajes del amor".',
        subtasks: [
            { icon: 'laptop', title: 'Buscar online el test de los "5 Lenguajes del Amor"' },
            { icon: 'notepad', title: 'Hacer el test por separado y apuntar los resultados' },
            { icon: 'cup', title: 'Compartir vuestros resultados y si os han sorprendido' },
            { icon: 'heart', title: 'Hablar de cómo podéis "hablar" más en el lenguaje del otro' },
            { icon: 'star', title: 'Proponerse hacer una acción concreta del lenguaje del otro esa semana' }
        ]
    },
    {
        emoji: '📜',
        text: 'Crear una "Constitución de la Pareja" con vuestras reglas y valores.',
        subtasks: [
            { icon: 'notepad', title: 'Hacer una lluvia de ideas de valores importantes (honestidad, apoyo...)' },
            { icon: 'clipboard', title: 'Definir "reglas" divertidas (ej: el que cocina no friega)' },
            { icon: 'book', title: 'Escribir los puntos en un papel bonito o en un documento' },
            { icon: 'brush', title: 'Decorar el documento para que parezca oficial' },
            { icon: 'star', title: 'Firmar ambos la "constitución" y guardarla' }
        ]
    },
    {
        emoji: '💭',
        text: 'Jugar a "¿Qué prefieres?" con preguntas profundas o graciosas.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar online listas de preguntas de "¿Qué prefieres?" para parejas' },
            { icon: 'pizza', title: 'Pedir comida y sentarse en un lugar cómodo' },
            { icon: 'game', title: 'Hacerse las preguntas por turnos' },
            { icon: 'estrellas', title: 'Justificar siempre la respuesta y debatirla' },
            { icon: 'heart', title: 'Intentar adivinar qué responderá el otro antes de que lo diga' }
        ]
    },
    {
        emoji: '🏆',
        text: 'Crear los "Premios Anuales de la Pareja".',
        subtasks: [
            { icon: 'notepad', title: 'Inventar categorías (ej: "Mejor cena del año", "Momento más divertido")' },
            { icon: 'clipboard', title: 'Nominar 2-3 momentos para cada categoría' },
            { icon: 'star', title: 'Debatir y elegir a los "ganadores" de cada premio' },
            { icon: 'gift', title: 'Hacer un pequeño diploma o trofeo casero para los momentos ganadores' },
            { icon: 'camera', title: 'Hacer una foto de los "premios" para el recuerdo' }
        ]
    },
    // --- Ayuda a la Comunidad ---
    {
        emoji: '🐕',
        text: 'Ser voluntario por un día en un refugio de animales.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar refugios de animales cercanos que acepten voluntarios por un día' },
            { icon: 'phone', title: 'Llamar para coordinar el día y la hora' },
            { icon: 'car', title: 'Ponerse ropa cómoda que no importe que se ensucie' },
            { icon: 'dog', title: 'Pasar el día paseando perros, limpiando o jugando con los animales' },
            { icon: 'heart', title: 'Considerar hacer una pequeña donación al refugio al iros' }
        ]
    },
    {
        emoji: '🌳',
        text: 'Participar en una jornada de limpieza de un parque o una playa.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar organizaciones locales que organicen limpiezas' },
            { icon: 'clipboard', title: 'Inscribirse en el evento' },
            { icon: 'sun', title: 'Preparar guantes, bolsas de basura, agua y protección solar' },
            { icon: 'house', title: 'Pasar la mañana recogiendo residuos y ayudando' },
            { icon: 'star', title: 'Sentirse orgullosos de haber mejorado un espacio común' }
        ]
    },
// ... (los 45 retos anteriores)

    // --- Ayuda a la Comunidad (Continuación) ---
    {
        emoji: '🥫',
        text: 'Hacer una compra solidaria para un banco de alimentos.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar qué alimentos no perecederos son más necesarios' },
            { icon: 'money', title: 'Ir al supermercado con una lista específica' },
            { icon: 'clipboard', title: 'Comprar los productos pensando en que sean útiles y nutritivos' },
            { icon: 'car', title: 'Llevar la compra al punto de recogida del banco de alimentos' },
            { icon: 'heart', title: 'Celebrar vuestro gesto con una cena sencilla en casa' }
        ]
    },
    {
        emoji: '🩸',
        text: 'Ir a donar sangre juntos.',
        subtasks: [
            { icon: 'laptop', title: 'Verificar los requisitos y si ambos podéis donar' },
            { icon: 'phone', title: 'Buscar el centro de donación más cercano y sus horarios' },
            { icon: 'cup', title: 'Asegurarse de ir bien hidratados y haber comido algo' },
            { icon: 'car', title: 'Ir juntos y apoyarse mutuamente durante el proceso' },
            { icon: 'star', title: 'Tomarse el bocadillo y el refresco de después como una mini-cita' }
        ]
    },
    {
        emoji: '🧑‍🏫',
        text: 'Preparar material para una clase de apoyo o una ludoteca infantil.',
        subtasks: [
            { icon: 'laptop', title: 'Contactar con una ONG local para saber qué necesitan' },
            { icon: 'money', title: 'Comprar cartulinas, rotuladores, pegamento, etc.' },
            { icon: 'house', title: 'Pasar una tarde creando fichas, juegos o material didáctico' },
            { icon: 'gift', title: 'Empaquetar todo de forma bonita y organizada' },
            { icon: 'car', title: 'Entregar el material a la organización' }
        ]
    },

    // --- Desafíos y Habilidades Nuevas ---
    {
        emoji: '🕺',
        text: 'Aprender una coreografía de baile de TikTok o YouTube.',
        subtasks: [
            { icon: 'phone', title: 'Elegir un baile que parezca divertido y no demasiado difícil' },
            { icon: 'tv', title: 'Poner el vídeo en la tele a cámara lenta para aprender los pasos' },
            { icon: 'music', title: 'Practicar por separado y luego intentar sincronizarse' },
            { icon: 'gamepad', title: 'Reírse mucho de los errores y no tomarlo demasiado en serio' },
            { icon: 'camera', title: 'Grabar el resultado final, ¡aunque no sea perfecto!' }
        ]
    },
    {
        emoji: ' juggling',
        text: 'Aprender a hacer malabares con tres pelotas.',
        subtasks: [
            { icon: 'laptop', title: 'Ver un tutorial para principiantes sobre malabares' },
            { icon: 'money', title: 'Conseguir 3 pelotas pequeñas para cada uno (o usar naranjas)' },
            { icon: 'game', title: 'Practicar primero con una pelota, luego con dos' },
            { icon: 'estrellas', title: 'Intentar hacer el ciclo completo con tres pelotas' },
            { icon: 'star', title: 'Celebrar el primer ciclo completo que consiga uno de los dos' }
        ]
    },
    {
        emoji: '🧗',
        text: 'Probar una sesión de iniciación en un rocódromo.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar un rocódromo cercano con cursos de iniciación' },
            { icon: 'phone', title: 'Reservar una sesión para dos' },
            { icon: 'car', title: 'Ponerse ropa deportiva y cómoda' },
            { icon: 'estrellas', title: 'Aprender a ponerse el arnés y las normas de seguridad' },
            { icon: 'heart', title: 'Animarse mutuamente al intentar subir las primeras vías' }
        ]
    },
    {
        emoji: '🃏',
        text: 'Aprender un truco de magia con cartas.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en YouTube "truco de magia fácil con cartas"' },
            { icon: 'game', title: 'Elegir un truco cada uno y practicarlo en secreto' },
            { icon: 'estrellas', title: 'Preparar un pequeño "show de magia"' },
            { icon: 'tv', title: 'Hacerse el truco el uno al otro e intentar adivinar el secreto' },
            { icon: 'heart', title: 'Aplaudir el esfuerzo del otro, salga bien o mal' }
        ]
    },
    {
        emoji: '💰',
        text: 'Hacer un curso online gratuito sobre finanzas personales.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en plataformas como Coursera o edX cursos gratuitos' },
            { icon: 'book', title: 'Inscribirse en un curso corto sobre presupuestos o ahorro' },
            { icon: 'cup', title: 'Ver el primer módulo del curso juntos, tomando notas' },
            { icon: 'notepad', title: 'Comentar cómo podéis aplicar lo aprendido a vuestras finanzas' },
            { icon: 'star', title: 'Establecer una pequeña meta financiera conjunta' }
        ]
    },

    // --- Turismo Local ---
    {
        emoji: '🗺️',
        text: 'Hacer un tour por vuestra propia ciudad como si fuerais turistas.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en un blog de viajes "qué ver en [vuestra ciudad] en un día"' },
            { icon: 'clipboard', title: 'Hacer una ruta con 3-4 puntos de interés que no soléis visitar' },
            { icon: 'camera', title: 'Llevar una cámara y hacer fotos de turista' },
            { icon: 'bus', title: 'Usar el transporte público para moverse' },
            { icon: 'cup', title: 'Comer o tomar algo en un sitio típico que recomienden las guías' }
        ]
    },
    {
        emoji: '🍇',
        text: 'Visitar un mercado de agricultores y comprar productos locales.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar el día y la ubicación del mercado local más cercano' },
            { icon: 'money', title: 'Llevar bolsas de tela y algo de efectivo' },
            { icon: 'clipboard', title: 'Pasear por los puestos y hablar con los productores' },
            { icon: 'pizza', title: 'Comprar ingredientes frescos para la cena de esa noche' },
            { icon: 'house', title: 'Cocinar juntos con los productos que habéis comprado' }
        ]
    },
    {
        emoji: '👻',
        text: 'Hacer un "tour de misterios y leyendas" por vuestra ciudad.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar si hay tours guiados de noche en vuestra ciudad' },
            { icon: 'phone', title: 'Reservar el tour para dos' },
            { icon: 'car', title: 'Cenar algo ligero antes de empezar' },
            { icon: 'estrellas', title: 'Escuchar las historias y leyendas con atención' },
            { icon: 'cup', title: 'Tomar una bebida caliente después para comentar las historias' }
        ]
    },
    {
        emoji: '🌳',
        text: 'Descubrir un parque o jardín botánico de la ciudad en el que nunca hayáis estado.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en Google Maps "parques" o "jardín botánico"' },
            { icon: 'car', title: 'Elegir uno que parezca interesante y planificar cómo llegar' },
            { icon: 'book', title: 'Pasear tranquilamente por todos sus rincones' },
            { icon: 'camera', title: 'Hacer fotos de las plantas o flores más curiosas' },
            { icon: 'cup', title: 'Sentarse en un banco a leer o simplemente a charlar' }
        ]
    },
    {
        emoji: '🏘️',
        text: 'Explorar un barrio diferente de vuestra ciudad.',
        subtasks: [
            { icon: 'clipboard', title: 'Elegir un barrio por el que no soláis pasar' },
            { icon: 'car', title: 'Ir hasta allí y empezar a caminar sin rumbo fijo' },
            { icon: 'cup', title: 'Entrar en una cafetería o tienda local que os llame la atención' },
            { icon: 'camera', title: 'Fijarse en la arquitectura y los detalles de las calles' },
            { icon: 'pizza', title: 'Cenar en un restaurante de ese barrio' }
        ]
    },

    // --- Noches Temáticas en Casa ---
    {
        emoji: '🎬',
        text: 'Noche de cine de un director específico (ej: Tarantino, Miyazaki).',
        subtasks: [
            { icon: 'laptop', title: 'Elegir un director que os guste a los dos' },
            { icon: 'tv', title: 'Seleccionar dos de sus películas más representativas' },
            { icon: 'pizza', title: 'Preparar una cena temática relacionada con las películas' },
            { icon: 'movie', title: 'Ver la primera película' },
            { icon: 'cup', title: 'Comentar el estilo del director antes de ver la segunda' }
        ]
    },
    {
        emoji: '🌮',
        text: 'Noche mexicana: tacos, guacamole y margaritas.',
        subtasks: [
            { icon: 'money', title: 'Comprar tortillas, carne, verduras, aguacates y limas' },
            { icon: 'house', title: 'Preparar el guacamole y los rellenos de los tacos' },
            { icon: 'music', title: 'Poner una playlist de música mexicana' },
            { icon: 'cup', title: 'Preparar margaritas (con o sin alcohol)' },
            { icon: 'pizza', title: 'Montar y comer los tacos al gusto de cada uno' }
        ]
    },
    {
        emoji: '🇬🇧',
        text: 'Tarde de té inglesa.',
        subtasks: [
            { icon: 'money', title: 'Comprar varios tipos de té, scones, mermelada y nata (clotted cream)' },
            { icon: 'house', title: 'Preparar unos sándwiches pequeños de pepino y salmón' },
            { icon: 'cup', title: 'Calentar el agua y preparar el té en una tetera bonita' },
            { icon: 'estrellas', title: 'Servir todo en platos de varios pisos si tenéis' },
            { icon: 'book', title: 'Disfrutar de la merienda mientras charláis con acento inglés de broma' }
        ]
    },
    {
        emoji: '📼',
        text: 'Noche de los 90: ver una película de esa década y comer snacks de entonces.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar una lista de películas icónicas de los 90' },
            { icon: 'tv', title: 'Elegir una que os traiga buenos recuerdos (ej: Jurassic Park, Pulp Fiction)' },
            { icon: 'money', title: 'Comprar snacks populares de los 90 (gusanitos, chicles...)' },
            { icon: 'music', title: 'Escuchar música de los 90 antes de la película' },
            { icon: 'movie', title: 'Ver la película y comentar la moda y la tecnología de la época' }
        ]
    },
    {
        emoji: '🕯️',
        text: 'Cena a la luz de las velas sin electricidad.',
        subtasks: [
            { icon: 'clipboard', title: 'Planificar una cena que no requiera muchos aparatos eléctricos' },
            { icon: 'money', title: 'Comprar muchas velas de diferentes tamaños' },
            { icon: 'house', title: 'Colocar las velas por el salón y el comedor de forma segura' },
            { icon: 'phone', title: 'Apagar las luces y los móviles' },
            { icon: 'cup', title: 'Disfrutar de la cena y la conversación en un ambiente íntimo' }
        ]
    },

    // --- Pequeños Lujos y Mimos ---
    {
        emoji: '🥐',
        text: 'Desayunar en una pastelería o cafetería bonita.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar una cafetería con buenas reseñas y un ambiente acogedor' },
            { icon: 'car', title: 'Ir un día de fin de semana por la mañana' },
            { icon: 'cup', title: 'Pedir un café especial y el dulce más apetecible' },
            { icon: 'book', title: 'Leer el periódico o una revista juntos' },
            { icon: 'sun', title: 'Disfrutar de un comienzo de día lento y sin prisas' }
        ]
    },
    {
        emoji: '🍾',
        text: 'Comprar una botella de champán/cava solo para celebrar un día normal.',
        subtasks: [
            { icon: 'money', title: 'Ir a una tienda y elegir una botella que os llame la atención' },
            { icon: 'house', title: 'Enfriar bien la botella en la nevera' },
            { icon: 'cup', title: 'Sacar dos copas bonitas' },
            { icon: 'star', title: 'Hacer un brindis por algo bueno que haya pasado esa semana, por pequeño que sea' },
            { icon: 'pizza', title: 'Acompañar con unas fresas o algo de picar' }
        ]
    },
    {
        emoji: '👕',
        text: 'Ir de compras y elegir un conjunto de ropa para el otro.',
        subtasks: [
            { icon: 'car', title: 'Ir a un centro comercial o a una zona de tiendas' },
            { icon: 'money', title: 'Establecer un presupuesto para cada conjunto' },
            { icon: 'clipboard', title: 'Separarse y buscar un look completo (pantalón, camisa, etc.) para el otro' },
            { icon: 'game', title: 'Ir a los probadores y mostrar el resultado' },
            { icon: 'gift', title: 'Comprar al menos una prenda de las que habéis elegido' }
        ]
    },
    {
        emoji: '💐',
        text: 'Regalarse flores mutuamente el mismo día sin un motivo especial.',
        subtasks: [
            { icon: 'phone', title: 'Ponerse de acuerdo en el día sin decir nada más' },
            { icon: 'car', title: 'Ir por separado a una floristería' },
            { icon: 'flower', title: 'Elegir una flor o un pequeño ramo que creas que le gustará al otro' },
            { icon: 'house', title: 'Llegar a casa y sorprenderse con las flores' },
            { icon: 'cup', title: 'Poner ambas flores en un jarrón bonito' }
        ]
    },
    {
        emoji: '🍦',
        text: 'Hacer una ruta por las mejores heladerías de la ciudad.',
        subtasks: [
            { icon: 'laptop', title: 'Buscar en Google "mejores heladerías de [vuestra ciudad]"' },
            { icon: 'clipboard', title: 'Elegir 2 o 3 heladerías para visitar' },
            { icon: 'car', title: 'Ir a la primera y compartir un helado de dos sabores' },
            { icon: 'game', title: 'Caminar hasta la siguiente y probar sabores diferentes' },
            { icon: 'star', title: 'Decidir cuál de las heladerías es vuestra favorita' }
        ]
    },
    // --- Retos Divertidos y Tontos ---
    {
        emoji: '👶',
        text: 'Intentar recrear una foto de vuestra infancia.',
        subtasks: [
            { icon: 'camera', title: 'Buscar cada uno una foto divertida de cuando erais pequeños' },
            { icon: 'gift_box', title: 'Intentar encontrar ropa y un lugar similar al de la foto' },
            { icon: 'estrellas', title: 'Poner la misma pose y expresión que en la foto original' },
            { icon: 'phone', title: 'Pedir a un amigo que os haga la foto o usar un temporizador' },
            { icon: 'laptop', title: 'Crear un montaje con la foto original y la nueva una al lado de la otra' }
        ]
    },
    {
        emoji: ' LEGO',
        text: 'Comprar un set de LEGO pequeño y montarlo juntos.',
        subtasks: [
            { icon: 'money', title: 'Elegir un set de LEGO que os guste a ambos (Star Wars, Harry Potter, flores...)' },
            { icon: 'house', title: 'Abrir la caja y organizar las piezas por color o tamaño' },
            { icon: 'book', title: 'Seguir las instrucciones paso a paso, turnándose' },
            { icon: 'game', title: 'Intentar no perder ninguna pieza pequeña' },
            { icon: 'star', title: 'Exponer la creación final en una estantería' }
        ]
    },
    {
        emoji: '🗣️',
        text: 'Hablar durante una hora solo usando acentos extraños.',
        subtasks: [
            { icon: 'clipboard', title: 'Elegir un acento cada uno (argentino, mexicano, británico...)' },
            { icon: 'laptop', title: 'Ver un vídeo corto para pillar el tono del acento' },
            { icon: 'game', title: 'Poner un temporizador de una hora' },
            { icon: 'cup', title: 'Intentar mantener una conversación normal pero con los acentos' },
            { icon: 'estrellas', title: 'El que pierda el acento primero, tiene que hacer una pequeña prenda' }
        ]
    },
    {
        emoji: ' blindfolded',
        text: 'Dibujarse el uno al otro con los ojos vendados.',
        subtasks: [
            { icon: 'notepad', title: 'Coger papel y lápices' },
            { icon: 'gift_box', title: 'Conseguir un pañuelo o antifaz para vendar los ojos' },
            { icon: 'game', title: 'Sentarse uno en frente del otro' },
            { icon: 'brush', title: 'Intentar dibujar un retrato del otro sin mirar' },
            { icon: 'camera', title: 'Quitarse la venda y reírse con el resultado' }
        ]
    },
    {
        emoji: ' fortaleza',
        text: 'Construir el mejor fuerte de cojines y mantas posible.',
        subtasks: [
            { icon: 'house', title: 'Reunir todos los cojines, mantas y sábanas de la casa' },
            { icon: 'clipboard', title: 'Usar sillas y el sofá como estructura' },
            { icon: 'estrellas', title: 'Crear un interior acogedor con luces de navidad o linternas' },
            { icon: 'laptop', title: 'Llevar el portátil o una tablet dentro para ver una película' },
            { icon: 'pizza', title: 'Comer snacks o pizza dentro del fuerte' }
        ]
    },
    // --- Planificación y Futuro ---
    {
        emoji: '🏡',
        text: 'Buscar casas de ensueño en Idealista/Fotocasa, solo por diversión.',
        subtasks: [
            { icon: 'laptop', title: 'Abrir una web inmobiliaria' },
            { icon: 'money', title: 'Poner filtros de búsqueda absurdos (ej: más de 1 millón, con piscina y 5 habitaciones)' },
            { icon: 'house', title: 'Explorar las casas más espectaculares' },
            { icon: 'clipboard', title: 'Guardar en favoritos las 3 casas que más os gusten' },
            { icon: 'star', title: 'Imaginar cómo sería vuestra vida en una de esas casas' }
        ]
    },
    {
        emoji: '🐶',
        text: 'Crear un plan para adoptar una mascota en el futuro.',
        subtasks: [
            { icon: 'dog', title: 'Decidir qué tipo de mascota os gustaría tener (perro, gato...)' },
            { icon: 'notepad', title: 'Investigar sobre la raza o el tipo de animal (cuidados, carácter...)' },
            { icon:- 'money', title: 'Calcular los costes iniciales y mensuales de tener una mascota' },
            { icon: 'clipboard', title: 'Hacer una lista de posibles nombres' },
            { icon: 'star', title: 'Guardar el plan para cuando sea el momento adecuado' }
        ]
    },
    {
        emoji: '✈️',
        text: 'Planificar un viaje por carretera (road trip).',
        subtasks: [
            { icon: 'laptop', title: 'Elegir un punto de partida y un destino final' },
            { icon: 'map', title: 'Usar Google Maps para trazar una ruta con 3-4 paradas interesantes' },
            { icon: 'clipboard', title: 'Investigar qué ver o hacer en cada parada' },
            { icon: 'music', title: 'Crear una playlist épica para el viaje' },
            { icon: 'money', title: 'Estimar la duración y el presupuesto del viaje' }
        ]
    },
    {
        emoji: '🎯',
        text: 'Definir 3 metas personales y 3 metas de pareja para el próximo año.',
        subtasks: [
            { icon: 'notepad', title: 'Cada uno escribe por separado 3 metas personales' },
            { icon: 'cup', title: 'Ponerlas en común y hablar sobre cómo apoyarse para conseguirlas' },
            { icon: 'heart', title: 'Hacer una lluvia de ideas de metas conjuntas (un viaje, ahorrar, un curso...)' },
            { icon: 'clipboard', title: 'Elegir las 3 metas de pareja más importantes' },
            { icon: 'star', title: 'Escribir todas las metas en un papel y ponerlo en la nevera' }
        ]
    },
    {
        emoji: ' Capsule',
        text: 'Preparar una cápsula del tiempo para abrir en vuestro próximo aniversario.',
        subtasks: [
            { icon: 'box', title: 'Buscar una caja de zapatos o una caja bonita' },
            { icon: 'notepad', title: 'Cada uno escribe una carta para el "yo del futuro" del otro' },
            { icon: 'camera', title: 'Añadir una foto actual y un pequeño objeto que os represente ahora' },
            { icon: 'gift', title: 'Cerrar la caja y escribir la fecha de apertura' },
            { icon: 'house', title: 'Guardar la caja en un lugar donde no la veáis todos los días' }
        ]
    }
];


export function getRandomTask() {
  const randomIndex = Math.floor(Math.random() * tasks.length);
  return tasks[randomIndex];
}
