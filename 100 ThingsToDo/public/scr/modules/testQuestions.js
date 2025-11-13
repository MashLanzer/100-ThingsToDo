// ============================================
// PREGUNTAS DEL JUEGO "EL TEST"
// ============================================

// Importar las preguntas desde el archivo separado
import { testQuestions } from './questions.js';

// Títulos de pareja según porcentaje de compatibilidad
const coupleTitles = [
  { min: 0, max: 20, title: "Novios Novatos", description: "¡Están empezando a conocerse! Tienen mucho por descubrir el uno del otro. 💕" },
  { min: 21, max: 40, title: "Pareja Curiosa", description: "Se conocen lo básico, pero hay muchos detalles por explorar. 🔍" },
  { min: 41, max: 60, title: "Dúo Conectado", description: "Tienen una buena conexión y se conocen bastante bien. 🤝" },
  { min: 61, max: 80, title: "Almas Cercanas", description: "Se conocen profundamente y comparten mucho. 💞" },
  { min: 81, max: 95, title: "Almas Gemelas", description: "¡Se conocen como la palma de su mano! Son prácticamente uno. 👫" },
  { min: 96, max: 100, title: "Leyendas del Amor", description: "¡Son una pareja legendaria! Su conexión es épica. 👑" }
];

// ============================================
// FUNCIONES PARA TESTS COMPARTIDOS
// ============================================

// Importar funciones de Firebase
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Función para crear un nuevo test
export async function createTest(db, creatorId, targetId, creatorName, targetName) {
  try {
    const testData = {
      id: `test_${Date.now()}_${creatorId}`,
      creatorId,
      targetId,
      creatorName,
      targetName,
      questions: [...testQuestions].sort(() => Math.random() - 0.5).slice(0, 10),
      answers: [], // Respuestas del creador
      guesses: [], // Adivinanzas del respondedor
      status: 'active', // active, completed, expired
      createdAt: new Date(),
      completedAt: null,
      currentQuestionIndex: 0,
      correctAnswers: 0,
      skippedQuestions: 0
    };

    // Guardar en Firebase
    const docRef = await addDoc(collection(db, 'tests'), testData);
    return { success: true, testId: docRef.id, test: testData };
  } catch (error) {
    console.error('Error creating test:', error);
    return { success: false, error: error.message };
  }
}

// Función para obtener tests disponibles para responder
export async function getAvailableTests(db, userId) {
  try {
    const q = query(
      collection(db, 'tests'),
      where('targetId', '==', userId),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tests = [];

    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, tests };
  } catch (error) {
    console.error('Error getting available tests:', error);
    return { success: false, error: error.message };
  }
}

// Función para obtener tests creados por el usuario
export async function getCreatedTests(db, userId) {
  try {
    const q = query(
      collection(db, 'tests'),
      where('creatorId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tests = [];

    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, tests };
  } catch (error) {
    console.error('Error getting created tests:', error);
    return { success: false, error: error.message };
  }
}

// Función para actualizar un test con respuestas
export async function updateTestAnswers(db, testId, answers, currentQuestionIndex, isCompleted = false) {
  try {
    const updateData = {
      answers,
      currentQuestionIndex,
      updatedAt: new Date()
    };

    // Si está completado, marcar el estado
    if (isCompleted) {
      updateData.creatorCompleted = true;
      updateData.status = 'active'; // Cambiar a active para que la pareja pueda responder
    }

    await updateDoc(doc(db, 'tests', testId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating test answers:', error);
    return { success: false, error: error.message };
  }
}

// Función para actualizar un test con adivinanzas
export async function updateTestGuesses(db, testId, guesses, correctAnswers, skippedQuestions) {
  try {
    const status = guesses.length === 10 ? 'completed' : 'active';

    await updateDoc(doc(db, 'tests', testId), {
      guesses,
      correctAnswers,
      skippedQuestions,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating test guesses:', error);
    return { success: false, error: error.message };
  }
}

// Función para verificar si hay tests activos
export async function hasActiveTest(db, userId) {
  try {
    // Verificar si el usuario creó un test activo o esperando respuesta
    const createdQuery = query(
      collection(db, 'tests'),
      where('creatorId', '==', userId),
      where('status', 'in', ['active', 'waiting_for_partner'])
    );

    // Verificar si hay un test activo para responder
    const targetQuery = query(
      collection(db, 'tests'),
      where('targetId', '==', userId),
      where('status', '==', 'active')
    );

    const [createdSnapshot, targetSnapshot] = await Promise.all([
      getDocs(createdQuery),
      getDocs(targetQuery)
    ]);

    return {
      success: true,
      hasActiveTest: !createdSnapshot.empty || !targetSnapshot.empty,
      createdActive: !createdSnapshot.empty,
      targetActive: !targetSnapshot.empty
    };
  } catch (error) {
    console.error('Error checking active tests:', error);
    return { success: false, error: error.message };
  }
}

// Función para obtener un test específico
export async function getTest(db, testId) {
  try {
    const docSnap = await getDoc(doc(db, 'tests', testId));

    if (docSnap.exists()) {
      return { success: true, test: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'Test not found' };
    }
  } catch (error) {
    console.error('Error getting test:', error);
    return { success: false, error: error.message };
  }
}

// Exportar los títulos de pareja para que puedan ser usados en otros archivos
export { coupleTitles };