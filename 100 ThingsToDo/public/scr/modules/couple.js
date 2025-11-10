// ============================================
// MÓDULO DE SISTEMA DE PAREJAS
// ============================================

import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  query, 
  where,
  Timestamp,
  setDoc,
 // deleteDoc  <-- AGREGADO
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============================================
// GENERADOR DE CÓDIGO ÚNICO
// ============================================

function generateCoupleCode( ) {
  // Genera un código de 6 caracteres alfanumérico (ej: AB12CD)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}


// ============================================
// FUNCIONES DE FIRESTORE PARA PAREJAS
// ============================================

/**
 * Obtiene o crea el código único del usuario
 * @param {Object} db - Instancia de Firestore
 * @param {string} userId - ID del usuario actual
 * @returns {Promise<Object>} Objeto con el código y datos del usuario
 */
export async function getUserCoupleCode(db, userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().coupleCode) {
      // El usuario ya tiene un código
      return {
        code: userSnap.data().coupleCode,
        partnerId: userSnap.data().partnerId || null,
        partnerName: userSnap.data().partnerName || null,
        linkedAt: userSnap.data().linkedAt?.toDate() || null
      };
    } else {
      // Generar nuevo código único
      let newCode = generateCoupleCode();
      let isUnique = false;
      
      // Verificar que el código sea único
      while (!isUnique) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('coupleCode', '==', newCode));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          isUnique = true;
        } else {
          newCode = generateCoupleCode();
        }
      }
      
      // Guardar el código en el perfil del usuario
      await setDoc(userRef, {
        coupleCode: newCode,
        partnerId: null,
        partnerName: null,
        linkedAt: null
      }, { merge: true });
      
      return {
        code: newCode,
        partnerId: null,
        partnerName: null,
        linkedAt: null
      };
    }
  } catch (error) {
    console.error('Error al obtener código de pareja:', error);
    throw error;
  }
}



// ============================================
// FUNCIONES DE MIGRACIÓN (CORREGIDA)
// ============================================

/**
 * Migra los planes individuales de dos usuarios a la nueva colección compartida.
 * @param {Object} db - Instancia de Firestore
 * @param {string} userId1 - ID del primer usuario
 * @param {string} userId2 - ID del segundo usuario
 * @param {string} newCoupleId - ID de la nueva colección compartida
 */
async function migratePlans(db, userId1, userId2, newCoupleId) {
  const usersToMigrate = [userId1, userId2];
  
  for (const userId of usersToMigrate) {
    const oldCoupleId = `couple-${userId}`;
    const oldPlansRef = collection(db, 'couples', oldCoupleId, 'plans');
    const newPlansRef = collection(db, 'couples', newCoupleId, 'plans');
    
    const snapshot = await getDocs(oldPlansRef);
    
    for (const docSnap of snapshot.docs) {
      const planData = docSnap.data();
      const planId = docSnap.id;
      
      // 1. Copiar el plan a la nueva colección (USANDO setDoc)
      const newPlanRef = doc(newPlansRef, planId);
      await setDoc(newPlanRef, planData);
      
      // 2. Migrar las tareas de ese plan
      const oldTasksRef = collection(db, 'couples', oldCoupleId, 'plans', planId, 'tasks');
      const newTasksRef = collection(db, 'couples', newCoupleId, 'plans', planId, 'tasks');
      
      const tasksSnapshot = await getDocs(oldTasksRef);
      
      for (const taskSnap of tasksSnapshot.docs) {
        await setDoc(doc(newTasksRef, taskSnap.id), taskSnap.data());
      }
      
      // 3. Eliminar el plan original (y sus tareas)
      // La eliminación puede fallar por permisos, pero la copia ya se hizo.
      // Intentamos eliminar, si falla, no importa, el plan original ya no será accesible
      // por el usuario una vez que su coupleId cambie.
     // try {
      //  await deleteDoc(doc(oldPlansRef, planId));
   //   } catch (e) {
    //    console.warn(`No se pudo eliminar el plan ${planId} de ${oldCoupleId}. Probablemente por permisos. El plan fue copiado.`);
    //  }
    }
  }
}



/**
 * Vincula dos usuarios usando el código de pareja
 * @param {Object} db - Instancia de Firestore
 * @param {string} userId - ID del usuario actual
 * @param {string} userName - Nombre del usuario actual
 * @param {string} partnerCode - Código del usuario a vincular
 * @returns {Promise<Object>} Datos de la vinculación
 */
export async function linkWithPartner(db, userId, userName, partnerCode) {
  try {
    // Buscar usuario con ese código
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('coupleCode', '==', partnerCode.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('Código no encontrado');
    }
    
    const partnerDoc = snapshot.docs[0];
    const partnerId = partnerDoc.id;
    const partnerData = partnerDoc.data();
    
    // Verificar que no sea el mismo usuario
    if (partnerId === userId) {
      throw new Error('No puedes vincularte contigo mismo');
    }
    
    // Verificar que el partner no esté ya vinculado con alguien más
    if (partnerData.partnerId && partnerData.partnerId !== userId) {
      throw new Error('Este código ya está vinculado con otra persona');
    }
    
    // Obtener datos del usuario actual
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    
    // Verificar que el usuario actual no esté vinculado con alguien más
    if (userData.partnerId && userData.partnerId !== partnerId) {
      throw new Error('Ya estás vinculado con otra persona');
    }
    
    // Crear o actualizar el ID de la pareja
    const coupleId = [userId, partnerId].sort().join('_');
    
    // Actualizar ambos usuarios
    const now = Timestamp.now();
    
    await updateDoc(userRef, {
      partnerId: partnerId,
      partnerName: partnerData.displayName || partnerData.email,
      coupleId: coupleId,
      linkedAt: now
    });
    
    await updateDoc(doc(db, 'users', partnerId), {
      partnerId: userId,
      partnerName: userName,
      coupleId: coupleId,
      linkedAt: now
    });
    
    // Crear documento de pareja si no existe
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleSnap = await getDoc(coupleRef);
    
    if (!coupleSnap.exists()) {
      await setDoc(coupleRef, {
        user1Id: userId,
        user2Id: partnerId,
        createdAt: now
      }, { merge: true });
    }
    
    // LLAMADA A LA NUEVA FUNCIÓN DE MIGRACIÓN
    await migratePlans(db, userId, partnerId, coupleId);
    
    return {
      success: true,
      partnerId: partnerId,
      partnerName: partnerData.displayName || partnerData.email,
      coupleId: coupleId
    };
  } catch (error) {
    console.error('Error al vincular pareja:', error);
    throw error;
  }
}

/**
 * Desvincula al usuario de su pareja
 * @param {Object} db - Instancia de Firestore
 * @param {string} userId - ID del usuario actual
 * @returns {Promise<void>}
 */
export async function unlinkPartner(db, userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    
    if (!userData.partnerId) {
      throw new Error('No estás vinculado con nadie');
    }
    
    const partnerId = userData.partnerId;
    
    // Actualizar ambos usuarios
    await updateDoc(userRef, {
      partnerId: null,
      partnerName: null,
      coupleId: null,
      linkedAt: null
    });
    
    await updateDoc(doc(db, 'users', partnerId), {
      partnerId: null,
      partnerName: null,
      coupleId: null,
      linkedAt: null
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error al desvincular pareja:', error);
    throw error;
  }
}

/**
 * Inicializa el perfil del usuario si no existe
 * @param {Object} db - Instancia de Firestore
 * @param {Object} user - Usuario de Firebase Auth
 * @returns {Promise<void>}
 */
export async function initializeUserProfile(db, user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Crear perfil inicial
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: Timestamp.now(),
        coupleCode: null,
        partnerId: null,
        partnerName: null,
        coupleId: null,
        linkedAt: null
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error al inicializar perfil:', error);
    throw error;
  }
}
