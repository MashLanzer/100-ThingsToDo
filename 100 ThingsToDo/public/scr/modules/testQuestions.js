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
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Función para crear un nuevo test
export async function createTest(db, creatorId, targetId, creatorName, targetName) {
  try {
    const testId = `test_${Date.now()}_${creatorId}`;
    const testData = {
      id: testId,
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

    // Guardar en Firebase usando setDoc con ID personalizado
    await setDoc(doc(db, 'tests', testId), testData);
    return { success: true, testId: testId, test: testData };
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
    console.log('DEBUG: updateTestAnswers called with:', {
      testId,
      answers: answers ? answers.length : 'undefined',
      currentQuestionIndex,
      isCompleted
    });

    // Validar que no haya valores undefined
    if (answers === undefined || currentQuestionIndex === undefined) {
      console.error('ERROR: updateTestAnswers received undefined values:', { answers, currentQuestionIndex });
      return { success: false, error: 'Invalid data: answers or currentQuestionIndex is undefined' };
    }

    // Validar que answers sea un array y no contenga valores undefined
    if (!Array.isArray(answers)) {
      console.error('ERROR: answers is not an array:', answers);
      return { success: false, error: 'Invalid data: answers is not an array' };
    }

    // Filtrar valores undefined en answers
    const cleanAnswers = answers.filter(answer => answer !== undefined && answer !== null);
    if (cleanAnswers.length !== answers.length) {
      console.warn('WARNING: Found undefined/null values in answers, cleaned them out');
    }

    const updateData = {
      answers: cleanAnswers,
      currentQuestionIndex,
      updatedAt: new Date()
    };

    // Si está completado, marcar el estado
    if (isCompleted) {
      updateData.creatorCompleted = true;
      updateData.status = 'active'; // Cambiar a active para que la pareja pueda responder
    }

    console.log('DEBUG: updateData to save:', updateData);
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
    console.log('DEBUG: updateTestGuesses called with testId:', testId);
    console.log('DEBUG: updateTestGuesses - guesses length:', guesses.length);

    // Verificar si el documento existe antes de intentar actualizarlo
    const docRef = doc(db, 'tests', testId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.error('DEBUG: Document does not exist! testId:', testId);

      // Intentar buscar documentos similares
      try {
        const testsRef = collection(db, 'tests');
        const q = query(testsRef, limit(20));
        const querySnapshot = await getDocs(q);

        console.log('DEBUG: Total documents found in tests collection:', querySnapshot.size);
        console.log('DEBUG: First 10 document IDs:');
        querySnapshot.docs.slice(0, 10).forEach((doc, index) => {
          console.log(`  ${index + 1}. ${doc.id} - Status: ${doc.data().status || 'unknown'} - Creator: ${doc.data().creatorId || 'unknown'}`);
        });

        // Buscar documentos que contengan parte del ID
        const partialId = testId.split('_')[1]; // Extraer timestamp
        console.log('DEBUG: Searching for documents containing timestamp:', partialId);
        querySnapshot.docs.forEach((doc) => {
          if (doc.id.includes(partialId)) {
            console.log('  FOUND SIMILAR:', doc.id, doc.data());
          }
        });

      } catch (searchError) {
        console.error('DEBUG: Error searching for documents:', searchError);
      }

      return { success: false, error: 'Test document not found' };
    }

    console.log('DEBUG: Document exists, proceeding with update');

    const status = guesses.length === 10 ? 'completed' : 'active';

    await updateDoc(docRef, {
      guesses,
      correctAnswers,
      skippedQuestions,
      status,
      completedAt: status === 'completed' ? new Date() : null,
      updatedAt: new Date()
    });

    console.log('DEBUG: Update successful');
    return { success: true };
  } catch (error) {
    console.error('Error updating test guesses:', error);
    console.error('Error details:', error.code, error.message);
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