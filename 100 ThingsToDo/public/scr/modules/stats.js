// ============================================
// MÓDULO DE ESTADÍSTICAS DE PAREJA
// ============================================

import { 
  getFirestore, 
  collection, 
  getDocs, 
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// MÓDULO DE ESTADÍSTICAS DE PAREJA
// ============================================

// NO NECESITAMOS IMPORTAR FIREBASE AQUÍ

/**
 * Calcula las estadísticas de planes y tareas para una pareja.
 * @param {Object} db - Instancia de Firestore (pasada desde app.js).
 * @param {Object} collection - Función 'collection' de Firestore.
 * @param {Object} getDocs - Función 'getDocs' de Firestore.
 * @param {string} coupleId - ID de la colección de la pareja.
 * @param {string} userId - ID del usuario actual.
 * @param {string} partnerId - ID de la pareja del usuario.
 * @returns {Promise<Object>} Objeto con todas las estadísticas calculadas.
 */
export async function calculateCoupleStats(db, collection, getDocs, coupleId, userId, partnerId) {
  if (!coupleId || !userId || !partnerId) {
    return null;
  }

  try {
    const plansRef = collection(db, 'couples', coupleId, 'plans');
    const plansSnapshot = await getDocs(plansRef);

    let totalPlans = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let userCompletedTasks = 0;
    let partnerCompletedTasks = 0;
    let completedPlans = 0;

    totalPlans = plansSnapshot.size;

    for (const planDoc of plansSnapshot.docs) {
      const tasksRef = collection(planDoc.ref, 'tasks');
      const tasksSnapshot = await getDocs(tasksRef);
      
      const planTotalTasks = tasksSnapshot.size;
      let planCompletedTasks = 0;
      
      totalTasks += planTotalTasks;

      tasksSnapshot.forEach(taskDoc => {
        const taskData = taskDoc.data();
        if (taskData.completed) {
          completedTasks++;
          planCompletedTasks++;
          
          if (taskData.completedBy === userId) {
            userCompletedTasks++;
          } else if (taskData.completedBy === partnerId) {
            partnerCompletedTasks++;
          }
        }
      });

      if (planTotalTasks > 0 && planTotalTasks === planCompletedTasks) {
        completedPlans++;
      }
    }

    return {
      totalPlans,
      completedPlans,
      totalTasks,
      completedTasks,
      userCompletedTasks,
      partnerCompletedTasks,
      completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };

  } catch (error) {
    console.error("Error al calcular estadísticas:", error);
    throw error;
  }
}

