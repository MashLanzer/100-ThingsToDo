// ============================================
// MÓDULO DE NOTIFICACIONES PUSH
// ============================================

import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =======================================================================
// ======> ¡IMPORTANTE! Pega tu clave pública de Firebase aquí <=======
// =======================================================================
const VAPID_KEY = 'BNbNtUbdQkOGikrsiXt9Q968eFJV-xh2Avzh-puVTmJiA36xWjFqc-_Ni8XuqbTodGZIY-wf7BAZXDZJvEvHqiY';
// =======================================================================

// Función para obtener la instancia de Firestore (lazy initialization)
function getDb() {
  return getFirestore();
}

/**
 * Inicializa el proceso de notificaciones.
 * Comprueba si son compatibles y si el usuario ya ha dado permiso.
 */
export function initializeNotifications(userId) {
  if (!('PushManager' in window)) {
    console.warn('Las notificaciones push no son compatibles con este navegador.');
    return;
  }

  // Comprobar el estado del permiso actual
  navigator.serviceWorker.ready.then(registration => {
    if (Notification.permission === 'granted') {
      console.log('El permiso para notificaciones ya fue concedido.');
      // Si ya tenemos permiso, nos aseguramos de que el usuario esté suscrito
      subscribeUserToPush(userId, registration);
    } else {
      // Si no tenemos permiso, podríamos mostrar un botón para pedirlos.
      // Por ahora, lo dejamos así para no ser intrusivos.
      console.log('Aún no se ha concedido permiso para notificaciones.');
    }
  });
}

/**
 * Muestra un modal o un prompt para pedir permiso de notificaciones.
 * Esta función será llamada por un botón en la UI.
 */
export function requestNotificationPermission(userId) {
  if (!('PushManager' in window)) {
    alert('Tu navegador no es compatible con las notificaciones push.');
    return;
  }

  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      console.log('¡Permiso concedido!');
      navigator.serviceWorker.ready.then(registration => {
        subscribeUserToPush(userId, registration);
      });
    } else {
      console.log('Permiso denegado.');
      alert('Has denegado las notificaciones. Puedes cambiarlas en la configuración de tu navegador.');
    }
  });
}

/**
 * Suscribe al usuario a las notificaciones push y guarda la suscripción en Firestore.
 */
async function subscribeUserToPush(userId, registration) {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });

    console.log('Usuario suscrito:', subscription);

    // Guardar la suscripción en el perfil del usuario en Firestore
    const userRef = doc(getDb(), 'users', userId);
    await setDoc(userRef, {
      pushSubscription: JSON.parse(JSON.stringify(subscription))
    }, { merge: true });

  } catch (error) {
    console.error('Error al suscribir al usuario:', error);
  }
}

/**
 * Función de utilidad para convertir la clave VAPID a un formato usable.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}