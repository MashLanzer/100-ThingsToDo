/**
 * Sistema de Desafíos para 100 Things To Do
 * Desafíos realistas relacionados con la app y la relación de pareja
 */

const CHALLENGES_DATA = [
  // === DESAFÍOS DE PRODUCTIVIDAD ===
  {
    id: 'complete_5_tasks',
    name: 'Productividad Inicial',
    description: 'Completa 5 tareas en una semana',
    icon: '📝',
    category: 'productivity',
    target: 5,
    progress: 0,
    rewardPoints: 50,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Organiza tus tareas diarias y marca como completadas las que termines.'
  },
  {
    id: 'complete_10_tasks',
    name: 'Productividad Avanzada',
    description: 'Completa 10 tareas en total',
    icon: '📊',
    category: 'productivity',
    target: 10,
    progress: 0,
    rewardPoints: 75,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Establece metas realistas y celebra cada logro pequeño.'
  },
  {
    id: 'complete_25_tasks',
    name: 'Maestro de Tareas',
    description: 'Completa 25 tareas en total',
    icon: '👑',
    category: 'productivity',
    target: 25,
    progress: 0,
    rewardPoints: 150,
    rewardBadge: { id: 'task_master', name: 'Maestro de Tareas', icon: '👑' },
    accepted: false,
    completed: false,
    tips: 'Has demostrado ser consistente. ¡Sigue así!'
  },

  // === DESAFÍOS DE CRECIMIENTO PERSONAL ===
  {
    id: 'reach_level_3',
    name: 'Crecimiento Personal',
    description: 'Alcanza el nivel 3',
    icon: '🌟',
    category: 'growth',
    target: 1,
    progress: 0,
    rewardPoints: 100,
    rewardBadge: { id: 'level_up', name: 'Subiendo de Nivel', icon: '⬆️' },
    accepted: false,
    completed: false,
    tips: 'Cada nivel representa crecimiento. ¡Sigue completando tareas!'
  },
  {
    id: 'reach_level_5',
    name: 'Experiencia Consolidada',
    description: 'Alcanza el nivel 5',
    icon: '⭐',
    category: 'growth',
    target: 1,
    progress: 0,
    rewardPoints: 200,
    rewardBadge: { id: 'experienced', name: 'Experimentado', icon: '⭐' },
    accepted: false,
    completed: false,
    tips: 'Tu experiencia está creciendo. ¡Estás en el camino correcto!'
  },
  {
    id: 'earn_500_points',
    name: 'Puntuación Dorada',
    description: 'Acumula 500 puntos en total',
    icon: '🥇',
    category: 'growth',
    target: 500,
    progress: 0,
    rewardPoints: 100,
    rewardBadge: { id: 'golden_score', name: 'Puntuación Dorada', icon: '🥇' },
    accepted: false,
    completed: false,
    tips: 'Los puntos se acumulan con cada tarea completada.'
  },

  // === DESAFÍOS DE CONSISTENCIA ===
  {
    id: 'streak_challenge',
    name: 'Racha Perfecta',
    description: 'Completa tareas 7 días seguidos',
    icon: '🔥',
    category: 'consistency',
    target: 7,
    progress: 0,
    rewardPoints: 150,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'La consistencia diaria es la clave del éxito.'
  },
  {
    id: 'streak_14_days',
    name: 'Racha Legendaria',
    description: 'Completa tareas 14 días seguidos',
    icon: '⚡',
    category: 'consistency',
    target: 14,
    progress: 0,
    rewardPoints: 300,
    rewardBadge: { id: 'legendary_streak', name: 'Racha Legendaria', icon: '⚡' },
    accepted: false,
    completed: false,
    tips: '¡Estás construyendo hábitos increíbles!'
  },
  {
    id: 'weekly_warrior',
    name: 'Guerrero Semanal',
    description: 'Completa al menos una tarea cada semana durante 4 semanas',
    icon: '🛡️',
    category: 'consistency',
    target: 4,
    progress: 0,
    rewardPoints: 120,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'La consistencia semanal es mejor que la perfección diaria.'
  },

  // === DESAFÍOS DE PAREJA ===
  {
    id: 'couple_tasks_5',
    name: 'Compañeros en Acción',
    description: 'Completa 5 tareas juntos como pareja',
    icon: '💑',
    category: 'couple',
    target: 5,
    progress: 0,
    rewardPoints: 80,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Trabajar juntos fortalece los lazos. ¡Planeen actividades conjuntas!'
  },
  {
    id: 'romantic_date',
    name: 'Cita Romántica',
    description: 'Planifica y completa una cita romántica especial',
    icon: '💕',
    category: 'couple',
    target: 1,
    progress: 0,
    rewardPoints: 100,
    rewardBadge: { id: 'romantic', name: 'Romántico', icon: '💕' },
    accepted: false,
    completed: false,
    tips: 'Las pequeñas atenciones mantienen viva la chispa del amor.'
  },
  {
    id: 'memory_lane',
    name: 'Viaje al Pasado',
    description: 'Revive un recuerdo especial juntos',
    icon: '📸',
    category: 'couple',
    target: 1,
    progress: 0,
    rewardPoints: 60,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Recordar momentos felices fortalece la relación.'
  },
  {
    id: 'support_system',
    name: 'Sistema de Apoyo',
    description: 'Ayuda a tu pareja con 3 tareas difíciles',
    icon: '🤝',
    category: 'couple',
    target: 3,
    progress: 0,
    rewardPoints: 90,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'El apoyo mutuo es fundamental en una relación sana.'
  },

  // === DESAFÍOS DE ORGANIZACIÓN ===
  {
    id: 'organize_week',
    name: 'Semana Organizada',
    description: 'Planifica todas las tareas de una semana completa',
    icon: '📅',
    category: 'organization',
    target: 1,
    progress: 0,
    rewardPoints: 70,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'La planificación reduce el estrés y aumenta la productividad.'
  },
  {
    id: 'category_master',
    name: 'Maestro de Categorías',
    description: 'Completa tareas en al menos 5 categorías diferentes',
    icon: '🏷️',
    category: 'organization',
    target: 5,
    progress: 0,
    rewardPoints: 85,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'La diversidad en las tareas mantiene las cosas interesantes.'
  },
  {
    id: 'priority_expert',
    name: 'Experto en Prioridades',
    description: 'Completa 10 tareas marcadas como de alta prioridad',
    icon: '🎯',
    category: 'organization',
    target: 10,
    progress: 0,
    rewardPoints: 110,
    rewardBadge: { id: 'priority_expert', name: 'Experto en Prioridades', icon: '🎯' },
    accepted: false,
    completed: false,
    tips: 'Enfocarte en lo importante marca la diferencia.'
  },

  // === DESAFÍOS DE MOTIVACIÓN ===
  {
    id: 'motivation_booster',
    name: 'Impulsor de Motivación',
    description: 'Motiva a tu pareja para completar 3 tareas juntos',
    icon: '🚀',
    category: 'motivation',
    target: 3,
    progress: 0,
    rewardPoints: 95,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Un pequeño empujón puede marcar una gran diferencia.'
  },
  {
    id: 'celebration_master',
    name: 'Maestro de Celebraciones',
    description: 'Celebra 5 logros importantes juntos',
    icon: '🎉',
    category: 'motivation',
    target: 5,
    progress: 0,
    rewardPoints: 75,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'Celebrar los logros mantiene la motivación alta.'
  },
  {
    id: 'goal_achiever',
    name: 'Logro de Metas',
    description: 'Alcanza una meta personal importante',
    icon: '🏆',
    category: 'motivation',
    target: 1,
    progress: 0,
    rewardPoints: 200,
    rewardBadge: { id: 'goal_achiever', name: 'Logro de Metas', icon: '🏆' },
    accepted: false,
    completed: false,
    tips: 'Establecer y alcanzar metas es el camino al éxito.'
  },

  // === DESAFÍOS DE CREATIVIDAD ===
  {
    id: 'creative_tasks',
    name: 'Tareas Creativas',
    description: 'Completa 5 tareas que involucren creatividad',
    icon: '🎨',
    category: 'creativity',
    target: 5,
    progress: 0,
    rewardPoints: 80,
    rewardBadge: null,
    accepted: false,
    completed: false,
    tips: 'La creatividad mantiene la vida interesante y divertida.'
  },
  {
    id: 'new_experience',
    name: 'Nueva Experiencia',
    description: 'Prueba algo completamente nuevo juntos',
    icon: '🌈',
    category: 'creativity',
    target: 1,
    progress: 0,
    rewardPoints: 120,
    rewardBadge: { id: 'adventurer', name: 'Aventurero', icon: '🌈' },
    accepted: false,
    completed: false,
    tips: 'Salir de la zona de confort crea recuerdos inolvidables.'
  }
];

// Función para obtener desafíos por categoría
function getChallengesByCategory(category) {
  return CHALLENGES_DATA.filter(challenge => challenge.category === category);
}

// Función para obtener desafíos disponibles (no completados)
function getAvailableChallenges() {
  return CHALLENGES_DATA.filter(challenge => !challenge.completed);
}

// Función para obtener desafíos completados
function getCompletedChallenges() {
  return CHALLENGES_DATA.filter(challenge => challenge.completed);
}

// Función para buscar un desafío por ID
function getChallengeById(id) {
  return CHALLENGES_DATA.find(challenge => challenge.id === id);
}

// Exportar las funciones y datos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHALLENGES_DATA,
    getChallengesByCategory,
    getAvailableChallenges,
    getCompletedChallenges,
    getChallengeById
  };
}