// ============================================
// MÓDULO DE FAVORES & DESAFÍOS
// ============================================

import { RANDOM_CHALLENGES } from './randomTasks.js';

/**
 * Obtener desafío random
 */
export function getRandomChallenge() {
  const randomIndex = Math.floor(Math.random() * RANDOM_CHALLENGES.length);
  return RANDOM_CHALLENGES[randomIndex];
}

/**
 * Crea un nuevo favor
 */
export async function createCoupon(db, coupleId, currentUserId, currentUserName, title, description, difficulty, points, category) {
  const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const favorsRef = collection(db, 'couples', coupleId, 'favors');
  
  const newFavor = {
    title: title.trim(),
    description: description.trim(),
    difficulty: difficulty,
    points: Number(points),
    category: category,
    createdBy: currentUserId,
    creatorName: currentUserName,
    createdAt: Timestamp.now(),
    completed: false,
    completedAt: null,
    completedBy: null
  };
  
  const docRef = await addDoc(favorsRef, newFavor);
  return docRef.id;
}

/**
 * Obtiene todos los favores de la pareja
 */
export async function getCoupons(db, coupleId) {
  const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const favorsRef = collection(db, 'couples', coupleId, 'favors');
  const q = query(favorsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  const favors = [];
  snapshot.forEach(doc => {
    favors.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return favors;
}

/**
 * Completar un favor (ganar puntos)
 */
export async function redeemCoupon(db, coupleId, couponId, userId) {
  const { doc, updateDoc, Timestamp, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const favorRef = doc(db, 'couples', coupleId, 'favors', couponId);
  const favorSnap = await getDoc(favorRef);
  const favorData = favorSnap.data();
  
  await updateDoc(favorRef, {
    completed: true,
    completedAt: Timestamp.now(),
    completedBy: userId
  });
  
  // Actualizar puntos del usuario que completó el favor
  await updateUserPoints(db, coupleId, userId, favorData.points);
}

/**
 * Elimina un favor
 */
export async function deleteCoupon(db, coupleId, couponId) {
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const favorRef = doc(db, 'couples', coupleId, 'favors', couponId);
  await deleteDoc(favorRef);
}

/**
 * Actualizar puntos de un usuario
 */
async function updateUserPoints(db, coupleId, userId, pointsToAdd) {
  const { doc, getDoc, setDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const userPointsRef = doc(db, 'couples', coupleId, 'favorPoints', userId);
  const userPointsSnap = await getDoc(userPointsRef);
  
  if (userPointsSnap.exists()) {
    const currentPoints = userPointsSnap.data().points || 0;
    await updateDoc(userPointsRef, {
      points: currentPoints + pointsToAdd
    });
  } else {
    await setDoc(userPointsRef, {
      points: pointsToAdd,
      userId: userId
    });
  }
}

/**
 * Obtener puntos de ambos usuarios
 */
export async function getUsersPoints(db, coupleId, myUserId, partnerUserId) {
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const myPointsRef = doc(db, 'couples', coupleId, 'favorPoints', myUserId);
  const partnerPointsRef = doc(db, 'couples', coupleId, 'favorPoints', partnerUserId);
  
  const [myPointsSnap, partnerPointsSnap] = await Promise.all([
    getDoc(myPointsRef),
    getDoc(partnerPointsRef)
  ]);
  
  return {
    myPoints: myPointsSnap.exists() ? myPointsSnap.data().points : 0,
    partnerPoints: partnerPointsSnap.exists() ? partnerPointsSnap.data().points : 0
  };
}
