// ============================================
// PREGUNTAS DEL JUEGO "EL TEST"
// ============================================

const testQuestions = [
  "¿Cuál es mi comida favorita?",
  "¿Mi mayor manía o costumbre rara?",
  "¿Qué canción me hace llorar?",
  "¿Mi sueño más loco o ambición secreta?",
  "¿Cuál es mi recuerdo de infancia favorito?",
  "¿Qué superpoder querría tener?",
  "¿Mi lugar favorito del mundo?",
  "¿Qué me hace reír sin parar?",
  "¿Mi mayor miedo irracional?",
  "¿Qué haría si ganara la lotería?",
  "¿Cuál es mi ritual matutino?",
  "¿Mi película favorita de todos los tiempos?",
  "¿Qué actividad me relaja completamente?",
  "¿Mi mayor logro personal?",
  "¿Cuál es mi color favorito?",
  "¿Qué tipo de música escucho cuando estoy feliz?",
  "¿Mi postre favorito?",
  "¿Qué haría en un día perfecto?",
  "¿Mi animal favorito?",
  "¿Cuál es mi estación del año preferida?"
];

// Títulos de pareja según porcentaje de compatibilidad
const coupleTitles = [
  { min: 0, max: 20, title: "Novios Novatos", description: "¡Están empezando a conocerse! Tienen mucho por descubrir el uno del otro. 💕" },
  { min: 21, max: 40, title: "Pareja Curiosa", description: "Se conocen lo básico, pero hay muchos detalles por explorar. 🔍" },
  { min: 41, max: 60, title: "Dúo Conectado", description: "Tienen una buena conexión y se conocen bastante bien. 🤝" },
  { min: 61, max: 80, title: "Almas Cercanas", description: "Se conocen profundamente y comparten mucho. 💞" },
  { min: 81, max: 95, title: "Almas Gemelas", description: "¡Se conocen como la palma de su mano! Son prácticamente uno. 👫" },
  { min: 96, max: 100, title: "Leyendas del Amor", description: "¡Son una pareja legendaria! Su conexión es épica. 👑" }
];

// Exportar las preguntas y títulos para que puedan ser usados en otros archivos
export { testQuestions, coupleTitles };