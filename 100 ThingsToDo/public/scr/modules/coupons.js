// ============================================
// MÓDULO DE CUPONES DE AMOR
// ============================================

/**
 * Crea un nuevo cupón de amor
 * @param {Object} db - Instancia de Firestore
 * @param {string} coupleId - ID de la pareja
 * @param {string} currentUserId - ID del usuario actual
 * @param {string} currentUserName - Nombre del usuario actual
 * @param {string} title - Título del cupón ("Vale por...")
 * @param {string} description - Descripción opcional
 * @param {string} color - Color del cupón
 */
export async function createCoupon(db, coupleId, currentUserId, currentUserName, title, description, color) {
  const { collection, addDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const couponsRef = collection(db, 'couples', coupleId, 'coupons');
  
  const newCoupon = {
    title: title.trim(),
    description: description.trim(),
    color: color,
    createdBy: currentUserId,
    creatorName: currentUserName,
    createdAt: Timestamp.now(),
    redeemed: false,
    redeemedAt: null,
    redeemedBy: null
  };
  
  const docRef = await addDoc(couponsRef, newCoupon);
  return docRef.id;
}

/**
 * Obtiene todos los cupones de la pareja
 * @param {Object} db - Instancia de Firestore
 * @param {string} coupleId - ID de la pareja
 */
export async function getCoupons(db, coupleId) {
  const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const couponsRef = collection(db, 'couples', coupleId, 'coupons');
  const q = query(couponsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  const coupons = [];
  snapshot.forEach(doc => {
    coupons.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  return coupons;
}

/**
 * Canjea un cupón
 * @param {Object} db - Instancia de Firestore
 * @param {string} coupleId - ID de la pareja
 * @param {string} couponId - ID del cupón
 * @param {string} userId - ID del usuario que canjea
 */
export async function redeemCoupon(db, coupleId, couponId, userId) {
  const { doc, updateDoc, Timestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const couponRef = doc(db, 'couples', coupleId, 'coupons', couponId);
  
  await updateDoc(couponRef, {
    redeemed: true,
    redeemedAt: Timestamp.now(),
    redeemedBy: userId
  });
}

/**
 * Elimina un cupón
 * @param {Object} db - Instancia de Firestore
 * @param {string} coupleId - ID de la pareja
 * @param {string} couponId - ID del cupón
 */
export async function deleteCoupon(db, coupleId, couponId) {
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const couponRef = doc(db, 'couples', coupleId, 'coupons', couponId);
  await deleteDoc(couponRef);
}
