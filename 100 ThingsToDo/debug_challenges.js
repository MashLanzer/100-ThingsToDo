// Script de diagnóstico para ejecutar en la consola del navegador
console.log('🔍 DIAGNÓSTICO DEL SISTEMA DE DESAFÍOS');
console.log('=====================================');

// Verificar si el sistema existe
if (typeof gamificationSystem === 'undefined') {
  console.error('❌ gamificationSystem no está definido');
} else {
  console.log('✅ gamificationSystem existe');

  // Verificar propiedades básicas
  console.log('📊 Estado del sistema:');
  console.log('  - Puntos:', gamificationSystem.points);
  console.log('  - Nivel:', gamificationSystem.level);
  console.log('  - Tareas completadas:', gamificationSystem.stats.tasksCompleted);
  console.log('  - Desafíos totales:', gamificationSystem.challenges.length);

  // Verificar desafíos específicos
  const complete5Tasks = gamificationSystem.challenges.find(c => c.id === 'complete_5_tasks');
  const reachLevel3 = gamificationSystem.challenges.find(c => c.id === 'reach_level_3');
  const streakChallenge = gamificationSystem.challenges.find(c => c.id === 'streak_challenge');

  console.log('🎯 Estado de desafíos clave:');
  console.log('  - complete_5_tasks:', {
    progress: complete5Tasks?.progress,
    accepted: complete5Tasks?.accepted,
    completed: complete5Tasks?.completed
  });
  console.log('  - reach_level_3:', {
    progress: reachLevel3?.progress,
    accepted: reachLevel3?.accepted,
    completed: reachLevel3?.completed
  });
  console.log('  - streak_challenge:', {
    progress: streakChallenge?.progress,
    accepted: streakChallenge?.accepted,
    completed: streakChallenge?.completed
  });
}

// Verificar localStorage
console.log('💾 Estado de localStorage:');
try {
  const saved = localStorage.getItem('gamification_progress');
  if (saved) {
    const progress = JSON.parse(saved);
    console.log('  - Datos guardados:', {
      points: progress.totalPoints,
      challengesCount: progress.challenges?.length,
      firstChallenge: progress.challenges?.[0] ? {
        id: progress.challenges[0].id,
        progress: progress.challenges[0].progress,
        accepted: progress.challenges[0].accepted
      } : 'none'
    });
  } else {
    console.log('  - No hay datos guardados');
  }
} catch (error) {
  console.error('  - Error al leer localStorage:', error);
}

// Verificar funciones
console.log('🔧 Verificación de funciones:');
console.log('  - updateChallengeProgress existe:', typeof gamificationSystem?.updateChallengeProgress === 'function');
console.log('  - earnPoints existe:', typeof gamificationSystem?.earnPoints === 'function');
console.log('  - saveProgress existe:', typeof gamificationSystem?.saveProgress === 'function');

// Test manual
console.log('🧪 Test manual:');
if (gamificationSystem) {
  console.log('  Ejecutando earnPoints manualmente...');
  const result = gamificationSystem.earnPoints(10, 'task_completion');
  console.log('  Resultado:', result);

  console.log('  Nuevo estado de complete_5_tasks:');
  const challenge = gamificationSystem.challenges.find(c => c.id === 'complete_5_tasks');
  console.log('    - progress:', challenge?.progress);
  console.log('    - accepted:', challenge?.accepted);
  console.log('    - completed:', challenge?.completed);
}

console.log('=====================================');
console.log('🔍 Diagnóstico completado. Revisa los logs arriba para identificar el problema.');