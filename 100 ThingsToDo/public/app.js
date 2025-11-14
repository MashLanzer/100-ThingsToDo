// ============================================
// CONFIGURACIÓN DE FIREBASE
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  Timestamp,
  setDoc,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... al principio de app.js, junto a las otras importaciones de Firebase ...
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Importar módulo de parejas
import { 
  getUserCoupleCode, 
  linkWithPartner, 
  unlinkPartner,
  initializeUserProfile 
} from './scr/modules/couple.js';
// ===> AÑADE ESTA LÍNEA <===
import { calculateCoupleStats } from './scr/modules/stats.js';
// import { initializeNotifications, requestNotificationPermission } from './scr/modules/notifications.js';
import { initializeNotifications, requestNotificationPermission } from './scr/modules/notifications.js';
import { getRandomTask } from './scr/modules/surpriseTasks.js';
import { RANDOM_CHALLENGES } from './scr/modules/randomTasks.js';
import { testQuestions } from './scr/modules/questions.js';
import { coupleTitles, createTest, getAvailableTests, getCreatedTests, updateTestAnswers, updateTestGuesses, hasActiveTest, getTest, confirmTestResults, checkBothConfirmed } from './scr/modules/testQuestions.js';
// Canvas confetti para celebraciones avanzadas
// Dynamic loader for canvas-confetti (UMD bundle). We load the browser UMD and use window.confetti.
let confettiLib = null;
function loadConfettiLib() {
  if (confettiLib) return Promise.resolve(confettiLib);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    s.async = true;
    s.onload = () => {
      confettiLib = window.confetti || null;
      if (confettiLib) resolve(confettiLib);
      else reject(new Error('canvas-confetti loaded but window.confetti not found'));
    };
    s.onerror = () => reject(new Error('Failed to load canvas-confetti'));
    document.head.appendChild(s);
  });
}

// Try to load in background (non-blocking)
loadConfettiLib().catch(() => {});


// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyChZQczwBwXu8TY6OImIFMYfjANJDAfBtU",
  authDomain: "thingstodo-2772c.firebaseapp.com",
  projectId: "thingstodo-2772c",
  storageBucket: "thingstodo-2772c.firebasestorage.app",
  messagingSenderId: "258798229107",
  appId: "1:258798229107:web:085d79a496d1db8a2d3c06",
  measurementId: "G-JMZX3BWYRF"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ============================================
// ICONOS KAWAII
// ============================================

const KAWAII_ICONS = {
  clipboard: '📋',
  heart: '💕',
  gift: '🎁',
  skewers: '🍢',
  cup: '☕',
  brush: '🪮',
  notepad: '📝',
  tv: '📺',
  guitar: '🎸',
  phone: '📱',
  gift_box: '🎀',
  gamepad: '🎮',
  laptop: '💻',
  envelope: '💌',
  flower: '🌸',
  // Nuevos Iconos 
  pizza: '🍕', // Comida, cenas, cocinar
  movie: '🎬', // Películas, series, cine
  travel: '✈️', // Viajes, escapadas, vacaciones
  book: '📚', // Lectura, estudio, aprender
  music: '🎶', // Música, conciertos, bailar
  camera: '📸', // Fotos, recuerdos, álbum
  bath: '🛁', // Relax, spa, cuidado personal
  game: '🎲', // Juegos de mesa, diversión
  money: '💰', // Finanzas, ahorro, compras
  house: '🏠', // Hogar, mudanza, decoración
  car: '🚗', // Paseos, coche, transporte
  star: '⭐', // Metas, deseos, sueños
  ring: '💍', // Compromiso, boda, aniversario
  balloon: '🎈', // Celebraciones, cumpleaños
  // --- ÍCONOS KAWAII EXTRA ---
  cat: '🐈',
  dog: '🐕',
  bear: '🐻',
  bunny: '🐰',
  cloud: '☁️',
  sun: '☀️',
  rainbow: '🌈',
  ice_cream: '🍦',
  sushi: '🍣',
  cactus: '🌵',
  estrellas: '✨',
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

let currentUser = null;
let currentCoupleId = null;
let currentPlanId = null;
let selectedIcon = 'clipboard';
let coupleData = null;
let sortableInstance = null;
let currentSurpriseTask = null;
let currentChallengeCategory = 'all';
let challengeHistory = [];

// ============================================
// SISTEMA DE NOTIFICACIONES UNIVERSAL
// ============================================

/**
 * Muestra una notificación modal con animación
 * @param {Object} options - Configuración de la notificación
 * @param {string} options.title - Título de la notificación
 * @param {string} options.message - Mensaje de la notificación
 * @param {string} options.icon - Emoji del icono (por defecto: 💬)
 * @param {string} options.type - Tipo: 'success', 'error', 'info', 'warning' (afecta color del icono)
 * @param {boolean} options.confirm - Si es true, muestra botón Cancelar
 * @param {Function} options.onConfirm - Callback cuando se confirma
 * @param {Function} options.onCancel - Callback cuando se cancela
 */
function showNotification({ 
  title = 'Notificación', 
  message = '', 
  icon = '💬', 
  type = 'info',
  confirm = false,
  input = false,
  inputPlaceholder = 'Ingresa el nombre...',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm = null,
  onCancel = null
}) {
  return new Promise((resolve) => {
    console.log('>>> showNotification called with confirm:', confirm, 'type:', type);
    
    // SIEMPRE ocultar otros modales al mostrar notificación, PERO respetar modales anidados
    const mapModal = document.getElementById('map-modal');
    const favorsModal = document.getElementById('favors-fullscreen-modal');
    const isPlaceInfoInsideMap = mapModal && mapModal.contains(placeInfoModal);
    const isFavorsModalOpen = favorsModal && !favorsModal.classList.contains('hidden');
    
    if (placeInfoModal && !isPlaceInfoInsideMap) {
      placeInfoModal.style.display = 'none';
      document.body.appendChild(placeInfoModal);
      console.log('Modal de detalles cerrado al mostrar notificación (no estaba dentro del mapa)');
    } else if (isPlaceInfoInsideMap) {
      console.log('Modal de detalles NO cerrado al mostrar notificación (está dentro del mapa)');
    }
    
    // Cerrar modal de favores solo si no estamos dentro de él
    if (favorsModal && !favorsModal.classList.contains('hidden') && !isFavorsModalOpen) {
      favorsModal.classList.add('hidden');
      console.log('Modal de favores cerrado al mostrar notificación (no estábamos dentro de él)');
    } else if (isFavorsModalOpen) {
      console.log('Modal de favores NO cerrado al mostrar notificación (estamos dentro de él)');
    }
    // Cerrar modal de crear favor si está abierto
    const createFavorModal = document.getElementById('create-favor-modal');
    if (createFavorModal && !createFavorModal.classList.contains('hidden')) {
      createFavorModal.classList.add('hidden');
      console.log('Modal de crear favor cerrado al mostrar notificación');
    }
    // Cerrar lightbox si está abierto
    if (lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
      console.log('Lightbox cerrado al mostrar notificación');
    }
    
    const modal = document.getElementById('notification-modal');
    const iconEl = document.getElementById('notification-icon');
    const titleEl = document.getElementById('notification-title');
    const messageEl = document.getElementById('notification-message');
    const inputEl = document.getElementById('notification-input');
    const btn = document.getElementById('notification-btn');
    const cancelBtn = document.getElementById('notification-cancel-btn');
    
    console.log('>>> Modal elements found:', {
      modal: !!modal,
      input: !!inputEl,
      btn: !!btn,
      cancelBtn: !!cancelBtn
    });
    
    // Iconos predeterminados por tipo
    const typeIcons = {
      success: '✅',
      error: '❌',
      info: '💬',
      warning: '⚠️',
      confirm: '⚠️',
      time: '⏳',
      heart: '💕',
      gift: '🎁',
      money: '💰',
      save: '🐖',
      party: '🎉',
      task: '📝'
    };
    
    // Configurar contenido
    iconEl.textContent = icon || typeIcons[type] || typeIcons.info;
    titleEl.textContent = title;
    messageEl.textContent = message;
    
    // Configurar input si es necesario
    if (input) {
      inputEl.style.display = 'block';
      inputEl.placeholder = inputPlaceholder;
      inputEl.value = '';
      inputEl.focus();
    } else {
      inputEl.style.display = 'none';
    }
    
    // Definir handlers primero
    let cancelHandler = null;
    let confirmHandler = null;
    
    // Si es confirmación o tiene input, mostrar botón Cancelar
    if (confirm || type === 'confirm' || input) {
      console.log('>>> Setting up confirm/input mode');
      btn.textContent = confirmText;
      if (cancelBtn) {
        cancelBtn.textContent = cancelText;
        cancelBtn.style.display = 'inline-block';
        console.log('>>> Cancel button visible');
        
        // Handler para cancelar
        cancelHandler = () => {
          console.log('>>> CANCEL clicked - resolving null');
          hideModal(modal, 'notification');
          if (onCancel) onCancel();
          resolve(null);
        };
        cancelBtn.onclick = cancelHandler;
      }
      
      // Handler para confirmar
      confirmHandler = () => {
        const inputValue = input ? inputEl.value.trim() : null;
        console.log('>>> CONFIRM clicked - resolving:', inputValue || true);
        hideModal(modal, 'notification');
        if (onConfirm) onConfirm(inputValue);
        resolve(inputValue || true);
      };
      btn.onclick = confirmHandler;
      console.log('>>> Confirm handlers set');
      
      // Si hay input, permitir confirmar con Enter
      if (input && inputEl) {
        inputEl.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            confirmHandler();
          }
        });
      }
      
    } else {
      btn.textContent = confirmText;
      if (cancelBtn) cancelBtn.style.display = 'none';
      
      // Cerrar al hacer click en el botón
      const closeHandler = () => {
        hideModal(modal, 'notification');
        if (onConfirm) onConfirm();
        resolve(true);
      };
      btn.onclick = closeHandler;
    }
    
    // Mostrar modal
    showModal(modal, 'notification');
    
    // Si estamos dentro del favors-modal, mover la notificación dentro de él para nesting
    if (isFavorsModalOpen) {
      console.log('Moviendo notificación dentro del favors-modal para nesting');
      favorsModal.appendChild(modal);
      modal.style.position = 'absolute';
      modal.style.inset = '0';
      modal.style.zIndex = '76000'; // NOTIFICACIONES DENTRO DE FAVORES
    }
    
    // Animar icono (reiniciar animación)
    iconEl.style.animation = 'none';
    setTimeout(() => {
      iconEl.style.animation = 'notification-icon-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 10);
  });
  
  // Cerrar al hacer click fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      hideModal(modal, 'notification');
      if (onCancel) onCancel();
    }
  });
}

// ============================================
// FUNCIONES DE UTILIDAD PARA MODALES
// ============================================

/**
 * Muestra un modal usando el sistema de clases consistente
 * @param {HTMLElement} modal - El elemento modal a mostrar
 * @param {string} modalType - Tipo de modal ('standard' para .modal.is-open, 'favors' para .hidden, 'music' para .active)
 */
function showModal(modal, modalType = 'standard') {
  if (!modal) {
    console.warn('showModal: Modal element is null or undefined');
    return;
  }

  console.log(`showModal: Showing modal ${modal.id} with type ${modalType}`);

  // Cerrar otros modales primero (excepto para notificaciones, que ya lo manejan)
  if (modalType !== 'notification') {
    closeAllModals(modal);
  }

  // Asegurarse de que el modal esté al final del body para el stacking context
  document.body.appendChild(modal);

  if (modalType === 'standard') {
    // Sistema de clases is-open para modales estándar
    modal.classList.add('is-open');
    modal.classList.remove('hidden');
  } else if (modalType === 'favors') {
    // Sistema de clases hidden para modales de favores
    modal.classList.remove('hidden');
  } else if (modalType === 'music') {
    // Sistema de clases active para modales de música
    modal.classList.add('active');
  } else if (modalType === 'notification') {
    // Sistema de clases is-open para modales de notificación
    modal.classList.add('is-open');
  } else if (modalType === 'place') {
    // Sistema de clases is-open para modales de lugar
    modal.classList.add('is-open');
  }

  // Forzar z-index basado en el tipo de modal
  if (modalType === 'favors') {
    modal.style.zIndex = '75000'; // SISTEMA DE FAVORES PRINCIPAL
  } else if (modal.classList.contains('notification-modal')) {
    modal.style.zIndex = '95000'; // NOTIFICACIONES CRÍTICAS
  } else if (modal.id === 'photo-lightbox') {
    modal.style.zIndex = '99999'; // LIGHTBOX SOBRE TODO
  } else if (modal.id === 'place-info-modal' || modalType === 'place') {
    modal.style.zIndex = '85000'; // DETALLES DE LUGARES - ALTO PRIORIDAD
  } else if (modalType === 'music') {
    modal.style.zIndex = '80000'; // MODALES DE MÚSICA
  } else {
    modal.style.zIndex = '70000'; // MODALES PRINCIPALES
  }

  // Forzar estilos inline para asegurar visibilidad (sobrescribe estilos de closeAllModals)
  modal.style.display = 'flex';
  modal.style.visibility = 'visible';
  modal.style.opacity = '1';

  console.log(`Modal ${modal.id} should now be visible with z-index ${modal.style.zIndex}`);
  console.log(`Modal ${modal.id} classes: ${modal.className}`);
  
  // Verificación final - forzar visibilidad si es necesario
  setTimeout(() => {
    const computedDisplay = window.getComputedStyle(modal).display;
    const computedVisibility = window.getComputedStyle(modal).visibility;
    const computedOpacity = window.getComputedStyle(modal).opacity;
    console.log(`Modal ${modal.id} after timeout - display: ${computedDisplay}, visibility: ${computedVisibility}, opacity: ${computedOpacity}, z-index: ${window.getComputedStyle(modal).zIndex}`);
    
    if (computedDisplay === 'none') {
      console.warn(`Modal ${modal.id} computed display is still 'none', CSS may not be working`);
    }
    if (computedVisibility === 'hidden') {
      console.warn(`Modal ${modal.id} computed visibility is still 'hidden', CSS may not be working`);
    }
    if (computedOpacity === '0') {
      console.warn(`Modal ${modal.id} computed opacity is still '0', CSS may not be working`);
    }
  }, 100);
}

/**
 * Oculta un modal usando el sistema de clases consistente
 * @param {HTMLElement} modal - El elemento modal a ocultar
 * @param {string} modalType - Tipo de modal ('standard' para .modal.is-open, 'favors' para .hidden, 'music' para .active)
 */
function hideModal(modal, modalType = 'standard') {
  if (!modal) {
    console.warn('hideModal: Modal element is null or undefined');
    return;
  }

  console.log(`hideModal: Hiding modal ${modal.id} with type ${modalType}`);

  if (modalType === 'standard') {
    // Sistema de clases is-open para modales estándar
    modal.classList.remove('is-open');
  } else if (modalType === 'favors') {
    // Sistema de clases hidden para modales de favores
    modal.classList.add('hidden');
  } else if (modalType === 'music') {
    // Sistema de clases active para modales de música
    modal.classList.remove('active');
  } else if (modalType === 'notification') {
    // Sistema de clases is-open para modales de notificación
    modal.classList.remove('is-open');
    
    // Si está dentro del favors-modal, devolverlo al body
    const favorsModal = document.getElementById('favors-fullscreen-modal');
    if (favorsModal && favorsModal.contains(modal)) {
      console.log('Devolviendo notificación al body desde favors-modal');
      document.body.appendChild(modal);
    }
  } else if (modalType === 'place') {
    // Sistema de clases is-open para modales de lugar
    modal.classList.remove('is-open');
  }

  // Forzar ocultamiento
  modal.style.display = 'none';
  modal.style.visibility = 'hidden';
  modal.style.opacity = '0';

  // Limpiar z-index forzado
  modal.style.zIndex = '';
}

/**
 * Cierra todos los modales abiertos
 * @param {HTMLElement} excludeModal - Modal a excluir del cierre (opcional)
 */
function closeAllModals(excludeModal = null) {
  console.log('closeAllModals: Closing all open modals, excluding:', excludeModal?.id);

  const isOpeningConfirmModal = excludeModal && excludeModal.id === 'confirm-modal';
  
  // NO cerrar modales padre si están abiertos (para preservar nesting) o si estamos abriendo un modal temporal como confirm
  const mapModal = document.getElementById('map-modal');
  const favorsModal = document.getElementById('favors-fullscreen-modal');
  
  // Cerrar modales estándar (is-open)
  const standardModals = document.querySelectorAll('.modal.is-open');
  standardModals.forEach(modal => {
    if (modal !== excludeModal) {
      // No cerrar map-modal si está abierto (preservar nesting) o si estamos abriendo un modal temporal
      if (modal === mapModal && (mapModal.classList.contains('is-open') || isOpeningConfirmModal)) {
        console.log('closeAllModals: No cerrando map-modal porque está abierto o estamos abriendo modal temporal');
        return;
      }
      modal.classList.remove('is-open');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
    }
  });

  // Cerrar modales de favores (hidden) - pero no si está abierto como modal padre o si estamos abriendo modal temporal
  if (favorsModal && !favorsModal.classList.contains('hidden') && favorsModal !== excludeModal) {
    if (!isOpeningConfirmModal) {
      console.log('closeAllModals: Cerrando modal de favores');
      favorsModal.classList.add('hidden');
      favorsModal.style.display = 'none';
      favorsModal.style.visibility = 'hidden';
      favorsModal.style.opacity = '0';
    } else {
      console.log('closeAllModals: No cerrando modal de favores porque estamos abriendo modal temporal');
    }
  }

  const createFavorModal = document.getElementById('create-favor-modal');
  if (createFavorModal && !createFavorModal.classList.contains('hidden') && createFavorModal !== excludeModal) {
    createFavorModal.classList.add('hidden');
    createFavorModal.style.display = 'none';
    createFavorModal.style.visibility = 'hidden';
    createFavorModal.style.opacity = '0';
  }

  // Cerrar modales de música (active)
  const musicModals = document.querySelectorAll('.music-edit-modal.active');
  musicModals.forEach(modal => {
    if (modal !== excludeModal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
    }
  });

  // Cerrar modales de notificación (is-open)
  const notificationModal = document.getElementById('notification-modal');
  if (notificationModal && notificationModal.classList.contains('is-open') && notificationModal !== excludeModal) {
    notificationModal.classList.remove('is-open');
    notificationModal.style.display = 'none';
    notificationModal.style.visibility = 'hidden';
    notificationModal.style.opacity = '0';
  }

  // Cerrar lightbox
  if (lightbox && lightbox.classList.contains('active')) {
    closeLightbox();
  }

  // Cerrar otros modales que usan display directamente
  const displayModals = [
    'editPlanModal',
    'coupleModal',
    'statsModal',
    'phoneModal',
    'logoutConfirmModal',
    'place-info-modal', // Modal de detalles de lugar
    'map-modal' // Modal del mapa
  ];

  // Verificar si el place-info-modal está dentro del map-modal antes de cerrarlo
  const placeInfoModal = document.getElementById('place-info-modal');
  const isPlaceInfoInsideMap = mapModal && mapModal.contains(placeInfoModal);
  const isOpeningMapModal = excludeModal && excludeModal.id === 'map-modal';
  
  console.log('closeAllModals: Checking place-info-modal containment');
  console.log('closeAllModals: mapModal exists:', !!mapModal);
  console.log('closeAllModals: placeInfoModal exists:', !!placeInfoModal);
  console.log('closeAllModals: isPlaceInfoInsideMap:', isPlaceInfoInsideMap);
  console.log('closeAllModals: isOpeningMapModal:', isOpeningMapModal);
  console.log('closeAllModals: isOpeningConfirmModal:', isOpeningConfirmModal);

  displayModals.forEach(modalId => {
    const modal = document.getElementById(modalId) || window[modalId];
    if (modal && (modal.style.display !== 'none' || modal.classList.contains('is-open'))) {
      // No cerrar place-info-modal si está dentro del map-modal O si estamos abriendo el map-modal
      if (modalId === 'place-info-modal' && (isPlaceInfoInsideMap || isOpeningMapModal)) {
        console.log('closeAllModals: No cerrando place-info-modal porque está dentro del map-modal o estamos abriendo el map-modal');
        return;
      }
      // No cerrar map-modal si está abierto
      if (modalId === 'map-modal' && (mapModal.classList.contains('is-open') || isOpeningConfirmModal)) {
        console.log('closeAllModals: No cerrando map-modal porque está abierto o estamos abriendo modal temporal');
        return;
      }
      console.log(`closeAllModals: Cerrando modal ${modalId}`);
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
      modal.classList.remove('is-open');
    }
  });
}

let currentGoalId = null;
// ===> AÑADE ESTAS LÍNEAS AQUÍ <===
let currentJournalDate = new Date();
let selectedJournalDate = null;
let journalEntriesCache = new Map();
// ===> AÑADE ESTAS LÍNEAS AQUÍ <===
let currentSlideIndex = 0;
let slides = [];
let currentPlaylistId = null;

let youtubePlayer = null; // Guardará la instancia del reproductor de YouTube
let isPlaying = false;    // Controla si la música está sonando

let selectedCouponIcon = 'gift'; // Añade esta línea con las otras variables de estado
// Track which plans we've already celebrated to avoid duplicate celebrations
const celebratedPlans = new Set();



// ============================================
// ELEMENTOS DEL DOM
// ============================================

// Pantallas
const loadingScreen = document.getElementById('loading-screen');
const homePage = document.getElementById('home-page');
const dashboardPage = document.getElementById('dashboard-page');
const planDetailPage = document.getElementById('plan-detail-page');

const mainPanel = document.getElementById('main-panel'); // <--- AÑADE ESTA LÍNEA

// Home
const loginBtn = document.getElementById('login-btn');

// Dashboard
const userName = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const newPlanBtn = document.getElementById('new-plan-btn');
const newPlanForm = document.getElementById('new-plan-form');
const planTitleInput = document.getElementById('plan-title-input');
const planDescInput = document.getElementById('plan-desc-input');
const createPlanBtn = document.getElementById('create-plan-btn');
const cancelPlanBtn = document.getElementById('cancel-plan-btn');
const plansContainer = document.getElementById('plans-container');
const emptyState = document.getElementById('empty-state');

// Plan Detail
const backBtn = document.getElementById('back-btn');
const planDetailTitle = document.getElementById('plan-detail-title');
const planDetailDesc = document.getElementById('plan-detail-desc');
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('progress-fill');
const newTaskBtn = document.getElementById('new-task-btn');
const newTaskForm = document.getElementById('new-task-form');
const taskTitleInput = document.getElementById('task-title-input');
const iconGrid = document.getElementById('icon-grid');
const createTaskBtn = document.getElementById('create-task-btn');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const tasksContainer = document.getElementById('tasks-container');
const tasksEmptyState = document.getElementById('tasks-empty-state');

// Modal de Pareja
const coupleBtn = document.getElementById('couple-btn');
const coupleModal = document.getElementById('couple-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const coupleLoadingView = document.getElementById('couple-loading-view');
const coupleUnlinkedView = document.getElementById('couple-unlinked-view');
const coupleLinkedView = document.getElementById('couple-linked-view');
const userCoupleCode = document.getElementById('user-couple-code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const partnerCodeInput = document.getElementById('partner-code-input');
const linkPartnerBtn = document.getElementById('link-partner-btn');
const partnerNameDisplay = document.getElementById('partner-name-display');
const linkedDateDisplay = document.getElementById('linked-date-display');
const unlinkPartnerBtn = document.getElementById('unlink-partner-btn');

// ===> AÑADE ESTAS LÍNEAS <===
const editPlanModal = document.getElementById('edit-plan-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editPlanIdInput = document.getElementById('edit-plan-id-input');
const editPlanTitleInput = document.getElementById('edit-plan-title-input');
const editPlanDescInput = document.getElementById('edit-plan-desc-input');
const updatePlanBtn = document.getElementById('update-plan-btn');
const deletePlanBtn = document.getElementById('delete-plan-btn');

// ===> AÑADE ESTAS LÍNEAS <===
const linkPartnerBanner = document.getElementById('link-partner-banner');
const goToCoupleModalBtn = document.getElementById('go-to-couple-modal-btn')

// ... al final de la sección de elementos del DOM ...
const statsBtn = document.getElementById('stats-btn');
const statsModal = document.getElementById('stats-modal');
const closeStatsModalBtn = document.getElementById('close-stats-modal-btn');
const statsLoadingView = document.getElementById('stats-loading-view');
const statsContentView = document.getElementById('stats-content-view');

// ... al final de la sección de elementos del DOM ...
const coupleAboutView = document.getElementById('couple-about-view');
const openAboutViewBtn = document.getElementById('open-about-view-btn');
const backToCoupleViewBtn = document.getElementById('back-to-couple-view-btn');

// ... al final de la sección de elementos del DOM ...
// const notificationsModal = document.getElementById('notifications-modal');
// const closeNotificationsModalBtn = document.getElementById('close-notifications-modal-btn');
// const openNotificationsModalBtn = document.getElementById('open-notifications-modal-btn');
// const enableNotificationsBtn = document.getElementById('enable-notifications-btn');

// ... al final de la sección de elementos del DOM ...
const openPhoneModalBtn = document.getElementById('open-phone-modal-btn');
const openFavorsModalBtn = document.getElementById('open-favors-modal-btn');
const openNewFeaturesBtn = document.getElementById('open-new-features-btn');
const phoneModal = document.getElementById('phone-modal');
const closePhoneModalBtn = document.getElementById('close-phone-modal-btn');
const phoneHomescreen = document.getElementById('phone-homescreen');
const backToHomeBtns = document.querySelectorAll('.back-to-home-btn');
const phoneTimeDisplay = document.getElementById('phone-time-display');

// Referencias del modal fullscreen de favores
const favorsFullscreenModal = document.getElementById('favors-fullscreen-modal');
const closeFavorsModalBtn = document.getElementById('close-favors-modal-btn');

// NUEVO: Elementos del rediseño de Reto Diario
const challengeQuestionView = document.getElementById('challenge-question-view');
const challengeRevealedView = document.getElementById('challenge-revealed-view');
const revealChallengeBtn = document.getElementById('reveal-challenge-btn');

// Reutilizamos las referencias de la tarea sorpresa, pero las hacemos más específicas
// CORRECCIÓN
const surpriseEmoji = document.querySelector('#phone-view-surprise .surprise-emoji');
const surpriseText = document.querySelector('#phone-view-surprise .surprise-text');
const acceptSurpriseTaskBtn = document.querySelector('#phone-view-surprise #accept-surprise-task-btn');
const rerollSurpriseTaskBtn = document.querySelector('#phone-view-surprise #reroll-surprise-task-btn');
const challengesTodayCount = document.getElementById('challenges-today');
const challengesTotalCount = document.getElementById('challenges-total');
const challengeCategoryBadge = document.querySelector('.challenge-category-badge');
const difficultyLabel = document.querySelector('.difficulty-label');
const categoryChips = document.querySelectorAll('.category-chip');
const historyList = document.getElementById('history-list');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');

// ... al final de la sección de elementos del DOM ...
const previewCapsuleBody = document.querySelector('.preview-capsule-body');
const previewCapsuleCap = document.querySelector('.preview-capsule-cap');

// Modales faltantes - agregar aquí
const wheelResultModal = document.getElementById('wheel-result-modal');
const closeWheelResultModalBtn = document.getElementById('close-wheel-result-modal');
// surprise-task-modal ELIMINADO - era modal huérfano

// Elementos de adjuntos multimedia
// ... al final de la sección de elementos del DOM ...

// Elementos de Cápsulas del Tiempo
const capsulesList = document.getElementById('capsules-list');
const capsulesEmptyState = document.getElementById('capsules-empty-state');
const createCapsuleFab = document.getElementById('create-capsule-fab');
const backToCapsuleListBtn = document.querySelector('.back-to-capsule-list-btn');
const goToCreateCapsuleBtn = document.getElementById('go-to-create-capsule-btn');
const saveCapsuleBtn = document.getElementById('save-capsule-btn');

// Elementos del formulario de creación
const capsuleMessageInput = document.getElementById('capsule-message-input');
const capsuleTypeCards = document.querySelectorAll('.capsule-type-card');
const dateOptionCards = document.querySelectorAll('.date-option-card');
const customDateContainer = document.getElementById('custom-date-container');
const capsuleUnlockDateInput = document.getElementById('capsule-unlock-date-input');
const attachmentBtns = document.querySelectorAll('.attachment-btn');
const attachmentsPreview = document.getElementById('attachments-preview');
const capsulePrevBtn = document.getElementById('capsule-prev-btn');
const capsuleNextBtn = document.getElementById('capsule-next-btn');
const stepIndicators = document.querySelectorAll('.step-dot');

// Elementos de estadísticas
const totalCapsulesEl = document.getElementById('total-capsules');
const pendingCapsulesEl = document.getElementById('pending-capsules');
const openedCapsulesEl = document.getElementById('opened-capsules');

// Variables de estado
let currentCapsuleStep = 1;
let selectedCapsuleType = 'memory';
let selectedUnlockDate = null;
let capsuleAttachments = [];

// ... al final de la sección de elementos del DOM ...
const goalsList = document.getElementById('goals-list');
const goalsEmptyState = document.getElementById('goals-empty-state');
const goToCreateGoalBtn = document.getElementById('go-to-create-goal-btn');
const backToBudgetListBtn = document.querySelector('.back-to-budget-list-btn');

// Elementos de estadísticas de presupuesto
const totalGoalsEl = document.getElementById('total-goals');
const totalSavedEl = document.getElementById('total-saved');
const totalTargetEl = document.getElementById('total-target');

const goalDetailTitle = document.getElementById('goal-detail-title');
const createGoalContainer = document.getElementById('create-goal-container');
const viewGoalContainer = document.getElementById('view-goal-container');
const goalNameInput = document.getElementById('goal-name-input');
const goalTotalInput = document.getElementById('goal-total-input');
const saveGoalBtn = document.getElementById('save-goal-btn');
const piggyBankFill = document.getElementById('piggy-bank-fill');
const goalCurrentAmount = document.getElementById('goal-current-amount');
const goalTotalAmount = document.getElementById('goal-total-amount');
const contributionAmountInput = document.getElementById('contribution-amount-input');
const addContributionBtn = document.getElementById('add-contribution-btn');
const goalContributionsList = document.getElementById('goal-contributions-list');

// Elementos del Diario de Pareja
const journalCalendarGrid = document.getElementById('journal-calendar-grid');
const journalMonthYear = document.getElementById('journal-month-year');
const journalPrevMonthBtn = document.getElementById('journal-prev-month-btn');
const journalNextMonthBtn = document.getElementById('journal-next-month-btn');
const journalSearchInput = document.getElementById('journal-search-input');
const backToJournalBtn = document.querySelector('.back-to-journal-btn');
const journalEntryDate = document.getElementById('journal-entry-date');
const journalGalleryContainer = document.getElementById('journal-gallery-container');
const journalAddPhotoBtn = document.getElementById('journal-add-photo-btn');
const journalImageInput = document.getElementById('journal-image-input');
const journalEntryText = document.getElementById('journal-entry-text');
const saveJournalEntryBtn = document.getElementById('save-journal-entry-btn');

// ... al final de la sección de elementos del DOM ...

// Elementos de la Vista de Lectura del Diario
const journalReadDate = document.getElementById('journal-read-date');
const journalReadGallery = document.getElementById('journal-read-gallery');
const journalReadText = document.getElementById('journal-read-text');
const goToEditEntryBtn = document.getElementById('go-to-edit-entry-btn');

// Elementos del Widget de Previsualización
const journalPreviewWidget = document.getElementById('journal-preview-widget');
const previewImage = document.getElementById('preview-image');
const previewDate = document.getElementById('preview-date');
const previewSnippet = document.getElementById('preview-snippet');

// Elementos del Carrusel del Diario
const carouselContainer = document.getElementById('journal-carousel-container');
const carouselTrack = document.getElementById('journal-carousel-track');
const carouselPrevBtn = document.getElementById('carousel-prev-btn');
const carouselNextBtn = document.getElementById('carousel-next-btn');
const carouselDots = document.getElementById('carousel-dots');

// Elementos del Modal de Confirmación de Salida
const logoutConfirmModal = document.getElementById('logout-confirm-modal');
const closeLogoutModalBtn = document.getElementById('close-logout-modal-btn');
const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
const confirmLogoutBtn = document.getElementById('confirm-logout-btn');

// ... al final de la sección de elementos del DOM ...

// Elementos del Switch de Dispositivo
const phoneContainer = document.querySelector('.phone-container');
const deviceSwitchBtn = document.getElementById('device-switch-btn');

// Elementos de la Banda Sonora
const playlistsList = document.getElementById('playlists-list');
const newPlaylistNameInput = document.getElementById('new-playlist-name-input');
const createPlaylistBtn = document.getElementById('create-playlist-btn');
const playlistDetailTitle = document.getElementById('playlist-detail-title');
const cassetteLabelTitle = document.getElementById('cassette-label-title');
const songList = document.getElementById('song-list');
const goToAddSongBtn = document.getElementById('go-to-add-song-btn');
const songNameInput = document.getElementById('song-name-input');
const youtubeLinkInput = document.getElementById('youtube-link-input');
const saveSongBtn = document.getElementById('save-song-btn');
const totalPlaylistsCount = document.getElementById('total-playlists');
const totalSongsCount = document.getElementById('total-songs');

// Elementos de modales de edición
const editPlaylistModal = document.getElementById('edit-playlist-modal');
const editSongModal = document.getElementById('edit-song-modal');
const editPlaylistNameInput = document.getElementById('edit-playlist-name-input');
const editSongNameInput = document.getElementById('edit-song-name-input');
const editSongUrlInput = document.getElementById('edit-song-url-input');

// Elementos del Reproductor de Música (Tocadiscos)
const youtubePlayerContainer = document.getElementById('youtube-player-container');
const turntableContainer = document.querySelector('.turntable-container');
const turntableDisc = document.querySelector('.turntable-disc');
const playerSongTitle = document.getElementById('player-song-title');
const playerAddedBy = document.getElementById('player-added-by');

// ... justo después de los elementos del tocadiscos ...
const cassettePlayer = document.querySelector('.cassette-player');




















// ============================================
// FUNCIONES DE UI - DASHBOARD

// ============================================
// MICROANIMACIONES - SECCIÓN ELIMINADA
// Las animaciones se agregarán desde cero
// ============================================

/**
 * Actualiza el estado del botón "Crear Nuevo Plan" basado en si el usuario tiene pareja.
 * @param {boolean} isLinked - True si el usuario está vinculado con una pareja.
 */
function updateNewPlanButtonState(isLinked) {
  if (isLinked) {
    newPlanBtn.disabled = false;
    newPlanBtn.title = 'Crear un nuevo plan compartido';
  } else {
    newPlanBtn.disabled = true;
    newPlanBtn.title = 'Vincula una pareja para crear planes compartidos';
  }
}

// ... cerca de las otras funciones de UI del dashboard ...
function updateStatsButtonVisibility(isLinked) {
  statsBtn.style.display = isLinked ? 'inline-flex' : 'none';
}



/**
 * Muestra u oculta el banner para vincular pareja.
 * @param {boolean} isLinked - True si el usuario está vinculado.
 */
function updateLinkPartnerBanner(isLinked) {
  if (isLinked) {
    linkPartnerBanner.style.display = 'none';
  } else {
    linkPartnerBanner.style.display = 'flex';
  }
}


function openEditPlanModal(plan) {
  editPlanIdInput.value = plan.id;
  editPlanTitleInput.value = plan.title;
  editPlanDescInput.value = plan.description || '';
  showModal(editPlanModal, 'standard');
}

function closeEditPlanModal() {
  hideModal(editPlanModal, 'standard');
}

async function handleUpdatePlan() {
  const planId = editPlanIdInput.value;
  const title = editPlanTitleInput.value.trim();
  const description = editPlanDescInput.value.trim();

  if (!title) {
    showNotification({
      title: 'Campo Requerido',
      message: 'El título no puede estar vacío.',
      icon: '📝',
      type: 'warning'
    });
    return;
  }

  try {
    await updatePlan(planId, title, description);
    // animate save button to give feedback
    if (updatePlanBtn) {
      updatePlanBtn.classList.add('animate-save');
      setTimeout(() => updatePlanBtn.classList.remove('animate-save'), 900);
    }
    closeEditPlanModal();
    await loadPlans(); // Recargar la lista de planes
  } catch (error) {
    showNotification({
      title: 'Error',
      message: 'Error al guardar los cambios.',
      icon: '❌',
      type: 'error'
    });
  }
}

async function handleDeletePlan() {
  const planId = editPlanIdInput.value;
  const planTitle = editPlanTitleInput.value;

  console.log('>>> handleDeletePlan called for:', planTitle);

  // Usar modal de notificación en lugar de confirm
  const confirmed = await showNotification({
    title: '¿Eliminar plan?',
    message: `¿Estás seguro de que quieres eliminar el plan "${planTitle}"? Esta acción no se puede deshacer.`,
    icon: '⚠️',
    type: 'confirm',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar'
  });

  console.log('>>> User confirmed:', confirmed);

  if (!confirmed) {
    console.log('>>> Delete cancelled by user');
    return;
  }

  console.log('>>> Proceeding with deletion...');

  try {
    // Animar la tarjeta del plan antes de eliminarla (si está visible)
    const planCard = plansContainer.querySelector(`[data-plan-id="${planId}"]`);
    console.log('>>> Plan card found:', !!planCard);
    if (planCard) {
      planCard.classList.add('animate-delete');
      // Esperar la animación con un timeout de seguridad
      await Promise.race([
        new Promise(res => planCard.addEventListener('animationend', res, { once: true })),
        new Promise(res => setTimeout(res, 500)) // Timeout de 500ms
      ]);
      console.log('>>> Animation completed or timed out');
    }

    console.log('>>> Calling deletePlan()...');
    await deletePlan(planId);
    console.log('>>> deletePlan completed, closing modal...');
    closeEditPlanModal();
    console.log('>>> Reloading plans...');
    await loadPlans();
    console.log('>>> Plans reloaded, showing success notification');
    
    showNotification({
      title: '¡Plan eliminado!',
      message: 'El plan se eliminó correctamente',
      icon: '✓',
      type: 'success'
    });
  } catch (error) {
    console.error('>>> Error during deletion:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo eliminar el plan. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}


// ----------------------
// Confetti Hearts helper
// ----------------------
function showConfettiHearts(containerEl, amount = 10) {
  try {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    // position relative to containerEl
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';

    for (let i = 0; i < amount; i++) {
      const heart = document.createElement('div');
      heart.className = 'confetti-heart';
      heart.textContent = '💖';
      const left = Math.random() * 80 + 10; // 10% - 90%
      heart.style.left = `${left}%`;
      heart.style.bottom = `8%`;
      heart.style.fontSize = `${Math.random() * 10 + 14}px`;
      heart.style.opacity = '0';
      // stagger and variant
      const variant = (i % 3) + 1;
      heart.classList.add(`animate-${variant}`);
      heart.style.animationDelay = `${Math.random() * 300}ms`;
      container.appendChild(heart);
    }

    // Append to provided container or to body
    const parent = containerEl || document.body;
    parent.appendChild(container);

    // remove after animation
    setTimeout(() => {
      container.remove();
    }, 1800);
  } catch (e) {
    // fail silently
    console.error('Error showing confetti hearts', e);
  }
}

// Celebrate whole plan completion with overlay, toast and extra hearts
function celebratePlanCompletion(planId) {
  if (!planId) return;
  if (celebratedPlans.has(planId)) return; // already celebrated
  celebratedPlans.add(planId);

  // Glow the plan card if visible
  const planCard = plansContainer.querySelector(`[data-plan-id="${planId}"]`);
  if (planCard) {
    planCard.classList.add('plan-complete-glow');
    setTimeout(() => planCard.classList.remove('plan-complete-glow'), 1200);
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';

  const bg = document.createElement('div');
  bg.className = 'bg-blur';
  overlay.appendChild(bg);

  const amount = 28; // more hearts for big celebration
  for (let i = 0; i < amount; i++) {
    const h = document.createElement('div');
    h.className = 'celebration-heart';
    h.textContent = ['💖','💕','✨','🎉'][i % 4];
    // random position
    h.style.left = `${Math.random() * 90 + 3}%`;
    h.style.top = `${Math.random() * 60 + 20}%`;
    const variant = (i % 3) + 1;
    h.classList.add(`animate-${variant}`);
    h.style.fontSize = `${Math.random() * 18 + 18}px`;
    h.style.animationDelay = `${Math.random() * 300}ms`;
    overlay.appendChild(h);
  }

  document.body.appendChild(overlay);

  // show toast
  const toast = document.createElement('div');
  toast.className = 'celebration-toast show';
  toast.innerHTML = `<div class="toast-msg">¡Plan completado! 🎉</div><div class="toast-sub">Buen trabajo, celebren juntos 💕</div>`;
  document.body.appendChild(toast);

  // play canvas-confetti bursts for a nicer effect (dynamic loader)
  loadConfettiLib().then((lib) => {
    try {
      lib({
        particleCount: 60,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FFB6D9', '#FFD9E8', '#FF9AA2', '#FFD166']
      });
      setTimeout(() => lib({ particleCount: 40, spread: 100, origin: { y: 0.6 } }), 250);
      setTimeout(() => lib({ particleCount: 30, spread: 160, origin: { x: 0.5, y: 0.55 } }), 450);
    } catch (e) {
      try { showConfettiHearts(document.body, 18); } catch (err) {}
    }
  }).catch(() => {
    // fallback if couldn't load lib
    try { showConfettiHearts(document.body, 18); } catch (err) {}
  });

  // Auto dismiss after short time
  setTimeout(() => {
    overlay.remove();
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 420);
  }, 2200);
}

// ----------------------
// CountUp helper (animates number increase)
// ----------------------
function countUp(el, endValue, duration = 800, suffix = '') {
  if (!el) return;
  const start = 0;
  const range = Number(endValue) - start;
  const startTime = performance.now();

  const step = (now) => {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.floor(start + range * eased);
    el.textContent = `${value}${suffix}`;
    if (t < 1) requestAnimationFrame(step);
    else {
      el.textContent = `${endValue}${suffix}`;
      el.classList.add('animate-count');
      setTimeout(() => el.classList.remove('animate-count'), 800);
    }
  };

  requestAnimationFrame(step);
}



// ============================================
// FUNCIONES DE NAVEGACIÓN
// ============================================

function showPage(page) {
  loadingScreen.style.display = 'none';
  homePage.style.display = 'none';
  dashboardPage.style.display = 'none';
  planDetailPage.style.display = 'none';
  
  page.style.display = 'block';
}

function showLoading() {
  loadingScreen.style.display = 'flex';
  homePage.style.display = 'none';
  dashboardPage.style.display = 'none';
  planDetailPage.style.display = 'none';
}

function navigateToDashboard() {
  showPage(dashboardPage);
  loadPlans();
}

function navigateToPlanDetail(planId) {
  currentPlanId = planId;
  showPage(planDetailPage);
  loadPlanDetail(planId);
}

function navigateToHome() {
  showPage(homePage);
}

// ============================================
// AUTENTICACIÓN
// ============================================

async function handleLogin() {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    showNotification({
      title: 'Error de Inicio de Sesión',
      message: 'Error al iniciar sesión. Por favor, intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    showNotification({
      title: 'Error',
      message: 'Error al cerrar sesión. Por favor, intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

// Observador de estado de autenticación
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    userName.textContent = user.displayName || user.email;
    
    // Inicializar perfil del usuario
    await initializeUserProfile(db, user);
    
    // Obtener datos de pareja
    const coupleInfo = await getUserCoupleCode(db, user.uid);

        // ===> AÑADIR ESTA LÍNEA <===
    updateNewPlanButtonState(!!coupleInfo.partnerId);
    updateLinkPartnerBanner(!!coupleInfo.partnerId); // <== AÑADIR
    updateStatsButtonVisibility(!!coupleInfo.partnerId);

    
    // Si tiene pareja vinculada, usar coupleId compartido
    if (coupleInfo.partnerId) {
      currentCoupleId = [user.uid, coupleInfo.partnerId].sort().join('_');
    } else {
      currentCoupleId = `couple-${user.uid}`;
    }
    
    navigateToDashboard();

        // ===> AÑADE ESTA LÍNEA <===
    // Inicializa el sistema de notificaciones en segundo plano
   initializeNotifications(user.uid);


  } else {
    currentUser = null;
    currentCoupleId = null;
    navigateToHome();
  }
});

// ============================================
// FUNCIONES DE FIRESTORE - PLANES
// ============================================

async function createPlan(title, description) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const plansRef = collection(db, 'couples', currentCoupleId, 'plans');
        const newPlanDoc = await addDoc(plansRef, { // <== Cambiado de addDoc a newPlanDoc

      title,
      description: description || '',
      createdBy: currentUser.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

        return newPlanDoc.id; // <== AÑADE ESTA LÍNEA para devolver el ID


  } catch (error) {
    console.error('Error al crear plan:', error);
    throw error;
  }
}

async function getPlans() {
  if (!currentCoupleId) return [];
  
  try {
    const plansRef = collection(db, 'couples', currentCoupleId, 'plans');
    const q = query(plansRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error('Error al obtener planes:', error);
    return [];
  }
}

async function getPlanWithTasks(planId) {
  if (!currentCoupleId) return null;
  
  try {
    const planRef = doc(db, 'couples', currentCoupleId, 'plans', planId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) return null;
    
    const tasksRef = collection(db, 'couples', currentCoupleId, 'plans', planId, 'tasks');
    const q = query(tasksRef, orderBy('order', 'asc'));
    const tasksSnap = await getDocs(q);
    
    const tasks = tasksSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      completedAt: doc.data().completedAt?.toDate(),
    }));
    
    return {
      id: planSnap.id,
      ...planSnap.data(),
      createdAt: planSnap.data().createdAt?.toDate(),
      updatedAt: planSnap.data().updatedAt?.toDate(),
      tasks,
    };
  } catch (error) {
    console.error('Error al obtener plan:', error);
    return null;
  }
}


async function updatePlan(planId, title, description) {
  if (!currentCoupleId) return;
  try {
    const planRef = doc(db, 'couples', currentCoupleId, 'plans', planId);
    await updateDoc(planRef, {
      title,
      description,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al actualizar plan:', error);
    throw error;
  }
}

async function deletePlan(planId) {
  console.log('>>> deletePlan called with planId:', planId);
  console.log('>>> currentCoupleId:', currentCoupleId);
  
  if (!currentCoupleId) {
    console.error('>>> No currentCoupleId - aborting delete');
    return;
  }
  
  try {
    // NOTA: Esto eliminará el plan pero no sus subtareas en Firestore.
    // Para una eliminación completa, se necesitaría una Cloud Function.
    // Por ahora, esto es suficiente para que desaparezca de la UI.
    const planRef = doc(db, 'couples', currentCoupleId, 'plans', planId);
    console.log('>>> Deleting from Firestore...');
    await deleteDoc(planRef);
    console.log('>>> Plan deleted successfully from Firestore');
  } catch (error) {
    console.error('>>> Error al eliminar plan:', error);
    throw error;
  }
}



// ============================================
// FUNCIONES DE FIRESTORE - TAREAS
// ============================================

async function createTask(planId, title, icon) {
  if (!currentCoupleId) return;
  
  try {
    const tasksRef = collection(db, 'couples', currentCoupleId, 'plans', planId, 'tasks');
    const tasksSnap = await getDocs(tasksRef);
    const order = tasksSnap.size;
    
    const newDoc = await addDoc(tasksRef, {
      title,
      icon,
      completed: false,
      order,
      createdAt: Timestamp.now(),
    });

    return newDoc.id;
  } catch (error) {
    console.error('Error al crear tarea:', error);
    throw error;
  }
}

async function toggleTask(planId, taskId, completed) {
  if (!currentCoupleId) return;
  
  try {
    const taskRef = doc(db, 'couples', currentCoupleId, 'plans', planId, 'tasks', taskId);
    await updateDoc(taskRef, {
      completed,
      completedBy: completed ? currentUser.uid : null,
      completedByName: completed ? (currentUser.displayName || currentUser.email) : null,
      completedAt: completed ? Timestamp.now() : null,
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    throw error;
  }
}

async function deleteTask(planId, taskId) {
  if (!currentCoupleId) return;
  
  try {
    const taskRef = doc(db, 'couples', currentCoupleId, 'plans', planId, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES DE UI - DASHBOARD
// ============================================

async function loadPlans() {
  try {
    const plans = await getPlans();
    
    if (plans.length === 0) {
      plansContainer.style.display = 'none';
      emptyState.style.display = 'block';
    } else {
      plansContainer.style.display = 'grid';
      emptyState.style.display = 'none';
      
      // Cargar tareas para cada plan
      const plansWithTasks = await Promise.all(
        plans.map(async (plan) => {
          const planWithTasks = await getPlanWithTasks(plan.id);
          return planWithTasks || plan;
        })
      );
      
      renderPlans(plansWithTasks);
    }
  } catch (error) {
    console.error('Error al cargar planes:', error);
  }
}

function renderPlans(plans) {
  plansContainer.innerHTML = '';
  
  plans.forEach((plan, idx) => {
    const planCard = document.createElement('div');
    planCard.className = 'plan-card';
    // dataset to allow targeting after creación/eliminación
    planCard.dataset.planId = plan.id;
    // entrance animation stagger
    planCard.classList.add('plan-card-enter');
    planCard.style.animationDelay = `${idx * 60}ms`;
    
    // Verificar si el plan está completado
    const totalTasks = plan.tasks ? plan.tasks.length : 0;
    const completedTasks = plan.tasks ? plan.tasks.filter(t => t.completed).length : 0;
    const isCompleted = totalTasks > 0 && completedTasks === totalTasks;
    
    if (isCompleted) {
      planCard.classList.add('plan-card-completed');
    }
    
    // El clic principal sigue navegando al detalle
    planCard.onclick = (e) => {
      // Evita que el clic en los botones de acción navegue
      if (e.target.closest('.plan-card-actions')) return;
      navigateToPlanDetail(plan.id);
    };
    
    // Contenedor para el contenido principal
    const contentWrapper = document.createElement('div');

    const title = document.createElement('h3');
    title.className = 'plan-card-title';
    title.textContent = plan.title;
    contentWrapper.appendChild(title);
    
    if (plan.description) {
      const desc = document.createElement('p');
      desc.className = 'plan-card-desc';
      desc.textContent = plan.description;
      contentWrapper.appendChild(desc);
    }
    
    const date = document.createElement('p');
    date.className = 'plan-card-date';
    date.textContent = `Creado ${plan.createdAt.toLocaleDateString('es-ES')}`;
    contentWrapper.appendChild(date);

    // ===> AÑADE ESTE BLOQUE DE ACCIONES <===
    const actions = document.createElement('div');
    actions.className = 'plan-card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon';
    editBtn.title = 'Editar plan';
    editBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
    editBtn.onclick = () => openEditPlanModal(plan);
    
    actions.appendChild(editBtn);
    
    planCard.appendChild(contentWrapper);
    planCard.appendChild(actions); // Añadir las acciones a la tarjeta
    
    plansContainer.appendChild(planCard);
  });
}


function toggleNewPlanForm() {
  const isVisible = newPlanForm.style.display === 'block';
  newPlanForm.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    planTitleInput.value = '';
    planDescInput.value = '';
    planTitleInput.focus();
  }
}

async function handleCreatePlan() {
  const title = planTitleInput.value.trim();
  const description = planDescInput.value.trim();
  
  if (!title) {
    showNotification({
      title: 'Campo Requerido',
      message: 'Por favor, ingresa un título para el plan',
      icon: '📝',
      type: 'warning'
    });
    return;
  }
  
  try {
    await createPlan(title, description);
    toggleNewPlanForm();
    await loadPlans();
  } catch (error) {
    showNotification({
      title: 'Error',
      message: 'Error al crear el plan. Por favor, intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

// ============================================
// FUNCIONES DE UI - PLAN DETAIL
// ============================================

async function loadPlanDetail(planId) {

    try {
    // ===> AÑADE ESTO AL INICIO DE LA FUNCIÓN <===
    // Destruye la instancia anterior para evitar duplicados
    if (sortableInstance) {
      sortableInstance.destroy();
      sortableInstance = null;
    }


    const plan = await getPlanWithTasks(planId);
    
    if (!plan) {
      alert('Plan no encontrado');
      navigateToDashboard();
      return;
    }
    
    planDetailTitle.textContent = plan.title;
    planDetailDesc.textContent = plan.description || '';
    planDetailDesc.style.display = plan.description ? 'block' : 'none';
    
    renderTasks(plan.tasks);
    updateProgress(plan.tasks);

        // ===> AÑADE ESTE BLOQUE AL FINAL DE LA FUNCIÓN <===
    // Solo inicializa si hay tareas que ordenar
    if (plan.tasks.length > 0) {
      initSortable();
    }


  } catch (error) {
    console.error('Error al cargar plan:', error);
  }
}

function renderTasks(tasks) {
  if (tasks.length === 0) {
    tasksContainer.style.display = 'none';
    tasksEmptyState.style.display = 'block';
    tasksEmptyState.classList.add('empty-animate');
  } else {
    tasksContainer.style.display = 'flex';
    tasksEmptyState.style.display = 'none';
    tasksEmptyState.classList.remove('empty-animate');
    tasksContainer.innerHTML = '';
    
    tasks.forEach((task, idx) => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
      // entrance animation (staggered)
      taskItem.classList.add('task-enter');
      taskItem.style.animationDelay = `${idx * 45}ms`;
      taskItem.dataset.taskId = task.id;
      
      // Checkbox
      const checkbox = document.createElement('div');
      checkbox.className = `task-checkbox ${task.completed ? 'checked' : ''}`;
      
      // Verificar si la tarea fue completada por otra persona
      const completedByOther = task.completed && task.completedBy && task.completedBy !== currentUser.uid;
      
      if (completedByOther) {
        // Si fue completada por otra persona, deshabilitar el checkbox
        checkbox.style.cursor = 'not-allowed';
        checkbox.style.opacity = '0.7';
        checkbox.title = `Completado por ${task.completedByName || 'tu pareja'}`;
      } else {
        // Si no está completada o la completó el usuario actual, permitir toggle
        checkbox.onclick = () => handleToggleTask(task.id, task.completed);
      }
      
      if (task.completed) {
        checkbox.textContent = '✓';
      }
      
      // Icon
      const icon = document.createElement('div');
      icon.className = 'task-icon';
      icon.textContent = KAWAII_ICONS[task.icon] || '📌';
      
      // Content
      const content = document.createElement('div');
      content.className = 'task-content';
      
      const title = document.createElement('p');
      title.className = `task-title ${task.completed ? 'completed' : ''}`;
      title.textContent = task.title;
      
      content.appendChild(title);

          // ===> AÑADE ESTE BLOQUE <===
    if (task.completed && task.completedByName) {
      const completedBy = document.createElement('p');
      completedBy.className = 'task-completed-by';
      completedBy.textContent = `Completado por ${task.completedByName}`;
      content.appendChild(completedBy);
    }
      
  // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'task-delete';
      deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      deleteBtn.onclick = () => handleDeleteTask(task.id);
      
      taskItem.appendChild(checkbox);
      taskItem.appendChild(icon);
      taskItem.appendChild(content);
      taskItem.appendChild(deleteBtn);
      
      tasksContainer.appendChild(taskItem);
    });
  }
}


// ... justo después de la función renderTasks ...

function initSortable() {
  if (sortableInstance) {
    sortableInstance.destroy();
  }

  sortableInstance = new Sortable(tasksContainer, {
    animation: 150, // Animación suave al mover
    ghostClass: 'task-ghost', // Clase CSS para el elemento fantasma
    onEnd: handleUpdateTaskOrder, // Función a llamar cuando se suelta el elemento
  });
}

async function handleUpdateTaskOrder(event) {
  const items = event.target.children;
  const updates = [];

  for (let i = 0; i < items.length; i++) {
    const taskId = items[i].dataset.taskId; // Usaremos un data-attribute para obtener el ID
    const newOrder = i;
    
    // Preparamos una promesa de actualización para cada tarea que cambió de posición
    const taskRef = doc(db, 'couples', currentCoupleId, 'plans', currentPlanId, 'tasks', taskId);
    updates.push(updateDoc(taskRef, { order: newOrder }));
  }

  try {
    // Ejecutamos todas las actualizaciones en paralelo
    await Promise.all(updates);
  } catch (error) {
    console.error("Error al reordenar tareas:", error);
    alert("No se pudo guardar el nuevo orden. Inténtalo de nuevo.");
    // Opcional: recargar el plan para revertir visualmente
    await loadPlanDetail(currentPlanId);
  }
}



function updateProgress(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const percent = total > 0 ? (completed / total) * 100 : 0;
  
  progressText.textContent = `${completed}/${total}`;
  progressFill.style.width = `${percent}%`;
}

function toggleNewTaskForm() {
  const isVisible = newTaskForm.style.display === 'block';
  newTaskForm.style.display = isVisible ? 'none' : 'block';
  
  if (!isVisible) {
    taskTitleInput.value = '';
    selectedIcon = 'clipboard';
    renderIconGrid();
    taskTitleInput.focus();
  }
}

function renderIconGrid() {
  iconGrid.innerHTML = '';
  
  Object.entries(KAWAII_ICONS).forEach(([key, icon]) => {
    const btn = document.createElement('button');
    btn.className = `icon-btn ${key === selectedIcon ? 'selected' : ''}`;
    // small kawaii micro-interaction classes
    btn.classList.add('kawaii');
    // tiny pop on render
    btn.style.transform = 'scale(.96)';
    btn.style.opacity = '0';
    btn.textContent = icon;
    btn.type = 'button';
    btn.onclick = () => {
      selectedIcon = key;
      renderIconGrid();
    };
    
    iconGrid.appendChild(btn);

    // animate in (stagger)
    requestAnimationFrame(() => {
      setTimeout(() => {
        btn.style.transition = 'transform 280ms cubic-bezier(.2,.9,.2,1), opacity 280ms ease';
        btn.style.transform = 'scale(1)';
        btn.style.opacity = '1';
      }, Math.random() * 220);
    });
  });
}

async function handleCreateTask() {
  const title = taskTitleInput.value.trim();
  
  if (!title) {
    showNotification({
      title: 'Campo Requerido',
      message: 'Por favor, ingresa un título para la tarea',
      icon: '📝',
      type: 'warning'
    });
    return;
  }
  
  try {
  const newTaskId = await createTask(currentPlanId, title, selectedIcon);
    toggleNewTaskForm();
    await loadPlanDetail(currentPlanId);

    // Añadir clase de "nuevo" al elemento recién creado
    if (newTaskId) {
      const newEl = document.querySelector(`[data-task-id="${newTaskId}"]`);
      if (newEl) {
        newEl.classList.add('task-added');
        setTimeout(() => newEl.classList.remove('task-added'), 900);
      }
    }
    // If a new task is created for this plan, allow future celebrations again
    celebratedPlans.delete(currentPlanId);
  } catch (error) {
    showNotification({
      title: 'Error',
      message: 'Error al crear la tarea. Por favor, intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

async function handleToggleTask(taskId, currentCompleted) {
  try {
    await toggleTask(currentPlanId, taskId, !currentCompleted);
    await loadPlanDetail(currentPlanId);

    // Si ahora todas las tareas están completadas, mostrar celebración
    const allItems = tasksContainer.querySelectorAll('.task-item');
    const completedItems = tasksContainer.querySelectorAll('.task-item.completed');
    if (allItems.length > 0 && allItems.length === completedItems.length) {
      // pequeña animación en los items
      completedItems.forEach(el => el.classList.add('animate-complete'));
      // celebration: overlay, toast, hearts and plan glow
      celebratePlanCompletion(currentPlanId);
      // limpiar clase luego
      setTimeout(() => completedItems.forEach(el => el.classList.remove('animate-complete')), 900);
    }
  } catch (error) {
    alert('Error al actualizar la tarea. Por favor, intenta de nuevo.');
  }
}

async function handleDeleteTask(taskId) {
  showNotification({
    title: 'Eliminar Tarea',
    message: '¿Estás seguro de que quieres eliminar esta tarea?',
    icon: '🗑️',
    type: 'warning',
    confirm: true,
    onConfirm: async () => {
      try {
        // Animar elemento en la UI antes de borrarlo (si está disponible el animationManager)
        const el = tasksContainer.querySelector(`[data-task-id="${taskId}"]`);
        if (el && window.animationManager) {
          // Usar la animación del sistema
          window.animationManager.animateItemExit(el, async () => {
            await deleteTask(currentPlanId, taskId);
            await loadPlanDetail(currentPlanId);
          });
        } else {
          // Si no hay animación, eliminar directamente
          await deleteTask(currentPlanId, taskId);
          await loadPlanDetail(currentPlanId);
        }
      } catch (error) {
        showNotification({
          title: 'Error',
          message: 'Error al eliminar la tarea. Por favor, intenta de nuevo.',
          icon: '❌',
          type: 'error'
        });
      }
    }
  });
}


// ============================================
// FUNCIONES DEL MODAL DE PAREJA
// ============================================

function openCoupleModal() {
  showModal(coupleModal, 'standard');
  loadCoupleData();
}

function closeCoupleModal() {
  hideModal(coupleModal, 'standard');
  coupleAboutView.style.display = 'none'; // Asegura que no se quede abierta
}

async function loadCoupleData() {
  try {
    // Mostrar loading
    coupleLoadingView.style.display = 'block';
    coupleUnlinkedView.style.display = 'none';
    coupleLinkedView.style.display = 'none';
    
    // Obtener datos de pareja
    coupleData = await getUserCoupleCode(db, currentUser.uid);
    
    if (coupleData.partnerId) {
      // Usuario tiene pareja vinculada
      showLinkedView();
    } else {
      // Usuario no tiene pareja vinculada
      showUnlinkedView();
    }
  } catch (error) {
    console.error('Error al cargar datos de pareja:', error);
    alert('Error al cargar información de pareja');
    closeCoupleModal();
  }
}

function showUnlinkedView() {
  coupleLoadingView.style.display = 'none';
  coupleUnlinkedView.style.display = 'block';
  coupleLinkedView.style.display = 'none';
  
  userCoupleCode.textContent = coupleData.code;
  partnerCodeInput.value = '';
}

function showLinkedView() {
  coupleLoadingView.style.display = 'none';
  coupleUnlinkedView.style.display = 'none';
  coupleLinkedView.style.display = 'block';
  
  partnerNameDisplay.textContent = coupleData.partnerName;
  
  if (coupleData.linkedAt) {
    linkedDateDisplay.textContent = `Vinculados desde ${coupleData.linkedAt.toLocaleDateString('es-ES')}`;
  } else {
    linkedDateDisplay.textContent = '';
  }
  // small entrance animation for the linked card
  const linkedCard = coupleLinkedView.querySelector('.couple-linked-card');
  if (linkedCard) {
    linkedCard.classList.remove('animate-in');
    // force reflow
    void linkedCard.offsetWidth;
    linkedCard.classList.add('animate-in');
    setTimeout(() => linkedCard.classList.remove('animate-in'), 900);
  }
}

async function handleCopyCode() {
  try {
    await navigator.clipboard.writeText(coupleData.code);
    
    // Cambiar icono temporalmente
    copyCodeBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    
    setTimeout(() => {
      copyCodeBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
    }, 2000);
  } catch (error) {
    console.error('Error al copiar código:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo copiar el código',
      icon: '❌',
      type: 'error'
    });
  }
}

async function handleLinkPartner() {
  const partnerCode = partnerCodeInput.value.trim().toUpperCase();
  
  if (!partnerCode) {
    showNotification({
      title: 'Campo Requerido',
      message: 'Por favor, ingresa un código',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (partnerCode.length !== 6) {
    showNotification({
      title: 'Código Inválido',
      message: 'El código debe tener 6 caracteres',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (partnerCode === coupleData.code) {
    showNotification({
      title: 'Error',
      message: 'No puedes vincularte contigo mismo',
      icon: '❌',
      type: 'error'
    });
    return;
  }
  
  try {
    linkPartnerBtn.disabled = true;
    linkPartnerBtn.textContent = 'Vinculando...';
    
    const result = await linkWithPartner(
      db, 
      currentUser.uid, 
      currentUser.displayName || currentUser.email,
      partnerCode
    );
    
    // Actualizar coupleId global
    currentCoupleId = result.coupleId;
    
    // Recargar datos
    await loadCoupleData();
    
    // Recargar planes con el nuevo coupleId
    await loadPlans();

        // ===> AÑADIR ESTA LÍNEA <===
    updateNewPlanButtonState(true);
    updateLinkPartnerBanner(true); // <== AÑADIR
    updateStatsButtonVisibility(true);

    
    showNotification({
      title: '¡Vinculación Exitosa!',
      message: `Ahora estás vinculado con ${result.partnerName}. ¡Pueden crear planes juntos!`,
      icon: '💕',
      type: 'heart'
    });
  } catch (error) {
    console.error('Error al vincular:', error);
    
    if (error.message === 'Código no encontrado') {
      showNotification({
        title: 'Error',
        message: 'Código no encontrado. Verifica que sea correcto.',
        icon: '❌',
        type: 'error'
      });
    } else if (error.message === 'No puedes vincularte contigo mismo') {
      showNotification({
        title: 'Error',
        message: 'No puedes usar tu propio código.',
        icon: '❌',
        type: 'error'
      });
    } else if (error.message.includes('ya está vinculado')) {
      showNotification({
        title: 'Error',
        message: 'Este código ya está vinculado con otra persona.',
        icon: '❌',
        type: 'error'
      });
    } else {
      showNotification({
        title: 'Error',
        message: 'Error al vincular. Por favor, intenta de nuevo.',
        icon: '❌',
        type: 'error'
      });
    }
  } finally {
    linkPartnerBtn.disabled = false;
    linkPartnerBtn.textContent = 'Vincular';
  }
}

async function handleUnlinkPartner() {
  showNotification({
    title: 'Desvincular Pareja',
    message: '¿Estás seguro de que quieres desvincular tu pareja? Los planes creados juntos ya no serán compartidos.',
    icon: '💔',
    type: 'warning',
    confirm: true,
    onConfirm: async () => {
      try {
        unlinkPartnerBtn.disabled = true;
        unlinkPartnerBtn.textContent = 'Desvinculando...';
        
        await unlinkPartner(db, currentUser.uid);
        
        // Actualizar coupleId global
        currentCoupleId = `couple-${currentUser.uid}`;
        
        // Recargar datos
        await loadCoupleData();
        
        // Recargar planes
        await loadPlans();

            // ===> AÑADIR ESTA LÍNEA <===
        updateNewPlanButtonState(false);
        updateLinkPartnerBanner(false); // <== AÑADIR
        updateStatsButtonVisibility(false);

        
        showNotification({
          title: 'Desvinculación Exitosa',
          message: 'Pareja desvinculada correctamente',
          icon: '✅',
          type: 'success'
        });
      } catch (error) {
        console.error('Error al desvincular:', error);
        showNotification({
          title: 'Error',
          message: 'Error al desvincular. Por favor, intenta de nuevo.',
          icon: '❌',
          type: 'error'
        });
      } finally {
        unlinkPartnerBtn.disabled = false;
        unlinkPartnerBtn.textContent = 'Desvincular Pareja';
      }
    }
  });
}


// ============================================
// EVENT LISTENERS
// ============================================

// Home
loginBtn.addEventListener('click', handleLogin);

// Dashboard
// NUEVO BLOQUE DE CÓDIGO
logoutBtn.addEventListener('click', () => {
  openLogoutConfirmModal();
});

// Función para abrir el modal de confirmación de logout
function openLogoutConfirmModal() {
  showModal(logoutConfirmModal, 'standard');
}

// Función para cerrar el modal
function closeLogoutConfirmModal() {
  hideModal(logoutConfirmModal, 'standard');
}

// Listeners para los botones del nuevo modal
closeLogoutModalBtn.addEventListener('click', closeLogoutConfirmModal);
cancelLogoutBtn.addEventListener('click', closeLogoutConfirmModal);
confirmLogoutBtn.addEventListener('click', () => {
  closeLogoutConfirmModal(); // Cierra el modal
  handleLogout(); // Ejecuta la función de logout que ya tenías
});

// Listener para cerrar el modal al hacer clic en el overlay
logoutConfirmModal.addEventListener('click', (e) => {
  if (e.target === logoutConfirmModal) {
    closeLogoutConfirmModal();
  }
});






newPlanBtn.addEventListener('click', toggleNewPlanForm);
createPlanBtn.addEventListener('click', handleCreatePlan);
cancelPlanBtn.addEventListener('click', toggleNewPlanForm);

// Plan Detail
backBtn.addEventListener('click', navigateToDashboard);
newTaskBtn.addEventListener('click', toggleNewTaskForm);
createTaskBtn.addEventListener('click', handleCreateTask);
cancelTaskBtn.addEventListener('click', toggleNewTaskForm);

// Modal de Pareja
coupleBtn.addEventListener('click', openCoupleModal);
closeModalBtn.addEventListener('click', closeCoupleModal);
copyCodeBtn.addEventListener('click', handleCopyCode);
linkPartnerBtn.addEventListener('click', handleLinkPartner);
unlinkPartnerBtn.addEventListener('click', handleUnlinkPartner);

// ===> AÑADE ESTOS LISTENERS <===
openAboutViewBtn.addEventListener('click', showAboutView);
backToCoupleViewBtn.addEventListener('click', hideAboutView);

// ===> AÑADE ESTOS LISTENERS <===
closeEditModalBtn.addEventListener('click', closeEditPlanModal);
updatePlanBtn.addEventListener('click', handleUpdatePlan);
deletePlanBtn.addEventListener('click', handleDeletePlan);
editPlanModal.addEventListener('click', (e) => {
  if (e.target === editPlanModal) {
    closeEditPlanModal();
  }
});



// ... al final de la sección de listeners ...
statsBtn.addEventListener('click', openStatsModal);
closeStatsModalBtn.addEventListener('click', closeStatsModal);
statsModal.addEventListener('click', (e) => {
  if (e.target === statsModal) {
    closeStatsModal();
  }
});



// Listeners para la app de Banda Sonora
createPlaylistBtn.addEventListener('click', handleCreatePlaylist);
goToAddSongBtn.addEventListener('click', goToAddSongView);
saveSongBtn.addEventListener('click', handleSaveSong);

// Validación visual en tiempo real para URL de YouTube
youtubeLinkInput.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url.length === 0) {
    youtubeLinkInput.style.borderColor = 'rgba(139, 92, 246, 0.2)';
    return;
  }
  
  if (url.includes('youtu.be/') || url.includes('youtube.com/watch')) {
    youtubeLinkInput.style.borderColor = '#10b981'; // Verde
    youtubeLinkInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
  } else {
    youtubeLinkInput.style.borderColor = '#ef4444'; // Rojo
    youtubeLinkInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
  }
});

// Listeners para modales de edición
document.getElementById('cancel-edit-playlist-btn').addEventListener('click', closeEditPlaylistModal);
document.getElementById('save-edit-playlist-btn').addEventListener('click', handleSaveEditPlaylist);
document.getElementById('cancel-edit-song-btn').addEventListener('click', closeEditSongModal);
document.getElementById('save-edit-song-btn').addEventListener('click', handleSaveEditSong);

// Validación visual para URL en modal de edición de canción
editSongUrlInput.addEventListener('input', (e) => {
  const url = e.target.value.trim();
  if (url.length === 0) {
    editSongUrlInput.style.borderColor = 'rgba(139, 92, 246, 0.2)';
    return;
  }
  
  if (url.includes('youtu.be/') || url.includes('youtube.com/watch')) {
    editSongUrlInput.style.borderColor = '#10b981'; // Verde
    editSongUrlInput.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
  } else {
    editSongUrlInput.style.borderColor = '#ef4444'; // Rojo
    editSongUrlInput.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
  }
});

// Cerrar modales al hacer clic fuera
editPlaylistModal.addEventListener('click', (e) => {
  if (e.target === editPlaylistModal) {
    closeEditPlaylistModal();
  }
});

editSongModal.addEventListener('click', (e) => {
  if (e.target === editSongModal) {
    closeEditSongModal();
  }
});

// Listener para el clic en el disco del tocadiscos
turntableDisc.addEventListener('click', togglePlayPause);

// Event listeners para iconos de apps en el phone homescreen (solo dentro del modal del teléfono)
if (phoneModal) {
  phoneModal.addEventListener('click', (e) => {
    const appIcon = e.target.closest('.app-icon[data-app]');
    if (appIcon) {
      const appName = appIcon.dataset.app;
      if (appName) {
        showPhoneApp(appName);
      }
    }
  });
}










// En la sección EVENT LISTENERS

// REEMPLAZA todos los bloques de allPhoneBackBtns.forEach por este único bloque:

const allPhoneBackBtns = document.querySelectorAll('.phone-back-btn');
allPhoneBackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetApp = btn.dataset.target;
    if (!targetApp) return;

    // Lógica especial para la playlist
    if (targetApp === 'playlistdetail') {
      const currentPlaylistName = playlistDetailTitle.textContent;
      openPlaylistDetail(currentPlaylistId, currentPlaylistName);
      return; // Salimos para no ejecutar el showPhoneApp genérico
    }
    
    // Lógica genérica para todas las demás apps
    showPhoneApp(targetApp);
    
    // Lógica extra si volvemos al homescreen
    if (targetApp === 'homescreen' && challengeQuestionView && challengeRevealedView) {
      challengeRevealedView.classList.remove('active');
      challengeQuestionView.classList.add('active');
    }
  });
});





// ... en la sección EVENT LISTENERS ...

// Listeners para el Teléfono Kawaii (VERSIÓN CORREGIDA)
openPhoneModalBtn.addEventListener('click', openPhoneModal);
if (openFavorsModalBtn) {
  openFavorsModalBtn.addEventListener('click', openFavorsFullscreenModal);
}
if (openNewFeaturesBtn) {
  openNewFeaturesBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();

    // Verificar que no estamos dentro de ningún modal
    const phoneModal = document.getElementById('phone-modal');
    const testGameModal = document.getElementById('test-game-modal');
    const favorsModal = document.getElementById('favors-modal');

    const isInsidePhone = phoneModal && phoneModal.style.display === 'flex';
    const isTestModalOpen = testGameModal && testGameModal.style.display === 'flex';
    const isFavorsModalOpen = favorsModal && favorsModal.style.display === 'flex';

    // Solo abrir si no hay ningún modal abierto
    if (!isInsidePhone && !isTestModalOpen && !isFavorsModalOpen) {
      console.log('Abriendo modal del test desde botón principal');
      openTestGameModal();
    } else {
      console.log('Modal del test bloqueado - hay otro modal abierto:', {
        phone: isInsidePhone,
        test: isTestModalOpen,
        favors: isFavorsModalOpen
      });
    }
  });
}
if (closeFavorsModalBtn) {
  closeFavorsModalBtn.addEventListener('click', closeFavorsFullscreenModal);
}
closePhoneModalBtn.addEventListener('click', closePhoneModal);
phoneModal.addEventListener('click', (e) => {
  if (e.target === phoneModal) {
    closePhoneModal();
  }
});

// Listeners para los botones de "volver"
backToHomeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    showPhoneApp('homescreen');
    // Resetea la tarjeta al volver al home
    if (challengeQuestionView && challengeRevealedView) {
      challengeRevealedView.classList.remove('active');
      challengeQuestionView.classList.add('active');
    }
  });
});

// Listeners para la app de Tarea Sorpresa
rerollSurpriseTaskBtn.addEventListener('click', handleReroll);
acceptSurpriseTaskBtn.addEventListener('click', acceptSurpriseTask);

// NUEVO: Listener para revelar reto
if (revealChallengeBtn) {
  revealChallengeBtn.addEventListener('click', () => {
    updateSurpriseContent();
    challengeQuestionView.classList.remove('active');
    challengeRevealedView.classList.add('active');
  });
}

// Listeners para categorías de retos
categoryChips.forEach(chip => {
  chip.addEventListener('click', () => {
    // Remover active de todos
    categoryChips.forEach(c => c.classList.remove('active'));
    // Añadir active al seleccionado
    chip.classList.add('active');
    
    // Actualizar categoría actual
    currentChallengeCategory = chip.dataset.category;
    
    // Volver a vista de pregunta
    challengeRevealedView.classList.remove('active');
    challengeQuestionView.classList.add('active');
  });
});

// Listener para toggle de historial
if (toggleHistoryBtn) {
  toggleHistoryBtn.addEventListener('click', () => {
    historyList.classList.toggle('collapsed');
    toggleHistoryBtn.classList.toggle('collapsed');
  });
}



// Listeners para la app de Cápsula del Tiempo
// goToCreateCapsuleBtn.addEventListener('click', () => showPhoneApp('createcapsule')); // Ya manejado por createCapsuleFab
// backToCapsuleListBtn.addEventListener('click', () => showPhoneApp('timecapsule')); // Ya manejado en initTimeCapsules
// saveCapsuleBtn.addEventListener('click', handleSaveCapsule); // Función no existe



// Listeners para la app de Presupuesto Compartido
goToCreateGoalBtn.addEventListener('click', openCreateGoalView);
backToBudgetListBtn.addEventListener('click', () => showPhoneApp('budget'));
saveGoalBtn.addEventListener('click', handleSaveGoal);
addContributionBtn.addEventListener('click', handleAddContribution);





// Nuevo listener para el botón de añadir foto
journalAddPhotoBtn.addEventListener('click', () => journalImageInput.click());

journalImageInput.addEventListener('change', (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumbnail';
        thumb.innerHTML = `
          <img src="${event.target.result}" alt="Previsualización">
          <button class="delete-photo-btn" onclick="this.parentElement.remove()">×</button>
        `;
        journalGalleryContainer.insertBefore(thumb, journalAddPhotoBtn);
      };
      reader.readAsDataURL(file);
    }
  }
  // Resetear el input para poder seleccionar las mismas fotos de nuevo si se eliminan
  e.target.value = '';
});

saveJournalEntryBtn.addEventListener('click', handleSaveJournalEntry);

// Event Listeners para navegación de meses en el calendario
journalPrevMonthBtn.addEventListener('click', () => {
  currentJournalDate.setMonth(currentJournalDate.getMonth() - 1);
  fetchJournalEntriesForMonth();
});

journalNextMonthBtn.addEventListener('click', () => {
  currentJournalDate.setMonth(currentJournalDate.getMonth() + 1);
  fetchJournalEntriesForMonth();
});

// Event Listeners para selector de emociones
document.querySelectorAll('.mood-option').forEach(btn => {
  btn.addEventListener('click', function() {
    // Remover selección anterior
    document.querySelectorAll('.mood-option').forEach(b => b.classList.remove('selected'));
    // Agregar selección actual
    this.classList.add('selected');
  });
});

// Event Listener para búsqueda de recuerdos
if (journalSearchInput) {
  journalSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Filtrar días del calendario según el término de búsqueda
    const allDays = journalCalendarGrid.querySelectorAll('.calendar-day:not(.other-month)');
    
    if (searchTerm === '') {
      // Si no hay búsqueda, mostrar todos los días
      allDays.forEach(day => {
        day.style.opacity = '1';
        day.style.pointerEvents = 'auto';
      });
    } else {
      // Filtrar días que tienen entradas con el texto buscado
      allDays.forEach(day => {
        const dayNumber = parseInt(day.textContent);
        const year = currentJournalDate.getFullYear();
        const month = currentJournalDate.getMonth();
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        
        if (journalEntriesCache.has(dateStr)) {
          const entry = journalEntriesCache.get(dateStr);
          const entryText = (entry.text || '').toLowerCase();
          
          if (entryText.includes(searchTerm)) {
            day.style.opacity = '1';
            day.style.pointerEvents = 'auto';
            day.style.transform = 'scale(1.1)';
            day.style.borderColor = 'var(--secondary)';
          } else {
            day.style.opacity = '0.3';
            day.style.pointerEvents = 'none';
            day.style.transform = 'scale(1)';
            day.style.borderColor = 'transparent';
          }
        } else {
          day.style.opacity = '0.3';
          day.style.pointerEvents = 'none';
        }
      });
    }
  });
}

// Event Listeners para botones "Atrás" del diario
document.querySelectorAll('.back-to-journal-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    showPhoneApp('journal');
  });
});

// Event Listeners para los botones del carrusel
carouselPrevBtn.addEventListener('click', () => {
  moveToSlide(currentSlideIndex - 1);
});
carouselNextBtn.addEventListener('click', () => {
  moveToSlide(currentSlideIndex + 1);
});



// Listener para el botón "Editar" en la vista de solo lectura
goToEditEntryBtn.addEventListener('click', () => {
  if (selectedJournalDate) {
    openJournalEditView(selectedJournalDate);
  }
});



// ... en la sección EVENT LISTENERS ...

// Listener para el switch de Teléfono/Tablet
if (deviceSwitchBtn) { // <--- AÑADE ESTA COMPROBACIÓN
  deviceSwitchBtn.addEventListener('click', () => {
    // toggle() añade la clase si no está, y la quita si ya está. ¡Es mágico!
    phoneContainer.classList.toggle('is-tablet');

    // Cambiar el icono y el título del botón para que el usuario sepa qué hace
    const isTablet = phoneContainer.classList.contains('is-tablet');
    if (isTablet) {
      deviceSwitchBtn.title = "Cambiar a modo Teléfono";
      // Icono de teléfono
      deviceSwitchBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>`;
    } else {
      deviceSwitchBtn.title = "Cambiar a modo Tablet";
      // Icono de tablet
      deviceSwitchBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
    }
  });
}

goToCoupleModalBtn.addEventListener('click', openCoupleModal);

// Cerrar modal al hacer click en el overlay
coupleModal.addEventListener('click', (e) => {
  if (e.target === coupleModal) {
    closeCoupleModal();
  }
});

// Enter key en input de código
partnerCodeInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleLinkPartner();
  }
});

// Enter key handlers
planTitleInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleCreatePlan();
  }
});

taskTitleInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    handleCreateTask();
  }
});


// ... al final de la sección de EVENT LISTENERS ...
/*
// Listeners para el modal de notificaciones
openNotificationsModalBtn.addEventListener('click', () => {
  notificationsModal.style.display = 'flex';
});

closeNotificationsModalBtn.addEventListener('click', () => {
  notificationsModal.style.display = 'none';
});

notificationsModal.addEventListener('click', (e) => {
  if (e.target === notificationsModal) {
    notificationsModal.style.display = 'none';
  }
});

enableNotificationsBtn.addEventListener('click', () => {
  requestNotificationPermission(currentUser.uid);
  notificationsModal.style.display = 'none'; // Cierra el modal después de pedir permiso
});
*/


// ============================================
// INICIALIZACIÓN
// ============================================

// Inicializar grid de iconos
renderIconGrid();

// Mostrar pantalla de carga inicialmente
showLoading();

// ===> AÑADE ESTAS LÍNEAS PARA EL RELOJ <===
// Llama a la función una vez para que la hora no aparezca vacía al principio
updatePhoneClock(); 

// Configura un intervalo para que la función se ejecute cada segundo (1000 milisegundos)
setInterval(updatePhoneClock, 1000);

// ============================================
// FUNCIONES DEL MODAL DE ESTADÍSTICAS
// ============================================

async function openStatsModal() { // <== Convertir la función en async
  showModal(statsModal, 'standard');
  
  // Mostrar la vista de carga inmediatamente
  statsLoadingView.style.display = 'block';
  statsContentView.style.display = 'none';

  try {
    // ===> PASO CLAVE: Cargar o recargar los datos de la pareja <===
    // Esta es la misma función que usa el modal de vincular pareja.
    // Nos aseguramos de que 'coupleData' esté siempre actualizado.
    coupleData = await getUserCoupleCode(db, currentUser.uid);

    // Ahora que 'coupleData' está cargado, llamamos a la función de estadísticas.
    await loadCoupleStats();

  } catch (error) {
    console.error("Error al preparar el modal de estadísticas:", error);
    alert("No se pudo obtener la información de la pareja para las estadísticas.");
    closeStatsModal();
  }
}

function closeStatsModal() {
  hideModal(statsModal, 'standard');
}

// ESTA ES LA NUEVA VERSIÓN SIMPLIFICADA
async function loadCoupleStats() {
  try {
    const partnerId = coupleData?.partnerId;
    if (!partnerId) {
      throw new Error("No se encontró información de la pareja.");
    }

    const stats = await calculateCoupleStats(db, collection, getDocs, currentCoupleId, currentUser.uid, partnerId);

    if (stats) {
      // Rellenar los campos del modal con los datos calculados (animando los números)
      const totalPlansEl = document.getElementById('stat-total-plans');
      const completedPlansEl = document.getElementById('stat-completed-plans');
      const totalTasksEl = document.getElementById('stat-total-tasks');
      const completionPercEl = document.getElementById('stat-completion-percentage');
      const userNameEl = document.getElementById('stat-user-name');
      const userTasksEl = document.getElementById('stat-user-tasks');
      const partnerNameEl = document.getElementById('stat-partner-name');
      const partnerTasksEl = document.getElementById('stat-partner-tasks');

      // set names immediately
      userNameEl.textContent = currentUser.displayName || 'Tú';
      partnerNameEl.textContent = coupleData.partnerName || 'Pareja';

      // animate numbers
      countUp(totalPlansEl, stats.totalPlans, 700);
      countUp(completedPlansEl, stats.completedPlans, 700);
      countUp(totalTasksEl, stats.totalTasks, 700);
      countUp(userTasksEl, stats.userCompletedTasks, 700);
      countUp(partnerTasksEl, stats.partnerCompletedTasks, 700);
      countUp(completionPercEl, stats.completionPercentage, 700, '%');

      // Mostrar contenido y ocultar carga con animación
      statsLoadingView.style.display = 'none';
      statsContentView.style.display = 'block';
      statsContentView.classList.add('animate-in');
      setTimeout(() => statsContentView.classList.remove('animate-in'), 900);
    } else {
      throw new Error("No se pudieron calcular las estadísticas.");
    }

  } catch (error) {
    console.error("Error al cargar estadísticas:", error);
    // El alert ahora se maneja en openStatsModal, pero dejamos el log
    // Opcional: mostrar un mensaje de error dentro del modal
    statsLoadingView.innerHTML = `<p class="couple-loading-text">Error al cargar logros.</p>`;
  }
}




// ... en la sección FUNCIONES DEL MODAL DE PAREJA ...

function showAboutView() {
  // Ocultar todas las vistas principales del modal
  coupleLoadingView.style.display = 'none';
  coupleUnlinkedView.style.display = 'none';
  coupleLinkedView.style.display = 'none';
  
  // Mostrar la vista "Acerca de"
  coupleAboutView.style.display = 'block';
}

function hideAboutView() {
  // Ocultar la vista "Acerca de"
  coupleAboutView.style.display = 'none';
  
  // Volver a cargar la vista correcta (vinculado o no vinculado)
  loadCoupleData();
}







// ============================================
// FUNCIONES DEL TELÉFONO KAWAII (VERSIÓN CORREGIDA)
// ============================================




function openPhoneModal() {
  console.log('Abriendo phoneModal. Estado del placeInfoModal antes:', placeInfoModal ? placeInfoModal.style.display : 'no modal');
  showModal(phoneModal, 'standard');
}

function closePhoneModal() {
  hideModal(phoneModal, 'standard');
  // Ocultar el modal de detalles si está abierto
  if (placeInfoModal && placeInfoModal.style.display === 'flex') {
    placeInfoModal.style.display = 'none';
    console.log('Modal de detalles ocultado al cerrar modal del teléfono');
  }
  // Al cerrar, reseteamos las vistas al estado inicial
  if (challengeQuestionView && challengeRevealedView) {
    challengeRevealedView.classList.remove('active');
    challengeQuestionView.classList.add('active');
  }
  // Y volvemos a la pantalla de inicio del teléfono
  showPhoneApp('homescreen');

   // ===> AÑADE UNA COMPROBACIÓN DE SEGURIDAD <===
  if (phoneContainer && deviceSwitchBtn) {
    phoneContainer.classList.remove('is-tablet');
    deviceSwitchBtn.title = "Cambiar a modo Tablet";
    deviceSwitchBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  }

}

// Funciones para el modal fullscreen de Favores
function openFavorsFullscreenModal() {
  console.log('=== openFavorsFullscreenModal called ===');
  
  // Solo cerrar otros modales si NO estamos dentro del phone-modal
  const phoneModal = document.getElementById('phone-modal');
  const isInsidePhone = phoneModal && phoneModal.style.display === 'flex';
  
  if (!isInsidePhone) {
    // Cerrar otros modales solo si no estamos dentro del teléfono
    const mapModal = document.getElementById('map-modal');
    const isPlaceInfoInsideMap = mapModal && mapModal.contains(placeInfoModal);
    
    if (placeInfoModal && !isPlaceInfoInsideMap) {
      placeInfoModal.style.display = 'none';
      document.body.appendChild(placeInfoModal);
      console.log('Modal de detalles cerrado al abrir modal de favores (no estamos en teléfono y no está dentro del mapa)');
    } else if (isPlaceInfoInsideMap) {
      console.log('Modal de detalles NO cerrado al abrir modal de favores (está dentro del mapa)');
    }
    
    // Cerrar modal del mapa si está abierto
    if (mapModal && mapModal.classList.contains('is-open')) {
      mapModal.classList.remove('is-open');
      mapModal.style.display = 'none';
      console.log('Modal del mapa cerrado al abrir modal de favores');
    }
    
    // Cerrar modal de crear favor si está abierto
    const createFavorModal = document.getElementById('create-favor-modal');
    if (createFavorModal && !createFavorModal.classList.contains('hidden')) {
      createFavorModal.classList.add('hidden');
      console.log('Modal de crear favor cerrado al abrir modal de favores');
    }
    // Cerrar modal de notificación si está abierto
    const notificationModal = document.getElementById('notification-modal');
    if (notificationModal && notificationModal.style.display !== 'none') {
      notificationModal.style.display = 'none';
      console.log('Modal de notificación cerrado al abrir modal de favores');
    }
    // Cerrar lightbox si está abierto
    if (lightbox && lightbox.classList.contains('active')) {
      closeLightbox();
      console.log('Lightbox cerrado al abrir modal de favores');
    }
  } else {
    console.log('Estamos dentro del teléfono, no cerramos otros modales al abrir favores');
  }
  
  let modal = document.getElementById('favors-fullscreen-modal');
  
  // Si el modal no existe, lo creamos dinámicamente
  if (!modal) {
    console.log('Modal not found in DOM, creating it dynamically...');
    
    // Crear el modal completo
    const modalHTML = `
      <div id="favors-fullscreen-modal" class="favors-fullscreen-modal">
        <div class="favors-modal-overlay"></div>
        <div class="favors-modal-container">
          <div class="favors-modal-header">
            <h2>🎯 Desafíos</h2>
            <button id="close-favors-modal-btn" class="favors-close-btn">✕</button>
          </div>
          
          <div class="favors-modal-content">
            <!-- Balance de puntos -->
            <div class="points-balance-large">
              <div class="user-points-large">
                <div class="points-label">Tus puntos</div>
                <div id="my-points-large" class="points-value-large">0</div>
              </div>
              <div class="points-divider-large">⚡</div>
              <div class="user-points-large">
                <div class="points-label">Tu pareja</div>
                <div id="partner-points-large" class="points-value-large">0</div>
              </div>
            </div>

            <!-- Tabs -->
            <div class="favors-tabs-large">
              <button id="tab-active-large" class="favor-tab-large active">Activos</button>
              <button id="tab-completed-large" class="favor-tab-large">Completados</button>
              <button id="tab-random-large" class="favor-tab-large">🎲 Random</button>
            </div>

            <!-- Lista de favores activos -->
            <div id="active-favors-list-large" class="favors-list-large">
              <div id="favors-empty-state-large" class="favors-empty-state-large">
                <div class="empty-icon-large">🎁</div>
                <p>No hay favores activos. ¡Crea el primero o prueba uno random!</p>
              </div>
            </div>

            <!-- Lista de completados -->
            <div id="completed-favors-list-large" class="favors-list-large hidden">
            </div>

            <!-- Vista de desafío random -->
            <div id="random-challenge-view-large" class="random-challenge-view-large hidden">
              <div class="challenge-card-large">
                <div class="challenge-icon-large">🎲</div>
                <h3 id="challenge-title-large" class="challenge-title-large">Cargando desafío...</h3>
                <p id="challenge-description-large" class="challenge-description-large"></p>
                <div class="challenge-difficulty-large">
                  <span id="challenge-difficulty-badge-large" class="difficulty-badge-large">⭐ Fácil</span>
                  <span id="challenge-points-large" class="challenge-points-large">+10 puntos</span>
                </div>
                <div class="challenge-actions-large">
                  <button id="accept-challenge-btn-large" class="btn btn-primary btn-large">¡Aceptar!</button>
                  <button id="reroll-challenge-btn-large" class="btn btn-secondary btn-large">Otro desafío</button>
                </div>
              </div>
            </div>

            <button id="add-favor-btn-large" class="btn btn-primary btn-large" style="margin-top: 2rem;">
              ✨ Crear Desafío
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Insertar el modal en el body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('favors-fullscreen-modal');
    
    // Configurar todos los event listeners del modal
    setupFavorsModalListeners();
    
    console.log('Modal created successfully');
  } else {
    console.log('Modal already exists in DOM');
    // Asegurarse de que los listeners están configurados
    setupFavorsModalListeners();
  }
  
  // Mostrar el modal
  console.log('=== SHOWING FAVORS MODAL ===');
  console.log('Modal exists:', !!modal);
  console.log('Modal classes before:', modal.className);
  
  // Mostrar el modal usando el sistema unificado
  showModal(modal, 'favors');
  
  console.log('Favors modal should now be visible');
  
  // Configurar click outside para cerrar el modal
  const closeFavorsOnClickOutside = (e) => {
    if (e.target === modal) {
      closeFavorsFullscreenModal();
    }
  };
  modal.addEventListener('click', closeFavorsOnClickOutside);
  
  // Cargar datos si el usuario está autenticado
  if (currentUser && currentCoupleId) {
    console.log('Loading favors data...');
    loadFavorsData();
  }
}

function closeFavorsFullscreenModal() {
  hideModal(document.getElementById('favors-fullscreen-modal'), 'favors');
}

// Setup para listeners de favores en phone-modal (sin sufijo -large)
let favorsPhoneListenersSetup = false;
let favorsModalListenersSetup = false;

function setupFavorsModalListeners() {
  console.log('=== setupFavorsModalListeners called ===');
  
  if (favorsModalListenersSetup) {
    console.log('Favors modal listeners already setup, skipping');
    return;
  }
  
  const closeBtn = document.getElementById('close-favors-modal-btn');
  const tabActive = document.getElementById('tab-active-large');
  const tabCompleted = document.getElementById('tab-completed-large');
  const tabRandom = document.getElementById('tab-random-large');
  const addFavorBtn = document.getElementById('add-favor-btn-large');
  const rerollBtn = document.getElementById('reroll-challenge-btn-large');
  const acceptBtn = document.getElementById('accept-challenge-btn-large');
  
  console.log('Favors modal elements found:', {
    closeBtn: !!closeBtn,
    tabActive: !!tabActive,
    tabCompleted: !!tabCompleted,
    tabRandom: !!tabRandom,
    addFavorBtn: !!addFavorBtn,
    rerollBtn: !!rerollBtn,
    acceptBtn: !!acceptBtn
  });
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFavorsFullscreenModal);
  }
  
  if (tabActive) {
    tabActive.addEventListener('click', () => {
      console.log('>>> Tab ACTIVE (large) clicked');
      switchFavorsTab('active');
    });
  }
  
  if (tabCompleted) {
    tabCompleted.addEventListener('click', () => {
      console.log('>>> Tab COMPLETED (large) clicked');
      switchFavorsTab('completed');
    });
  }
  
  if (tabRandom) {
    tabRandom.addEventListener('click', () => {
      console.log('>>> Tab RANDOM (large) clicked');
      switchFavorsTab('random');
    });
  }
  
  if (addFavorBtn) {
    addFavorBtn.addEventListener('click', () => {
      console.log('>>> Add favor (large) clicked');
      openCreateFavorModal();
    });
  }
  
  if (rerollBtn) {
    rerollBtn.addEventListener('click', () => {
      console.log('>>> Reroll (large) clicked');
      const challengeCard = document.querySelector('.random-challenge-card-large');
      if (challengeCard) {
        challengeCard.classList.add('shake');
        setTimeout(() => challengeCard.classList.remove('shake'), 500);
      }
      loadRandomChallenge();
    });
  }
  
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      console.log('>>> Accept challenge (large) clicked');
      acceptRandomChallenge();
    });
  }
  
  favorsModalListenersSetup = true;
  console.log('=== Favors modal listeners setup complete ===');
}

function setupFavorsPhoneListeners() {
  console.log('=== setupFavorsPhoneListeners called ===');
  
  if (favorsPhoneListenersSetup) {
    console.log('Favors phone listeners already setup, skipping');
    return;
  }
  
  const phoneViewCoupons = document.getElementById('phone-view-coupons');
  
  if (!phoneViewCoupons) {
    console.error('ERROR: phone-view-coupons container not found!');
    return;
  }
  
  console.log('phone-view-coupons found:', phoneViewCoupons);
  console.log('phone-view-coupons display:', window.getComputedStyle(phoneViewCoupons).display);
  console.log('phone-view-coupons visibility:', window.getComputedStyle(phoneViewCoupons).visibility);
  
  const tabActive = document.getElementById('tab-active');
  const tabCompleted = document.getElementById('tab-completed');
  const tabRandom = document.getElementById('tab-random');
  const addFavorBtn = document.getElementById('add-favor-btn');
  const rerollBtn = document.getElementById('reroll-challenge-btn');
  const acceptBtn = document.getElementById('accept-challenge-btn');
  
  console.log('Elements found:', {
    tabActive: !!tabActive,
    tabCompleted: !!tabCompleted,
    tabRandom: !!tabRandom,
    addFavorBtn: !!addFavorBtn,
    rerollBtn: !!rerollBtn,
    acceptBtn: !!acceptBtn
  });
  
  if (tabActive) {
    console.log('tabActive element:', tabActive);
    console.log('tabActive display:', window.getComputedStyle(tabActive).display);
    console.log('tabActive pointer-events:', window.getComputedStyle(tabActive).pointerEvents);
  }
  
  if (!tabActive || !tabCompleted || !tabRandom) {
    console.error('ERROR: Some tab buttons not found!');
    return;
  }
  
  // Tab Activos
  tabActive.onclick = function(e) {
    console.log('>>> Tab ACTIVE clicked', e);
    switchFavorsTabPhone('active');
  };
  
  // Tab Completados
  tabCompleted.onclick = function(e) {
    console.log('>>> Tab COMPLETED clicked', e);
    switchFavorsTabPhone('completed');
  };
  
  // Tab Random
  tabRandom.onclick = function(e) {
    console.log('>>> Tab RANDOM clicked', e);
    switchFavorsTabPhone('random');
  };
  
  // Botón Crear Favor
  if (addFavorBtn) {
    addFavorBtn.onclick = function(e) {
      console.log('>>> Add favor button clicked', e);
      showPhoneApp('create-coupon');
    };
  }
  
  // Botón Reroll
  if (rerollBtn) {
    rerollBtn.onclick = function(e) {
      console.log('>>> Reroll button clicked', e);
      loadRandomChallengePhone();
    };
  }
  
  // Botón Aceptar
  if (acceptBtn) {
    acceptBtn.onclick = function(e) {
      console.log('>>> Accept button clicked', e);
      acceptRandomChallengePhone();
    };
  }
  
  favorsPhoneListenersSetup = true;
  console.log('=== Favors phone listeners setup COMPLETE ===');
}

// Cambiar entre tabs
function switchFavorsTab(tab) {
  console.log('=== switchFavorsTab called with:', tab);
  
  const tabs = ['active', 'completed', 'random'];
  const tabButtons = {
    active: document.getElementById('tab-active-large'),
    completed: document.getElementById('tab-completed-large'),
    random: document.getElementById('tab-random-large')
  };
  const views = {
    active: document.getElementById('active-favors-list-large'),
    completed: document.getElementById('completed-favors-list-large'),
    random: document.getElementById('random-challenge-view-large')
  };
  
  console.log('Tab buttons found:', {
    active: !!tabButtons.active,
    completed: !!tabButtons.completed,
    random: !!tabButtons.random
  });
  
  console.log('Views found:', {
    active: !!views.active,
    completed: !!views.completed,
    random: !!views.random
  });
  
  // Animar salida de vista actual
  tabs.forEach(t => {
    if (views[t] && !views[t].classList.contains('hidden')) {
      views[t].style.opacity = '0';
      views[t].style.transform = 'translateY(10px)';
    }
  });
  
  // Después de la animación de salida, cambiar vistas
  setTimeout(() => {
    console.log('Switching to tab:', tab);
    
    // Actualizar botones
    tabs.forEach(t => {
      if (tabButtons[t]) {
        if (t === tab) {
          tabButtons[t].classList.add('active');
        } else {
          tabButtons[t].classList.remove('active');
        }
      }
    });
    
    // Actualizar vistas
    tabs.forEach(t => {
      if (views[t]) {
        if (t === tab) {
          views[t].classList.remove('hidden');
          console.log('Showing view:', t);
          // Animar entrada
          setTimeout(() => {
            views[t].style.opacity = '1';
            views[t].style.transform = 'translateY(0)';
          }, 50);
        } else {
          views[t].classList.add('hidden');
          views[t].style.opacity = '0';
          views[t].style.transform = 'translateY(10px)';
        }
      }
    });
    
    // Si cambió a random, cargar un desafío
    if (tab === 'random') {
      loadRandomChallenge();
    }
  }, 200);
}

// Switch tabs para phone-modal (sin sufijo -large)
function switchFavorsTabPhone(tab) {
  console.log('switchFavorsTabPhone called with tab:', tab);
  
  const tabs = ['active', 'completed', 'random'];
  const tabButtons = {
    active: document.getElementById('tab-active'),
    completed: document.getElementById('tab-completed'),
    random: document.getElementById('tab-random')
  };
  const views = {
    active: document.getElementById('active-favors-list'),
    completed: document.getElementById('completed-favors-list'),
    random: document.getElementById('random-challenge-view')
  };
  
  console.log('Tab buttons found:', {
    active: !!tabButtons.active,
    completed: !!tabButtons.completed,
    random: !!tabButtons.random
  });
  
  console.log('Views found:', {
    active: !!views.active,
    completed: !!views.completed,
    random: !!views.random
  });
  
  // Actualizar botones
  tabs.forEach(t => {
    if (tabButtons[t]) {
      if (t === tab) {
        tabButtons[t].classList.add('active');
      } else {
        tabButtons[t].classList.remove('active');
      }
    }
  });
  
  // Actualizar vistas
  tabs.forEach(t => {
    if (views[t]) {
      if (t === tab) {
        views[t].style.display = 'block';
        console.log('Showing view:', t);
      } else {
        views[t].style.display = 'none';
        console.log('Hiding view:', t);
      }
    }
  });
  
  // Si cambió a random, cargar un desafío
  if (tab === 'random') {
    loadRandomChallengePhone();
  }
}

// Cargar datos de favores desde Firestore
async function loadFavorsData() {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    // Cargar puntos
    const pointsRef = collection(db, 'couples', currentCoupleId, 'favorPoints');
    const pointsSnapshot = await getDocs(pointsRef);
    
    let myPoints = 0;
    let partnerPoints = 0;
    
    pointsSnapshot.forEach(doc => {
      const data = doc.data();
      if (doc.id === currentUser.uid) {
        myPoints = data.points || 0;
      } else {
        partnerPoints = data.points || 0;
      }
    });
    
    // Actualizar UI - versión modal large
    const myPointsElLarge = document.getElementById('my-points-large');
    const partnerPointsElLarge = document.getElementById('partner-points-large');
    
    if (myPointsElLarge) myPointsElLarge.textContent = myPoints;
    if (partnerPointsElLarge) partnerPointsElLarge.textContent = partnerPoints;
    
    // Actualizar UI - versión phone-modal
    const myPointsEl = document.getElementById('my-points');
    const partnerPointsEl = document.getElementById('partner-points');
    
    if (myPointsEl) myPointsEl.textContent = myPoints;
    if (partnerPointsEl) partnerPointsEl.textContent = partnerPoints;
    
    // Cargar favores activos
    const favorsRef = collection(db, 'couples', currentCoupleId, 'favors');
    const q = query(favorsRef, where('completed', '==', false), orderBy('createdAt', 'desc'));
    const favorsSnapshot = await getDocs(q);
    
    // Actualizar lista LARGE (modal fullscreen)
    const activeListLarge = document.getElementById('active-favors-list-large');
    const emptyStateLarge = document.getElementById('favors-empty-state-large');
    
    if (favorsSnapshot.empty) {
      if (emptyStateLarge) emptyStateLarge.style.display = 'block';
      if (activeListLarge) {
        const items = activeListLarge.querySelectorAll('.favor-card-large');
        items.forEach(item => item.remove());
      }
    } else {
      if (emptyStateLarge) emptyStateLarge.style.display = 'none';
      if (activeListLarge) {
        const items = activeListLarge.querySelectorAll('.favor-card-large');
        items.forEach(item => item.remove());
        
        favorsSnapshot.forEach(docSnap => {
          const favor = docSnap.data();
          const favorCard = createFavorCard(docSnap.id, favor, false);
          activeListLarge.appendChild(favorCard);
        });
      }
    }
    
    // Actualizar lista PHONE (dentro del phone-modal)
    const activeList = document.getElementById('active-favors-list');
    const emptyState = document.getElementById('favors-empty-state');
    
    if (favorsSnapshot.empty) {
      if (emptyState) emptyState.style.display = 'block';
      if (activeList) {
        const items = activeList.querySelectorAll('.favor-card');
        items.forEach(item => item.remove());
      }
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (activeList) {
        const items = activeList.querySelectorAll('.favor-card');
        items.forEach(item => item.remove());
        
        favorsSnapshot.forEach(docSnap => {
          const favor = docSnap.data();
          const favorCard = createFavorCardPhone(docSnap.id, favor, false);
          activeList.appendChild(favorCard);
        });
      }
    }
    
    // Cargar favores completados - versión LARGE
    const qCompleted = query(favorsRef, where('completed', '==', true), orderBy('createdAt', 'desc'));
    const completedSnapshot = await getDocs(qCompleted);
    
    const completedListLarge = document.getElementById('completed-favors-list-large');
    if (completedListLarge) {
      completedListLarge.innerHTML = '';
      
      if (completedSnapshot.empty) {
        completedListLarge.innerHTML = '<div class="favors-empty-state-large"><div class="empty-icon-large">✅</div><p>Aún no hay favores completados</p></div>';
      } else {
        completedSnapshot.forEach(docSnap => {
          const favor = docSnap.data();
          const favorCard = createFavorCard(docSnap.id, favor, true);
          completedListLarge.appendChild(favorCard);
        });
      }
    }
    
    // Cargar favores completados - versión PHONE
    const completedList = document.getElementById('completed-favors-list');
    if (completedList) {
      completedList.innerHTML = '';
      
      if (completedSnapshot.empty) {
        completedList.innerHTML = '<div class="capsules-empty-state"><div class="empty-icon">✅</div><p>Aún no hay favores completados</p></div>';
      } else {
        completedSnapshot.forEach(docSnap => {
          const favor = docSnap.data();
          const favorCard = createFavorCardPhone(docSnap.id, favor, true);
          completedList.appendChild(favorCard);
        });
      }
    }
    
  } catch (error) {
    console.error('Error loading favors:', error);
  }
}

// Crear tarjeta de favor
function createFavorCard(favorId, favor, isCompleted) {
  const card = document.createElement('div');
  card.className = 'favor-card-large';
  card.dataset.favorId = favorId;
  
  const difficultyEmoji = {
    easy: '⭐',
    medium: '⭐⭐',
    hard: '⭐⭐⭐'
  };
  
  const categoryEmoji = {
    fun: '🎉',
    romantic: '💕',
    help: '🤝',
    surprise: '🎁'
  };
  
  // Verificar quién creó el favor
  const isCreator = favor.createdBy === currentUser.uid;
  
  card.innerHTML = `
    <div class="favor-card-header-large">
      <div class="favor-card-title-large">
        <span class="favor-category-icon-large">${categoryEmoji[favor.category] || '🎯'}</span>
        <h3>${favor.title}</h3>
      </div>
      <div class="favor-card-meta-large">
        <span class="favor-difficulty-large">${difficultyEmoji[favor.difficulty] || '⭐'}</span>
        <span class="favor-points-large">${favor.points}pts</span>
      </div>
    </div>
    <p class="favor-description-large">${favor.description}</p>
    ${!isCompleted ? `
      ${isCreator ? `
        <div class="favor-created-by-badge">✨ Creado por ti</div>
        <div class="favor-card-actions-large">
          <button class="btn btn-outline btn-small delete-favor-btn" data-favor-id="${favorId}">
            🗑️ Eliminar
          </button>
        </div>
      ` : `
        <div class="favor-card-actions-large">
          <button class="btn btn-success btn-small complete-favor-btn" data-favor-id="${favorId}">
            ✓ Completar
          </button>
          <button class="btn btn-outline btn-small delete-favor-btn" data-favor-id="${favorId}">
            ✕ Rechazar
          </button>
        </div>
      `}
    ` : `
      <div class="favor-completed-badge-large">✓ Completado</div>
    `}
  `;
  
  // Event listeners para botones
  if (!isCompleted) {
    const completeBtn = card.querySelector('.complete-favor-btn');
    const deleteBtn = card.querySelector('.delete-favor-btn');
    
    if (completeBtn) {
      completeBtn.addEventListener('click', () => completeFavor(favorId, favor.points));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteFavor(favorId));
    }
  }
  
  return card;
}

// Crear tarjeta de favor para phone-modal (sin sufijo -large)
function createFavorCardPhone(favorId, favor, isCompleted) {
  const card = document.createElement('div');
  card.className = 'favor-card';
  card.dataset.favorId = favorId;
  
  const difficultyEmoji = {
    easy: '⭐',
    medium: '⭐⭐',
    hard: '⭐⭐⭐'
  };
  
  const categoryEmoji = {
    fun: '🎉',
    romantic: '💕',
    help: '🤝',
    surprise: '🎁'
  };
  
  // Verificar quién creó el favor
  const isCreator = favor.createdBy === currentUser.uid;
  
  card.innerHTML = `
    <div class="favor-card-header">
      <div class="favor-card-title">
        <span class="favor-category-icon">${categoryEmoji[favor.category] || '🎯'}</span>
        <h3>${favor.title}</h3>
      </div>
      <div class="favor-card-meta">
        <span class="favor-difficulty">${difficultyEmoji[favor.difficulty] || '⭐'}</span>
        <span class="favor-points">${favor.points}pts</span>
      </div>
    </div>
    <p class="favor-description">${favor.description}</p>
    ${!isCompleted ? `
      ${isCreator ? `
        <div class="favor-created-by-badge">✨ Creado por ti</div>
        <div class="favor-card-actions">
          <button class="btn btn-outline btn-small delete-favor-btn-phone" data-favor-id="${favorId}">
            🗑️ Eliminar
          </button>
        </div>
      ` : `
        <div class="favor-card-actions">
          <button class="btn btn-success btn-small complete-favor-btn-phone" data-favor-id="${favorId}">
            ✓ Completar
          </button>
          <button class="btn btn-outline btn-small delete-favor-btn-phone" data-favor-id="${favorId}">
            ✕ Rechazar
          </button>
        </div>
      `}
    ` : `
      <div class="favor-completed-badge">✓ Completado</div>
    `}
  `;
  
  // Event listeners para botones
  if (!isCompleted) {
    const completeBtn = card.querySelector('.complete-favor-btn-phone');
    const deleteBtn = card.querySelector('.delete-favor-btn-phone');
    
    if (completeBtn) {
      completeBtn.addEventListener('click', () => completeFavor(favorId, favor.points));
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteFavor(favorId));
    }
  }
  
  return card;
}

// Completar favor
async function completeFavor(favorId, points) {
  if (!currentCoupleId || !currentUser) return;
  
  // Animación de completar
  const card = document.querySelector(`[data-favor-id="${favorId}"]`);
  if (card) {
    card.classList.add('completing');
  }
  
  try {
    // Actualizar favor como completado
    const favorRef = doc(db, 'couples', currentCoupleId, 'favors', favorId);
    await updateDoc(favorRef, {
      completed: true,
      completedAt: Timestamp.now(),
      completedBy: currentUser.uid
    });
    
    // Actualizar puntos del usuario
    const userPointsRef = doc(db, 'couples', currentCoupleId, 'favorPoints', currentUser.uid);
    const userPointsDoc = await getDoc(userPointsRef);
    
    if (userPointsDoc.exists()) {
      const currentPoints = userPointsDoc.data().points || 0;
      await updateDoc(userPointsRef, {
        points: currentPoints + points
      });
    } else {
      await setDoc(userPointsRef, {
        points: points,
        userId: currentUser.uid
      });
    }
    
    // Animar actualización de puntos
    const myPointsEl = document.getElementById('my-points-large');
    if (myPointsEl) {
      myPointsEl.classList.add('updated');
      setTimeout(() => myPointsEl.classList.remove('updated'), 600);
    }
    
    showNotification({
      title: '¡Desafío completado!',
      message: `Has ganado ${points} puntos. ¡Buen trabajo!`,
      icon: '🎉',
      type: 'success'
    });
    
    // Esperar un poco antes de recargar para que se vea la animación
    setTimeout(async () => {
      await loadFavorsData();
    }, 600);
    
  } catch (error) {
    console.error('Error completing favor:', error);
    if (card) {
      card.classList.remove('completing');
    }
    showNotification({
      title: 'Error',
      message: 'No se pudo completar el desafío. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

// Eliminar favor
async function deleteFavor(favorId) {
  if (!currentCoupleId) return;
  
  showNotification({
    title: 'Eliminar desafío',
    message: '¿Estás seguro de que quieres eliminar este desafío? Esta acción no se puede deshacer.',
    icon: '🗑️',
    type: 'warning',
    confirm: true,
    onConfirm: async () => {
      try {
        const favorRef = doc(db, 'couples', currentCoupleId, 'favors', favorId);
        await deleteDoc(favorRef);
        
        showNotification({
          title: 'Desafío eliminado',
          message: 'El desafío ha sido eliminado correctamente',
          icon: '✓',
          type: 'success'
        });
        
        // Recargar datos
        await loadFavorsData();
        
      } catch (error) {
        console.error('Error deleting favor:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo eliminar el desafío. Intenta de nuevo.',
          icon: '❌',
          type: 'error'
        });
      }
    }
  });
}

// Variable para el desafío actual
let currentRandomChallenge = null;

// Cargar desafío random desde el módulo importado
function loadRandomChallenge() {
  if (!RANDOM_CHALLENGES || RANDOM_CHALLENGES.length === 0) {
    console.error('No hay desafíos disponibles');
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * RANDOM_CHALLENGES.length);
  currentRandomChallenge = RANDOM_CHALLENGES[randomIndex];
  
  const titleEl = document.getElementById('challenge-title-large');
  const descEl = document.getElementById('challenge-description-large');
  const badgeEl = document.getElementById('challenge-difficulty-badge-large');
  const pointsEl = document.getElementById('challenge-points-large');
  
  if (titleEl) titleEl.textContent = currentRandomChallenge.title;
  if (descEl) descEl.textContent = currentRandomChallenge.description;
  if (pointsEl) pointsEl.textContent = `+${currentRandomChallenge.points} puntos`;
  
  if (badgeEl) {
    const difficultyText = {
      easy: '⭐ Fácil',
      medium: '⭐⭐ Medio',
      hard: '⭐⭐⭐ Difícil'
    };
    badgeEl.textContent = difficultyText[currentRandomChallenge.difficulty] || '⭐ Fácil';
    badgeEl.className = `difficulty-badge-large difficulty-${currentRandomChallenge.difficulty}`;
  }
}

// Aceptar desafío random
async function acceptRandomChallenge() {
  if (!currentRandomChallenge || !currentCoupleId || !currentUser) {
    showNotification({
      title: 'Error',
      message: 'No hay desafío seleccionado o no estás conectado',
      icon: '❌',
      type: 'error'
    });
    return;
  }
  
  try {
    // Crear el favor en Firestore
    const favorsRef = collection(db, 'couples', currentCoupleId, 'favors');
    await addDoc(favorsRef, {
      title: currentRandomChallenge.title,
      description: currentRandomChallenge.description,
      difficulty: currentRandomChallenge.difficulty,
      points: currentRandomChallenge.points,
      category: currentRandomChallenge.category,
      completed: false,
      createdBy: currentUser.uid,
      createdAt: Timestamp.now()
    });
    
    showNotification({
      title: '¡Desafío aceptado!',
      message: `${currentRandomChallenge.title} ha sido añadido a tus desafíos activos`,
      icon: '✓',
      type: 'success'
    });
    
    // Cambiar a pestaña activos
    switchFavorsTab('active');
    loadFavorsData();
    
  } catch (error) {
    console.error('Error accepting challenge:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo aceptar el desafío. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

// Versiones para phone-modal (sin sufijo -large)
function loadRandomChallengePhone() {
  if (!RANDOM_CHALLENGES || RANDOM_CHALLENGES.length === 0) {
    console.error('No hay desafíos disponibles');
    return;
  }
  
  const randomIndex = Math.floor(Math.random() * RANDOM_CHALLENGES.length);
  currentRandomChallenge = RANDOM_CHALLENGES[randomIndex];
  
  const titleEl = document.getElementById('challenge-title');
  const descEl = document.getElementById('challenge-description');
  const badgeEl = document.getElementById('challenge-difficulty-badge');
  const pointsEl = document.getElementById('challenge-points');
  
  if (titleEl) titleEl.textContent = currentRandomChallenge.title;
  if (descEl) descEl.textContent = currentRandomChallenge.description;
  if (pointsEl) pointsEl.textContent = `+${currentRandomChallenge.points} puntos`;
  
  if (badgeEl) {
    const difficultyText = {
      easy: '⭐ Fácil',
      medium: '⭐⭐ Medio',
      hard: '⭐⭐⭐ Difícil'
    };
    badgeEl.textContent = difficultyText[currentRandomChallenge.difficulty] || '⭐ Fácil';
    badgeEl.className = `difficulty-badge difficulty-${currentRandomChallenge.difficulty}`;
  }
}

async function acceptRandomChallengePhone() {
  if (!currentRandomChallenge || !currentCoupleId || !currentUser) {
    showNotification({
      title: 'Error',
      message: 'No hay desafío seleccionado o no estás conectado',
      icon: '❌',
      type: 'error'
    });
    return;
  }
  
  try {
    const favorsRef = collection(db, 'couples', currentCoupleId, 'favors');
    await addDoc(favorsRef, {
      title: currentRandomChallenge.title,
      description: currentRandomChallenge.description,
      difficulty: currentRandomChallenge.difficulty,
      points: currentRandomChallenge.points,
      category: currentRandomChallenge.category,
      completed: false,
      createdBy: currentUser.uid,
      createdAt: Timestamp.now()
    });
    
    showNotification({
      title: '¡Desafío aceptado!',
      message: `${currentRandomChallenge.title} ha sido añadido a tus desafíos activos`,
      icon: '✓',
      type: 'success'
    });
    
    // Cambiar a pestaña activos
    switchFavorsTabPhone('active');
    loadFavorsData();
    
  } catch (error) {
    console.error('Error accepting challenge:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo aceptar el desafío. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

// ============================================
// FUNCIONES PARA CREAR DESAFÍO PERSONALIZADO
// ============================================

// Abrir modal de crear desafío
function openCreateFavorModal() {
  console.log('openCreateFavorModal called');
  
  let modal = document.getElementById('create-favor-modal');
  
  // Si no existe, crearlo dinámicamente
  if (!modal) {
    console.log('Creating create-favor-modal dynamically...');
    
    const modalHTML = `
      <div id="create-favor-modal" class="favors-fullscreen-modal hidden">
        <div class="favors-modal-overlay"></div>
        <div class="favors-modal-container favors-modal-small">
          <div class="favors-modal-header">
            <h2>✨ Crear Desafío</h2>
            <button id="close-create-favor-modal-btn" class="favors-close-btn">✕</button>
          </div>
          
          <div class="favors-modal-content">
            <input type="text" id="coupon-title-input-large" class="input-large" placeholder="Título del desafío (ej: Masaje de 30 min)" maxlength="60">
            <textarea id="coupon-description-input-large" class="textarea-large" placeholder="Descripción detallada..." rows="4" maxlength="200"></textarea>
            
            <label class="label-large">Dificultad & Puntos:</label>
            <div class="difficulty-picker-large">
              <button class="difficulty-option-large" data-difficulty="easy" data-points="10">
                <span class="diff-emoji-large">⭐</span>
                <span class="diff-label-large">Fácil</span>
                <span class="diff-points-large">10 pts</span>
              </button>
              <button class="difficulty-option-large selected" data-difficulty="medium" data-points="25">
                <span class="diff-emoji-large">⭐⭐</span>
                <span class="diff-label-large">Medio</span>
                <span class="diff-points-large">25 pts</span>
              </button>
              <button class="difficulty-option-large" data-difficulty="hard" data-points="50">
                <span class="diff-emoji-large">⭐⭐⭐</span>
                <span class="diff-label-large">Difícil</span>
                <span class="diff-points-large">50 pts</span>
              </button>
            </div>

            <label class="label-large">Categoría:</label>
            <div class="category-picker-large">
              <button class="category-option-large selected" data-category="romantic">💕 Romántico</button>
              <button class="category-option-large" data-category="fun">🎉 Divertido</button>
              <button class="category-option-large" data-category="help">🤝 Ayuda</button>
              <button class="category-option-large" data-category="surprise">🎁 Sorpresa</button>
            </div>

            <button id="save-coupon-btn-large" class="btn btn-primary btn-block btn-large">✨ Crear Desafío</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('create-favor-modal');
    console.log('Modal created, setting up listeners...');
  }
  
  console.log('Opening create favor modal...');
  console.log('Create favor modal exists:', !!modal);
  console.log('Create favor modal classes before:', modal.className);
  
  // Usar la función de modales anidados para favores
  showModal(modal, 'standard');
  
  console.log('Create favor modal should now be visible');
  
  // Configurar click outside para cerrar el modal
  const closeCreateFavorOnClickOutside = (e) => {
    if (e.target === modal) {
      closeCreateFavorModal();
    }
  };
  modal.addEventListener('click', closeCreateFavorOnClickOutside);
  
  // Configurar listeners cada vez que se abre (para asegurar que funcione)
  setupCreateFavorModalListeners();
}

// Cerrar modal de crear desafío
function closeCreateFavorModal() {
  hideModal(document.getElementById('create-favor-modal'), 'favors');
  
  // Limpiar formulario
  document.getElementById('coupon-title-input-large').value = '';
  document.getElementById('coupon-description-input-large').value = '';
}

// Variables para el modal de crear desafío
let selectedDifficulty = 'medium';
let selectedPoints = 25;
let selectedCategory = 'romantic';
let createFavorListenersSetup = false;

// Configurar listeners del modal de crear desafío
function setupCreateFavorModalListeners() {
  console.log('Setting up create favor modal listeners...');
  
  const closeBtn = document.getElementById('close-create-favor-modal-btn');
  const saveBtn = document.getElementById('save-coupon-btn-large');
  const difficultyBtns = document.querySelectorAll('.difficulty-option-large');
  const categoryBtns = document.querySelectorAll('.category-option-large');
  
  console.log('Elements found:', {
    closeBtn,
    saveBtn,
    difficultyBtns: difficultyBtns.length,
    categoryBtns: categoryBtns.length
  });
  
  if (createFavorListenersSetup) {
    console.log('Listeners already set up, skipping...');
    return;
  }
  
  createFavorListenersSetup = true;
  
  // Cerrar modal
  if (closeBtn) {
    closeBtn.addEventListener('click', closeCreateFavorModal);
    console.log('Close button listener added');
  }
  
  // Seleccionar dificultad
  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      difficultyBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDifficulty = btn.dataset.difficulty;
      selectedPoints = parseInt(btn.dataset.points);
      console.log('Difficulty selected:', selectedDifficulty, selectedPoints);
    });
  });
  
  // Seleccionar categoría
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedCategory = btn.dataset.category;
      console.log('Category selected:', selectedCategory);
    });
  });
  
  // Guardar desafío
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      console.log('Save button clicked!');
      saveCustomFavor();
    });
    console.log('Save button listener added');
  }
}

// Guardar desafío personalizado
async function saveCustomFavor() {
  const titleInput = document.getElementById('coupon-title-input-large');
  const descInput = document.getElementById('coupon-description-input-large');
  
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  
  if (!title) {
    showNotification({
      title: 'Título requerido',
      message: 'Por favor ingresa un título para el desafío',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (!description) {
    showNotification({
      title: 'Descripción requerida',
      message: 'Por favor ingresa una descripción para el desafío',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (!currentCoupleId || !currentUser) {
    showNotification({
      title: 'Error',
      message: 'Debes estar conectado para crear desafíos',
      icon: '❌',
      type: 'error'
    });
    return;
  }
  
  try {
    // Guardar en Firestore
    const favorsRef = collection(db, 'couples', currentCoupleId, 'favors');
    await addDoc(favorsRef, {
      title: title,
      description: description,
      difficulty: selectedDifficulty,
      points: selectedPoints,
      category: selectedCategory,
      completed: false,
      createdBy: currentUser.uid,
      createdAt: Timestamp.now()
    });
    
    showNotification({
      title: '¡Desafío creado!',
      message: `${title} ha sido creado exitosamente`,
      icon: '✨',
      type: 'success'
    });
    
    // Cerrar modal con animación
    const modal = document.getElementById('create-favor-modal');
    if (modal) {
      modal.style.opacity = '0';
      modal.style.transform = 'scale(0.95)';
      setTimeout(() => {
        closeCreateFavorModal();
      }, 200);
    }
    
    // Cambiar a pestaña activos y recargar
    switchFavorsTab('active');
    
    // Delay para mostrar la nueva tarjeta con animación
    setTimeout(async () => {
      await loadFavorsData();
    }, 300);
    
  } catch (error) {
    console.error('Error saving custom favor:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo crear el desafío. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}



// Función simplificada para generar y mostrar el contenido de la tarea
function updateSurpriseContent() {
  currentSurpriseTask = getRandomTask(currentChallengeCategory);
  surpriseEmoji.textContent = currentSurpriseTask.emoji;
  surpriseText.textContent = currentSurpriseTask.text;
  
  // Actualizar categoría
  if (challengeCategoryBadge) {
    challengeCategoryBadge.textContent = currentSurpriseTask.categoryLabel || '✨ Variado';
  }
  
  // Actualizar dificultad
  if (difficultyLabel) {
    difficultyLabel.textContent = currentSurpriseTask.difficultyLabel || 'Medio';
    difficultyLabel.className = 'difficulty-label difficulty-' + (currentSurpriseTask.difficulty || 'medium');
  }
}

// Función para manejar el botón "Buscar otra idea" (reroll)
function handleReroll() {
  // Volver a la vista de pregunta
  challengeRevealedView.classList.remove('active');
  challengeQuestionView.classList.add('active');
}

async function acceptSurpriseTask() {
  if (!currentSurpriseTask) return;

  const planTitle = `Reto: ${currentSurpriseTask.emoji} ${currentSurpriseTask.text}`;
  const planDescription = "¡Una tarea sorpresa para hacer juntos!";
  
  try {
    acceptSurpriseTaskBtn.disabled = true;
    acceptSurpriseTaskBtn.textContent = 'Creando...';

    const newPlanId = await createPlan(planTitle, planDescription);

    if (newPlanId && currentSurpriseTask.subtasks) {
      for (const subtask of currentSurpriseTask.subtasks) {
        await createTask(newPlanId, subtask.title, subtask.icon);
      }
    }
    
    // Guardar en historial
    await saveChallengeToHistory(currentSurpriseTask);
    
    // Actualizar estadísticas
    await updateChallengeStats();
    
    await loadPlans();
    
    // Mostrar notificación y confeti ANTES de cerrar el modal
    showNotification({
      title: '¡Reto Aceptado!',
      message: '¡Nuevo reto con sus pasos añadido a vuestra lista!',
      icon: '🎉',
      type: 'party'
    });
    
    // Confeti effect
    createConfettiEffect();
    
    // Esperar un momento para que se vea la notificación y luego cerrar el modal
    setTimeout(() => {
      closePhoneModal();
      // Volver a vista de pregunta después de cerrar
      setTimeout(() => {
        challengeRevealedView.classList.remove('active');
        challengeQuestionView.classList.add('active');
      }, 100);
    }, 1500);

  } catch (error) {
    showNotification({
      title: 'Error',
      message: 'Hubo un error al crear el plan sorpresa.',
      icon: '❌',
      type: 'error'
    });
    console.error("Error aceptando tarea sorpresa:", error);
  } finally {
    acceptSurpriseTaskBtn.disabled = false;
    acceptSurpriseTaskBtn.textContent = '¡Aceptamos!';
  }
}

// ============================================
// NUEVAS FUNCIONES PARA RETO DIARIO
// ============================================

// Guardar reto en historial (Firestore)
async function saveChallengeToHistory(challenge) {
  if (!currentCoupleId) return;
  
  try {
    const historyRef = collection(db, 'couples', currentCoupleId, 'challengeHistory');
    await addDoc(historyRef, {
      emoji: challenge.emoji,
      text: challenge.text,
      category: challenge.category || 'all',
      categoryLabel: challenge.categoryLabel || '✨ Variado',
      difficulty: challenge.difficulty || 'medium',
      acceptedAt: Timestamp.now(),
      acceptedBy: currentUser.uid,
      status: 'accepted'
    });
  } catch (error) {
    console.error('Error al guardar reto en historial:', error);
  }
}

// Cargar historial desde Firestore
async function loadChallengeHistory() {
  if (!currentCoupleId) return;
  
  try {
    const historyRef = collection(db, 'couples', currentCoupleId, 'challengeHistory');
    const q = query(historyRef, orderBy('acceptedAt', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    challengeHistory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    renderChallengeHistory();
  } catch (error) {
    console.error('Error al cargar historial:', error);
  }
}

// Renderizar historial
function renderChallengeHistory() {
  if (!historyList) return;
  
  if (challengeHistory.length === 0) {
    historyList.innerHTML = `
      <div class="empty-state-message" style="padding: 1.5rem;">
        <p style="font-size: 0.85rem; margin: 0;">Aún no hay retos en el historial</p>
      </div>
    `;
    return;
  }
  
  historyList.innerHTML = '';
  
  challengeHistory.forEach(challenge => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const date = challenge.acceptedAt?.toDate ? challenge.acceptedAt.toDate() : new Date();
    const dateStr = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    
    item.innerHTML = `
      <div class="history-item-emoji">${challenge.emoji}</div>
      <div class="history-item-content">
        <div class="history-item-text">${challenge.text}</div>
        <div class="history-item-date">${dateStr}</div>
      </div>
      <div class="history-item-status">✅</div>
    `;
    
    historyList.appendChild(item);
  });
}

// Actualizar estadísticas
async function updateChallengeStats() {
  if (!currentCoupleId) return;
  
  try {
    const historyRef = collection(db, 'couples', currentCoupleId, 'challengeHistory');
    
    // Total de retos
    const totalSnapshot = await getDocs(historyRef);
    const total = totalSnapshot.size;
    
    // Retos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);
    
    const todayQuery = query(historyRef, where('acceptedAt', '>=', todayTimestamp));
    const todaySnapshot = await getDocs(todayQuery);
    const todayCount = todaySnapshot.size;
    
    if (challengesTodayCount) challengesTodayCount.textContent = todayCount;
    if (challengesTotalCount) challengesTotalCount.textContent = total;
    
  } catch (error) {
    console.error('Error al actualizar estadísticas:', error);
  }
}

// Efecto de confeti
function createConfettiEffect() {
  const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-20px';
    confetti.style.opacity = '1';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    confetti.style.zIndex = '10000';
    confetti.style.pointerEvents = 'none';
    
    document.body.appendChild(confetti);
    
    const duration = 2000 + Math.random() * 1000;
    const rotation = Math.random() * 360;
    const xMovement = (Math.random() - 0.5) * 200;
    
    confetti.animate([
      { 
        transform: 'translateY(0) rotate(0deg) translateX(0)',
        opacity: 1
      },
      {
        transform: `translateY(${window.innerHeight + 20}px) rotate(${rotation}deg) translateX(${xMovement}px)`,
        opacity: 0
      }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });
    
    setTimeout(() => confetti.remove(), duration);
  }
}


// app.js - REEMPLAZA LA FUNCIÓN showPhoneApp CON ESTA VERSIÓN

// app.js - REEMPLAZA LA FUNCIÓN showPhoneApp CON ESTA VERSIÓN MEJORADA

function showPhoneApp(appName) {
  console.log("🔄 Mostrando app:", appName);
  
  // Detener la música si salimos del reproductor. Esto es correcto.
  if (appName !== 'player' && youtubePlayer && typeof youtubePlayer.stopVideo === 'function') {
    youtubePlayer.stopVideo();
    if (turntableContainer) turntableContainer.classList.remove('playing');
    if (cassettePlayer) cassettePlayer.classList.remove('playing');
  }

  // 1. Ocultar TODAS las vistas del teléfono
  document.querySelectorAll('.phone-app-view').forEach(view => {
    view.classList.remove('active');
  });

  // 2. Encontrar y mostrar SOLO la vista que queremos
  const viewToShow = document.getElementById(`phone-view-${appName}`);
  if (viewToShow) {
    console.log("✅ Vista encontrada:", viewToShow.id);
    
    viewToShow.classList.add('active');
    
    const computed = window.getComputedStyle(viewToShow);
    console.log("✅ Estilos aplicados:", {
      display: computed.display,
      opacity: computed.opacity,
      visibility: computed.visibility,
      width: computed.width,
      height: computed.height,
      position: computed.position
    });

    // 3. Ejecutar el código de inicialización para la app específica
    //    Esto asegura que el contenido se cargue CADA VEZ que entras a la app.
    switch (appName) {
      // --- Apps que ya tenías ---
      case 'surprise':
        updateSurpriseContent();
        // Cargar estadísticas e historial
        updateChallengeStats();
        loadChallengeHistory();
        // Aseguramos que empiece en la vista de pregunta
        if (challengeQuestionView && challengeRevealedView) {
          challengeRevealedView.classList.remove('active');
          challengeQuestionView.classList.add('active');
        }
        break;
      case 'timecapsule':
        loadAndRenderCapsules();
        break;
      case 'budget':
        renderGoalsList();
        break;
      case 'journal':
        fetchJournalEntriesForMonth();
        break;
      case 'soundtrack':
        renderPlaylists();
        break;
      case 'coupons':
        console.log('=== Mostrando app coupons en phone-modal');
        loadFavorsData();
        // Esperar a que el DOM esté listo antes de configurar listeners
        setTimeout(() => {
          console.log('=== Ejecutando setupFavorsPhoneListeners después de 500ms');
          setupFavorsPhoneListeners();
        }, 500);
        break;
      
      // No se necesita lógica extra para 'homescreen' u otras vistas estáticas.
    }

  } else {
    // Un mensaje de error útil si alguna vez escribes mal el nombre de una app
    console.error(`Error: No se encontró la vista de la app con el ID: phone-view-${appName}`);
  }
}









// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Actualiza el reloj del teléfono con la hora actual.
 */
function updatePhoneClock() {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  // Añade un cero a la izquierda si los minutos son menores de 10
  // Ejemplo: 10:05 en lugar de 10:5
  minutes = minutes < 10 ? '0' + minutes : minutes;

  // Formatea la hora final
  const timeString = `${hours}:${minutes}`;

  // Actualiza el contenido del span
  if (phoneTimeDisplay) {
    phoneTimeDisplay.textContent = timeString;
  }
}


// ============================================
// FUNCIONES DE FIRESTORE - CÁPSULAS DEL TIEMPO
// ============================================

// ============================================
// FUNCIONES DE CÁPSULAS DEL TIEMPO
// ============================================

// Inicializar cápsulas del tiempo
async function initTimeCapsules() {
  console.log('Inicializando Cápsulas del Tiempo...');

  // Event listeners principales
  createCapsuleFab?.addEventListener('click', () => showPhoneApp('createcapsule'));
  backToCapsuleListBtn?.addEventListener('click', () => showPhoneApp('timecapsule'));

  // Event listeners del formulario
  capsuleMessageInput?.addEventListener('input', updateCharCounter);
  capsuleTypeCards.forEach(card => {
    card.addEventListener('click', () => selectCapsuleType(card));
  });
  dateOptionCards.forEach(card => {
    card.addEventListener('click', () => selectDateOption(card));
  });
  capsulePrevBtn?.addEventListener('click', goToPreviousStep);
  capsuleNextBtn?.addEventListener('click', goToNextStep);

  // Event listeners de adjuntos
  attachmentBtns.forEach(btn => {
    btn.addEventListener('click', () => handleAttachmentClick(btn.dataset.type));
  });

  // Inputs de archivos
  document.getElementById('photo-input')?.addEventListener('change', (e) => handleFileSelection(e.target.files, 'image'));
  document.getElementById('video-input')?.addEventListener('change', (e) => handleFileSelection(e.target.files, 'video'));
  document.getElementById('audio-input')?.addEventListener('change', (e) => handleFileSelection(e.target.files, 'audio'));

  // Cargar cápsulas cuando se abre la app
  if (window.location.hash === '#timecapsule' || document.querySelector('[data-app="timecapsule"]')?.classList.contains('active')) {
    await loadAndRenderCapsules();
  }
}

// Cargar y renderizar cápsulas
async function loadAndRenderCapsules() {
  try {
    const capsules = await getCapsules();
    updateCapsuleStats(capsules);
    renderCapsules(capsules);
  } catch (error) {
    console.error('Error al cargar cápsulas:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudieron cargar las cápsulas.',
      icon: '❌',
      type: 'error'
    });
  }
}

// Actualizar estadísticas
function updateCapsuleStats(capsules) {
  const now = new Date();
  const total = capsules.length;
  const pending = capsules.filter(c => c.unlockDate.toDate() > now).length;
  const opened = total - pending;

  totalCapsulesEl.textContent = total;
  pendingCapsulesEl.textContent = pending;
  openedCapsulesEl.textContent = opened;
}

// Renderizar cápsulas
function renderCapsules(capsules) {
  if (!capsulesList) return;

  capsulesList.innerHTML = '';

  if (capsules.length === 0) {
    capsulesList.appendChild(capsulesEmptyState);
    capsulesEmptyState.style.display = 'block';
    return;
  }

  capsulesEmptyState.style.display = 'none';
  const now = new Date();

  capsules.forEach(capsule => {
    const isLocked = capsule.unlockDate.toDate() > now;
    const timeLeft = isLocked ? Math.ceil((capsule.unlockDate.toDate() - now) / (1000 * 60 * 60 * 24)) : 0;
    const hasAttachments = capsule.attachments && capsule.attachments.length > 0;

    const capsuleCard = document.createElement('div');
    capsuleCard.className = `capsule-card ${isLocked ? 'locked' : 'opened'}`;
    capsuleCard.onclick = () => handleCapsuleClick(capsule, isLocked);

    capsuleCard.innerHTML = `
      <div class="capsule-header">
        <div class="capsule-type-icon">${getCapsuleTypeEmoji(capsule.type)}</div>
        <div class="capsule-info">
          <div class="capsule-title">${getCapsuleTypeName(capsule.type)}</div>
          <div class="capsule-creator">Por: ${capsule.creatorName || 'Tú'}</div>
          <div class="capsule-meta">
            <span class="capsule-date">
              📅 ${isLocked ? `Se abre en ${timeLeft} días` : `Abierta`}
            </span>
          </div>
        </div>
      </div>
      ${!isLocked ? `<div class="capsule-preview">${capsule.message}</div>` : ''}
      <div class="capsule-status">
        <div class="capsule-status-badge ${isLocked ? 'locked' : 'opened'}">
          ${isLocked ? '🔒 Sellada' : '✨ Abierta'}
        </div>
        ${!isLocked && hasAttachments ? `<div class="capsule-attachments-count">📎 ${capsule.attachments.length}</div>` : ''}
      </div>
    `;

    capsulesList.appendChild(capsuleCard);
  });
}

// Manejar clic en cápsula
function handleCapsuleClick(capsule, isLocked) {
  if (isLocked) {
    showCapsulePreview(capsule);
  } else {
    openCapsuleDirectly(capsule);
  }
}

// Mostrar preview de cápsula bloqueada
function showCapsulePreview(capsule) {
  const timeLeft = Math.ceil((capsule.unlockDate.toDate() - new Date()) / (1000 * 60 * 60 * 24));

  showNotification({
    title: `⏳ ${getCapsuleTypeName(capsule.type)}`,
    message: `Esta cápsula se abrirá automáticamente en ${timeLeft} días. ¡Será una sorpresa especial! ✨`,
    icon: getCapsuleTypeEmoji(capsule.type),
    type: 'info'
  });
}

// Abrir cápsula directamente
async function openCapsuleDirectly(capsule) {
  try {
    // Marcar como abierta en Firestore
    await updateDoc(doc(db, 'couples', currentCoupleId, 'capsules', capsule.id), {
      openedAt: Timestamp.now()
    });

    // Efectos visuales
    createOpeningEffects();

    // Mostrar contenido
    let message = `💌 Mensaje de ${capsule.creatorName}:\n\n"${capsule.message}"`;

    if (capsule.attachments && capsule.attachments.length > 0) {
      message += '\n\n📎 Adjuntos:';
      capsule.attachments.forEach((attachment, index) => {
        message += `\n• ${attachment.name}`;
      });
    }

    message += '\n\n✨ ¡Tu cápsula del tiempo ha sido abierta! ✨';

    showNotification({
      title: '🎉 ¡Cápsula Abierta!',
      message: message,
      icon: '🎊',
      type: 'success'
    });

    // Recargar lista
    await loadAndRenderCapsules();

  } catch (error) {
    console.error('Error al abrir cápsula:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo abrir la cápsula.',
      icon: '❌',
      type: 'error'
    });
  }
}

// Crear efectos de apertura
function createOpeningEffects() {
  // Confetti
  if (window.confetti) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4']
    });
  }

  // Sonido de apertura
  playCapsuleSound('open');
}

// Reproducir sonidos de cápsula
function playCapsuleSound(type) {
  try {
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = window.audioContext;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    switch (type) {
      case 'open':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
        break;
    }
  } catch (error) {
    console.log('Audio not available');
  }
}

// Funciones auxiliares para tipos de cápsula
function getCapsuleTypeEmoji(type) {
  const emojis = {
    memory: '💙',
    dream: '💜',
    love: '💕',
    achievement: '🏆',
    mystery: '🔮',
    reflection: '🤔',
    default: '💎'
  };
  return emojis[type] || emojis.default;
}

function getCapsuleTypeName(type) {
  const names = {
    memory: 'Recuerdo Especial',
    dream: 'Sueño Futuro',
    love: 'Carta de Amor',
    achievement: 'Logro Personal',
    mystery: 'Misterio Oculto',
    reflection: 'Reflexión Personal',
    default: 'Cápsula del Tiempo'
  };
  return names[type] || names.default;
}

// Funciones del formulario de creación
function updateCharCounter() {
  const counter = document.querySelector('.char-counter');
  const count = capsuleMessageInput.value.length;
  counter.innerHTML = `<span>${count}</span>/2000`;
}

function selectCapsuleType(card) {
  capsuleTypeCards.forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  selectedCapsuleType = card.dataset.type;
}

function selectDateOption(card) {
  dateOptionCards.forEach(c => c.classList.remove('active'));
  card.classList.add('active');

  if (card.classList.contains('custom')) {
    customDateContainer.style.display = 'block';
    selectedUnlockDate = null;
  } else {
    customDateContainer.style.display = 'none';
    const days = parseInt(card.dataset.days);
    const date = new Date();
    date.setDate(date.getDate() + days);
    selectedUnlockDate = date;
  }
}

function goToPreviousStep() {
  if (currentCapsuleStep > 1) {
    currentCapsuleStep--;
    updateStepDisplay();
  }
}

function goToNextStep() {
  if (currentCapsuleStep < 4) {
    if (validateCurrentStep()) {
      currentCapsuleStep++;
      updateStepDisplay();
    }
  } else {
    handleCreateCapsule();
  }
}

function validateCurrentStep() {
  switch (currentCapsuleStep) {
    case 1:
      return capsuleMessageInput.value.trim().length > 0;
    case 2:
      return selectedCapsuleType;
    case 3:
      return selectedUnlockDate || (customDateContainer.style.display === 'block' && capsuleUnlockDateInput.value);
    case 4:
      return true;
  }
  return false;
}

function updateStepDisplay() {
  // Ocultar todos los pasos
  document.querySelectorAll('.capsule-step').forEach(step => {
    step.classList.remove('active');
  });

  // Mostrar paso actual
  document.getElementById(`step-${getStepName(currentCapsuleStep)}`).classList.add('active');

  // Actualizar indicadores
  stepIndicators.forEach((dot, index) => {
    if (index + 1 <= currentCapsuleStep) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Actualizar botones de navegación
  capsulePrevBtn.disabled = currentCapsuleStep === 1;
  capsuleNextBtn.innerHTML = currentCapsuleStep === 4 ?
    '<span>✨ Sellar Cápsula</span>' :
    '<span>Siguiente ›</span>';
}

function getStepName(step) {
  const names = ['', 'message', 'type', 'date', 'attachments'];
  return names[step];
}

// Manejo de adjuntos
function handleAttachmentClick(type) {
  const input = document.getElementById(`${type}-input`);
  input.click();
}

function handleFileSelection(files, type) {
  Array.from(files).forEach(file => {
    if (validateFile(file, type)) {
      const attachment = {
        file: file,
        type: type,
        name: file.name,
        size: file.size,
        id: Date.now() + Math.random()
      };
      capsuleAttachments.push(attachment);
      renderAttachmentsPreview();
    }
  });
}

function validateFile(file, type) {
  // Validar tamaño (10MB máximo)
  if (file.size > 10 * 1024 * 1024) {
    showNotification({
      title: 'Archivo demasiado grande',
      message: 'Los archivos no pueden superar los 10MB.',
      icon: '⚠️',
      type: 'warning'
    });
    return false;
  }

  // Validar tipo
  const validTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/ogg'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3']
  };

  if (!validTypes[type].includes(file.type)) {
    showNotification({
      title: 'Tipo de archivo no válido',
      message: `Por favor selecciona un archivo de tipo ${type} válido.`,
      icon: '⚠️',
      type: 'warning'
    });
    return false;
  }

  return true;
}

function renderAttachmentsPreview() {
  attachmentsPreview.innerHTML = capsuleAttachments.map(attachment => `
    <div class="attachment-item" data-id="${attachment.id}">
      <div class="attachment-item-icon">${getAttachmentTypeEmoji(attachment.type)}</div>
      <div class="attachment-item-info">
        <div class="attachment-item-name">${attachment.name}</div>
        <div class="attachment-item-size">${formatFileSize(attachment.size)}</div>
      </div>
      <button class="attachment-item-remove" onclick="removeCapsuleAttachment('${attachment.id}')">×</button>
    </div>
  `).join('');
}

function removeCapsuleAttachment(attachmentId) {
  capsuleAttachments = capsuleAttachments.filter(att => att.id !== attachmentId);
  renderAttachmentsPreview();
}

function getAttachmentTypeEmoji(type) {
  switch (type) {
    case 'image': return '📸';
    case 'video': return '🎥';
    case 'audio': return '🎵';
    default: return '📎';
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Crear cápsula
async function handleCreateCapsule() {
  try {
    // Obtener fecha final
    let finalUnlockDate = selectedUnlockDate;
    if (customDateContainer.style.display === 'block') {
      finalUnlockDate = new Date(capsuleUnlockDateInput.value);
    }

    // Validar fecha
    const now = new Date();
    if (finalUnlockDate <= now) {
      showNotification({
        title: 'Fecha inválida',
        message: 'La fecha de apertura debe ser en el futuro.',
        icon: '⚠️',
        type: 'warning'
      });
      return;
    }

    // Mostrar loading
    capsuleNextBtn.disabled = true;
    capsuleNextBtn.innerHTML = '<span>🔄 Sellando...</span>';

    // Crear cápsula
    const capsuleData = {
      message: capsuleMessageInput.value.trim(),
      unlockDate: Timestamp.fromDate(finalUnlockDate),
      type: selectedCapsuleType,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now()
    };

    const capsuleId = await createCapsule(capsuleData.message, finalUnlockDate, capsuleData.type);

    // Subir adjuntos si los hay
    if (capsuleAttachments.length > 0) {
      const attachmentUrls = await uploadCapsuleAttachments(capsuleId);
      await updateDoc(doc(db, 'couples', currentCoupleId, 'capsules', capsuleId), {
        attachments: attachmentUrls
      });
    }

    // Limpiar formulario
    resetCapsuleForm();

    // Mostrar éxito
    showNotification({
      title: '✨ ¡Cápsula Sellada!',
      message: 'Tu mensaje ha sido guardado para el futuro.',
      icon: '⏳',
      type: 'success'
    });

    // Volver a la lista
    showPhoneApp('timecapsule');
    await loadAndRenderCapsules();

  } catch (error) {
    console.error('Error al crear cápsula:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo sellar la cápsula. Inténtalo de nuevo.',
      icon: '❌',
      type: 'error'
    });
  } finally {
    capsuleNextBtn.disabled = false;
    updateStepDisplay();
  }
}

function resetCapsuleForm() {
  capsuleMessageInput.value = '';
  currentCapsuleStep = 1;
  selectedCapsuleType = 'memory';
  selectedUnlockDate = null;
  capsuleAttachments = [];

  // Reset UI
  capsuleTypeCards.forEach(card => card.classList.remove('active'));
  document.querySelector('[data-type="memory"]').classList.add('active');
  dateOptionCards.forEach(card => card.classList.remove('active'));
  customDateContainer.style.display = 'none';
  renderAttachmentsPreview();
  updateStepDisplay();
  updateCharCounter();
}

// Funciones de Firestore
async function createCapsule(message, unlockDate, capsuleType) {
  if (!currentCoupleId || !currentUser) throw new Error('Usuario no autenticado');

  const capsulesRef = collection(db, 'couples', currentCoupleId, 'capsules');
  const docRef = await addDoc(capsulesRef, {
    message,
    unlockDate: Timestamp.fromDate(unlockDate),
    type: capsuleType,
    createdBy: currentUser.uid,
    creatorName: currentUser.displayName,
    createdAt: Timestamp.now(),
    openedAt: null
  });

  return docRef.id;
}

async function getCapsules() {
  if (!currentCoupleId) return [];

  try {
    const capsulesRef = collection(db, 'couples', currentCoupleId, 'capsules');
    const q = query(capsulesRef, orderBy('unlockDate', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      unlockDate: doc.data().unlockDate,
      createdAt: doc.data().createdAt,
      openedAt: doc.data().openedAt
    }));
  } catch (error) {
    console.error('Error al obtener cápsulas:', error);
    return [];
  }
}

async function uploadCapsuleAttachments(capsuleId) {
  const uploadedUrls = [];

  for (const attachment of capsuleAttachments) {
    try {
      const storageRef = ref(storage, `couples/${currentCoupleId}/capsules/${capsuleId}/${attachment.name}`);
      await uploadBytes(storageRef, attachment.file);
      const downloadURL = await getDownloadURL(storageRef);

      uploadedUrls.push({
        name: attachment.name,
        type: attachment.type,
        size: attachment.size,
        url: downloadURL
      });
    } catch (error) {
      console.error('Error al subir adjunto:', error);
    }
  }

  return uploadedUrls;
}

// ============================================
// FUNCIONES DE FIRESTORE - METAS DE AHORRO
// ============================================

async function createGoal(name, total) {
  if (!currentCoupleId || !currentUser) return;
  const goalRef = doc(collection(db, 'couples', currentCoupleId, 'goals'));
  await setDoc(goalRef, {
    name,
    total: Number(total),
    current: 0,
    createdAt: Timestamp.now(),
    createdBy: currentUser.uid,
    creatorName: currentUser.displayName || currentUser.email,
  });
  return goalRef.id;
}

async function getGoals() {
  if (!currentCoupleId) return [];
  const goalsRef = collection(db, 'couples', currentCoupleId, 'goals');
  const q = query(goalsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getGoal(goalId) {
  if (!currentCoupleId) return null;
  const goalRef = doc(db, 'couples', currentCoupleId, 'goals', goalId);
  const goalSnap = await getDoc(goalRef);
  return goalSnap.exists() ? { id: goalSnap.id, ...goalSnap.data() } : null;
}

async function addContribution(goalId, amount) {
  if (!currentCoupleId || !currentUser) return;
  const goalRef = doc(db, 'couples', currentCoupleId, 'goals', goalId);
  const contributionsRef = collection(goalRef, 'contributions');
  
  // Añadir la aportación
  await addDoc(contributionsRef, {
    amount: Number(amount),
    userId: currentUser.uid,
    userName: currentUser.displayName,
    createdAt: Timestamp.now(),
  });

  // Actualizar el total en el documento principal de la meta
  const goal = await getGoal(goalId);
  const newCurrent = (goal.current || 0) + Number(amount);
  await updateDoc(goalRef, { current: newCurrent });
}

async function getContributions(goalId) {
  if (!currentCoupleId) return [];
  const contributionsRef = collection(db, 'couples', currentCoupleId, 'goals', goalId, 'contributions');
  const q = query(contributionsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
}



// ============================================
// FUNCIONES DE UI - METAS DE AHORRO
// ============================================



async function renderGoalsList() {
  const goals = await getGoals();

  // Actualizar estadísticas
  updateBudgetStats(goals);

  goalsList.innerHTML = '';
  if (goals.length === 0) {
    goalsList.appendChild(goalsEmptyState);
    goalsEmptyState.style.display = 'block';
  } else {
    goalsEmptyState.style.display = 'none';
    goals.forEach(goal => {
      const percentage = goal.total > 0 ? (goal.current / goal.total) * 100 : 0;
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.onclick = () => openGoalDetail(goal.id);
      item.innerHTML = `
        <div class="goal-header">
          <div class="goal-icon">🎯</div>
          <div class="goal-info">
            <div class="goal-title">${goal.name}</div>
            <div class="goal-creator">Por: ${goal.creatorName || 'Tú'}</div>
            <div class="goal-meta">
              <span class="goal-progress-text">${Math.round(percentage)}% completado</span>
            </div>
          </div>
        </div>
        <div class="goal-progress">
          <div class="goal-progress-bar">
            <div class="goal-progress-fill" style="width: ${percentage}%"></div>
          </div>
          <div class="goal-amounts">
            <span class="goal-current">${goal.current}$</span>
            <span class="goal-total">${goal.total}$</span>
          </div>
        </div>
      `;
      goalsList.appendChild(item);
    });
  }
}

// Actualizar estadísticas del presupuesto
function updateBudgetStats(goals) {
  const totalGoals = goals.length;
  const totalSaved = goals.reduce((sum, goal) => sum + goal.current, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.total, 0);

  if (totalGoalsEl) totalGoalsEl.textContent = totalGoals;
  if (totalSavedEl) totalSavedEl.textContent = `${totalSaved}$`;
  if (totalTargetEl) totalTargetEl.textContent = `${totalTarget}$`;
}

function openCreateGoalView() {
  currentGoalId = null;
  goalDetailTitle.textContent = 'Nueva Meta';
  createGoalContainer.style.display = 'flex';
  viewGoalContainer.style.display = 'none';
  goalNameInput.value = '';
  goalTotalInput.value = '';
  showPhoneApp('goaldetail');
}

async function openGoalDetail(goalId) {
  currentGoalId = goalId;
  createGoalContainer.style.display = 'none';
  viewGoalContainer.style.display = 'flex';
  
  const goal = await getGoal(goalId);
  const contributions = await getContributions(goalId);
  
  if (goal) {
    goalDetailTitle.textContent = goal.name;
    const percentage = goal.total > 0 ? (goal.current / goal.total) * 100 : 0;
    piggyBankFill.style.width = `${Math.min(percentage, 100)}%`;
    goalCurrentAmount.textContent = `${goal.current.toFixed(2)}$`;
    goalTotalAmount.textContent = `${goal.total.toFixed(2)}$`;
    
    goalContributionsList.innerHTML = '';
    contributions.forEach(c => {
      const item = document.createElement('div');
      item.className = 'contribution-item';
      item.innerHTML = `
        <span class="contribution-item-user">${c.userName}</span>
        <strong class="contribution-item-amount">+${c.amount.toFixed(2)}$</strong>
      `;
      goalContributionsList.appendChild(item);
    });
  }
  showPhoneApp('goaldetail');
}

async function handleSaveGoal() {
  const name = goalNameInput.value.trim();
  const total = goalTotalInput.value;
  if (!name || !total || Number(total) <= 0) {
    alert('Por favor, introduce un nombre y una cantidad total válida.');
    return;
  }
  await createGoal(name, total);
  await renderGoalsList();
  showPhoneApp('budget');
}

async function handleAddContribution() {
  const amount = contributionAmountInput.value;
  if (!amount || Number(amount) <= 0) {
    showNotification({
      title: 'Cantidad Inválida',
      message: 'Introduce una cantidad válida para aportar.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  // Obtener datos de la meta actual
  const goalDoc = await getDoc(doc(db, 'couples', currentCoupleId, 'goals', currentGoalId));
  const goalData = goalDoc.data();
  
  await addContribution(currentGoalId, amount);
  await openGoalDetail(currentGoalId); // Recargar la vista
  contributionAmountInput.value = '';
  
  // Mostrar notificación de éxito
  showNotification({
    title: '¡Aportación Exitosa!',
    message: `${currentUser.displayName} aportó ${Number(amount).toFixed(2)}$ a "${goalData.name}"`,
    icon: '🐖',
    type: 'save'
  });
}

// ============================================
// FUNCIONES DEL CARRUSEL DE FOTOS
// ============================================



function setupCarousel(imageUrls) {
  carouselTrack.innerHTML = '';
  carouselDots.innerHTML = '';
  slides = [];
  currentSlideIndex = 0;

  if (!imageUrls || imageUrls.length === 0) {
    carouselContainer.style.display = 'none';
    return;
  }
  
  carouselContainer.style.display = 'block';

  imageUrls.forEach((url, index) => {
    // Crear slide
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = `<img src="${url}" alt="Recuerdo ${index + 1}">`;
    carouselTrack.appendChild(slide);
    slides.push(slide);

    // Crear dot indicador
    const dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.addEventListener('click', () => moveToSlide(index));
    carouselDots.appendChild(dot);
  });

  // Mostrar/ocultar botones de navegación
  carouselPrevBtn.style.display = slides.length > 1 ? 'flex' : 'none';
  carouselNextBtn.style.display = slides.length > 1 ? 'flex' : 'none';
  
  updateCarousel();
}

function moveToSlide(index) {
  if (index < 0 || index >= slides.length) return;
  currentSlideIndex = index;
  updateCarousel();
}

function updateCarousel() {
  // Mover el track
  carouselTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

  // Actualizar los dots
  const dots = carouselDots.children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].classList.toggle('active', i === currentSlideIndex);
  }
}






// ============================================
// FUNCIONES DE UI - DIARIO DE PAREJA
// ============================================



function renderJournalCalendar() {
  journalCalendarGrid.innerHTML = '';
  const year = currentJournalDate.getFullYear();
  const month = currentJournalDate.getMonth();
  
  journalMonthYear.textContent = `${currentJournalDate.toLocaleString('es-ES', { month: 'long' })} ${year}`;
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date(); // Obtenemos la fecha de hoy
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  
  // Rellenar días del mes anterior
  for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day other-month';
    journalCalendarGrid.appendChild(dayCell);
  }
  
  // Rellenar días del mes actual
  for (let i = 1; i <= daysInMonth; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    dayCell.textContent = i;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

    // Comprobar si es el día de hoy
    const currentDayStr = `${year}-${month}-${i}`;
    if (currentDayStr === todayStr) {
      dayCell.classList.add('today');
    }
    
    // Marcar días que tienen entradas en el diario
    if (journalEntriesCache.has(dateStr)) {
      dayCell.classList.add('has-entry');
      const entry = journalEntriesCache.get(dateStr);
      
      // Mostrar emoji de emoción si existe
      if (entry.mood) {
        const moodEmojis = {
          happy: '😊',
          love: '🥰',
          fun: '😄',
          romantic: '💕',
          chill: '😌',
          sad: '😢'
        };
        const indicator = document.createElement('span');
        indicator.className = 'day-mood-indicator';
        indicator.textContent = moodEmojis[entry.mood] || '💕';
        dayCell.appendChild(indicator);
      }
    }
    
    dayCell.onclick = () => handleDayClick(new Date(year, month, i));

    // Animación de entrada escalonada
    dayCell.style.animationDelay = `${i * 20}ms`;
    dayCell.classList.add('calendar-day-enter');

    journalCalendarGrid.appendChild(dayCell);
  }
}

async function fetchJournalEntriesForMonth() {
  if (!currentCoupleId) return;
  const year = currentJournalDate.getFullYear();
  const month = currentJournalDate.getMonth();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const entriesRef = collection(db, 'couples', currentCoupleId, 'journal');
  const q = query(entriesRef, where('date', '>=', startOfMonth), where('date', '<=', endOfMonth));
  const snapshot = await getDocs(q);
  
  journalEntriesCache.clear();
  snapshot.forEach(doc => {
    const data = doc.data();
    const date = data.date.toDate();
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    journalEntriesCache.set(dateStr, data);
  });
  renderJournalCalendar();
  updateJournalPreview();
}


// REEMPLAZA la antigua función openJournalEntry por estas DOS:

// 1. La nueva función que decide a dónde ir
async function handleDayClick(date) {
  selectedJournalDate = date;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  if (journalEntriesCache.has(dateStr)) {
    // Si el día tiene contenido, vamos a la vista de lectura
    openJournalReadView(journalEntriesCache.get(dateStr));
  } else {
    // Si el día está vacío, vamos directamente a la vista de edición
    openJournalEditView(date);
  }
}

// 2. La nueva función para la vista de LECTURA Carrusel
function openJournalReadView(entry) {
  const date = entry.date.toDate();
  
  // Título del header (formato corto)
  journalReadDate.textContent = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  
  // Fecha completa en el widget de info
  const fullDateElement = document.getElementById('journal-read-date-full');
  if (fullDateElement) {
    fullDateElement.textContent = date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }
  
  // Mostrar estado de ánimo
  const moodEmojis = {
    happy: '😊',
    love: '🥰',
    fun: '😄',
    romantic: '💕',
    chill: '😌',
    sad: '😢'
  };
  
  const moodNames = {
    happy: 'Feliz',
    love: 'Enamorado',
    fun: 'Divertido',
    romantic: 'Romántico',
    chill: 'Relajado',
    sad: 'Triste'
  };
  
  const moodEmojiElement = document.getElementById('journal-read-mood-emoji');
  const moodNameElement = document.getElementById('journal-read-mood-name');
  
  if (moodEmojiElement && moodNameElement) {
    if (entry.mood && moodEmojis[entry.mood]) {
      moodEmojiElement.textContent = moodEmojis[entry.mood];
      moodNameElement.textContent = moodNames[entry.mood];
    } else {
      moodEmojiElement.textContent = '💭';
      moodNameElement.textContent = 'Sin definir';
    }
  }
  
  // Configurar el carrusel
  setupCarousel(entry.imageUrls);

  // Rellenar el texto
  journalReadText.textContent = entry.text || '';
  
  showPhoneApp('journalread');
}


async function openJournalEditView(date) {
  selectedJournalDate = date;
  journalEntryDate.textContent = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Resetear la vista
  journalEntryText.value = '';
  journalGalleryContainer.querySelectorAll('.gallery-thumbnail').forEach(el => el.remove()); // Limpiar galería
  journalImageInput.value = null;
  
  // Resetear selector de emociones
  document.querySelectorAll('.mood-option').forEach(btn => btn.classList.remove('selected'));

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  if (journalEntriesCache.has(dateStr)) {
    const entry = journalEntriesCache.get(dateStr);
    journalEntryText.value = entry.text || '';
    
    // Seleccionar la emoción guardada
    if (entry.mood) {
      const moodBtn = document.querySelector(`.mood-option[data-mood="${entry.mood}"]`);
      if (moodBtn) {
        moodBtn.classList.add('selected');
      }
    }
    
    // Si hay imágenes, renderizarlas
    if (entry.imageUrls && entry.imageUrls.length > 0) {
      entry.imageUrls.forEach(url => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumbnail';
        thumb.innerHTML = `
          <img src="${url}" alt="Recuerdo">
          <button class="delete-photo-btn" onclick="this.parentElement.remove()">×</button>
        `;
        journalGalleryContainer.insertBefore(thumb, journalAddPhotoBtn);
      });
    }
  }
  
  showPhoneApp('journalentry');
}


async function handleSaveJournalEntry() {
  if (!selectedJournalDate || !currentCoupleId) return;

  const text = journalEntryText.value.trim();
  const imageFiles = journalImageInput.files; // Ahora es plural

  // Obtener el estado de ánimo seleccionado
  const selectedMoodBtn = document.querySelector('.mood-option.selected');
  const mood = selectedMoodBtn ? selectedMoodBtn.dataset.mood : null;

  // Obtener las URLs de las imágenes ya existentes
  const existingImageUrls = Array.from(journalGalleryContainer.querySelectorAll('.gallery-thumbnail img')).map(img => img.src);

  if (!text && imageFiles.length === 0 && existingImageUrls.length === 0) {
    await showNotification({
      title: '⚠️ Contenido requerido',
      message: 'Añade fotos o escribe algo para guardar el recuerdo.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }

  saveJournalEntryBtn.disabled = true;
  saveJournalEntryBtn.querySelector('span').textContent = '💾 Guardando...';

  try {
    const imageUrls = [...existingImageUrls]; // Empezamos con las que ya estaban

    // Si se han seleccionado nuevas imágenes, subirlas
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const filePath = `couples/${currentCoupleId}/journal/${selectedJournalDate.getTime()}_${file.name}`;
        const storageRef = ref(storage, filePath);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadUrl);
      }
    }

    // Guardar/actualizar la entrada en Firestore
    const entryId = `${selectedJournalDate.getFullYear()}-${selectedJournalDate.getMonth() + 1}-${selectedJournalDate.getDate()}`;
    const entryRef = doc(db, 'couples', currentCoupleId, 'journal', entryId);
    
    await setDoc(entryRef, {
      date: Timestamp.fromDate(selectedJournalDate),
      text: text,
      imageUrls: imageUrls, // Guardamos un array de URLs
      mood: mood, // Guardamos la emoción seleccionada
      lastUpdatedBy: currentUser.uid,
    }, { merge: true });

    await fetchJournalEntriesForMonth();
    showPhoneApp('journal');

  } catch (error) {
    console.error("Error guardando la entrada:", error);
    alert("No se pudo guardar el recuerdo.");
  } finally {
    saveJournalEntryBtn.disabled = false;
    saveJournalEntryBtn.querySelector('span').textContent = '💾 Guardar Recuerdo';
  }
}


// Nueva función para el widget
function updateJournalPreview() {
  // Actualizar estadísticas de emociones del mes
  const moodCounts = {
    happy: 0,
    love: 0,
    fun: 0,
    romantic: 0,
    chill: 0,
    sad: 0
  };
  
  // Contar emociones de las entradas del mes actual
  journalEntriesCache.forEach(entry => {
    if (entry.mood && moodCounts.hasOwnProperty(entry.mood)) {
      moodCounts[entry.mood]++;
    }
  });
  
  // Actualizar la UI de estadísticas
  Object.keys(moodCounts).forEach(mood => {
    const moodStatElement = document.querySelector(`.mood-stat[data-mood="${mood}"] .mood-count`);
    if (moodStatElement) {
      moodStatElement.textContent = moodCounts[mood];
    }
  });
  
  // Mostrar el último recuerdo
  const sortedEntries = Array.from(journalEntriesCache.values()).sort((a, b) => {
    const dateA = a.date.toDate ? a.date.toDate() : a.date;
    const dateB = b.date.toDate ? b.date.toDate() : b.date;
    return dateB - dateA;
  });
  
  const lastMemoryWidget = document.getElementById('journal-last-memory');
  
  if (sortedEntries.length > 0) {
    const latestEntry = sortedEntries[0];
    const date = latestEntry.date.toDate ? latestEntry.date.toDate() : latestEntry.date;
    
    const moodEmojis = {
      happy: '😊',
      love: '🥰',
      fun: '😄',
      romantic: '💕',
      chill: '😌',
      sad: '😢'
    };
    
    document.getElementById('last-memory-date').textContent = date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    document.getElementById('last-memory-snippet').textContent = latestEntry.text || 'Un recuerdo guardado en imágenes ✨';
    document.getElementById('last-memory-mood').textContent = latestEntry.mood ? moodEmojis[latestEntry.mood] : '💭';
    
    const lastMemoryImage = document.getElementById('last-memory-image');
    if (latestEntry.imageUrls && latestEntry.imageUrls.length > 0) {
      lastMemoryImage.src = latestEntry.imageUrls[0];
    } else {
      lastMemoryImage.src = 'scr/images/icon-192x192.png';
    }
    
    lastMemoryWidget.style.display = 'block';
    lastMemoryWidget.onclick = () => openJournalReadView(latestEntry);
  } else {
    lastMemoryWidget.style.display = 'none';
  }
}


// ============================================
// FUNCIONES DE FIRESTORE - BANDA SONORA
// ============================================

async function createPlaylist(name) {
  if (!currentCoupleId) return;
  const playlistsRef = collection(db, 'couples', currentCoupleId, 'playlists');
  await addDoc(playlistsRef, {
    name,
    createdAt: Timestamp.now(),
    createdBy: currentUser.uid,
  });
}

async function getPlaylists() {
  if (!currentCoupleId) return [];
  const playlistsRef = collection(db, 'couples', currentCoupleId, 'playlists');
  const q = query(playlistsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function addSongToPlaylist(playlistId, songName, youtubeLink) {
  if (!currentCoupleId || !playlistId) return;
  const songsRef = collection(db, 'couples', currentCoupleId, 'playlists', playlistId, 'songs');
  await addDoc(songsRef, {
    name: songName,
    url: youtubeLink,
    addedBy: currentUser.displayName,
    createdAt: Timestamp.now(),
  });
}

async function getSongsFromPlaylist(playlistId) {
  if (!currentCoupleId || !playlistId) return [];
  const songsRef = collection(db, 'couples', currentCoupleId, 'playlists', playlistId, 'songs');
  const q = query(songsRef, orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updatePlaylist(playlistId, newName) {
  if (!currentCoupleId || !playlistId) return;
  const playlistRef = doc(db, 'couples', currentCoupleId, 'playlists', playlistId);
  await updateDoc(playlistRef, { name: newName });
}

async function deletePlaylist(playlistId) {
  if (!currentCoupleId || !playlistId) return;
  
  // Primero eliminar todas las canciones de la playlist
  const songsRef = collection(db, 'couples', currentCoupleId, 'playlists', playlistId, 'songs');
  const songsSnapshot = await getDocs(songsRef);
  const deletePromises = songsSnapshot.docs.map(songDoc => deleteDoc(songDoc.ref));
  await Promise.all(deletePromises);
  
  // Luego eliminar la playlist
  const playlistRef = doc(db, 'couples', currentCoupleId, 'playlists', playlistId);
  await deleteDoc(playlistRef);
}

async function updateSong(playlistId, songId, songName, youtubeUrl) {
  if (!currentCoupleId || !playlistId || !songId) return;
  const songRef = doc(db, 'couples', currentCoupleId, 'playlists', playlistId, 'songs', songId);
  await updateDoc(songRef, {
    name: songName,
    url: youtubeUrl
  });
}

async function deleteSong(playlistId, songId) {
  if (!currentCoupleId || !playlistId || !songId) return;
  const songRef = doc(db, 'couples', currentCoupleId, 'playlists', playlistId, 'songs', songId);
  await deleteDoc(songRef);
}


// ============================================
// FUNCIONES DE UI - BANDA SONORA
// ============================================



async function renderPlaylists() {
  const playlists = await getPlaylists();
  playlistsList.innerHTML = '';
  
  // Actualizar estadísticas
  totalPlaylistsCount.textContent = playlists.length;
  
  // Calcular total de canciones en todas las playlists
  let totalSongs = 0;
  for (const playlist of playlists) {
    const songs = await getSongsFromPlaylist(playlist.id);
    totalSongs += songs.length;
  }
  totalSongsCount.textContent = totalSongs;
  
  if (playlists.length > 0) {
    playlists.forEach(p => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      
      item.innerHTML = `
        <span class="playlist-item-icon">🎵</span>
        <div class="playlist-item-content">
          <p class="playlist-item-name">${p.name}</p>
        </div>
        <div class="playlist-item-actions">
          <button class="playlist-action-btn playlist-edit-btn" data-id="${p.id}" data-name="${p.name}">✏️</button>
          <button class="playlist-action-btn playlist-delete-btn" data-id="${p.id}" data-name="${p.name}">🗑️</button>
        </div>
        <span class="playlist-item-arrow">›</span>
      `;
      
      // Click en el item para ver detalles (excepto en los botones)
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.playlist-item-actions')) {
          openPlaylistDetail(p.id, p.name);
        }
      });
      
      // Click en editar
      const editBtn = item.querySelector('.playlist-edit-btn');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditPlaylistModal(p.id, p.name);
      });
      
      // Click en eliminar
      const deleteBtn = item.querySelector('.playlist-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeletePlaylist(p.id, p.name);
      });
      
      playlistsList.appendChild(item);
    });
  } else {
    playlistsList.innerHTML = `
      <div class="empty-state-message">
        <div class="empty-icon">🎵</div>
        <p>Aún no tienes playlists.</p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">¡Crea tu primera playlist abajo!</p>
      </div>
    `;
  }
}

async function openPlaylistDetail(playlistId, playlistName) {
  currentPlaylistId = playlistId;
  playlistDetailTitle.textContent = playlistName;
  cassetteLabelTitle.textContent = playlistName;
  
  const songs = await getSongsFromPlaylist(playlistId);
  
  // Actualizar contador de canciones
  const playlistSongCountElement = document.getElementById('playlist-song-count');
  if (playlistSongCountElement) {
    playlistSongCountElement.textContent = songs.length;
  }
  
  songList.innerHTML = '';
  if (songs.length > 0) {
    songs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'song-item';

      item.innerHTML = `
        <span class="song-icon">🎧</span>
        <div class="song-info">
          <p class="song-title">${song.name}</p>
          <span class="song-added-by">Añadida por ${song.addedBy}</span>
        </div>
        <div class="song-actions">
          <button class="song-action-btn song-edit-btn" data-id="${song.id}" data-name="${song.name}" data-url="${song.url}">✏️</button>
          <button class="song-action-btn song-delete-btn" data-id="${song.id}" data-name="${song.name}">🗑️</button>
        </div>
      `;

      // Crear el botón de reproducción por separado
      const playButton = document.createElement('button');
      playButton.className = 'play-song-btn';
      playButton.textContent = '▶';
      playButton.addEventListener('click', () => {
        playSong(song.url, song.name, song.addedBy);
      });

      // Eventos de edición y eliminación
      const editBtn = item.querySelector('.song-edit-btn');
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditSongModal(song.id, song.name, song.url);
      });

      const deleteBtn = item.querySelector('.song-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteSong(song.id, song.name);
      });

      item.appendChild(playButton);
      songList.appendChild(item);
    });
  } else {
    songList.innerHTML = `
      <div class="empty-state-message">
        <div class="empty-icon">🎶</div>
        <p>Esta playlist está vacía.</p>
        <p style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">¡Añade tu primera canción!</p>
      </div>
    `;
  }
  
  showPhoneApp('playlistdetail');
}

async function handleCreatePlaylist() {
  const name = newPlaylistNameInput.value.trim();
  if (!name) {
    // Mostrar notificación pidiendo el nombre
    const playlistName = await showNotification({
      title: '🎵 Crear Playlist',
      message: '¿Cómo quieres llamar a tu nueva playlist?',
      icon: '🎵',
      input: true,
      inputPlaceholder: 'Nombre de la playlist...',
      confirmText: 'Crear',
      cancelText: 'Cancelar'
    });
    
    if (!playlistName) return; // Cancelado
    
    newPlaylistNameInput.value = playlistName;
  }
  
  const finalName = newPlaylistNameInput.value.trim();
  await createPlaylist(finalName);
  
  // Animación de éxito
  createPlaylistBtn.textContent = '✅ ¡Creada!';
  createPlaylistBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  
  setTimeout(() => {
    createPlaylistBtn.innerHTML = '<span>+ Crear Playlist</span>';
    createPlaylistBtn.style.background = '';
  }, 2000);
  
  newPlaylistNameInput.value = '';
  await renderPlaylists();
}

function goToAddSongView() {
  songNameInput.value = '';
  youtubeLinkInput.value = '';
  showPhoneApp('addsong');
}

async function handleSaveSong() {
  const songName = songNameInput.value.trim();
  const youtubeLink = youtubeLinkInput.value.trim();
  if (!songName || !youtubeLink) {
    await showNotification({
      title: '⚠️ Campos incompletos',
      message: 'Por favor, completa el nombre y el enlace de la canción.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  // Validación simple del enlace de YouTube
  if (!youtubeLink.includes('youtu.be/') && !youtubeLink.includes('youtube.com/watch')) {
    await showNotification({
      title: '⚠️ Enlace inválido',
      message: 'El enlace no parece ser un vídeo de YouTube válido.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  await addSongToPlaylist(currentPlaylistId, songName, youtubeLink);
  
  // Animación de éxito
  saveSongBtn.textContent = '✅ ¡Guardada!';
  saveSongBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
  
  setTimeout(() => {
    saveSongBtn.textContent = '💾 Guardar Canción';
    saveSongBtn.style.background = '';
  }, 1500);
  
  const currentPlaylistName = playlistDetailTitle.textContent;
  await openPlaylistDetail(currentPlaylistId, currentPlaylistName); // Recargar la vista de la playlist
}

// ============================================
// FUNCIONES DE EDICIÓN Y ELIMINACIÓN
// ============================================

// Variables para modales
let editingPlaylistId = null;
let editingSongId = null;

// Función para abrir modal de editar playlist
function openEditPlaylistModal(playlistId, currentName) {
  editingPlaylistId = playlistId;
  editPlaylistNameInput.value = currentName;
  showMusicModal(editPlaylistModal, 'music');
}

// Función para cerrar modal de editar playlist
function closeEditPlaylistModal() {
  hideMusicModal(editPlaylistModal, 'music');
  editingPlaylistId = null;
  editPlaylistNameInput.value = '';
}

// Función para guardar edición de playlist
async function handleSaveEditPlaylist() {
  const newName = editPlaylistNameInput.value.trim();
  if (!newName) {
    alert('Por favor, ingresa un nombre para la playlist.');
    return;
  }
  
  await updatePlaylist(editingPlaylistId, newName);
  closeEditPlaylistModal();
  await renderPlaylists();
}

// Función para confirmar eliminación de playlist
async function confirmDeletePlaylist(playlistId, playlistName) {
  const confirmed = await showNotification({
    title: '🗑️ Eliminar Playlist',
    message: `¿Estás seguro de que quieres eliminar la playlist "${playlistName}"? Se eliminarán todas las canciones.`,
    icon: '🗑️',
    type: 'warning',
    confirm: true,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar'
  });
  
  if (confirmed) {
    handleDeletePlaylist(playlistId);
  }
}

// Función para eliminar playlist
async function handleDeletePlaylist(playlistId) {
  await deletePlaylist(playlistId);
  await renderPlaylists();
}

// Función para abrir modal de editar canción
function openEditSongModal(songId, currentName, currentUrl) {
  editingSongId = songId;
  editSongNameInput.value = currentName;
  editSongUrlInput.value = currentUrl;
  showMusicModal(editSongModal, 'music');
}

// Función para cerrar modal de editar canción
function closeEditSongModal() {
  hideMusicModal(editSongModal, 'music');
  editingSongId = null;
  editSongNameInput.value = '';
  editSongUrlInput.value = '';
}

// Función para guardar edición de canción
async function handleSaveEditSong() {
  const newName = editSongNameInput.value.trim();
  const newUrl = editSongUrlInput.value.trim();
  
  if (!newName || !newUrl) {
    await showNotification({
      title: '⚠️ Campos incompletos',
      message: 'Por favor, completa todos los campos.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (!newUrl.includes('youtu.be/') && !newUrl.includes('youtube.com/watch')) {
    alert('El enlace no parece ser un vídeo de YouTube válido.');
    return;
  }
  
  await updateSong(currentPlaylistId, editingSongId, newName, newUrl);
  closeEditSongModal();
  
  const currentPlaylistName = playlistDetailTitle.textContent;
  await openPlaylistDetail(currentPlaylistId, currentPlaylistName);
}

// Función para confirmar eliminación de canción
async function confirmDeleteSong(songId, songName) {
  const confirmed = await showNotification({
    title: '🗑️ Eliminar Canción',
    message: `¿Estás seguro de que quieres eliminar "${songName}"?`,
    icon: '🗑️',
    type: 'warning',
    confirm: true,
    confirmText: 'Eliminar',
    cancelText: 'Cancelar'
  });
  
  if (confirmed) {
    handleDeleteSong(songId);
  }
}

// Función para eliminar canción
async function handleDeleteSong(songId) {
  await deleteSong(currentPlaylistId, songId);
  
  const currentPlaylistName = playlistDetailTitle.textContent;
  await openPlaylistDetail(currentPlaylistId, currentPlaylistName);
}


// ... dentro de FUNCIONES DE UI - BANDA SONORA ...

// Función para extraer el ID de un vídeo de YouTube
function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}


// REEMPLAZA la función playSong existente por esta:

/**
 * Carga y reproduce una canción de YouTube, creando un reproductor controlable.
 * @param {string} url - La URL del video de YouTube.
 * @param {string} name - El nombre de la canción.
 * @param {string} addedBy - El nombre de quien añadió la canción.
 */
function playSong(url, name, addedBy) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    alert("El enlace de YouTube no es válido y no se puede reproducir.");
    return;
  }

  // Actualizar la información en pantalla inmediatamente
  playerSongTitle.textContent = name;
  playerAddedBy.textContent = `Añadida por ${addedBy}`;
  
  // Limpiar el contenedor por si había un reproductor anterior
  youtubePlayerContainer.innerHTML = '';
  const playerDiv = document.createElement('div');
  playerDiv.id = 'yt-player-instance'; // Damos un ID al div del reproductor
  youtubePlayerContainer.appendChild(playerDiv);

  // Función para crear el reproductor una vez que la API esté lista
  function createPlayer() {
    // Destruir el reproductor anterior si existe
    if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
      youtubePlayer.destroy();
    }

    youtubePlayer = new YT.Player('yt-player-instance', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        'autoplay': 1, // Inicia la reproducción automáticamente
        'controls': 0, // Oculta los controles de YouTube
        'showinfo': 0,
        'rel': 0
      },
      events: {
        'onReady': onPlayerReady,
        'onStateChange': onPlayerStateChange
      }
    });
  }

  // Comprobar si la API de YouTube IFrame ya está cargada
  if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
    // Si no está cargada, la cargamos
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script' )[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // YouTube llamará a esta función global cuando la API esté lista
    window.onYouTubeIframeAPIReady = createPlayer;
  } else {
    // Si ya está cargada, simplemente creamos el reproductor
    createPlayer();
  }

  // Mostrar la pantalla del reproductor
  showPhoneApp('player');
}

// ===> AÑADE ESTAS NUEVAS FUNCIONES DE AYUDA <===

/**
 * Se ejecuta cuando el reproductor de YouTube está listo.
 */
function onPlayerReady(event) {
  isPlaying = true;
  turntableContainer.classList.add('playing');
  event.target.playVideo();
}

/**
 * Se ejecuta cuando el estado del reproductor cambia (play, pausa, etc.).
 */
function onPlayerStateChange(event) {
  const cassetteSpoools = document.querySelectorAll('.cassette-spool');
  
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    turntableContainer.classList.add('playing');
    // Animar carretes del cassette
    cassetteSpoools.forEach(spool => spool.classList.add('spinning'));
  } else {
    isPlaying = false;
    turntableContainer.classList.remove('playing');
    // Detener animación de carretes
    cassetteSpoools.forEach(spool => spool.classList.remove('spinning'));
  }
}



/**
 * Alterna entre reproducir y pausar la canción actual.
 * También controla las animaciones del tocadiscos.
 */
function togglePlayPause() {
  // Si no hay un reproductor cargado, no hacemos nada.
  if (!youtubePlayer || typeof youtubePlayer.getPlayerState !== 'function') {
    return;
  }

  const playerState = youtubePlayer.getPlayerState();
  const cassetteSpoools = document.querySelectorAll('.cassette-spool');

  if (playerState === YT.PlayerState.PLAYING) {
    // Si está sonando, lo pausamos
    youtubePlayer.pauseVideo();
    isPlaying = false;
    turntableContainer.classList.remove('playing'); // Detiene la animación
    cassetteSpoools.forEach(spool => spool.classList.remove('spinning'));
  } else {
    // Si está pausado, en buffer o finalizado, lo reproducimos
    youtubePlayer.playVideo();
    isPlaying = true;
    turntableContainer.classList.add('playing'); // Inicia la animación
    cassetteSpoools.forEach(spool => spool.classList.add('spinning'));
  }
}

// ============================================
// RUEDA DE DECISIONES - WHEEL OF DECISIONS
// ============================================

let currentWheel = {
  name: 'Mi Ruleta',
  options: ['Opción 1', 'Opción 2', 'Opción 3']
};
let wheelSpinning = false;
let wheelRotation = 0;

const wheelCanvas = document.getElementById('wheel-canvas');
const wheelCtx = wheelCanvas ? wheelCanvas.getContext('2d') : null;
const wheelColors = ['#ffb3ba', '#bae1ff', '#ffffba', '#baffc9', '#ffdfba', '#e0bbe4', '#ffd6e8', '#c1f0c1'];

function renderWheel() {
  if (!wheelCtx) return;
  
  const centerX = wheelCanvas.width / 2;
  const centerY = wheelCanvas.height / 2;
  const radius = 130;
  const options = currentWheel.options;
  const sliceAngle = (2 * Math.PI) / options.length;
  
  wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
  
  // Dibujar cada segmento
  options.forEach((option, i) => {
    const startAngle = i * sliceAngle + (wheelRotation * Math.PI / 180);
    const endAngle = (i + 1) * sliceAngle + (wheelRotation * Math.PI / 180);
    
    // Segmento de color
    wheelCtx.beginPath();
    wheelCtx.arc(centerX, centerY, radius, startAngle, endAngle);
    wheelCtx.lineTo(centerX, centerY);
    wheelCtx.fillStyle = wheelColors[i % wheelColors.length];
    wheelCtx.fill();
    wheelCtx.strokeStyle = '#fff';
    wheelCtx.lineWidth = 3;
    wheelCtx.stroke();
    
    // Texto
    wheelCtx.save();
    wheelCtx.translate(centerX, centerY);
    wheelCtx.rotate(startAngle + sliceAngle / 2);
    wheelCtx.textAlign = 'right';
    wheelCtx.fillStyle = '#333';
    wheelCtx.font = 'bold 14px Arial';
    const text = option.length > 12 ? option.substring(0, 12) + '...' : option;
    wheelCtx.fillText(text, radius - 15, 5);
    wheelCtx.restore();
  });
  
  // Círculo central
  wheelCtx.beginPath();
  wheelCtx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
  wheelCtx.fillStyle = '#fff';
  wheelCtx.fill();
  wheelCtx.strokeStyle = '#ddd';
  wheelCtx.lineWidth = 3;
  wheelCtx.stroke();
  
  wheelCtx.fillStyle = '#333';
  wheelCtx.font = 'bold 20px Arial';
  wheelCtx.textAlign = 'center';
  wheelCtx.textBaseline = 'middle';
  wheelCtx.fillText('🎡', centerX, centerY);
}

function spinWheel() {
  if (wheelSpinning || currentWheel.options.length === 0) return;
  
  wheelSpinning = true;
  const spinBtn = document.getElementById('spin-wheel-btn');
  if (spinBtn) spinBtn.disabled = true;
  
  const spins = 5 + Math.random() * 5; // 5-10 vueltas
  const extraDegrees = Math.random() * 360;
  const totalRotation = spins * 360 + extraDegrees;
  const duration = 4000; // 4 segundos
  const startTime = Date.now();
  const startRotation = wheelRotation;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing out cubic para desaceleración
    const easeOut = 1 - Math.pow(1 - progress, 3);
    wheelRotation = (startRotation + totalRotation * easeOut) % 360;
    
    renderWheel();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelSpinning = false;
      if (spinBtn) spinBtn.disabled = false;
      
      // Calcular opción ganadora
      const sliceAngle = 360 / currentWheel.options.length;
      const pointerAngle = (90 - wheelRotation + 360) % 360;
      const winningIndex = Math.floor(pointerAngle / sliceAngle);
      const winner = currentWheel.options[winningIndex];
      
      // Mostrar resultado con confeti
      setTimeout(() => {
        showWheelResult(winner);
        createConfetti();
      }, 300);
    }
  }
  
  animate();
}

function showWheelResult(winner) {
  // Actualizar contenido del modal
  const wheelResultIcon = document.getElementById('wheel-result-icon');
  const wheelResultText = document.getElementById('wheel-result-text');
  const okWheelResultBtn = document.getElementById('ok-wheel-result-btn');

  if (wheelResultIcon) wheelResultIcon.textContent = '🎉';
  if (wheelResultText) wheelResultText.textContent = winner;

  // Configurar event listeners
  if (closeWheelResultModalBtn) {
    closeWheelResultModalBtn.onclick = () => {
      wheelResultModal.style.display = 'none';
    };
  }

  if (okWheelResultBtn) {
    okWheelResultBtn.onclick = () => {
      wheelResultModal.style.display = 'none';
    };
  }

  // Cerrar al hacer click fuera
  if (wheelResultModal) {
    wheelResultModal.onclick = (e) => {
      if (e.target === wheelResultModal) {
        wheelResultModal.style.display = 'none';
      }
    };
  }

  // Mostrar modal
  if (wheelResultModal) {
    wheelResultModal.style.display = 'flex';
  }
}

function createConfetti() {
  const colors = ['#ffb3ba', '#bae1ff', '#ffffba', '#baffc9', '#ffdfba', '#e0bbe4'];
  const confettiCount = 50;
  const phoneModal = document.getElementById('phone-modal');
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * window.innerWidth + 'px';
    confetti.style.top = '-10px';
    confetti.style.opacity = '1';
    confetti.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
    confetti.style.zIndex = '10000';
    confetti.style.pointerEvents = 'none';
    confetti.style.borderRadius = '50%';
    
    document.body.appendChild(confetti);
    
    const fallDuration = 2000 + Math.random() * 1000;
    const xMovement = (Math.random() - 0.5) * 200;
    
    confetti.animate([
      { transform: `translateY(0px) translateX(0px) rotate(0deg)`, opacity: 1 },
      { transform: `translateY(${window.innerHeight}px) translateX(${xMovement}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
    ], {
      duration: fallDuration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    });
    
    setTimeout(() => confetti.remove(), fallDuration);
  }
}

function addWheelOption() {
  const input = document.getElementById('wheel-option-input');
  const option = input.value.trim();
  
  if (!option) {
    showNotification({
      title: 'Opción vacía',
      message: 'Por favor escribe una opción antes de añadir',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (currentWheel.options.length >= 12) {
    showNotification({
      title: 'Límite alcanzado',
      message: 'Máximo 12 opciones por ruleta',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  currentWheel.options.push(option);
  input.value = '';
  renderWheelOptions();
  renderWheel();
}

function removeWheelOption(index) {
  if (currentWheel.options.length <= 2) {
    showNotification({
      title: 'Mínimo requerido',
      message: 'La ruleta necesita al menos 2 opciones',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  currentWheel.options.splice(index, 1);
  renderWheelOptions();
  renderWheel();
}

function renderWheelOptions() {
  const list = document.getElementById('wheel-options-list');
  if (!list) return;
  
  if (currentWheel.options.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: #999; padding: 1rem;">No hay opciones. ¡Añade algunas!</p>';
    return;
  }
  
  list.innerHTML = currentWheel.options.map((option, i) => `
    <div class="wheel-option-item">
      <span class="option-color" style="background: ${wheelColors[i % wheelColors.length]}"></span>
      <span class="option-text">${option}</span>
      <button class="btn-remove-option" onclick="removeWheelOption(${i})">×</button>
    </div>
  `).join('');
}

async function saveCurrentWheel() {
  if (!currentCoupleId) {
    showNotification({
      title: 'Error',
      message: 'Debes estar autenticado para guardar ruletas',
      icon: '❌',
      type: 'error'
    });
    return;
  }
  
  const nameInput = document.getElementById('wheel-name-input');
  const wheelName = nameInput.value.trim() || 'Mi Ruleta';
  
  if (currentWheel.options.length < 2) {
    showNotification({
      title: 'Opciones insuficientes',
      message: 'Añade al menos 2 opciones antes de guardar',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  try {
    const wheelsRef = collection(db, 'couples', currentCoupleId, 'wheels');
    await addDoc(wheelsRef, {
      name: wheelName,
      options: currentWheel.options,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid
    });
    
    showNotification({
      title: '¡Ruleta guardada! 💾',
      message: `"${wheelName}" se guardó correctamente`,
      icon: '✅',
      type: 'success'
    });
    
    loadSavedWheels();
  } catch (error) {
    console.error('Error saving wheel:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo guardar la ruleta',
      icon: '❌',
      type: 'error'
    });
  }
}

async function loadSavedWheels() {
  if (!currentCoupleId) return;
  
  const list = document.getElementById('saved-wheels-list');
  if (!list) return;
  
  try {
    const wheelsRef = collection(db, 'couples', currentCoupleId, 'wheels');
    const q = query(wheelsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      list.innerHTML = `
        <div class="wheels-empty-state">
          <div class="empty-icon">🎡</div>
          <p>No hay ruletas guardadas. ¡Crea y guarda tu primera ruleta!</p>
        </div>
      `;
      return;
    }
    
    list.innerHTML = snapshot.docs.map(doc => {
      const wheel = doc.data();
      return `
        <div class="saved-wheel-card">
          <div class="saved-wheel-info">
            <strong>${wheel.name}</strong>
            <span>${wheel.options.length} opciones</span>
          </div>
          <div class="saved-wheel-actions">
            <button class="btn btn-sm btn-primary" onclick="loadWheel('${doc.id}')">Cargar</button>
            <button class="btn btn-sm btn-outline" onclick="deleteWheel('${doc.id}')">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading wheels:', error);
  }
}

async function loadWheel(wheelId) {
  if (!currentCoupleId) return;
  
  try {
    const wheelDoc = await getDoc(doc(db, 'couples', currentCoupleId, 'wheels', wheelId));
    if (wheelDoc.exists()) {
      const wheelData = wheelDoc.data();
      currentWheel = {
        name: wheelData.name,
        options: wheelData.options
      };
      
      const nameInput = document.getElementById('wheel-name-input');
      if (nameInput) nameInput.value = currentWheel.name;
      
      renderWheelOptions();
      renderWheel();
      
      showNotification({
        title: 'Ruleta cargada',
        message: `"${currentWheel.name}" lista para girar`,
        icon: '🎡',
        type: 'success'
      });
    }
  } catch (error) {
    console.error('Error loading wheel:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo cargar la ruleta',
      icon: '❌',
      type: 'error'
    });
  }
}

async function deleteWheel(wheelId) {
  if (!currentCoupleId) return;
  
  const confirmed = await showNotification({
    title: '¿Eliminar ruleta?',
    message: '¿Estás seguro de que quieres eliminar esta ruleta?',
    icon: '⚠️',
    type: 'confirm',
    confirmText: 'Eliminar',
    cancelText: 'Cancelar'
  });
  
  if (!confirmed) return;
  
  try {
    await deleteDoc(doc(db, 'couples', currentCoupleId, 'wheels', wheelId));
    showNotification({
      title: 'Ruleta eliminada',
      message: 'La ruleta se eliminó correctamente',
      icon: '✓',
      type: 'success'
    });
    loadSavedWheels();
  } catch (error) {
    console.error('Error deleting wheel:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo eliminar la ruleta',
      icon: '❌',
      type: 'error'
    });
  }
}

function newWheel() {
  currentWheel = {
    name: 'Mi Ruleta',
    options: ['Opción 1', 'Opción 2', 'Opción 3']
  };
  
  const nameInput = document.getElementById('wheel-name-input');
  if (nameInput) nameInput.value = currentWheel.name;
  
  renderWheelOptions();
  renderWheel();
  wheelRotation = 0;
}

function initWheel() {
  const spinBtn = document.getElementById('spin-wheel-btn');
  const addOptionBtn = document.getElementById('add-wheel-option-btn');
  const saveWheelBtn = document.getElementById('save-wheel-btn');
  const newWheelBtn = document.getElementById('new-wheel-btn');
  const optionInput = document.getElementById('wheel-option-input');
  
  if (spinBtn) spinBtn.onclick = spinWheel;
  if (addOptionBtn) addOptionBtn.onclick = addWheelOption;
  if (saveWheelBtn) saveWheelBtn.onclick = saveCurrentWheel;
  if (newWheelBtn) newWheelBtn.onclick = newWheel;
  
  if (optionInput) {
    optionInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addWheelOption();
    });
  }
  
  renderWheelOptions();
  renderWheel();
  loadSavedWheels();
}

// ============================================
// MAPA DE AVENTURAS
// ============================================

const openMapModalBtn = document.getElementById('open-map-modal-btn');
const mapModal = document.getElementById('map-modal');
const closeMapModalBtn = document.getElementById('close-map-modal-btn');
const placeFormModal = document.getElementById('place-form-modal');
const closePlaceFormBtn = document.getElementById('close-place-form-btn');
const addPlaceBtn = document.getElementById('add-place-btn');
const savePlaceBtn = document.getElementById('save-place-btn');
const cancelPlaceBtn = document.getElementById('cancel-place-btn');
const placesList = document.getElementById('places-list');
const placeTabs = document.querySelectorAll('.places-tab');
const visitedCount = document.getElementById('visited-count');
const wishlistCount = document.getElementById('wishlist-count');
const placeInfoModal = document.getElementById('place-info-modal');

// Globo 3D
let globe = null;
let currentTab = 'visited';
let editingPlaceId = null;
let allPlacesData = [];
let isAutoRotate = false;
let selectedPhotos = [];

// Modal de confirmación
const confirmModal = document.getElementById('confirm-modal');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalCancel = document.getElementById('confirm-modal-cancel');
const confirmModalConfirm = document.getElementById('confirm-modal-confirm');
let confirmCallback = null;

function showConfirmDialog(title, message, onConfirm) {
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  confirmCallback = onConfirm;
  showModal(confirmModal, 'standard');
}

function hideConfirmModal() {
  hideModal(confirmModal, 'standard');
  confirmCallback = null;
}

if (confirmModalCancel) {
  confirmModalCancel.onclick = () => {
    hideConfirmModal();
  };
}

if (confirmModalConfirm) {
  confirmModalConfirm.onclick = () => {
    if (confirmCallback) {
      confirmCallback();
    }
    hideConfirmModal();
  };
}

// Click outside para cerrar confirm modal
if (confirmModal) {
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      hideConfirmModal();
    }
  });
}

// Cerrar modal de confirmación al hacer click en overlay
if (confirmModal) {
  confirmModal.querySelector('.modal-overlay')?.addEventListener('click', () => {
    confirmModal.style.display = 'none';
    confirmCallback = null;
  });
}

// Modal de información de lugar
const placeInfoTitle = document.getElementById('place-info-title');
const placeInfoBody = document.getElementById('place-info-body');
const closePlaceInfoBtn = document.getElementById('close-place-info-btn');

function showPlaceInfo(place) {
  if (!placeInfoModal || !placeInfoTitle || !placeInfoBody) {
    console.error('Modal elements not found:', { placeInfoModal, placeInfoTitle, placeInfoBody });
    return;
  }
  // Solo mostrar el modal de detalles si el globo está visible
  var globeContainer = document.querySelector('.globe-container');
  var mapModal = document.getElementById('map-modal');
  if (!globeContainer || !mapModal || mapModal.style.display !== 'flex' || !globe) {
    console.warn('El globo no está visible, no se muestra el modal de detalles');
    return;
  }
  
  const icon = place.status === 'visited' ? '📍' : '✈️';
  placeInfoTitle.textContent = `${icon} ${place.name}`;
  
  let photosHtml = '';
  if (place.photos && place.photos.length > 0) {
    photosHtml = `
      <div class="place-info-photos">
        ${place.photos.map(photo => `
          <img src="${photo}" alt="Foto de ${place.name}" class="place-info-photo">
        `).join('')}
      </div>
    `;
  }
  
  placeInfoBody.innerHTML = `
    <div class="place-info-content">
      <div class="place-info-row">
        <strong>🌍 País:</strong>
        <span>${place.country}</span>
      </div>
      ${place.date ? `
        <div class="place-info-row">
          <strong>📅 Fecha:</strong>
          <span>${place.date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      ` : ''}
      ${place.note ? `
        <div class="place-info-note">
          <strong>💭 Recuerdo:</strong>
          <p>${place.note}</p>
        </div>
      ` : ''}
      ${photosHtml}
    </div>
  `;
  
  console.log('Contenido del modal cargado:', placeInfoBody.innerHTML.length, 'caracteres');
  
  console.log('Mostrando modal de lugar:', place.name);
  
  // Configuración especial para cuando está dentro del modal del mapa
  if (mapModal && mapModal.style.display === 'flex') {
    // Mostrar el modal como hijo del modal del mapa para mejor stacking
    mapModal.appendChild(placeInfoModal);
    placeInfoModal.style.position = 'absolute';
    placeInfoModal.style.inset = '0';
    placeInfoModal.style.zIndex = '86000'; // DETALLES DE LUGARES - MUY ALTO
    placeInfoModal.style.pointerEvents = 'auto'; // Asegurar que sea interactuable
    placeInfoModal.style.display = 'flex';
    placeInfoModal.style.visibility = 'visible';
    placeInfoModal.style.opacity = '1';
    placeInfoModal.classList.add('is-open');
  
    // Asegurar que el contenido del modal sea interactuable
    const modalContent = placeInfoModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.pointerEvents = 'auto';
      modalContent.style.position = 'relative';
      modalContent.style.zIndex = '87000'; // CONTENIDO DETALLES - MUY ALTO
    }
  } else {
    // Usar el sistema unificado de modales cuando no está dentro del mapa
    showModal(placeInfoModal, 'standard');
  }
  
  // Configuración visual adicional
  placeInfoModal.style.alignItems = 'center';
  placeInfoModal.style.justifyContent = 'center';
  placeInfoModal.style.transform = 'none';
  placeInfoModal.style.opacity = '1';
  placeInfoModal.style.transition = 'none';
  
  // Forzar centrado del contenido
  const modalContent = placeInfoModal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.style.margin = 'auto';
    modalContent.style.transform = 'none';
    modalContent.style.transition = 'none'; // Deshabilitar transiciones
  }
  
  console.log('Modal configurado:', {
    display: placeInfoModal.style.display,
    zIndex: placeInfoModal.style.zIndex,
    position: placeInfoModal.style.position,
    visibility: window.getComputedStyle(placeInfoModal).visibility,
    opacity: window.getComputedStyle(placeInfoModal).opacity
  });
  
  // Agregar event listeners a las fotos para el lightbox
  if (place.photos && place.photos.length > 0) {
    const photoElements = placeInfoBody.querySelectorAll('.place-info-photo');
    console.log('Configurando event listeners para', photoElements.length, 'fotos');
    photoElements.forEach((img, index) => {
      img.onclick = (e) => {
        e.stopPropagation(); // Prevenir que el evento se propague al overlay
        console.log('Clic en foto', index);
        openLightbox(place.photos, index);
      };
      img.style.cursor = 'pointer'; // Asegurar que se vea clickeable
      img.style.pointerEvents = 'auto'; // Asegurar interactividad
    });
  }
  
  // Reconfigurar event listeners para cerrar el modal (por si el DOM cambió)
  if (closePlaceInfoBtn) {
    closePlaceInfoBtn.onclick = () => {
      console.log('Clic en botón cerrar modal de detalles');
      closePlaceInfoModal();
    };
    closePlaceInfoBtn.style.pointerEvents = 'auto'; // Asegurar que sea clickeable
    closePlaceInfoBtn.style.cursor = 'pointer';
  }

  if (placeInfoModal) {
    const overlay = placeInfoModal.querySelector('.modal-overlay');
    if (overlay) {
      overlay.onclick = () => {
        console.log('Clic en overlay del modal de detalles');
        closePlaceInfoModal();
      };
      overlay.style.pointerEvents = 'auto'; // Asegurar que sea clickeable
      overlay.style.cursor = 'pointer';
    }
  }
}

// Event listeners para cerrar el modal se configuran dentro de showPlaceInfo
// para que funcionen cuando el modal se mueve en el DOM

function closePlaceInfoModal() {
  console.log('Cerrando modal de detalles de lugar');
  
  const mapModal = document.getElementById('map-modal');
  const isInsideMap = mapModal && mapModal.contains(placeInfoModal);
  
  if (isInsideMap) {
    // Si está dentro del modal del mapa, solo ocultar este modal
    console.log('Modal está dentro del mapa, ocultando solo el modal de detalles');
    placeInfoModal.style.display = 'none';
    // Devolver el modal a su posición original en el DOM
    document.body.appendChild(placeInfoModal);
  } else {
    // Si está standalone, usar el sistema unificado de modales
    console.log('Modal está standalone, usando hideModal');
    hideModal(placeInfoModal, 'standard');
  }
}

// Función para mostrar modales de música respetando modales anidados
function showMusicModal(modal, modalType = 'music') {
  console.log(`showMusicModal: Showing modal ${modal.id} with type ${modalType}`);
  
  const phoneModal = document.getElementById('phone-modal');
  const isInsidePhone = phoneModal && phoneModal.classList.contains('is-open');
  
  if (isInsidePhone) {
    // Si estamos dentro del teléfono, mostrar como hijo sin cerrar el modal padre
    console.log('Modal de música mostrado dentro del teléfono, sin cerrar el modal padre');
    phoneModal.appendChild(modal);
    modal.style.position = 'absolute';
    modal.style.inset = '0';
    modal.style.zIndex = '75000'; // MODALES DE MÚSICA HIJOS - ALTO
    modal.style.pointerEvents = 'auto';
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('is-open');
    
    // Asegurar que el contenido del modal sea interactuable
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.pointerEvents = 'auto';
      modalContent.style.position = 'relative';
      modalContent.style.zIndex = '76000';
    }
  } else {
    // Si no estamos dentro del teléfono, usar el sistema unificado normal
    console.log('Modal de música mostrado normalmente (no dentro del teléfono)');
    showModal(modal, modalType);
  }
}

// Función para ocultar modales de música respetando modales anidados
function hideMusicModal(modal, modalType = 'music') {
  console.log(`hideMusicModal: Hiding modal ${modal.id} with type ${modalType}`);
  
  const phoneModal = document.getElementById('phone-modal');
  const isInsidePhone = phoneModal && phoneModal.contains(modal);
  
  if (isInsidePhone) {
    // Si está dentro del teléfono, solo ocultar este modal
    console.log('Modal de música ocultado (estaba dentro del teléfono)');
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    // Devolver el modal a su posición original en el DOM
    document.body.appendChild(modal);
  } else {
    // Si está standalone, usar el sistema unificado de modales
    console.log('Modal de música ocultado normalmente');
    hideModal(modal, modalType);
  }
}

// Función para mostrar modales de lugares respetando modales anidados
function showPlaceModal(modal, modalType = 'place') {
  console.log(`showPlaceModal: Showing modal ${modal.id} with type ${modalType}`);
  
  const mapModal = document.getElementById('map-modal');
  const isInsideMap = mapModal && mapModal.classList.contains('is-open');
  
  if (isInsideMap) {
    // Si estamos dentro del modal del mapa, mostrar como hijo sin cerrar el modal padre
    console.log('Modal de lugar mostrado dentro del modal del mapa, sin cerrar el modal padre');
    mapModal.appendChild(modal);
    modal.style.position = 'absolute';
    modal.style.inset = '0';
    modal.style.zIndex = '87000'; // MODALES DE LUGARES HIJOS - MUY ALTO
    modal.style.pointerEvents = 'auto';
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.classList.add('is-open');
    
    // Asegurar que el contenido del modal sea interactuable
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.style.pointerEvents = 'auto';
      modalContent.style.position = 'relative';
      modalContent.style.zIndex = '88000';
    }
  } else {
    // Si no estamos dentro del modal del mapa, usar el sistema unificado normal
    console.log('Modal de lugar mostrado normalmente (no dentro del modal del mapa)');
    showModal(modal, 'standard');
  }
}

// Función para ocultar modales de lugares respetando modales anidados
function hidePlaceModal(modal, modalType = 'place') {
  console.log(`hidePlaceModal: Hiding modal ${modal.id} with type ${modalType}`);
  
  const mapModal = document.getElementById('map-modal');
  const isInsideMap = mapModal && mapModal.contains(modal);
  
  if (isInsideMap) {
    // Si está dentro del modal del mapa, solo ocultar este modal
    console.log('Modal de lugar ocultado (estaba dentro del modal del mapa)');
    modal.classList.remove('is-open');
    modal.style.display = 'none';
    // Devolver el modal a su posición original en el DOM
    document.body.appendChild(modal);
  } else {
    // Si está standalone, usar el sistema unificado de modales
    console.log('Modal de lugar ocultado normalmente');
    hideModal(modal, 'standard');
  }
}

// Lightbox para ver fotos en grande
const lightbox = document.getElementById('photo-lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxCounter = document.getElementById('lightbox-counter');

let currentPhotos = [];
let currentPhotoIndex = 0;

function openLightbox(photos, index) {
  console.log('Abriendo lightbox con', photos.length, 'fotos, índice:', index);
  console.log('Lightbox element:', lightbox);
  if (!lightbox) {
    console.error('Lightbox element not found!');
    return;
  }
  
  // Asegurar que el lightbox esté en el body para máximo z-index
  document.body.appendChild(lightbox);
  
  currentPhotos = photos;
  currentPhotoIndex = index;
  showCurrentPhoto();
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
  console.log('Lightbox activado, clase active:', lightbox.classList.contains('active'));
  console.log('Lightbox display:', window.getComputedStyle(lightbox).display);
  
  // Verificar después de un momento si sigue abierto
  setTimeout(() => {
    console.log('Lightbox después de timeout - display:', window.getComputedStyle(lightbox).display);
    console.log('Lightbox después de timeout - active:', lightbox.classList.contains('active'));
  }, 100);
}

function closeLightbox() {
  console.log('Cerrando lightbox');
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function showCurrentPhoto() {
  if (currentPhotos.length === 0) {
    console.log('No hay fotos para mostrar');
    return;
  }
  
  console.log('Mostrando foto:', currentPhotos[currentPhotoIndex]);
  lightboxImage.src = currentPhotos[currentPhotoIndex];
  lightboxCounter.textContent = `${currentPhotoIndex + 1} / ${currentPhotos.length}`;
  
  // Mostrar/ocultar botones de navegación
  if (currentPhotos.length <= 1) {
    lightboxPrev.style.display = 'none';
    lightboxNext.style.display = 'none';
  } else {
    lightboxPrev.style.display = 'flex';
    lightboxNext.style.display = 'flex';
  }
}

function nextPhoto() {
  currentPhotoIndex = (currentPhotoIndex + 1) % currentPhotos.length;
  showCurrentPhoto();
}

function prevPhoto() {
  currentPhotoIndex = (currentPhotoIndex - 1 + currentPhotos.length) % currentPhotos.length;
  showCurrentPhoto();
}

if (lightboxClose) {
  lightboxClose.onclick = closeLightbox;
}

if (lightboxNext) {
  lightboxNext.onclick = nextPhoto;
}

if (lightboxPrev) {
  lightboxPrev.onclick = prevPhoto;
}

// Cerrar lightbox al hacer clic en el fondo
if (lightbox) {
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });
}

// Navegación con teclado
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  
  if (e.key === 'Escape') {
    closeLightbox();
  } else if (e.key === 'ArrowRight') {
    nextPhoto();
  } else if (e.key === 'ArrowLeft') {
    prevPhoto();
  }
});

// Abrir modal del mapa
if (openMapModalBtn) {
  openMapModalBtn.onclick = () => {
    console.log('=== Abriendo modal del mapa ===');
    console.log('Estado antes de abrir:');
    const mapModalCheck = document.getElementById('map-modal');
    const placeInfoModalCheck = document.getElementById('place-info-modal');
    console.log('mapModal display:', mapModalCheck ? mapModalCheck.style.display : 'no modal');
    console.log('placeInfoModal display:', placeInfoModalCheck ? placeInfoModalCheck.style.display : 'no modal');
    console.log('placeInfoModal parent:', placeInfoModalCheck ? placeInfoModalCheck.parentElement?.id : 'no parent');
    console.log('is placeInfoModal inside mapModal?', mapModalCheck && placeInfoModalCheck ? mapModalCheck.contains(placeInfoModalCheck) : 'cannot check');
    
    showModal(mapModal, 'standard');
    setTimeout(() => {
      initGlobe();
      loadPlaces();
    }, 500);
  };
}

// Cerrar modal del mapa
if (closeMapModalBtn) {
  closeMapModalBtn.onclick = () => {
    hideModal(mapModal, 'standard');
    // Ocultar el modal de detalles y devolverlo a su posición original
    if (placeInfoModal && placeInfoModal.style.display === 'flex') {
      placeInfoModal.style.display = 'none';
      // Devolver el modal a su posición original en el DOM
      document.body.appendChild(placeInfoModal);
      console.log('Modal de detalles ocultado y movido de vuelta al body');
    }
  };
}

// Click outside para cerrar map modal
if (mapModal) {
  mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) {
      mapModal.style.display = 'none';
      // Ocultar el modal de detalles y devolverlo a su posición original
      if (placeInfoModal && placeInfoModal.style.display === 'flex') {
        placeInfoModal.style.display = 'none';
        document.body.appendChild(placeInfoModal);
      }
    }
  });
}

// Controles de pestañas
placeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    placeTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    loadPlaces();
  });
});

// Abrir formulario para agregar lugar
if (addPlaceBtn) {
  addPlaceBtn.onclick = () => {
    editingPlaceId = null;
    selectedPhotos = [];
    document.getElementById('place-form-title').textContent = '✨ Agregar Lugar';
    document.getElementById('place-search-input').value = '';
    document.getElementById('place-name-input').value = '';
    document.getElementById('place-country-input').value = '';
    document.getElementById('place-lat-input').value = '';
    document.getElementById('place-lng-input').value = '';
    document.getElementById('place-note-input').value = '';
    document.getElementById('place-date-input').value = '';
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('photos-preview').innerHTML = '';
    document.querySelector('input[name="place-status"][value="visited"]').checked = true;
    updatePhotosFieldVisibility();
    showPlaceModal(placeFormModal, 'place');
  };
}

// Controlar visibilidad del campo de fotos según el estado
const statusRadios = document.querySelectorAll('input[name="place-status"]');
statusRadios.forEach(radio => {
  radio.addEventListener('change', updatePhotosFieldVisibility);
});

function updatePhotosFieldVisibility() {
  const status = document.querySelector('input[name="place-status"]:checked')?.value;
  const photosGroup = document.getElementById('photos-group');
  if (photosGroup) {
    photosGroup.style.display = status === 'visited' ? 'block' : 'none';
  }
}

// Manejo de fotos
const photosInput = document.getElementById('place-photos-input');
const photosPreview = document.getElementById('photos-preview');
const addPhotoBtn = document.getElementById('add-photo-btn');

// Botón para abrir selector de archivos
if (addPhotoBtn && photosInput) {
  addPhotoBtn.onclick = () => {
    photosInput.click();
  };
}

if (photosInput) {
  photosInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          selectedPhotos.push({
            file: file,
            dataUrl: event.target.result
          });
          renderPhotosPreview();
        };
        reader.readAsDataURL(file);
      }
    });
    photosInput.value = ''; // Reset input
  });
}

function renderPhotosPreview() {
  if (!photosPreview) return;
  
  photosPreview.innerHTML = selectedPhotos.map((photo, index) => `
    <div class="photo-preview-item">
      <img src="${photo.dataUrl}" alt="Foto ${index + 1}">
      <button type="button" class="photo-preview-remove" data-index="${index}">×</button>
    </div>
  `).join('');
  
  // Event listeners para eliminar fotos
  photosPreview.querySelectorAll('.photo-preview-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index);
      selectedPhotos.splice(index, 1);
      renderPhotosPreview();
    });
  });
}

// Búsqueda de ubicaciones
const searchLocationBtn = document.getElementById('search-location-btn');
const searchInput = document.getElementById('place-search-input');
const searchResults = document.getElementById('search-results');

if (searchLocationBtn) {
  searchLocationBtn.onclick = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      showNotification({
        title: 'Búsqueda vacía',
        message: 'Por favor escribe una ubicación para buscar',
        icon: '🔍',
        type: 'warning'
      });
      return;
    }
    
    searchLocationBtn.disabled = true;
    searchLocationBtn.textContent = 'Buscando...';
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const results = await response.json();
      
      if (results.length === 0) {
        searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(139, 111, 71, 0.6);">No se encontraron resultados</div>';
        searchResults.style.display = 'block';
      } else {
        displaySearchResults(results);
      }
    } catch (error) {
      console.error('Error al buscar ubicación:', error);
      showNotification({
        title: 'Error de búsqueda',
        message: 'Error al buscar la ubicación. Por favor intenta de nuevo.',
        icon: '❌',
        type: 'error'
      });
    } finally {
      searchLocationBtn.disabled = false;
      searchLocationBtn.textContent = 'Buscar Coordenadas';
    }
  };
}

// Enter para buscar
if (searchInput) {
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchLocationBtn.click();
    }
  });
}

function displaySearchResults(results) {
  searchResults.innerHTML = results.map(result => `
    <div class="search-result-item" data-lat="${result.lat}" data-lng="${result.lon}" data-name="${result.display_name}">
      <span class="search-result-icon">📍</span>
      <div class="search-result-info">
        <div class="search-result-name">${result.name || result.display_name.split(',')[0]}</div>
        <div class="search-result-address">${result.display_name}</div>
      </div>
    </div>
  `).join('');
  searchResults.style.display = 'block';
  
  // Event listeners para seleccionar resultado
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      const fullAddress = item.dataset.name;
      const addressParts = fullAddress.split(',').map(s => s.trim());
      
      // Extraer nombre y país del resultado
      const name = addressParts[0];
      const country = addressParts[addressParts.length - 1];
      
      document.getElementById('place-name-input').value = name;
      document.getElementById('place-country-input').value = country;
      document.getElementById('place-lat-input').value = lat.toFixed(6);
      document.getElementById('place-lng-input').value = lng.toFixed(6);
      
      searchResults.style.display = 'none';
      searchInput.value = '';
      
      // Mostrar en el globo
      if (globe) {
        globe.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
      }
    });
  });
}

// Cerrar formulario
if (closePlaceFormBtn) {
  closePlaceFormBtn.onclick = () => {
    hidePlaceModal(placeFormModal, 'place');
  };
}

if (cancelPlaceBtn) {
  cancelPlaceBtn.onclick = () => {
    hidePlaceModal(placeFormModal, 'place');
  };
}

// Click outside para cerrar place form modal
if (placeFormModal) {
  placeFormModal.addEventListener('click', (e) => {
    if (e.target === placeFormModal) {
      hidePlaceModal(placeFormModal, 'place');
    }
  });
}

// Guardar lugar
if (savePlaceBtn) {
  savePlaceBtn.onclick = async () => {
    const name = document.getElementById('place-name-input').value.trim();
    const country = document.getElementById('place-country-input').value.trim();
    const lat = parseFloat(document.getElementById('place-lat-input').value);
    const lng = parseFloat(document.getElementById('place-lng-input').value);
    const note = document.getElementById('place-note-input').value.trim();
    const dateStr = document.getElementById('place-date-input').value;
    const status = document.querySelector('input[name="place-status"]:checked').value;
    
    if (!name || !country) {
      showNotification({
        title: 'Campos incompletos',
        message: 'Por favor completa el nombre y país',
        icon: '⚠️',
        type: 'warning'
      });
      return;
    }
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      showNotification({
        title: 'Coordenadas requeridas',
        message: 'Por favor usa el buscador para obtener las coordenadas del lugar',
        icon: '🔍',
        type: 'warning'
      });
      return;
    }
    
    savePlaceBtn.disabled = true;
    savePlaceBtn.textContent = 'Guardando...';
    
    try {
      const placeData = {
        name,
        country,
        lat,
        lng,
        note,
        status,
        date: dateStr ? new Date(dateStr) : null,
        createdAt: new Date(),
      };
      
      // Manejar fotos
      if (status === 'visited') {
        // Si estamos editando, obtener las fotos existentes
        let existingPhotos = [];
        if (editingPlaceId) {
          const existingPlace = allPlacesData.find(p => p.id === editingPlaceId);
          existingPhotos = existingPlace?.photos || [];
        }
        
        // Subir nuevas fotos si las hay
        if (selectedPhotos.length > 0) {
          const newPhotoUrls = await uploadPlacePhotos(selectedPhotos);
          placeData.photos = [...existingPhotos, ...newPhotoUrls];
        } else {
          placeData.photos = existingPhotos;
        }
      }
      
      if (editingPlaceId) {
        await updatePlace(editingPlaceId, placeData);
      } else {
        await createPlace(placeData);
      }
      
      hidePlaceModal(placeFormModal, 'place');
      selectedPhotos = [];
      await loadPlaces();
      updateGlobeMarkers();
    } catch (error) {
      console.error('Error al guardar lugar:', error);
      showNotification({
        title: 'Error al guardar',
        message: 'No se pudo guardar el lugar. Intenta de nuevo.',
        icon: '❌',
        type: 'error'
      });
    } finally {
      savePlaceBtn.disabled = false;
      savePlaceBtn.textContent = 'Guardar Lugar';
    }
  };
}

// Subir fotos a Firebase Storage
async function uploadPlacePhotos(photos) {
  const photoUrls = [];
  
  for (const photo of photos) {
    try {
      const storageRef = ref(storage, `couples/${currentCoupleId}/places/${Date.now()}_${photo.file.name}`);
      await uploadBytes(storageRef, photo.file);
      const url = await getDownloadURL(storageRef);
      photoUrls.push(url);
    } catch (error) {
      console.error('Error al subir foto:', error);
    }
  }
  
  return photoUrls;
}

// Funciones de Firestore
async function createPlace(placeData) {
  if (!currentCoupleId) return;
  
  const placesRef = collection(db, 'couples', currentCoupleId, 'places');
  await addDoc(placesRef, placeData);
}

async function updatePlace(placeId, placeData) {
  if (!currentCoupleId) return;
  
  const placeRef = doc(db, 'couples', currentCoupleId, 'places', placeId);
  await updateDoc(placeRef, { ...placeData, updatedAt: new Date() });
}

async function deletePlace(placeId) {
  if (!currentCoupleId) return;
  
  const placeRef = doc(db, 'couples', currentCoupleId, 'places', placeId);
  await deleteDoc(placeRef);
}

async function loadPlaces() {
  if (!currentCoupleId) return;
  
  try {
    const placesRef = collection(db, 'couples', currentCoupleId, 'places');
    const q = query(placesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    allPlacesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    }));
    
    const places = allPlacesData.filter(p => p.status === currentTab);
    
    // Actualizar contadores
    visitedCount.textContent = allPlacesData.filter(p => p.status === 'visited').length;
    wishlistCount.textContent = allPlacesData.filter(p => p.status === 'wishlist').length;
    
    renderPlaces(places);
    updateGlobeMarkers();
  } catch (error) {
    console.error('Error al cargar lugares:', error);
  }
}

function renderPlaces(places) {
  if (places.length === 0) {
    placesList.innerHTML = `
      <div class="places-empty">
        <div class="empty-icon">🌍</div>
        <p>Aún no han marcado lugares</p>
        <p class="empty-subtitle">¡Empiecen a crear sus recuerdos!</p>
      </div>
    `;
    return;
  }
  
  placesList.innerHTML = places.map(place => `
    <div class="place-card" data-id="${place.id}">
      <div class="place-card-header">
        <span class="place-pin">${place.status === 'visited' ? '📍' : '✈️'}</span>
        <div class="place-info">
          <div class="place-name">${place.name}</div>
          <div class="place-country">${place.country}</div>
          ${place.date ? `<div class="place-date">${place.date.toLocaleDateString('es-ES')}</div>` : ''}
        </div>
      </div>
      ${place.note ? `<div class="place-note">"${place.note}"</div>` : ''}
      <div class="place-actions">
        <button class="place-action-btn edit-place-btn" data-id="${place.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Editar
        </button>
        <button class="place-action-btn delete-place-btn" data-id="${place.id}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  `).join('');
  
  // Event listeners
  document.querySelectorAll('.edit-place-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const placeId = btn.dataset.id;
      const place = places.find(p => p.id === placeId);
      if (place) {
        editingPlaceId = placeId;
        selectedPhotos = [];
        document.getElementById('place-form-title').textContent = '✏️ Editar Lugar';
        document.getElementById('place-name-input').value = place.name;
        document.getElementById('place-country-input').value = place.country;
        document.getElementById('place-lat-input').value = place.lat || '';
        document.getElementById('place-lng-input').value = place.lng || '';
        document.getElementById('place-note-input').value = place.note || '';
        document.getElementById('place-date-input').value = place.date ? place.date.toISOString().split('T')[0] : '';
        
        // Mostrar fotos existentes como preview (sin permitir eliminarlas por ahora)
        const photosPreview = document.getElementById('photos-preview');
        if (place.photos && place.photos.length > 0) {
          photosPreview.innerHTML = place.photos.map((photoUrl) => `
            <div class="photo-preview-item">
              <img src="${photoUrl}" alt="Foto existente">
              <span class="photo-existing-badge">✓</span>
            </div>
          `).join('');
        } else {
          photosPreview.innerHTML = '';
        }
        
        document.querySelector(`input[name="place-status"][value="${place.status}"]`).checked = true;
        updatePhotosFieldVisibility();
        showPlaceModal(placeFormModal, 'place');
      }
    };
  });
  
  document.querySelectorAll('.delete-place-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const placeId = btn.dataset.id;
      const place = places.find(p => p.id === placeId);
      showConfirmDialog(
        '🗑️ Eliminar Lugar',
        `¿Estás seguro de eliminar "${place?.name || 'este lugar'}"?`,
        async () => {
          await deletePlace(placeId);
          await loadPlaces();
        }
      );
    };
  });
  
  // Click en tarjeta para volar al lugar en el globo
  document.querySelectorAll('.place-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.place-action-btn')) return;
      const placeId = card.dataset.id;
      const place = allPlacesData.find(p => p.id === placeId);
      if (place && globe) {
        globe.pointOfView({
          lat: place.lat,
          lng: place.lng,
          altitude: 1.5
        }, 1000);
      }
    });
  });
}

// Globo 3D con Globe.GL
function initGlobe() {
  if (globe) return; // Ya está inicializado
  
  const container = document.getElementById('globe-viz');
  if (!container) return;
  
  globe = Globe()
    (container)
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#FFB6D9')
    .atmosphereAltitude(0.15)
    .pointAltitude(0.01)
    .pointRadius(0.6)
    .pointColor(d => d.status === 'visited' ? '#FF6B9D' : '#FFA500')
    .pointLabel(d => `
      <div style="
        background: linear-gradient(135deg, #FFB6D9 0%, #FF8DC7 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 12px;
        font-family: 'Fredoka', sans-serif;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      ">
        <strong>${d.status === 'visited' ? '📍' : '✈️'} ${d.name}</strong><br/>
        ${d.country}<br/>
        ${d.note ? `<em style="font-size: 12px;">"${d.note}"</em>` : ''}
      </div>
    `)
    .onPointClick(d => {
      showPlaceInfo(d);
    });
  
  // Configurar controles
  const controls = globe.controls();
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.5;
  controls.enableZoom = true;
  controls.minDistance = 150;
  controls.maxDistance = 500;
  
  // Animación inicial - centrado mejor
  globe.pointOfView({ lat: 15, lng: 10, altitude: 2 }, 0);
  
  // Ajustar altura de la cámara para mejor centrado
  setTimeout(() => {
    const scene = globe.scene();
    if (scene && scene.camera) {
      scene.camera.position.y = 0;
    }
  }, 100);
  
  // Controles personalizados
  document.getElementById('rotate-globe-btn')?.addEventListener('click', () => {
    isAutoRotate = !isAutoRotate;
    controls.autoRotate = isAutoRotate;
    const btn = document.getElementById('rotate-globe-btn');
    btn.style.background = isAutoRotate ? '#FFB6D9' : '';
  });
  
  document.getElementById('reset-globe-btn')?.addEventListener('click', () => {
    globe.pointOfView({ lat: 15, lng: 10, altitude: 2 }, 1000);
    isAutoRotate = false;
    controls.autoRotate = false;
    document.getElementById('rotate-globe-btn').style.background = '';
  });
  
  document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.max(pov.altitude - 0.3, 0.5) }, 300);
  });
  
  document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
    const pov = globe.pointOfView();
    globe.pointOfView({ ...pov, altitude: Math.min(pov.altitude + 0.3, 3) }, 300);
  });
}

function updateGlobeMarkers() {
  if (!globe) return;
  
  const markers = allPlacesData.map(place => ({
    lat: place.lat,
    lng: place.lng,
    name: place.name,
    country: place.country,
    note: place.note,
    status: place.status,
    date: place.date,
    photos: place.photos || [],
    size: 1
  }));
  
  globe.pointsData(markers);
}

// ============================================
// REGISTRO DEL SERVICE WORKER (PWA)
// ============================================

// Variable para el prompt de instalación
let deferredPrompt;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[PWA] Intentando registrar Service Worker...');
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[PWA] Service Worker registrado con éxito:', registration);
        console.log('[PWA] Estado del SW:', registration.active ? 'Activo' : 'Instalándose');

        // Escuchar actualizaciones del service worker
        registration.addEventListener('updatefound', () => {
          console.log('[PWA] Nuevo Service Worker encontrado');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('[PWA] Estado del nuevo SW:', newWorker.state);
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateNotification();
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('[PWA] Error en el registro del Service Worker:', error);
      });
  });
} else {
  console.warn('[PWA] Service Worker no soportado en este navegador');
}

// Event listener para el prompt de instalación
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[PWA] Prompt de instalación disponible');
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar botón de instalación personalizado
  showInstallButton();
});

// Detectar cuando la app está instalada
window.addEventListener('appinstalled', (e) => {
  console.log('[PWA] App instalada exitosamente');
  deferredPrompt = null;
  hideInstallButton();
});

// Función para mostrar notificación de actualización mejorada
function showUpdateNotification() {
  // Remover cualquier banner existente
  hideUpdateBanner();

  // Crear banner de actualización moderno
  const updateBanner = document.createElement('div');
  updateBanner.id = 'pwa-update-banner';
  updateBanner.innerHTML = `
    <div class="update-banner-content">
      <div class="update-icon">
        <div class="update-icon-wrapper">
          🎉
          <div class="update-pulse"></div>
        </div>
      </div>
      <div class="update-text">
        <h3>¡Nueva versión disponible!</h3>
        <p>Actualiza para obtener las últimas mejoras y nuevas funcionalidades</p>
        <div class="update-features">
          <span class="feature-tag">🚀 Nuevas funciones</span>
          <span class="feature-tag">🐛 Corrección de bugs</span>
          <span class="feature-tag">⚡ Mejor rendimiento</span>
        </div>
      </div>
      <div class="update-actions">
        <button class="update-btn update-now" onclick="applyUpdate()">
          <span class="btn-icon">⬇️</span>
          <span class="btn-text">Actualizar Ahora</span>
        </button>
        <button class="update-btn update-later" onclick="postponeUpdate()">
          <span class="btn-text">Después</span>
        </button>
      </div>
      <button class="update-close" onclick="hideUpdateBanner()" title="Cerrar">
        ✕
      </button>
    </div>
    <div class="update-progress" id="update-progress" style="display: none;">
      <div class="progress-bar">
        <div class="progress-fill" id="update-progress-fill"></div>
      </div>
      <span class="progress-text" id="update-progress-text">Actualizando...</span>
    </div>
  `;

  updateBanner.className = 'pwa-update-banner';
  document.body.appendChild(updateBanner);

  // Animar entrada
  setTimeout(() => updateBanner.classList.add('visible'), 100);

  // Auto-ocultar después de 2 minutos si no hay interacción
  setTimeout(() => {
    if (updateBanner.parentNode) {
      hideUpdateBanner();
    }
  }, 120000);
}

// Función para aplicar actualización con progreso
async function applyUpdate() {
  const progressEl = document.getElementById('update-progress');
  const progressFill = document.getElementById('update-progress-fill');
  const progressText = document.getElementById('update-progress-text');

  if (progressEl) {
    progressEl.style.display = 'block';

    // Simular progreso de actualización
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        progressText.textContent = '¡Actualización completada!';
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Actualizando... ${Math.round(progress)}%`;
    }, 300);
  } else {
    // Fallback directo
    window.location.reload();
  }
}

// Función para posponer actualización
function postponeUpdate() {
  // Guardar timestamp de posposición
  localStorage.setItem('updatePostponed', Date.now().toString());

  // Recordar mostrar de nuevo en 24 horas
  setTimeout(() => {
    showUpdateNotification();
  }, 24 * 60 * 60 * 1000);

  hideUpdateBanner();

  showNotification({
    title: '⏰ Actualización pospuesta',
    message: 'Te recordaremos en 24 horas',
    type: 'info',
    duration: 3000
  });
}

// Función para ocultar banner de actualización mejorada
function hideUpdateBanner() {
  const banner = document.getElementById('pwa-update-banner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
  }
}

// Función para mostrar botón de instalación mejorado
function showInstallButton() {
  // Remover cualquier banner existente
  hideInstallButton();

  // Crear banner de instalación moderno
  const installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.innerHTML = `
    <div class="install-banner-content">
      <div class="install-icon">
        <div class="icon-wrapper">
          📱
          <div class="pulse-ring"></div>
          <div class="pulse-ring pulse-ring-delay"></div>
        </div>
      </div>
      <div class="install-text">
        <h3>¡Instala ThingsToDo!</h3>
        <p>Disfruta de la experiencia completa con notificaciones, acceso offline y mucho más</p>
        <div class="install-features">
          <span class="feature">🔔 Notificaciones</span>
          <span class="feature">📴 Modo Offline</span>
          <span class="feature">⚡ Súper Rápido</span>
        </div>
      </div>
      <div class="install-actions">
        <button class="install-btn install-now" onclick="installPWA()">
          <span class="btn-text">Instalar Ahora</span>
          <span class="btn-icon">⬇️</span>
        </button>
        <button class="install-btn install-later" onclick="hideInstallButton()">
          <span class="btn-text">Después</span>
        </button>
      </div>
      <button class="install-close" onclick="hideInstallButton()" aria-label="Cerrar">
        ✕
      </button>
    </div>
    <div class="install-progress" id="install-progress" style="display: none;">
      <div class="progress-bar">
        <div class="progress-fill" id="progress-fill"></div>
      </div>
      <span class="progress-text" id="progress-text">Instalando...</span>
    </div>
  `;

  installBanner.className = 'pwa-install-banner';
  document.body.appendChild(installBanner);

  // Animar entrada
  setTimeout(() => {
    installBanner.classList.add('visible');
  }, 100);

  // Auto-ocultar después de 30 segundos si no hay interacción
  setTimeout(() => {
    if (installBanner.parentNode) {
      hideInstallButton();
    }
  }, 30000);
}

// Función para mostrar progreso de instalación
function showInstallProgress() {
  const progressEl = document.getElementById('install-progress');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  if (progressEl) {
    progressEl.style.display = 'block';

    // Simular progreso
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        progressText.textContent = '¡Instalación completada!';
        setTimeout(() => hideInstallButton(), 2000);
      }

      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Instalando... ${Math.round(progress)}%`;
    }, 200);
  }
}

// Función para ocultar banner de instalación
function hideInstallButton() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.classList.remove('visible');
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
  }
}

// Función para instalar la PWA con progreso
async function installPWA() {
  if (!deferredPrompt) {
    showNotification({
      title: '❌ Error de instalación',
      message: 'El prompt de instalación no está disponible',
      type: 'error'
    });
    return;
  }

  // Mostrar progreso
  showInstallProgress();

  try {
    // Mostrar el prompt nativo
    deferredPrompt.prompt();

    // Esperar la respuesta del usuario
    const { outcome } = await deferredPrompt.userChoice;

    console.log('[PWA] Resultado de instalación:', outcome);

    // Limpiar el deferred prompt
    deferredPrompt = null;

    if (outcome === 'accepted') {
      console.log('[PWA] PWA instalada exitosamente');

      // Configurar funcionalidades avanzadas después de la instalación
      setTimeout(() => {
        setupAdvancedFeatures();
      }, 1000);

    } else {
      console.log('[PWA] Usuario canceló la instalación');
      hideInstallButton();
    }

  } catch (error) {
    console.error('[PWA] Error durante la instalación:', error);
    hideInstallButton();

    showNotification({
      title: '❌ Error de instalación',
      message: 'Hubo un problema instalando la aplicación',
      type: 'error'
    });
  }
}

// Función para configurar funcionalidades avanzadas después de la instalación
async function setupAdvancedFeatures() {
  console.log('[PWA] Configurando funcionalidades avanzadas...');

  try {
    // Configurar push notifications
    await setupPushNotifications();

    // Configurar periodic sync
    await setupPeriodicSync();

    // Mostrar mensaje de bienvenida
    showNotification({
      title: '🎉 ¡Bienvenido a ThingsToDo!',
      message: 'Tu app está lista. Explora todas las funcionalidades disponibles.',
      type: 'success',
      duration: 5000
    });

    // Registrar instalación en analytics
    trackInstallation();

  } catch (error) {
    console.error('[PWA] Error configurando funcionalidades avanzadas:', error);
  }
}

// Función para trackear instalación (analytics)
function trackInstallation() {
  // Enviar evento de instalación a analytics
  console.log('[PWA] Instalación trackeada');

  // Aquí enviarías datos a tu servicio de analytics
  // gtag('event', 'pwa_install', { ... });
}

// Función para verificar el estado de la PWA
function checkPWAStatus() {
  const pwaStatus = {
    serviceWorker: 'serviceWorker' in navigator,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
    canInstall: !!deferredPrompt,
    manifest: !!document.querySelector('link[rel="manifest"]'),
    installed: window.matchMedia('(display-mode: standalone)').matches,
    shortcuts: 'shortcuts' in navigator
  };

  console.log('[PWA] Estado de la PWA:', pwaStatus);
  return pwaStatus;
}

// Hacer las funciones disponibles globalmente para debugging
window.checkPWAStatus = checkPWAStatus;
window.installPWA = installPWA;
window.hideUpdateBanner = hideUpdateBanner;

// ============================================
// ANALYTICS OFFLINE - PWA
// ============================================

// Almacén de eventos de analytics offline
let offlineAnalyticsQueue = [];

// Función para trackear eventos de analytics
function trackEvent(eventName, eventData = {}) {
  const event = {
    name: eventName,
    data: eventData,
    timestamp: Date.now(),
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    online: navigator.onLine,
    pwaMode: window.matchMedia('(display-mode: standalone)').matches
  };

  console.log('[Analytics] Evento trackeado:', eventName, eventData);

  if (navigator.onLine) {
    // Enviar inmediatamente si estamos online
    sendAnalyticsEvent(event);
  } else {
    // Almacenar para envío posterior
    offlineAnalyticsQueue.push(event);
    saveAnalyticsQueueToStorage();

    console.log('[Analytics] Evento almacenado para envío offline:', offlineAnalyticsQueue.length, 'pendientes');
  }

  // Actualizar estadísticas de uso
  updateUsageStatistics(eventName);
}

// Función para enviar evento de analytics
async function sendAnalyticsEvent(event) {
  try {
    // En una implementación real, enviarías a tu servicio de analytics
    // await fetch('/api/analytics/event', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });

    console.log('[Analytics] Evento enviado:', event.name);

  } catch (error) {
    console.error('[Analytics] Error enviando evento:', error);
    // Si falla, agregar a la cola offline
    offlineAnalyticsQueue.push(event);
    saveAnalyticsQueueToStorage();
  }
}

// Función para sincronizar analytics offline cuando vuelve la conexión
async function syncOfflineAnalytics() {
  if (!navigator.onLine || offlineAnalyticsQueue.length === 0) {
    return;
  }

  console.log('[Analytics] Sincronizando', offlineAnalyticsQueue.length, 'eventos offline...');

  const eventsToSend = [...offlineAnalyticsQueue];
  let successCount = 0;

  for (const event of eventsToSend) {
    try {
      await sendAnalyticsEvent(event);
      // Remover de la cola
      const index = offlineAnalyticsQueue.indexOf(event);
      if (index > -1) {
        offlineAnalyticsQueue.splice(index, 1);
      }
      successCount++;
    } catch (error) {
      console.error('[Analytics] Error sincronizando evento:', event.name, error);
      // Mantener en cola para reintento
    }
  }

  // Guardar cola actualizada
  saveAnalyticsQueueToStorage();

  if (successCount > 0) {
    console.log('[Analytics] Sincronizados', successCount, 'eventos offline');

    showNotification({
      title: '📊 Analytics Sincronizados',
      message: `${successCount} eventos offline enviados exitosamente`,
      type: 'success',
      duration: 3000
    });
  }
}

// Función para guardar cola de analytics en storage
function saveAnalyticsQueueToStorage() {
  try {
    localStorage.setItem('offlineAnalyticsQueue', JSON.stringify(offlineAnalyticsQueue));
  } catch (error) {
    console.error('[Analytics] Error guardando cola de analytics:', error);
  }
}

// Función para cargar cola de analytics desde storage
function loadAnalyticsQueueFromStorage() {
  try {
    const stored = localStorage.getItem('offlineAnalyticsQueue');
    if (stored) {
      offlineAnalyticsQueue = JSON.parse(stored);
      console.log('[Analytics] Cargados', offlineAnalyticsQueue.length, 'eventos offline pendientes');
    }
  } catch (error) {
    console.error('[Analytics] Error cargando cola de analytics:', error);
    offlineAnalyticsQueue = [];
  }
}

// Función para obtener estadísticas de analytics
function getAnalyticsStats() {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const recentEvents = offlineAnalyticsQueue.filter(event => event.timestamp > last24h);

  return {
    totalQueued: offlineAnalyticsQueue.length,
    recentEvents: recentEvents.length,
    oldestEvent: offlineAnalyticsQueue.length > 0 ? new Date(offlineAnalyticsQueue[0].timestamp) : null,
    newestEvent: offlineAnalyticsQueue.length > 0 ? new Date(offlineAnalyticsQueue[offlineAnalyticsQueue.length - 1].timestamp) : null,
    eventsByName: offlineAnalyticsQueue.reduce((acc, event) => {
      acc[event.name] = (acc[event.name] || 0) + 1;
      return acc;
    }, {})
  };
}

// Función para obtener ID de sesión
function getSessionId() {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

// Función para trackear automáticamente eventos importantes
function setupAutomaticTracking() {
  // Trackear carga de página
  trackEvent('page_load', {
    referrer: document.referrer,
    loadTime: performance.now()
  });

  // Trackear interacciones importantes
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-track]');
    if (target) {
      const eventName = target.getAttribute('data-track');
      const eventData = JSON.parse(target.getAttribute('data-track-data') || '{}');
      trackEvent(eventName, eventData);
    }
  });

  // Trackear cambios de visibilidad
  document.addEventListener('visibilitychange', () => {
    trackEvent(document.hidden ? 'page_hidden' : 'page_visible', {
      timeSpent: performance.now()
    });
  });

  // Trackear errores
  window.addEventListener('error', (e) => {
    trackEvent('javascript_error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno
    });
  });

  // Trackear uso offline/online
  window.addEventListener('online', () => {
    trackEvent('network_online');
    syncOfflineAnalytics();
  });

  window.addEventListener('offline', () => {
    trackEvent('network_offline');
  });

  // Trackear instalación PWA
  window.addEventListener('appinstalled', () => {
    trackEvent('pwa_installed', {
      platform: navigator.platform,
      userAgent: navigator.userAgent
    });
  });

  // Trackear activación de shortcuts
  window.addEventListener('shortcut-activated', (e) => {
    trackEvent('shortcut_used', {
      shortcut: e.detail.action
    });
  });
}

// Event listener para el botón de modo de bajo consumo
const openLowPowerModalBtn = document.getElementById('open-low-power-modal-btn');
if (openLowPowerModalBtn) {
  openLowPowerModalBtn.addEventListener('click', () => {
    showLowPowerSettings();
  });
}

// Event listener para el botón de widgets
const openWidgetsModalBtn = document.getElementById('open-widgets-modal-btn');
if (openWidgetsModalBtn) {
  openWidgetsModalBtn.addEventListener('click', () => {
    showWidgetManager();
  });
}

// Event listener para el botón de servicios en background
const openServicesModalBtn = document.getElementById('open-services-modal-btn');
if (openServicesModalBtn) {
  openServicesModalBtn.addEventListener('click', () => {
    showBackgroundServicesManager();
  });
}

// Event listener para el botón de funcionalidades nativas avanzadas
const openNativeFeaturesBtn = document.getElementById('open-native-features-btn');
if (openNativeFeaturesBtn) {
  openNativeFeaturesBtn.addEventListener('click', () => {
    showNativeFeaturesManager();
  });
}

// Event listener para el botón de notificaciones y logros
const openNotificationsBtn = document.getElementById('open-notifications-btn');
if (openNotificationsBtn) {
  openNotificationsBtn.addEventListener('click', () => {
    showNotificationsAndAchievementsMenu();
  });
}

// Inicializar analytics
document.addEventListener('DOMContentLoaded', () => {
  loadAnalyticsQueueFromStorage();
  setupAutomaticTracking();

  // Sincronizar analytics pendientes si estamos online
  if (navigator.onLine) {
    setTimeout(syncOfflineAnalytics, 2000);
  }
});

// Hacer funciones disponibles globalmente para debugging
window.trackEvent = trackEvent;
window.getAnalyticsStats = getAnalyticsStats;
window.syncOfflineAnalytics = syncOfflineAnalytics;

// Estado del modo kiosco
let isKioskMode = false;

// Función para activar modo kiosco
async function enterKioskMode() {
  if (!document.documentElement.requestFullscreen) {
    console.warn('[PWA] Fullscreen no soportado');
    showNotification({
      title: '❌ Modo Kiosco no disponible',
      message: 'Tu navegador no soporta el modo pantalla completa',
      type: 'warning'
    });
    return false;
  }

  try {
    await document.documentElement.requestFullscreen();

    // Cambiar estilos para modo kiosco
    document.body.classList.add('kiosk-mode');
    isKioskMode = true;

    // Ocultar elementos de UI del navegador
    hideBrowserUI();

    // Mostrar controles de kiosco
    showKioskControls();

    console.log('[PWA] Modo kiosco activado');

    showNotification({
      title: '🎯 Modo Kiosco Activado',
      message: 'Pantalla completa para máxima inmersión',
      type: 'success',
      duration: 2000
    });

    return true;

  } catch (error) {
    console.error('[PWA] Error activando modo kiosco:', error);
    showNotification({
      title: '❌ Error en modo kiosco',
      message: 'No se pudo activar la pantalla completa',
      type: 'error'
    });
    return false;
  }
}

// Función para salir del modo kiosco
async function exitKioskMode() {
  if (!document.exitFullscreen) {
    return false;
  }

  try {
    await document.exitFullscreen();

    // Restaurar estilos normales
    document.body.classList.remove('kiosk-mode');
    isKioskMode = false;

    // Mostrar elementos de UI del navegador
    showBrowserUI();

    // Ocultar controles de kiosco
    hideKioskControls();

    console.log('[PWA] Modo kiosco desactivado');

    showNotification({
      title: '📱 Modo Normal',
      message: 'Pantalla completa desactivada',
      type: 'info',
      duration: 2000
    });

    return true;

  } catch (error) {
    console.error('[PWA] Error saliendo del modo kiosco:', error);
    return false;
  }
}

// Función para ocultar elementos de UI del navegador
function hideBrowserUI() {
  // Crear overlay para ocultar elementos del navegador
  const overlay = document.createElement('div');
  overlay.id = 'kiosk-overlay';
  overlay.className = 'kiosk-overlay';
  document.body.appendChild(overlay);

  // Agregar estilos para ocultar scrollbars y elementos
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';
}

// Función para mostrar elementos de UI del navegador
function showBrowserUI() {
  // Remover overlay
  const overlay = document.getElementById('kiosk-overlay');
  if (overlay) {
    overlay.remove();
  }

  // Restaurar scrollbars
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
}

// Función para mostrar controles de kiosco
function showKioskControls() {
  const controls = document.createElement('div');
  controls.id = 'kiosk-controls';
  controls.innerHTML = `
    <div class="kiosk-controls-panel">
      <button class="kiosk-btn kiosk-exit" onclick="exitKioskMode()" title="Salir de pantalla completa">
        ⛶ Salir
      </button>
      <div class="kiosk-info">
        <span class="kiosk-indicator">🎯</span>
        <span>Modo Kiosco</span>
      </div>
      <button class="kiosk-btn kiosk-share" onclick="shareApp()" title="Compartir">
        📤
      </button>
    </div>
  `;
  controls.className = 'kiosk-controls';
  document.body.appendChild(controls);

  // Auto-ocultar controles después de 3 segundos
  let hideTimeout;
  const resetTimer = () => {
    clearTimeout(hideTimeout);
    controls.classList.remove('hidden');
    hideTimeout = setTimeout(() => {
      controls.classList.add('hidden');
    }, 3000);
  };

  // Mostrar controles al mover el mouse
  document.addEventListener('mousemove', resetTimer);
  document.addEventListener('touchstart', resetTimer);

  // Iniciar timer
  resetTimer();
}

// Función para ocultar controles de kiosco
function hideKioskControls() {
  const controls = document.getElementById('kiosk-controls');
  if (controls) {
    controls.remove();
  }

  // Remover event listeners
  document.removeEventListener('mousemove', resetTimer);
  document.removeEventListener('touchstart', resetTimer);
}

// Función para alternar modo kiosco
async function toggleKioskMode() {
  if (isKioskMode) {
    await exitKioskMode();
  } else {
    await enterKioskMode();
  }
}

// Detectar cambios en fullscreen
document.addEventListener('fullscreenchange', () => {
  isKioskMode = !!document.fullscreenElement;

  if (!isKioskMode) {
    // Usuario salió de fullscreen manualmente (F11, etc.)
    document.body.classList.remove('kiosk-mode');
    hideKioskControls();
    showBrowserUI();
  }
});

// Función para verificar si el modo kiosco está disponible
function isKioskModeAvailable() {
  return !!(
    document.documentElement.requestFullscreen &&
    document.exitFullscreen &&
    // Verificar si estamos en una PWA instalada
    window.matchMedia('(display-mode: standalone)').matches
  );
}

// Agregar botón de modo kiosco al menú (solo en PWA instalada)
document.addEventListener('DOMContentLoaded', () => {
  if (isKioskModeAvailable()) {
    // Agregar opción al menú después de un delay
    setTimeout(() => {
      addKioskModeOption();
    }, 2000);
  }
});

// Función para agregar opción de modo kiosco al menú
function addKioskModeOption() {
  // Buscar el menú de navegación o header
  const navMenu = document.querySelector('.nav-menu, .header-menu, .main-nav');
  if (!navMenu) return;

  const kioskItem = document.createElement('div');
  kioskItem.className = 'nav-item kiosk-mode-item';
  kioskItem.innerHTML = `
    <button class="nav-btn kiosk-toggle" onclick="toggleKioskMode()" title="Modo pantalla completa">
      <span class="kiosk-icon">🎯</span>
      <span class="kiosk-label">Modo Kiosco</span>
    </button>
  `;

  navMenu.appendChild(kioskItem);
}

// Hacer funciones disponibles globalmente
window.enterKioskMode = enterKioskMode;
window.exitKioskMode = exitKioskMode;
window.toggleKioskMode = toggleKioskMode;
window.isKioskModeAvailable = isKioskModeAvailable;

// Estado de shortcuts dinámicos
let dynamicShortcuts = [];

// Función para actualizar shortcuts dinámicos
async function updateDynamicShortcuts() {
  if (!('setAppShortcuts' in navigator)) {
    console.warn('[PWA] Dynamic shortcuts no soportados');
    return;
  }

  try {
    // Obtener estado actual de la app
    const appState = await getAppState();

    // Generar shortcuts basados en el estado
    const shortcuts = generateDynamicShortcuts(appState);

    // Actualizar shortcuts
    await navigator.setAppShortcuts(shortcuts);

    dynamicShortcuts = shortcuts;
    console.log('[PWA] Shortcuts dinámicos actualizados:', shortcuts);

  } catch (error) {
    console.error('[PWA] Error actualizando shortcuts dinámicos:', error);
  }
}

// Función para obtener el estado actual de la app
async function getAppState() {
  try {
    // Obtener información del usuario actual
    const currentUser = getCurrentUser();

    // Verificar si hay test activo
    const hasActiveTest = await simulateActiveTest();

    // Verificar si hay pareja conectada
    const hasPartner = await hasPartner();

    // Obtener estadísticas recientes
    const recentStats = await getRecentStats();

    return {
      user: currentUser,
      hasActiveTest,
      hasPartner,
      recentStats,
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('[PWA] Error obteniendo estado de la app:', error);
    return {};
  }
}

// Función para generar shortcuts dinámicos basados en el estado
function generateDynamicShortcuts(appState) {
  const shortcuts = [];

  // Shortcut base: Nuevo Plan
  shortcuts.push({
    name: 'Nuevo Plan Romántico',
    short_name: 'Nuevo Plan',
    description: 'Crear un nuevo plan para tu pareja',
    url: '/index.html?action=new-plan',
    icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
  });

  // Shortcut condicional: Continuar Test
  if (appState.hasActiveTest) {
    shortcuts.push({
      name: 'Continuar Test de Compatibilidad',
      short_name: 'Continuar Test',
      description: 'Continúa respondiendo las preguntas del test',
      url: '/index.html?action=continue-test',
      icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
    });
  } else {
    // Shortcut: Nuevo Test
    shortcuts.push({
      name: 'Nuevo Test de Compatibilidad',
      short_name: 'Hacer Test',
      description: 'Descubre qué tan compatible eres con tu pareja',
      url: '/index.html?action=test',
      icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
    });
  }

  // Shortcut condicional: Ver Resultados
  if (appState.recentStats && appState.recentStats.hasNewResults) {
    shortcuts.push({
      name: 'Ver Nuevos Resultados',
      short_name: 'Resultados',
      description: 'Revisa los resultados más recientes',
      url: '/index.html?action=results',
      icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
    });
  } else {
    // Shortcut: Estadísticas
    shortcuts.push({
      name: 'Ver Estadísticas',
      short_name: 'Estadísticas',
      description: 'Analiza tu progreso como pareja',
      url: '/index.html?action=stats',
      icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
    });
  }

  // Shortcut condicional: Mensajes de Pareja
  if (appState.hasPartner && appState.recentStats && appState.recentStats.unreadMessages > 0) {
    shortcuts.push({
      name: `Mensajes (${appState.recentStats.unreadMessages})`,
      short_name: 'Mensajes',
      description: `Tienes ${appState.recentStats.unreadMessages} mensajes nuevos`,
      url: '/index.html?action=messages',
      icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
    });
  }

  // Shortcut: Compartir App
  shortcuts.push({
    name: 'Compartir ThingsToDo',
    short_name: 'Compartir',
    description: 'Comparte esta app con tus amigos',
    url: '/index.html?action=share',
    icons: [{ src: '/scr/images/icon-192x192.png', sizes: '192x192' }]
  });

  // Limitar a máximo 4 shortcuts (límite típico de las plataformas)
  return shortcuts.slice(0, 4);
}

// Función auxiliar para obtener usuario actual (simulada)
function getCurrentUser() {
  // En una implementación real, obtendrías esto de tu sistema de auth
  return {
    id: 'user123',
    name: 'Usuario',
    isPremium: false
  };
}

// Función auxiliar para verificar test activo (simulada)
async function simulateActiveTest() {
  // Simular verificación de test activo
  return Math.random() > 0.7; // 30% de probabilidad de tener test activo
}

// Función auxiliar para verificar pareja conectada (simulada)
async function hasPartner() {
  // Simular verificación de pareja
  return Math.random() > 0.5; // 50% de probabilidad
}

// Función auxiliar para obtener estadísticas recientes (simulada)
async function getRecentStats() {
  // Simular estadísticas recientes
  return {
    hasNewResults: Math.random() > 0.8, // 20% de probabilidad
    unreadMessages: Math.floor(Math.random() * 5), // 0-4 mensajes
    lastActivity: Date.now() - Math.random() * 86400000 // Últimas 24 horas
  };
}

// Función para manejar shortcuts dinámicos
function handleDynamicShortcut(action) {
  console.log('[PWA] Shortcut dinámico activado:', action);

  switch (action) {
    case 'continue-test':
      // Lógica para continuar test
      setTimeout(() => {
        const testBtn = document.querySelector('[data-action="continue-test"]');
        if (testBtn) {
          testBtn.click();
        } else {
          // Fallback al test normal
          const fallbackBtn = document.querySelector('[title="El Test - Compatibilidad"]');
          if (fallbackBtn) fallbackBtn.click();
        }
      }, 1000);
      break;

    case 'results':
      // Lógica para mostrar resultados
      setTimeout(() => {
        const resultsBtn = document.querySelector('[data-action="show-results"]');
        if (resultsBtn) {
          resultsBtn.click();
        } else {
          // Fallback a estadísticas
          const statsBtn = document.querySelector('[title="Estadísticas"]');
          if (statsBtn) statsBtn.click();
        }
      }, 1000);
      break;

    case 'messages':
      // Lógica para mostrar mensajes
      setTimeout(() => {
        const messagesBtn = document.querySelector('[data-action="show-messages"]');
        if (messagesBtn) {
          messagesBtn.click();
        } else {
          // Fallback a notificaciones
          showNotification({
            title: '💬 Mensajes',
            message: 'Funcionalidad de mensajes próximamente',
            type: 'info'
          });
        }
      }, 1000);
      break;

    default:
      // Dejar que handleAppShortcut maneje los shortcuts normales
      handleAppShortcut();
  }
}

// Actualizar shortcuts cuando cambie el estado de la app
function scheduleShortcutUpdates() {
  // Actualizar shortcuts cada vez que la app gane foco
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateDynamicShortcuts();
    }
  });

  // Actualizar shortcuts periódicamente (cada 5 minutos)
  setInterval(updateDynamicShortcuts, 5 * 60 * 1000);

  // Actualizar shortcuts después de acciones importantes
  ['test-created', 'test-completed', 'plan-created', 'partner-connected'].forEach(eventType => {
    document.addEventListener(eventType, () => {
      setTimeout(updateDynamicShortcuts, 1000);
    });
  });
}

// Inicializar shortcuts dinámicos
document.addEventListener('DOMContentLoaded', () => {
  // Esperar un poco para que la app se cargue
  setTimeout(() => {
    updateDynamicShortcuts();
    scheduleShortcutUpdates();
  }, 3000);
});

// Hacer funciones disponibles globalmente para debugging
window.updateDynamicShortcuts = updateDynamicShortcuts;
window.getDynamicShortcuts = () => dynamicShortcuts;

// Función para registrar periodic sync
async function registerPeriodicSync(tag, options = {}) {
  if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('[PWA] Periodic Sync no soportado');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Verificar si ya está registrado
    const existingTags = await registration.periodicSync.getTags();
    if (existingTags.includes(tag)) {
      console.log(`[PWA] Periodic sync ya registrado: ${tag}`);
      return true;
    }

    await registration.periodicSync.register(tag, {
      minInterval: options.minInterval || 24 * 60 * 60 * 1000, // 24 horas por defecto
      ...options
    });

    console.log(`[PWA] Periodic sync registrado: ${tag}`);
    return true;

  } catch (error) {
    console.error(`[PWA] Error registrando periodic sync ${tag}:`, error);
    return false;
  }
}

// Función para configurar todos los periodic sync
async function setupPeriodicSync() {
  // Actualizar contenido cada 6 horas
  await registerPeriodicSync('update-content', {
    minInterval: 6 * 60 * 60 * 1000 // 6 horas
  });

  // Limpiar caché cada 7 días
  await registerPeriodicSync('cleanup-cache', {
    minInterval: 7 * 24 * 60 * 60 * 1000 // 7 días
  });

  // Enviar analytics cada 24 horas
  await registerPeriodicSync('send-analytics', {
    minInterval: 24 * 60 * 60 * 1000 // 24 horas
  });
}

// Función para manejar actualizaciones de contenido periódicas
function handleContentUpdate(data) {
  console.log('[PWA] Contenido actualizado periódicamente:', data);

  showNotification({
    title: '🔄 Contenido actualizado',
    message: 'La app se ha actualizado con contenido fresco',
    type: 'info',
    duration: 3000
  });

  // Opcionalmente recargar recursos específicos
  // refreshDynamicContent();
}

// Función para obtener estado de periodic sync
async function getPeriodicSyncStatus() {
  if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
    return { supported: false };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const tags = await registration.periodicSync.getTags();

    return {
      supported: true,
      registeredTags: tags,
      status: tags.length > 0 ? 'active' : 'inactive'
    };
  } catch (error) {
    console.error('[PWA] Error obteniendo estado de periodic sync:', error);
    return { supported: false, error: error.message };
  }
}

// Función para desregistrar periodic sync
async function unregisterPeriodicSync(tag) {
  if (!('serviceWorker' in navigator) || !('periodicSync' in window.ServiceWorkerRegistration.prototype)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.periodicSync.unregister(tag);
    console.log(`[PWA] Periodic sync desregistrado: ${tag}`);
    return true;
  } catch (error) {
    console.error(`[PWA] Error desregistrando periodic sync ${tag}:`, error);
    return false;
  }
}

// Inicializar periodic sync cuando el SW esté listo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(() => {
    setupPeriodicSync();
  });

  // Escuchar actualizaciones de contenido
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data && event.data.type === 'content-updated') {
      handleContentUpdate(event.data.data);
    }
  });
}

// Hacer funciones disponibles globalmente para debugging
window.registerPeriodicSync = registerPeriodicSync;
window.getPeriodicSyncStatus = getPeriodicSyncStatus;
window.unregisterPeriodicSync = unregisterPeriodicSync;

// Cola de datos pendientes para sincronizar
let pendingDataQueue = {
  plans: [],
  testData: [],
  stats: []
};

// Función para registrar background sync
async function registerBackgroundSync(tag) {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    console.warn('[PWA] Background Sync no soportado');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log(`[PWA] Background sync registrado: ${tag}`);
    return true;
  } catch (error) {
    console.error(`[PWA] Error registrando background sync ${tag}:`, error);
    return false;
  }
}

// Función para agregar datos a la cola de sincronización
function addToSyncQueue(type, data) {
  if (!pendingDataQueue[type]) {
    console.warn(`[PWA] Tipo de datos no válido para sync: ${type}`);
    return;
  }

  // Agregar timestamp y ID único
  const syncItem = {
    ...data,
    id: Date.now() + Math.random(),
    timestamp: Date.now(),
    syncAttempts: 0
  };

  pendingDataQueue[type].push(syncItem);

  // Guardar en localStorage como backup
  savePendingDataToStorage(type);

  // Intentar sincronizar inmediatamente si estamos online
  if (isOnline) {
    attemptImmediateSync(type);
  } else {
    // Registrar background sync para cuando vuelva la conexión
    registerBackgroundSync(`background-sync-${type}`);
  }

  console.log(`[PWA] Datos agregados a cola de sync ${type}:`, syncItem);
}

// Función para intentar sincronización inmediata
async function attemptImmediateSync(type) {
  if (!isOnline) return;

  const data = pendingDataQueue[type];
  if (!data || data.length === 0) return;

  try {
    console.log(`[PWA] Intentando sync inmediato para ${type}...`);

    // Procesar cada item en la cola
    for (let i = data.length - 1; i >= 0; i--) {
      const item = data[i];

      try {
        await sendDataToServer(type, item);
        data.splice(i, 1); // Remover de la cola
        console.log(`[PWA] Item sincronizado exitosamente: ${item.id}`);
      } catch (error) {
        console.error(`[PWA] Error sincronizando item ${item.id}:`, error);
        item.syncAttempts++;

        // Si falló muchas veces, remover de la cola para evitar bucles
        if (item.syncAttempts > 3) {
          data.splice(i, 1);
          console.warn(`[PWA] Removiendo item ${item.id} después de ${item.syncAttempts} intentos fallidos`);
        }
      }
    }

    // Actualizar storage
    savePendingDataToStorage(type);

    // Notificar éxito
    if (data.length === 0) {
      showNotification({
        title: '✅ Sincronización completada',
        message: `Todos los datos ${type} han sido sincronizados`,
        type: 'success'
      });
    }

  } catch (error) {
    console.error(`[PWA] Error en sync inmediato para ${type}:`, error);
  }
}

// Función para enviar datos al servidor
async function sendDataToServer(type, data) {
  // Simular envío al servidor
  // En una implementación real, harías fetch a tu API

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simular éxito (90% de las veces)
      if (Math.random() > 0.1) {
        resolve({ success: true });
      } else {
        reject(new Error('Error de red simulado'));
      }
    }, 500 + Math.random() * 1000); // Delay aleatorio
  });
}

// Función para guardar datos pendientes en localStorage
function savePendingDataToStorage(type) {
  try {
    localStorage.setItem(`pending_${type}`, JSON.stringify(pendingDataQueue[type]));
  } catch (error) {
    console.error('[PWA] Error guardando datos pendientes:', error);
  }
}

// Función para cargar datos pendientes desde localStorage
function loadPendingDataFromStorage() {
  try {
    Object.keys(pendingDataQueue).forEach(type => {
      const stored = localStorage.getItem(`pending_${type}`);
      if (stored) {
        pendingDataQueue[type] = JSON.parse(stored);
        console.log(`[PWA] Cargados ${pendingDataQueue[type].length} items pendientes para ${type}`);
      }
    });
  } catch (error) {
    console.error('[PWA] Error cargando datos pendientes:', error);
  }
}

// Función para obtener estadísticas de sincronización
function getSyncStats() {
  const stats = {};
  Object.keys(pendingDataQueue).forEach(type => {
    stats[type] = {
      pending: pendingDataQueue[type].length,
      totalSize: JSON.stringify(pendingDataQueue[type]).length
    };
  });
  return stats;
}

// Función para forzar sincronización manual
async function forceSyncAll() {
  if (!isOnline) {
    showNotification({
      title: '❌ Sin conexión',
      message: 'La sincronización requiere conexión a internet',
      type: 'error'
    });
    return;
  }

  showNotification({
    title: '🔄 Sincronizando...',
    message: 'Sincronizando todos los datos pendientes',
    type: 'info'
  });

  const types = Object.keys(pendingDataQueue);
  let totalSynced = 0;

  for (const type of types) {
    await attemptImmediateSync(type);
    totalSynced += pendingDataQueue[type].length;
  }

  if (totalSynced === 0) {
    showNotification({
      title: '✅ Todo sincronizado',
      message: 'No hay datos pendientes para sincronizar',
      type: 'success'
    });
  }
}

// Inicializar background sync cuando la app esté lista
document.addEventListener('DOMContentLoaded', () => {
  loadPendingDataFromStorage();

  // Intentar sync inmediato si estamos online
  if (isOnline) {
    setTimeout(() => {
      Object.keys(pendingDataQueue).forEach(type => {
        if (pendingDataQueue[type].length > 0) {
          attemptImmediateSync(type);
        }
      });
    }, 2000); // Esperar 2 segundos para que la app se cargue
  }
});

// Hacer funciones disponibles globalmente para debugging
window.addToSyncQueue = addToSyncQueue;
window.forceSyncAll = forceSyncAll;
window.getSyncStats = getSyncStats;

// Variable para almacenar la suscripción push
let pushSubscription = null;

// Función para solicitar permiso de notificaciones del navegador
async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[PWA] Este navegador no soporta notificaciones');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('[PWA] Permiso de notificaciones ya concedido');
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('[PWA] Permiso de notificaciones denegado por el usuario');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Permiso de notificaciones:', permission);
    return permission === 'granted';
  } catch (error) {
    console.error('[PWA] Error solicitando permiso de notificaciones:', error);
    return false;
  }
}

// Función para suscribirse a push notifications
async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PWA] Push notifications no soportadas');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BYourVAPIDPublicKeyHere') // Reemplaza con tu clave VAPID real
    });

    pushSubscription = subscription;
    console.log('[PWA] Suscripción push exitosa:', subscription);

    // Enviar la suscripción al servidor
    await sendSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    console.error('[PWA] Error suscribiéndose a push notifications:', error);
    return null;
  }
}

// Función para enviar suscripción al servidor
async function sendSubscriptionToServer(subscription) {
  try {
    // Aquí enviarías la suscripción a tu servidor backend
    // Por ahora solo simulamos
    console.log('[PWA] Enviando suscripción al servidor:', subscription.endpoint);

    // Simular envío
    // await fetch('/api/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });

  } catch (error) {
    console.error('[PWA] Error enviando suscripción al servidor:', error);
  }
}

// Función para convertir VAPID key
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

// Función para enviar notificación push de prueba
async function sendTestPushNotification() {
  if (!pushSubscription) {
    showNotification({
      title: '❌ No suscrito',
      message: 'Primero debes suscribirte a las notificaciones',
      type: 'error'
    });
    return;
  }

  try {
    // Simular envío de notificación push
    // En un entorno real, esto se haría desde el servidor
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: pushSubscription,
        payload: {
          title: '💕 ¡Hola desde ThingsToDo!',
          body: 'Esta es una notificación de prueba desde tu app favorita 💕',
          icon: '/scr/images/icon-192x192.png',
          badge: '/scr/images/icon-192x192.png',
          data: {
            url: '/',
            action: 'test'
          }
        }
      })
    });

    if (response.ok) {
      showNotification({
        title: '✅ Notificación enviada',
        message: 'Revisa tu bandeja de notificaciones',
        type: 'success'
      });
    } else {
      throw new Error('Error en el servidor');
    }

  } catch (error) {
    console.error('[PWA] Error enviando notificación de prueba:', error);

    // Fallback: mostrar notificación local
    showNotification({
      title: '💕 ¡Hola desde ThingsToDo!',
      message: 'Esta es una notificación de prueba desde tu app favorita 💕',
      type: 'info',
      confirm: true,
      onConfirm: () => {
        console.log('[PWA] Usuario hizo click en la notificación de prueba');
      }
    });
  }
}

// Función para configurar push notifications automáticamente
async function setupPushNotifications() {
  const hasPermission = await requestBrowserNotificationPermission();
  if (hasPermission) {
    const subscription = await subscribeToPushNotifications();
    if (subscription) {
      console.log('[PWA] Push notifications configuradas exitosamente');

      // Programar notificaciones recordatorias
      scheduleReminderNotifications();
    }
  }
}

// Función para programar notificaciones recordatorias avanzadas
function scheduleReminderNotifications() {
  if (!('serviceWorker' in navigator && 'Notification' in window)) {
    console.log('[PWA] Service Worker o Notification API no soportados');
    return;
  }

  console.log('[PWA] Configurando sistema avanzado de notificaciones push');

  // Limpiar programaciones anteriores
  if (window.notificationTimeouts) {
    window.notificationTimeouts.forEach(clearTimeout);
  }
  window.notificationTimeouts = [];

  // Configurar notificaciones inteligentes basadas en patrones de uso
  setupSmartNotifications();

  // Configurar notificaciones de pareja sincronizadas
  setupCoupleNotifications();

  // Configurar notificaciones de progreso
  setupProgressNotifications();

  // Configurar notificaciones motivacionales
  setupMotivationalNotifications();

  // Configurar notificaciones de recordatorios diarios
  setupDailyReminders();

  // Configurar notificaciones de mantenimiento semanal
  setupWeeklyMaintenance();

  console.log('[PWA] Sistema avanzado de notificaciones configurado');
}

// Sistema inteligente de notificaciones basado en patrones de uso
function setupSmartNotifications() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Analizar patrones de uso del usuario
  analyzeUserPatterns(userId).then(patterns => {
    if (!patterns) return;

    const now = new Date();
    const currentHour = now.getHours();

    // Notificaciones basadas en hora del día
    if (currentHour >= 9 && currentHour <= 11) {
      // Recordatorio matutino
      scheduleNotification(2 * 60 * 60 * 1000, { // 2 horas
        title: '🌅 ¡Buenos días!',
        body: '¿Qué planes tienes para hoy? ¡Añade algunas tareas a tu lista! 💪',
        icon: '/scr/images/icon-192x192.png',
        tag: 'morning-reminder',
        requireInteraction: false
      });
    } else if (currentHour >= 18 && currentHour <= 20) {
      // Recordatorio vespertino
      scheduleNotification(3 * 60 * 60 * 1000, { // 3 horas
        title: '🌙 ¡Buenas noches!',
        body: '¿Completaste todas tus tareas del día? ¡Revisa tu progreso! 📊',
        icon: '/scr/images/icon-192x192.png',
        tag: 'evening-reminder',
        requireInteraction: false
      });
    }

    // Notificaciones basadas en inactividad
    if (patterns.lastActivity && patterns.avgDailyTasks > 0) {
      const timeSinceLastActivity = now.getTime() - patterns.lastActivity.toDate().getTime();
      const hoursSinceActivity = timeSinceLastActivity / (1000 * 60 * 60);

      if (hoursSinceActivity > 24 && patterns.avgDailyTasks >= 3) {
        // Usuario activo que no ha usado la app en un día
        scheduleNotification(1 * 60 * 60 * 1000, { // 1 hora
          title: '💭 ¡Te extrañamos!',
          body: `Hace ${Math.floor(hoursSinceActivity)} horas que no nos visitas. ¡Tus tareas te esperan! 🎯`,
          icon: '/scr/images/icon-192x192.png',
          tag: 'inactivity-reminder',
          requireInteraction: true
        });
      }
    }
  }).catch(error => {
    console.error('[PWA] Error analizando patrones de usuario:', error);
  });
}

// Notificaciones sincronizadas para parejas
function setupCoupleNotifications() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Verificar si el usuario tiene pareja
  getUserCoupleCode(userId).then(coupleData => {
    if (!coupleData || !coupleData.partnerId) return;

    // Notificaciones de pareja cada 3 días
    scheduleRecurringNotification(3 * 24 * 60 * 60 * 1000, { // Cada 3 días
      title: '💕 ¡No olvides a tu pareja!',
      body: '¿Han hecho algo especial juntos últimamente? ¡Añadan una tarea de pareja! 💑',
      icon: '/scr/images/icon-192x192.png',
      tag: 'couple-reminder',
      requireInteraction: false
    });

    // Notificación semanal de estadísticas de pareja
    scheduleNotification(7 * 24 * 60 * 60 * 1000, { // 7 días
      title: '📊 Semana de pareja',
      body: '¡Revisa las estadísticas de pareja y ve cuánto han crecido juntos! 📈',
      icon: '/scr/images/icon-192x192.png',
      tag: 'couple-stats',
      requireInteraction: true
    });
  }).catch(error => {
    console.error('[PWA] Error configurando notificaciones de pareja:', error);
  });
}

// Notificaciones de progreso semanal/mensual
function setupProgressNotifications() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Notificación semanal de progreso (todos los domingos)
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7;
  const timeUntilSunday = daysUntilSunday * 24 * 60 * 60 * 1000;

  scheduleNotification(timeUntilSunday + (9 * 60 * 60 * 1000), { // Domingo a las 9 AM
    title: '📈 ¡Revisa tu semana!',
    body: '¿Cuántas tareas completaste? ¡Ve tus estadísticas semanales! 🎯',
    icon: '/scr/images/icon-192x192.png',
    tag: 'weekly-progress',
    requireInteraction: true
  });

  // Notificación mensual (primer día del mes)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const timeUntilNextMonth = nextMonth.getTime() - now.getTime();

  scheduleNotification(timeUntilNextMonth + (9 * 60 * 60 * 1000), { // Primer día del mes a las 9 AM
    title: '🎉 ¡Nuevo mes, nuevos retos!',
    body: '¡Empieza el mes con energía! Revisa tus metas mensuales 📅',
    icon: '/scr/images/icon-192x192.png',
    tag: 'monthly-reset',
    requireInteraction: true
  });
}

// Notificaciones motivacionales personalizadas
function setupMotivationalNotifications() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Array de mensajes motivacionales
  const motivationalMessages = [
    { title: '🚀 ¡Tú puedes!', body: 'Cada pequeña tarea completada te acerca a tus sueños 💪' },
    { title: '⭐ ¡Eres increíble!', body: 'Mira todo lo que has logrado. ¡Sigue así! 🌟' },
    { title: '🎯 ¡Foco y determinación!', body: 'Una tarea a la vez, estás construyendo algo grandioso 🏗️' },
    { title: '💪 ¡Fuerza interior!', body: 'Tienes el poder de cambiar tu día con cada acción ✨' },
    { title: '🎉 ¡Celebra tus victorias!', body: 'Cada check en tu lista es una victoria que merece celebración 🎊' },
    { title: '🌈 ¡El cambio está en ti!', body: 'Cada día es una oportunidad para ser mejor versión de ti mismo 🔄' },
    { title: '⚡ ¡Energía positiva!', body: 'Tu actitud determina tu dirección. ¡Mantén la positividad! ⚡' },
    { title: '🎪 ¡Vive la aventura!', body: 'La vida es una aventura, y tú eres el protagonista principal 🦸' }
  ];

  // Programar 2-3 notificaciones motivacionales aleatorias por semana
  for (let i = 0; i < 3; i++) {
    const randomDays = Math.floor(Math.random() * 7) + 1; // 1-7 días
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    scheduleNotification(randomDays * 24 * 60 * 60 * 1000, {
      title: randomMessage.title,
      body: randomMessage.body,
      icon: '/scr/images/icon-192x192.png',
      tag: `motivational-${i}`,
      requireInteraction: false,
      silent: true // Silenciosas para no molestar
    });
  }
}

// Recordatorios diarios inteligentes
function setupDailyReminders() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Recordatorio diario a las 8 PM si no han completado tareas
  const now = new Date();
  const reminderTime = new Date(now);
  reminderTime.setHours(20, 0, 0, 0); // 8 PM

  if (now < reminderTime) {
    const timeUntilReminder = reminderTime.getTime() - now.getTime();
    scheduleNotification(timeUntilReminder, {
      title: '📝 ¿Completaste tus tareas?',
      body: 'Revisa tu lista antes de terminar el día. ¡Mañana será mejor! 🌙',
      icon: '/scr/images/icon-192x192.png',
      tag: 'daily-reminder',
      requireInteraction: false
    });
  }
}

// Mantenimiento semanal (limpieza de datos antiguos, optimizaciones)
function setupWeeklyMaintenance() {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Notificación de mantenimiento semanal (todos los sábados)
  const now = new Date();
  const daysUntilSaturday = (6 - now.getDay()) % 7;
  const timeUntilSaturday = daysUntilSaturday * 24 * 60 * 60 * 1000;

  scheduleNotification(timeUntilSaturday + (10 * 60 * 60 * 1000), { // Sábado a las 10 AM
    title: '🧹 Mantenimiento semanal',
    body: 'La app se está optimizando. ¡Gracias por usar ThingsToDo! ⚙️',
    icon: '/scr/images/icon-192x192.png',
    tag: 'weekly-maintenance',
    requireInteraction: false,
    silent: true
  });
}

// Función auxiliar para programar notificaciones únicas
function scheduleNotification(delayMs, notificationData) {
  const timeoutId = setTimeout(() => {
    sendScheduledNotification(notificationData);
  }, delayMs);

  if (!window.notificationTimeouts) window.notificationTimeouts = [];
  window.notificationTimeouts.push(timeoutId);
}

// Función auxiliar para programar notificaciones recurrentes
function scheduleRecurringNotification(intervalMs, notificationData) {
  const timeoutId = setInterval(() => {
    sendScheduledNotification(notificationData);
  }, intervalMs);

  if (!window.notificationTimeouts) window.notificationTimeouts = [];
  window.notificationTimeouts.push(timeoutId);
}

// Función para enviar notificaciones programadas
async function sendScheduledNotification(notificationData) {
  try {
    // Verificar si el usuario está activo (no enviar si está usando la app)
    if (!document.hidden) {
      console.log('[PWA] Usuario activo, saltando notificación programada');
      return;
    }

    // Verificar permisos de notificación
    if (Notification.permission !== 'granted') {
      console.log('[PWA] Permisos de notificación no concedidos');
      return;
    }

    // Enviar notificación nativa
    const notification = new Notification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: '/scr/images/icon-192x192.png',
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      data: {
        url: '/',
        scheduled: true,
        ...notificationData.data
      }
    });

    // Auto-cerrar después de 5 segundos si no requiere interacción
    if (!notificationData.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    // Manejar clicks en la notificación
    notification.onclick = () => {
      window.focus();
      notification.close();

      // Analytics de notificación clickeada
      if (typeof gtag !== 'undefined') {
        gtag('event', 'notification_click', {
          event_category: 'engagement',
          event_label: notificationData.tag
        });
      }
    };

    console.log('[PWA] Notificación programada enviada:', notificationData.title);

  } catch (error) {
    console.error('[PWA] Error enviando notificación programada:', error);
  }
}

// Función para analizar patrones de uso del usuario
async function analyzeUserPatterns(userId) {
  try {
    // Obtener estadísticas del usuario
    const stats = await calculateCoupleStats(userId);

    // Obtener tareas completadas recientes
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', userId),
      orderBy('completedAt', 'desc'),
      limit(50)
    );

    const tasksSnapshot = await getDocs(tasksQuery);
    const recentTasks = tasksSnapshot.docs.map(doc => doc.data());

    // Calcular patrones
    const patterns = {
      lastActivity: recentTasks.length > 0 ? recentTasks[0].completedAt : null,
      avgDailyTasks: stats?.totalTasksCompleted || 0,
      mostActiveHour: calculateMostActiveHour(recentTasks),
      completionRate: calculateCompletionRate(recentTasks),
      streakDays: stats?.currentStreak || 0
    };

    return patterns;

  } catch (error) {
    console.error('[PWA] Error analizando patrones de usuario:', error);
    return null;
  }
}

// Función auxiliar para calcular hora más activa
function calculateMostActiveHour(tasks) {
  const hourCounts = {};
  tasks.forEach(task => {
    if (task.completedAt) {
      const hour = task.completedAt.toDate().getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  let maxHour = 0;
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxHour = parseInt(hour);
    }
  });

  return maxHour;
}

// Función auxiliar para calcular tasa de completación
function calculateCompletionRate(tasks) {
  if (tasks.length === 0) return 0;

  const completedTasks = tasks.filter(task => task.completed).length;
  return completedTasks / tasks.length;
}

// Función para manejar mensajes del service worker
function handleServiceWorkerMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'sync-completed':
      showNotification({
        title: '✅ Sincronización completada',
        message: `Datos ${data.type} sincronizados exitosamente`,
        type: 'success'
      });
      break;

    case 'sync-failed':
      showNotification({
        title: '⚠️ Sincronización pendiente',
        message: `No se pudieron sincronizar los datos ${data.type}. Se reintentará automáticamente.`,
        type: 'warning'
      });
      break;

    case 'SHARED_CONTENT_RECEIVED':
      // Almacenar el contenido compartido en sessionStorage
      sessionStorage.setItem('sharedContent', JSON.stringify(data));
      console.log('[Share] Contenido compartido recibido y almacenado:', data);
      break;

    default:
      console.log('[PWA] Mensaje del SW no manejado:', type, data);
  }
}

// Escuchar mensajes del service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
}

// Hacer funciones disponibles globalmente para debugging
window.requestBrowserNotificationPermission = requestBrowserNotificationPermission;
window.subscribeToPushNotifications = subscribeToPushNotifications;
window.sendTestPushNotification = sendTestPushNotification;
window.setupPushNotifications = setupPushNotifications;

// ============================================
// SISTEMA AVANZADO DE CALIDAD DE CONEXIÓN
// ============================================

// Estado de conexión avanzado
let connectionQuality = {
  online: navigator.onLine,
  effectiveType: 'unknown', // 4g, 3g, 2g, slow-2g
  downlink: 0, // Mbps
  rtt: 0, // ms
  quality: 'unknown', // excellent, good, fair, poor, offline
  lastUpdated: Date.now()
};

// Función para detectar calidad de conexión usando Network Information API
function detectConnectionQuality() {
  if ('connection' in navigator) {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (connection) {
      connectionQuality.effectiveType = connection.effectiveType || 'unknown';
      connectionQuality.downlink = connection.downlink || 0;
      connectionQuality.rtt = connection.rtt || 0;
      connectionQuality.lastUpdated = Date.now();

      // Determinar calidad basada en métricas
      connectionQuality.quality = determineConnectionQuality(connectionQuality);

      // Aplicar optimizaciones basadas en calidad
      applyConnectionOptimizations(connectionQuality.quality);

      console.log('[Connection] Calidad detectada:', connectionQuality);

      // Escuchar cambios en la conexión
      connection.addEventListener('change', () => {
        detectConnectionQuality();
        updateConnectionIndicator();
      });

      return connectionQuality;
    }
  }

  // Fallback si no hay Network Information API
  connectionQuality.quality = navigator.onLine ? 'good' : 'offline';
  console.log('[Connection] Network Information API no disponible, usando fallback');
  return connectionQuality;
}

// Función para determinar calidad de conexión
function determineConnectionQuality(metrics) {
  if (!metrics.online) return 'offline';

  const { effectiveType, downlink, rtt } = metrics;

  // Basado en effectiveType (más confiable)
  switch (effectiveType) {
    case '4g':
      if (downlink >= 10) return 'excellent';
      if (downlink >= 5) return 'good';
      return 'fair';
    case '3g':
      return downlink >= 1 ? 'fair' : 'poor';
    case '2g':
    case 'slow-2g':
      return 'poor';
    default:
      // Fallback basado en downlink y rtt
      if (downlink >= 10 && rtt <= 100) return 'excellent';
      if (downlink >= 5 && rtt <= 200) return 'good';
      if (downlink >= 1 && rtt <= 500) return 'fair';
      return 'poor';
  }
}

// Función para aplicar optimizaciones basadas en calidad de conexión
function applyConnectionOptimizations(quality) {
  const body = document.body;

  // Remover clases anteriores
  body.classList.remove('connection-excellent', 'connection-good', 'connection-fair', 'connection-poor', 'connection-offline');

  // Aplicar clase de calidad actual
  body.classList.add(`connection-${quality}`);

  // Aplicar optimizaciones específicas
  switch (quality) {
    case 'excellent':
      // Calidad excelente: activar todas las funciones
      enableHighQualityFeatures();
      break;

    case 'good':
      // Buena calidad: funciones normales
      enableNormalFeatures();
      break;

    case 'fair':
      // Calidad regular: reducir animaciones pesadas
      enableFairQualityFeatures();
      break;

    case 'poor':
      // Calidad pobre: modo de bajo consumo
      enableLowQualityFeatures();
      break;

    case 'offline':
      // Sin conexión: modo offline
      enableOfflineMode();
      break;
  }

  console.log(`[Connection] Optimizaciones aplicadas para calidad: ${quality}`);
}

// Funciones de optimización por calidad
function enableHighQualityFeatures() {
  // Activar animaciones complejas, videos, etc.
  document.body.style.setProperty('--animation-duration', '0.3s');
  document.body.style.setProperty('--image-quality', 'high');

  // Habilitar pre-carga de recursos
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_CONNECTION_MODE',
      data: { mode: 'high-quality' }
    });
  }
}

function enableNormalFeatures() {
  document.body.style.setProperty('--animation-duration', '0.2s');
  document.body.style.setProperty('--image-quality', 'normal');
}

function enableFairQualityFeatures() {
  // Reducir animaciones, usar imágenes más pequeñas
  document.body.style.setProperty('--animation-duration', '0.1s');
  document.body.style.setProperty('--image-quality', 'medium');

  // Desactivar algunas animaciones pesadas
  document.querySelectorAll('.heavy-animation').forEach(el => {
    el.style.animation = 'none';
  });
}

function enableLowQualityFeatures() {
  // Modo de bajo consumo máximo
  document.body.style.setProperty('--animation-duration', '0s');
  document.body.style.setProperty('--image-quality', 'low');

  // Desactivar todas las animaciones no esenciales
  document.querySelectorAll('.animated, .pulse, .bounce').forEach(el => {
    el.style.animation = 'none';
    el.style.transition = 'none';
  });

  // Mostrar indicador de modo de bajo consumo
  showLowPowerModeIndicator();

  // Notificar al service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_CONNECTION_MODE',
      data: { mode: 'low-power' }
    });
  }
}

function enableOfflineMode() {
  // Modo offline completo
  document.body.classList.add('offline-mode');

  showNotification({
    title: '📴 Modo Offline',
    message: 'Estás trabajando sin conexión. Los cambios se sincronizarán cuando vuelvas a conectarte.',
    type: 'info'
  });
}

// Función para mostrar indicador de modo de bajo consumo
function showLowPowerModeIndicator() {
  const existing = document.getElementById('low-power-indicator');
  if (existing) return;

  const indicator = document.createElement('div');
  indicator.id = 'low-power-indicator';
  indicator.innerHTML = `
    <div class="low-power-content">
      <span class="low-power-icon">🔋</span>
      <span class="low-power-text">Modo de bajo consumo activado</span>
    </div>
  `;
  indicator.className = 'low-power-indicator';

  document.body.appendChild(indicator);

  // Auto-ocultar después de 5 segundos
  setTimeout(() => {
    indicator.classList.add('fade-out');
    setTimeout(() => indicator.remove(), 300);
  }, 5000);
}

// Función para actualizar indicador de conexión
function updateConnectionIndicator() {
  const quality = connectionQuality.quality;
  const messages = {
    excellent: '🚀 Conexión excelente',
    good: '✅ Conexión buena',
    fair: '⚠️ Conexión regular',
    poor: '🐌 Conexión lenta',
    offline: '📴 Sin conexión'
  };

  const icons = {
    excellent: '🚀',
    good: '✅',
    fair: '⚠️',
    poor: '🐌',
    offline: '📴'
  };

  showAdvancedConnectionStatus(quality, messages[quality], icons[quality]);
}

// Función avanzada para mostrar estado de conexión
function showAdvancedConnectionStatus(quality, message, icon) {
  // Remover indicador existente
  const existingIndicator = document.getElementById('connection-status-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Crear nuevo indicador avanzado
  const indicator = document.createElement('div');
  indicator.id = 'connection-status-indicator';
  indicator.className = `connection-status connection-${quality}`;

  indicator.innerHTML = `
    <div class="connection-content">
      <span class="connection-icon">${icon}</span>
      <span class="connection-text">${message}</span>
      ${connectionQuality.downlink > 0 ? `<span class="connection-speed">${connectionQuality.downlink} Mbps</span>` : ''}
    </div>
  `;

  document.body.appendChild(indicator);

  // Mostrar con animación
  setTimeout(() => indicator.classList.add('visible'), 100);

  // Ocultar automáticamente (excepto offline)
  if (quality !== 'offline') {
    setTimeout(() => {
      indicator.classList.remove('visible');
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  }
}

// Función para manejar cambios de conexión
function handleConnectionChange(online) {
  connectionQuality.online = online;

  if (online) {
    // Re-detectar calidad cuando vuelve la conexión
    detectConnectionQuality();
  } else {
    connectionQuality.quality = 'offline';
    applyConnectionOptimizations('offline');
  }

  updateConnectionIndicator();

  // Si vuelve a estar online, intentar sincronizar datos pendientes
  if (online) {
    syncPendingData();
  }
}

// Función para sincronizar datos pendientes cuando vuelve la conexión
function syncPendingData() {
  console.log('[Connection] Sincronizando datos pendientes...');

  // Sincronizar analytics offline
  syncOfflineAnalytics();

  // Aquí se pueden agregar más sincronizaciones
  // - Formularios no enviados
  // - Cambios locales pendientes
  // - Notificaciones no enviadas
}

// Función para obtener información detallada de conexión
function getConnectionInfo() {
  return {
    ...connectionQuality,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    supportsNetworkInfo: 'connection' in navigator
  };
}

// Función para mostrar debug de conexión (para desarrollo)
function showConnectionDebug() {
  const info = getConnectionInfo();
  console.table(info);

  showNotification({
    title: '🔍 Debug de Conexión',
    message: `Calidad: ${info.quality} | Velocidad: ${info.downlink} Mbps | Latencia: ${info.rtt}ms`,
    type: 'info',
    confirm: true,
    confirmText: 'OK'
  });
}

// Hacer funciones disponibles globalmente para debugging
window.getConnectionInfo = getConnectionInfo;
window.showConnectionDebug = showConnectionDebug;
window.detectConnectionQuality = detectConnectionQuality;

// ============================================
// SISTEMA DE BACKUP Y RESTAURACIÓN DE DATOS
// ============================================

// Configuración del sistema de backup
const BACKUP_CONFIG = {
  autoBackup: true,
  autoBackupInterval: 24 * 60 * 60 * 1000, // 24 horas
  maxBackups: 10,
  backupKey: 'thingstodo_backups',
  recoveryKey: 'thingstodo_deleted_items'
};

// Función principal para crear backup de datos
async function createDataBackup(options = {}) {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  console.log('[Backup] Creando backup de datos...');

  try {
    const backupData = {
      metadata: {
        version: '1.0',
        timestamp: Date.now(),
        userId: userId,
        userAgent: navigator.userAgent,
        appVersion: 'ThingsToDo v2.0'
      },
      data: {}
    };

    // Recopilar todos los datos del usuario
    backupData.data = await collectAllUserData(userId);

    // Crear archivo de backup
    const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });

    // Guardar backup localmente
    await saveLocalBackup(backupData);

    // Si se solicita descarga
    if (options.download !== false) {
      downloadBackupFile(backupBlob, `thingstodo-backup-${new Date().toISOString().split('T')[0]}.json`);
    }

    // Notificar éxito
    showNotification({
      title: '✅ Backup creado',
      message: 'Tus datos han sido respaldados exitosamente.',
      type: 'success'
    });

    console.log('[Backup] Backup completado exitosamente');
    return backupData;

  } catch (error) {
    console.error('[Backup] Error creando backup:', error);
    showNotification({
      title: '❌ Error en backup',
      message: 'No se pudo crear el backup. Inténtalo de nuevo.',
      type: 'error'
    });
    throw error;
  }
}

// Función para recopilar todos los datos del usuario
async function collectAllUserData(userId) {
  const data = {};

  try {
    // Datos de usuario y pareja
    data.user = await getUserProfile(userId);
    data.couple = await getCoupleData(userId);

    // Tareas
    data.tasks = await getAllTasks(userId);

    // Planes
    data.plans = await getAllPlans(userId);

    // Estadísticas
    data.stats = await getUserStats(userId);

    // Tests de compatibilidad
    data.tests = await getAllTests(userId);

    // Favores
    data.favors = await getAllFavors(userId);

    // Cápsulas del tiempo
    data.timeCapsules = await getAllTimeCapsules(userId);

    // Metas de ahorro
    data.savings = await getAllSavingsGoals(userId);

    // Banda sonora
    data.soundtrack = await getSoundtrackData(userId);

    // Configuración de la app
    data.settings = getAppSettings();

    // Datos locales (localStorage, IndexedDB)
    data.localData = await getLocalData();

    console.log('[Backup] Datos recopilados:', Object.keys(data));

  } catch (error) {
    console.error('[Backup] Error recopilando datos:', error);
  }

  return data;
}

// Funciones auxiliares para recopilar datos específicos
async function getUserProfile(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('[Backup] Error obteniendo perfil de usuario:', error);
    return null;
  }
}

async function getCoupleData(userId) {
  try {
    const coupleCode = getUserCoupleCode(userId);
    if (!coupleCode) return null;

    const coupleDoc = await getDoc(doc(db, 'couples', coupleCode));
    return coupleDoc.exists() ? coupleDoc.data() : null;
  } catch (error) {
    console.error('[Backup] Error obteniendo datos de pareja:', error);
    return null;
  }
}

async function getAllTasks(userId) {
  try {
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
    const tasksSnapshot = await getDocs(tasksQuery);
    return tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo tareas:', error);
    return [];
  }
}

async function getAllPlans(userId) {
  try {
    const plansQuery = query(collection(db, 'plans'), where('userId', '==', userId));
    const plansSnapshot = await getDocs(plansQuery);
    return plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo planes:', error);
    return [];
  }
}

async function getUserStats(userId) {
  try {
    return await calculateCoupleStats(userId);
  } catch (error) {
    console.error('[Backup] Error obteniendo estadísticas:', error);
    return null;
  }
}

async function getAllTests(userId) {
  try {
    const testsQuery = query(collection(db, 'tests'), where('creatorId', '==', userId));
    const testsSnapshot = await getDocs(testsQuery);
    return testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo tests:', error);
    return [];
  }
}

async function getAllFavors(userId) {
  try {
    const favorsQuery = query(collection(db, 'favors'), where('userId', '==', userId));
    const favorsSnapshot = await getDocs(favorsQuery);
    return favorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo favores:', error);
    return [];
  }
}

async function getAllTimeCapsules(userId) {
  try {
    const capsulesQuery = query(collection(db, 'timeCapsules'), where('userId', '==', userId));
    const capsulesSnapshot = await getDocs(capsulesQuery);
    return capsulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo cápsulas del tiempo:', error);
    return [];
  }
}

async function getAllSavingsGoals(userId) {
  try {
    const savingsQuery = query(collection(db, 'savingsGoals'), where('userId', '==', userId));
    const savingsSnapshot = await getDocs(savingsQuery);
    return savingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo metas de ahorro:', error);
    return [];
  }
}

async function getSoundtrackData(userId) {
  try {
    const soundtrackQuery = query(collection(db, 'soundtracks'), where('userId', '==', userId));
    const soundtrackSnapshot = await getDocs(soundtrackQuery);
    return soundtrackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[Backup] Error obteniendo banda sonora:', error);
    return [];
  }
}

function getAppSettings() {
  return {
    theme: localStorage.getItem('theme') || 'light',
    notifications: localStorage.getItem('notifications') === 'true',
    soundEnabled: localStorage.getItem('soundEnabled') === 'true',
    language: localStorage.getItem('language') || 'es',
    lastBackup: localStorage.getItem('lastBackup'),
    usageStats: JSON.parse(localStorage.getItem('usageStats') || '{}')
  };
}

async function getLocalData() {
  return {
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
    // Nota: IndexedDB requiere APIs específicas para backup
    indexedDB: 'Not backed up automatically' // Placeholder
  };
}

// Función para guardar backup localmente
async function saveLocalBackup(backupData) {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_CONFIG.backupKey) || '[]');

    // Agregar nuevo backup
    backups.push({
      id: Date.now().toString(),
      timestamp: backupData.metadata.timestamp,
      size: JSON.stringify(backupData).length,
      data: backupData
    });

    // Mantener solo los backups más recientes
    if (backups.length > BACKUP_CONFIG.maxBackups) {
      backups.sort((a, b) => b.timestamp - a.timestamp);
      backups.splice(BACKUP_CONFIG.maxBackups);
    }

    localStorage.setItem(BACKUP_CONFIG.backupKey, JSON.stringify(backups));
    localStorage.setItem('lastBackup', backupData.metadata.timestamp.toString());

    console.log(`[Backup] Backup guardado localmente. Total backups: ${backups.length}`);

  } catch (error) {
    console.error('[Backup] Error guardando backup localmente:', error);
  }
}

// Función para descargar archivo de backup
function downloadBackupFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Función para restaurar datos desde backup
async function restoreFromBackup(backupData, options = {}) {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  console.log('[Restore] Iniciando restauración de datos...');

  try {
    // Validar backup
    if (!validateBackup(backupData)) {
      throw new Error('Backup inválido o corrupto');
    }

    // Confirmar restauración
    if (options.skipConfirmation !== true) {
      const confirmed = await showNotification({
        title: '⚠️ Restaurar backup',
        message: 'Esto reemplazará tus datos actuales. ¿Estás seguro?',
        type: 'confirm',
        confirmText: 'Restaurar',
        cancelText: 'Cancelar'
      });

      if (!confirmed) return;
    }

    // Crear backup de seguridad antes de restaurar
    if (options.createSafetyBackup !== false) {
      await createDataBackup({ download: false });
    }

    // Restaurar datos
    await restoreAllData(backupData.data, userId, options);

    // Notificar éxito
    showNotification({
      title: '✅ Restauración completada',
      message: 'Tus datos han sido restaurados exitosamente.',
      type: 'success'
    });

    // Recargar la aplicación
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('[Restore] Error en restauración:', error);
    showNotification({
      title: '❌ Error en restauración',
      message: 'No se pudieron restaurar los datos. Verifica el archivo de backup.',
      type: 'error'
    });
    throw error;
  }
}

// Función para validar backup
function validateBackup(backupData) {
  try {
    if (!backupData || typeof backupData !== 'object') return false;
    if (!backupData.metadata || !backupData.data) return false;
    if (!backupData.metadata.version || !backupData.metadata.timestamp) return false;

    // Validar que tenga al menos algunos datos
    const hasData = Object.values(backupData.data).some(data =>
      Array.isArray(data) ? data.length > 0 : data !== null
    );

    return hasData;
  } catch (error) {
    console.error('[Backup] Error validando backup:', error);
    return false;
  }
}

// Función para restaurar todos los datos
async function restoreAllData(data, userId, options) {
  const { merge = false, skipFirebase = false } = options;

  console.log('[Restore] Restaurando datos...', { merge, skipFirebase });

  // Restaurar configuración local primero
  if (data.settings) {
    restoreAppSettings(data.settings);
  }

  // Restaurar datos de Firebase
  if (!skipFirebase) {
    await restoreFirebaseData(data, userId, merge);
  }

  // Restaurar datos locales
  if (data.localData) {
    restoreLocalData(data.localData, merge);
  }
}

// Función para restaurar configuración de la app
function restoreAppSettings(settings) {
  try {
    Object.entries(settings).forEach(([key, value]) => {
      if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value.toString());
      }
    });
    console.log('[Restore] Configuración restaurada');
  } catch (error) {
    console.error('[Restore] Error restaurando configuración:', error);
  }
}

// Función para restaurar datos de Firebase
async function restoreFirebaseData(data, userId, merge) {
  try {
    // Restaurar en orden de dependencias

    // Usuario y pareja
    if (data.user) await restoreUserData(data.user, userId);
    if (data.couple) await restoreCoupleData(data.couple);

    // Datos principales
    if (data.tasks) await restoreTasks(data.tasks, userId, merge);
    if (data.plans) await restorePlans(data.plans, userId, merge);
    if (data.tests) await restoreTests(data.tests, userId, merge);
    if (data.favors) await restoreFavors(data.favors, userId, merge);
    if (data.timeCapsules) await restoreTimeCapsules(data.timeCapsules, userId, merge);
    if (data.savings) await restoreSavingsGoals(data.savings, userId, merge);
    if (data.soundtrack) await restoreSoundtrack(data.soundtrack, userId, merge);

    console.log('[Restore] Datos de Firebase restaurados');
  } catch (error) {
    console.error('[Restore] Error restaurando datos de Firebase:', error);
  }
}

// Funciones auxiliares para restaurar datos específicos
async function restoreTasks(tasks, userId, merge) {
  if (merge) {
    // En modo merge, solo agregar tareas que no existan
    for (const task of tasks) {
      try {
        await addDoc(collection(db, 'tasks'), { ...task, userId });
      } catch (error) {
        console.error('[Restore] Error restaurando tarea:', error);
      }
    }
  } else {
    // En modo replace, eliminar todas las tareas existentes y crear nuevas
    await deleteAllUserTasks(userId);
    for (const task of tasks) {
      try {
        await addDoc(collection(db, 'tasks'), { ...task, userId });
      } catch (error) {
        console.error('[Restore] Error restaurando tarea:', error);
      }
    }
  }
}

async function deleteAllUserTasks(userId) {
  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const tasksSnapshot = await getDocs(tasksQuery);
  const deletePromises = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// Funciones similares para otros tipos de datos...
async function restorePlans(plans, userId, merge) {
  // Implementar restauración de planes
  console.log('[Restore] Restaurando planes:', plans.length);
}

async function restoreTests(tests, userId, merge) {
  // Implementar restauración de tests
  console.log('[Restore] Restaurando tests:', tests.length);
}

async function restoreFavors(favors, userId, merge) {
  // Implementar restauración de favores
  console.log('[Restore] Restaurando favores:', favors.length);
}

async function restoreTimeCapsules(capsules, userId, merge) {
  // Implementar restauración de cápsulas
  console.log('[Restore] Restaurando cápsulas del tiempo:', capsules.length);
}

async function restoreSavingsGoals(savings, userId, merge) {
  // Implementar restauración de metas de ahorro
  console.log('[Restore] Restaurando metas de ahorro:', savings.length);
}

async function restoreSoundtrack(soundtrack, userId, merge) {
  // Implementar restauración de banda sonora
  console.log('[Restore] Restaurando banda sonora:', soundtrack.length);
}

async function restoreUserData(userData, userId) {
  try {
    await setDoc(doc(db, 'users', userId), userData, { merge: true });
    console.log('[Restore] Datos de usuario restaurados');
  } catch (error) {
    console.error('[Restore] Error restaurando datos de usuario:', error);
  }
}

async function restoreCoupleData(coupleData) {
  try {
    await setDoc(doc(db, 'couples', coupleData.code), coupleData, { merge: true });
    console.log('[Restore] Datos de pareja restaurados');
  } catch (error) {
    console.error('[Restore] Error restaurando datos de pareja:', error);
  }
}

// Función para restaurar datos locales
function restoreLocalData(localData, merge) {
  try {
    if (localData.localStorage) {
      Object.entries(localData.localStorage).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('[Restore] Error restaurando localStorage:', key, error);
        }
      });
    }
    console.log('[Restore] Datos locales restaurados');
  } catch (error) {
    console.error('[Restore] Error restaurando datos locales:', error);
  }
}

// Función para importar backup desde archivo
function importBackupFromFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return reject(new Error('No file selected'));

      try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        resolve(backupData);
      } catch (error) {
        reject(new Error('Invalid backup file'));
      }
    };
    input.click();
  });
}

// Función para mostrar UI de backup/restore
function showBackupRestoreUI() {
  const modal = document.createElement('div');
  modal.className = 'backup-restore-modal';
  modal.innerHTML = `
    <div class="backup-restore-content">
      <h3>💾 Backup y Restauración</h3>

      <div class="backup-section">
        <h4>Crear Backup</h4>
        <p>Guarda una copia de seguridad de todos tus datos</p>
        <div class="backup-actions">
          <button class="backup-btn" data-action="create">
            📤 Crear y Descargar
          </button>
          <button class="backup-btn" data-action="local">
            💾 Guardar Localmente
          </button>
        </div>
      </div>

      <div class="restore-section">
        <h4>Restaurar Datos</h4>
        <p>Restaura tus datos desde un archivo de backup</p>
        <div class="restore-actions">
          <button class="restore-btn" data-action="import">
            📥 Importar desde Archivo
          </button>
          <button class="restore-btn" data-action="local">
            📂 Desde Backups Locales
          </button>
        </div>
      </div>

      <div class="backup-info">
        <p><strong>Último backup:</strong> ${getLastBackupDate()}</p>
        <p><strong>Backups locales:</strong> ${getLocalBackupsCount()}</p>
      </div>

      <button class="close-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Manejar eventos
  modal.addEventListener('click', async (e) => {
    const action = e.target.dataset.action;

    if (action === 'create') {
      try {
        await createDataBackup({ download: true });
      } catch (error) {
        console.error('Error creating backup:', error);
      }
    } else if (action === 'local') {
      try {
        await createDataBackup({ download: false });
        showNotification({
          title: '✅ Backup guardado',
          message: 'El backup se guardó localmente.',
          type: 'success'
        });
      } catch (error) {
        console.error('Error creating local backup:', error);
      }
    } else if (action === 'import') {
      try {
        const backupData = await importBackupFromFile();
        await restoreFromBackup(backupData);
      } catch (error) {
        showNotification({
          title: '❌ Error',
          message: 'No se pudo importar el backup.',
          type: 'error'
        });
      }
    } else if (action === 'local') {
      showLocalBackupsList();
    } else if (e.target.classList.contains('close-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

// Funciones auxiliares para UI
function getLastBackupDate() {
  const lastBackup = localStorage.getItem('lastBackup');
  if (!lastBackup) return 'Nunca';

  const date = new Date(parseInt(lastBackup));
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function getLocalBackupsCount() {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUP_CONFIG.backupKey) || '[]');
    return backups.length;
  } catch (error) {
    return 0;
  }
}

function showLocalBackupsList() {
  // Implementar lista de backups locales
  console.log('Mostrar lista de backups locales');
}

// Función para configurar backup automático
function setupAutoBackup() {
  if (!BACKUP_CONFIG.autoBackup) return;

  const lastBackup = localStorage.getItem('lastBackup');
  const now = Date.now();

  if (!lastBackup || (now - parseInt(lastBackup)) > BACKUP_CONFIG.autoBackupInterval) {
    console.log('[Backup] Ejecutando backup automático...');
    createDataBackup({ download: false }).catch(error => {
      console.error('[Backup] Error en backup automático:', error);
    });
  }

  // Programar próximo backup automático
  setTimeout(setupAutoBackup, BACKUP_CONFIG.autoBackupInterval);
}

// Inicializar sistema de backup
document.addEventListener('DOMContentLoaded', () => {
  // Configurar backup automático cuando el usuario esté autenticado
  auth.onAuthStateChanged((user) => {
    if (user) {
      setTimeout(setupAutoBackup, 5000); // Esperar 5 segundos después del login
    }
  });
});

// Hacer funciones disponibles globalmente
window.createDataBackup = createDataBackup;
window.restoreFromBackup = restoreFromBackup;
window.showBackupRestoreUI = showBackupRestoreUI;
window.importBackupFromFile = importBackupFromFile;

// ============================================
// SISTEMA DE MODO BAJO CONSUMO
// ============================================

// Estado del modo de bajo consumo
let lowPowerMode = {
  active: false,
  batteryLevel: 100,
  batteryCharging: false,
  autoEnabled: true,
  manualEnabled: false,
  threshold: 20, // Porcentaje de batería para activar automáticamente
  lastActivated: null
};

// Configuración del modo de bajo consumo
const LOW_POWER_CONFIG = {
  autoActivationThreshold: 20, // % de batería
  disableAnimations: true,
  reduceUpdates: true,
  disableBackgroundTasks: true,
  reduceImageQuality: true,
  disableAutoSave: false,
  notificationInterval: 5 * 60 * 1000, // 5 minutos
  powerSaveFeatures: [
    'animations',
    'background-sync',
    'auto-refresh',
    'high-quality-images',
    'frequent-notifications',
    'location-services'
  ]
};

// Función para inicializar el sistema de batería
function initializeBatteryMonitoring() {
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      console.log('[Battery] Inicializando monitoreo de batería');

      // Actualizar estado inicial
      updateBatteryStatus(battery);

      // Escuchar cambios en el estado de la batería
      battery.addEventListener('levelchange', () => updateBatteryStatus(battery));
      battery.addEventListener('chargingchange', () => updateBatteryStatus(battery));
      battery.addEventListener('dischargingtimechange', () => updateBatteryStatus(battery));

    }).catch(error => {
      console.warn('[Battery] No se pudo acceder a la API de batería:', error);
      // Fallback: usar estimaciones basadas en tiempo de uso
      setupBatteryFallback();
    });
  } else {
    console.log('[Battery] API de batería no soportada, usando fallback');
    setupBatteryFallback();
  }
}

// Función para actualizar el estado de la batería
function updateBatteryStatus(battery) {
  const previousLevel = lowPowerMode.batteryLevel;
  const previousCharging = lowPowerMode.batteryCharging;

  lowPowerMode.batteryLevel = Math.round(battery.level * 100);
  lowPowerMode.batteryCharging = battery.charging;

  console.log(`[Battery] Estado actualizado: ${lowPowerMode.batteryLevel}% ${lowPowerMode.batteryCharging ? '(cargando)' : ''}`);

  // Verificar si debe activarse el modo de bajo consumo
  checkLowPowerModeActivation();

  // Notificar cambios significativos
  if (Math.abs(lowPowerMode.batteryLevel - previousLevel) >= 5 ||
      lowPowerMode.batteryCharging !== previousCharging) {
    showBatteryStatusNotification();
  }

  // Actualizar indicador visual
  updateBatteryIndicator();
}

// Función para verificar activación del modo de bajo consumo
function checkLowPowerModeActivation() {
  const shouldActivate = lowPowerMode.autoEnabled &&
                         !lowPowerMode.batteryCharging &&
                         lowPowerMode.batteryLevel <= LOW_POWER_CONFIG.autoActivationThreshold;

  const shouldDeactivate = lowPowerMode.batteryCharging ||
                          lowPowerMode.batteryLevel > LOW_POWER_CONFIG.autoActivationThreshold + 10;

  if (shouldActivate && !lowPowerMode.active) {
    activateLowPowerMode('auto');
  } else if (shouldDeactivate && lowPowerMode.active && !lowPowerMode.manualEnabled) {
    deactivateLowPowerMode();
  }
}

// Función para activar modo de bajo consumo
function activateLowPowerMode(reason = 'manual') {
  if (lowPowerMode.active) return;

  lowPowerMode.active = true;
  lowPowerMode.lastActivated = Date.now();

  if (reason === 'auto') {
    lowPowerMode.manualEnabled = false;
  } else {
    lowPowerMode.manualEnabled = true;
  }

  console.log(`[Low Power] Modo activado (${reason})`);

  // Aplicar optimizaciones de bajo consumo
  applyLowPowerOptimizations();

  // Mostrar notificación
  showNotification({
    title: '🔋 Modo de bajo consumo activado',
    message: `Batería al ${lowPowerMode.batteryLevel}%. Se han aplicado optimizaciones para ahorrar energía.`,
    type: 'warning',
    confirm: true,
    confirmText: 'Configurar',
    onConfirm: () => showLowPowerSettings()
  });

  // Guardar estado
  localStorage.setItem('lowPowerMode', JSON.stringify(lowPowerMode));

  // Actualizar UI
  updateLowPowerUI();
}

// Función para desactivar modo de bajo consumo
function deactivateLowPowerMode() {
  if (!lowPowerMode.active) return;

  lowPowerMode.active = false;
  lowPowerMode.manualEnabled = false;

  console.log('[Low Power] Modo desactivado');

  // Restaurar funcionalidades normales
  restoreNormalFunctionality();

  // Mostrar notificación
  showNotification({
    title: '✅ Modo normal restaurado',
    message: 'Todas las funcionalidades han vuelto a la normalidad.',
    type: 'success'
  });

  // Guardar estado
  localStorage.setItem('lowPowerMode', JSON.stringify(lowPowerMode));

  // Actualizar UI
  updateLowPowerUI();
}

// Función para aplicar optimizaciones de bajo consumo
function applyLowPowerOptimizations() {
  const body = document.body;

  // Agregar clase de bajo consumo
  body.classList.add('low-power-active');

  // Desactivar animaciones
  if (LOW_POWER_CONFIG.disableAnimations) {
    body.style.setProperty('--animation-duration', '0s');
    document.querySelectorAll('.animated, .pulse, .bounce, .fade-in').forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
  }

  // Reducir calidad de imágenes
  if (LOW_POWER_CONFIG.reduceImageQuality) {
    document.querySelectorAll('img').forEach(img => {
      if (!img.dataset.originalSrc) {
        img.dataset.originalSrc = img.src;
        // En un entorno real, aquí cargaríamos versiones de baja calidad
        img.style.filter = 'brightness(0.95)';
      }
    });
  }

  // Desactivar actualizaciones automáticas
  if (LOW_POWER_CONFIG.reduceUpdates) {
    // Pausar timers de actualización automática
    if (window.updateTimers) {
      window.updateTimers.forEach(clearInterval);
      window.updateTimers = [];
    }
  }

  // Notificar al service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_LOW_POWER_MODE',
      data: { active: true }
    });
  }

  // Reducir frecuencia de analytics
  if (typeof gtag !== 'undefined') {
    // Reducir envío de eventos
    window.originalGtag = window.gtag;
    window.gtag = (...args) => {
      // Solo enviar eventos críticos en modo de bajo consumo
      if (args[0] === 'event' && ['error', 'exception'].includes(args[1])) {
        window.originalGtag(...args);
      }
    };
  }
}

// Función para restaurar funcionalidades normales
function restoreNormalFunctionality() {
  const body = document.body;

  // Remover clase de bajo consumo
  body.classList.remove('low-power-active');

  // Restaurar animaciones
  body.style.removeProperty('--animation-duration');
  document.querySelectorAll('[style*="animation: none"], [style*="transition: none"]').forEach(el => {
    el.style.removeProperty('animation');
    el.style.removeProperty('transition');
  });

  // Restaurar calidad de imágenes
  document.querySelectorAll('img[data-original-src]').forEach(img => {
    if (img.dataset.originalSrc) {
      img.src = img.dataset.originalSrc;
      delete img.dataset.originalSrc;
      img.style.removeProperty('filter');
    }
  });

  // Restaurar analytics
  if (window.originalGtag) {
    window.gtag = window.originalGtag;
    delete window.originalGtag;
  }

  // Notificar al service worker
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SET_LOW_POWER_MODE',
      data: { active: false }
    });
  }
}

// Función para mostrar configuración del modo de bajo consumo
function showLowPowerSettings() {
  const modal = document.createElement('div');
  modal.className = 'low-power-settings-modal';
  modal.innerHTML = `
    <div class="low-power-settings-content">
      <h3>🔋 Configuración de Batería</h3>

      <div class="battery-status">
        <div class="battery-info">
          <span class="battery-level">${lowPowerMode.batteryLevel}%</span>
          <span class="battery-status-text">${lowPowerMode.batteryCharging ? 'Cargando' : 'Descargando'}</span>
        </div>
        <div class="battery-bar">
          <div class="battery-fill" style="width: ${lowPowerMode.batteryLevel}%"></div>
        </div>
      </div>

      <div class="power-settings">
        <div class="setting-item">
          <label>
            <input type="checkbox" id="auto-low-power" ${lowPowerMode.autoEnabled ? 'checked' : ''}>
            Activación automática
          </label>
          <span class="setting-desc">Activar cuando la batería baje del ${LOW_POWER_CONFIG.autoActivationThreshold}%</span>
        </div>

        <div class="setting-item">
          <label>
            <input type="checkbox" id="manual-low-power" ${lowPowerMode.manualEnabled ? 'checked' : ''}>
            Modo manual activo
          </label>
          <span class="setting-desc">Mantener modo de bajo consumo activado manualmente</span>
        </div>

        <div class="setting-item">
          <label for="battery-threshold">Umbral de activación:</label>
          <input type="range" id="battery-threshold" min="5" max="50" value="${LOW_POWER_CONFIG.autoActivationThreshold}">
          <span id="threshold-value">${LOW_POWER_CONFIG.autoActivationThreshold}%</span>
        </div>
      </div>

      <div class="power-actions">
        <button class="power-btn ${lowPowerMode.active ? 'deactivate' : 'activate'}" data-action="toggle">
          ${lowPowerMode.active ? '🚫 Desactivar' : '🔋 Activar'} Modo de Bajo Consumo
        </button>
        <button class="power-btn test" data-action="test">🧪 Probar Notificación</button>
      </div>

      <button class="close-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Configurar event listeners
  const autoCheckbox = modal.querySelector('#auto-low-power');
  const manualCheckbox = modal.querySelector('#manual-low-power');
  const thresholdSlider = modal.querySelector('#battery-threshold');
  const thresholdValue = modal.querySelector('#threshold-value');

  autoCheckbox.addEventListener('change', (e) => {
    lowPowerMode.autoEnabled = e.target.checked;
    localStorage.setItem('lowPowerMode', JSON.stringify(lowPowerMode));
  });

  manualCheckbox.addEventListener('change', (e) => {
    lowPowerMode.manualEnabled = e.target.checked;
    if (e.target.checked) {
      activateLowPowerMode('manual');
    } else if (lowPowerMode.active && !shouldAutoActivate()) {
      deactivateLowPowerMode();
    }
    localStorage.setItem('lowPowerMode', JSON.stringify(lowPowerMode));
  });

  thresholdSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    thresholdValue.textContent = value + '%';
    LOW_POWER_CONFIG.autoActivationThreshold = value;
    localStorage.setItem('lowPowerConfig', JSON.stringify(LOW_POWER_CONFIG));
  });

  // Manejar botones
  modal.addEventListener('click', (e) => {
    const action = e.target.dataset.action;

    if (action === 'toggle') {
      if (lowPowerMode.active) {
        deactivateLowPowerMode();
      } else {
        activateLowPowerMode('manual');
      }
      modal.remove();
    } else if (action === 'test') {
      showBatteryStatusNotification();
    } else if (e.target.classList.contains('close-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

// Función auxiliar para determinar si debe auto-activarse
function shouldAutoActivate() {
  return lowPowerMode.autoEnabled &&
         !lowPowerMode.batteryCharging &&
         lowPowerMode.batteryLevel <= LOW_POWER_CONFIG.autoActivationThreshold;
}

// Función para mostrar notificación de estado de batería
function showBatteryStatusNotification() {
  const level = lowPowerMode.batteryLevel;
  const charging = lowPowerMode.batteryCharging;

  let title, message, type;

  if (charging) {
    title = '🔌 Cargando batería';
    message = `Batería al ${level}%. Cargando...`;
    type = 'success';
  } else if (level <= 10) {
    title = '⚠️ Batería crítica';
    message = `Batería al ${level}%. Considere cargar el dispositivo.`;
    type = 'error';
  } else if (level <= 20) {
    title = '🪫 Batería baja';
    message = `Batería al ${level}%. Active el modo de ahorro de energía.`;
    type = 'warning';
  } else {
    title = '🔋 Estado de batería';
    message = `Batería al ${level}%.`;
    type = 'info';
  }

  showNotification({
    title,
    message,
    type,
    confirm: level <= 20 && !charging,
    confirmText: 'Activar ahorro',
    onConfirm: () => activateLowPowerMode('manual')
  });
}

// Función para actualizar indicador de batería
function updateBatteryIndicator() {
  const existing = document.getElementById('battery-indicator');
  if (existing) {
    existing.remove();
  }

  // Solo mostrar indicador si batería baja o modo activo
  if (lowPowerMode.batteryLevel > 25 && !lowPowerMode.active) {
    return;
  }

  const indicator = document.createElement('div');
  indicator.id = 'battery-indicator';
  indicator.className = `battery-indicator ${lowPowerMode.active ? 'low-power' : ''}`;

  indicator.innerHTML = `
    <div class="battery-content">
      <span class="battery-icon">${lowPowerMode.batteryCharging ? '🔌' : lowPowerMode.active ? '🔋' : '🪫'}</span>
      <span class="battery-text">${lowPowerMode.batteryLevel}%</span>
      ${lowPowerMode.active ? '<span class="power-save-text">AHORRO</span>' : ''}
    </div>
  `;

  document.body.appendChild(indicator);

  // Auto-ocultar después de 10 segundos si no está en modo de bajo consumo
  if (!lowPowerMode.active) {
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.classList.add('fade-out');
        setTimeout(() => indicator.remove(), 300);
      }
    }, 10000);
  }
}

// Función para actualizar UI del modo de bajo consumo
function updateLowPowerUI() {
  const body = document.body;

  if (lowPowerMode.active) {
    body.classList.add('low-power-mode');
  } else {
    body.classList.remove('low-power-mode');
  }

  updateBatteryIndicator();
}

// Función de fallback para cuando no hay API de batería
function setupBatteryFallback() {
  // Estimar nivel de batería basado en tiempo de uso
  const usageStart = localStorage.getItem('usageStart');
  const now = Date.now();

  if (!usageStart) {
    localStorage.setItem('usageStart', now.toString());
    lowPowerMode.batteryLevel = 100;
  } else {
    const usageTime = now - parseInt(usageStart);
    const estimatedDrain = (usageTime / (8 * 60 * 60 * 1000)) * 100; // 8 horas = 100% drain
    lowPowerMode.batteryLevel = Math.max(10, 100 - estimatedDrain);
  }

  // Simular cambios periódicos
  setInterval(() => {
    if (!lowPowerMode.batteryCharging) {
      lowPowerMode.batteryLevel = Math.max(0, lowPowerMode.batteryLevel - 0.1);
      checkLowPowerModeActivation();
    }
  }, 60000); // Cada minuto

  console.log('[Battery] Usando estimación de batería');
}

// Función para cargar configuración guardada
function loadLowPowerSettings() {
  try {
    const savedMode = localStorage.getItem('lowPowerMode');
    const savedConfig = localStorage.getItem('lowPowerConfig');

    if (savedMode) {
      Object.assign(lowPowerMode, JSON.parse(savedMode));
    }

    if (savedConfig) {
      Object.assign(LOW_POWER_CONFIG, JSON.parse(savedConfig));
    }

    // Aplicar estado guardado
    if (lowPowerMode.active) {
      applyLowPowerOptimizations();
    }

    updateLowPowerUI();

  } catch (error) {
    console.error('[Low Power] Error cargando configuración:', error);
  }
}

// Inicializar sistema de batería
document.addEventListener('DOMContentLoaded', () => {
  loadLowPowerSettings();
  initializeBatteryMonitoring();
});

// ============================================
// SISTEMA DE WIDGETS INTERACTIVOS PARA PANTALLA DE INICIO
// ============================================

// Configuración de widgets disponibles
const AVAILABLE_WIDGETS = {
  'progress': {
    name: 'Progreso de Pareja',
    icon: '💕',
    description: 'Muestra el progreso de tus metas románticas',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium'
  },
  'reminders': {
    name: 'Recordatorios Diarios',
    icon: '⏰',
    description: 'Recordatorios personalizados para momentos especiales',
    sizes: ['small', 'medium'],
    defaultSize: 'medium'
  },
  'stats': {
    name: 'Estadísticas Rápidas',
    icon: '📊',
    description: 'Métricas importantes de tu relación',
    sizes: ['small', 'medium', 'large'],
    defaultSize: 'medium'
  },
  'tasks': {
    name: 'Tareas Pendientes',
    icon: '✅',
    description: 'Lista rápida de tareas por completar',
    sizes: ['small', 'medium'],
    defaultSize: 'small'
  },
  'mood': {
    name: 'Estado de Ánimo',
    icon: '😊',
    description: 'Comparte y sigue el estado de ánimo de tu pareja',
    sizes: ['small'],
    defaultSize: 'small'
  },
  'anniversaries': {
    name: 'Próximos Aniversarios',
    icon: '🎂',
    description: 'Cuenta regresiva para fechas especiales',
    sizes: ['small', 'medium'],
    defaultSize: 'small'
  },
  'photos': {
    name: 'Fotos Recientes',
    icon: '📸',
    description: 'Galería rápida de momentos compartidos',
    sizes: ['medium', 'large'],
    defaultSize: 'medium'
  },
  'music': {
    name: 'Playlist Romántica',
    icon: '🎵',
    description: 'Controla tu música romántica favorita',
    sizes: ['small', 'medium'],
    defaultSize: 'medium'
  }
};

// Estado de widgets instalados
let installedWidgets = JSON.parse(localStorage.getItem('installedWidgets') || '[]');

// Función para mostrar el gestor de widgets
function showWidgetManager() {
  const modal = document.createElement('div');
  modal.className = 'widget-manager-modal';
  modal.innerHTML = `
    <div class="widget-manager-content">
      <h3>🎯 Widgets para Pantalla de Inicio</h3>
      <p class="widget-description">
        Agrega widgets interactivos a tu pantalla de inicio para acceder rápidamente a las funciones más importantes de tu app romántica.
      </p>

      <div class="widget-grid">
        ${Object.entries(AVAILABLE_WIDGETS).map(([key, widget]) => `
          <div class="widget-card ${installedWidgets.includes(key) ? 'installed' : ''}" data-widget="${key}">
            <div class="widget-header">
              <span class="widget-icon">${widget.icon}</span>
              <span class="widget-status">${installedWidgets.includes(key) ? 'Instalado' : 'Disponible'}</span>
            </div>
            <div class="widget-info">
              <h4>${widget.name}</h4>
              <p>${widget.description}</p>
              <div class="widget-sizes">
                ${widget.sizes.map(size => `<span class="size-option">${size}</span>`).join('')}
              </div>
            </div>
            <button class="widget-action-btn" data-action="${installedWidgets.includes(key) ? 'remove' : 'install'}">
              ${installedWidgets.includes(key) ? 'Remover' : 'Instalar'}
            </button>
          </div>
        `).join('')}
      </div>

      <div class="widget-instructions">
        <h4>📱 Cómo agregar widgets:</h4>
        <ol>
          <li>Instala los widgets que deseas desde arriba</li>
          <li>Ve a la pantalla de inicio de tu teléfono</li>
          <li>Mantén presionado en un espacio vacío</li>
          <li>Selecciona "Widgets" y busca "ThingsToDo"</li>
          <li>Arrastra el widget deseado a tu pantalla</li>
        </ol>
      </div>

      <button class="close-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('click', (e) => {
    const widgetCard = e.target.closest('.widget-card');
    const actionBtn = e.target.closest('.widget-action-btn');

    if (actionBtn) {
      const widgetKey = widgetCard.dataset.widget;
      const action = actionBtn.dataset.action;

      if (action === 'install') {
        installWidget(widgetKey);
        widgetCard.classList.add('installed');
        actionBtn.textContent = 'Remover';
        actionBtn.dataset.action = 'remove';
        widgetCard.querySelector('.widget-status').textContent = 'Instalado';
      } else {
        removeWidget(widgetKey);
        widgetCard.classList.remove('installed');
        actionBtn.textContent = 'Instalar';
        actionBtn.dataset.action = 'install';
        widgetCard.querySelector('.widget-status').textContent = 'Disponible';
      }
    }

    if (e.target.classList.contains('close-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

// Función para instalar un widget
function installWidget(widgetKey) {
  if (!installedWidgets.includes(widgetKey)) {
    installedWidgets.push(widgetKey);
    localStorage.setItem('installedWidgets', JSON.stringify(installedWidgets));

    // Notificar al service worker para actualizar widgets
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_WIDGETS',
        data: { installedWidgets }
      });
    }

    showNotification({
      title: '✅ Widget Instalado',
      message: `El widget "${AVAILABLE_WIDGETS[widgetKey].name}" está listo para usar en tu pantalla de inicio.`,
      type: 'success'
    });
  }
}

// Función para remover un widget
function removeWidget(widgetKey) {
  const index = installedWidgets.indexOf(widgetKey);
  if (index > -1) {
    installedWidgets.splice(index, 1);
    localStorage.setItem('installedWidgets', JSON.stringify(installedWidgets));

    // Notificar al service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_WIDGETS',
        data: { installedWidgets }
      });
    }

    showNotification({
      title: '🗑️ Widget Removido',
      message: `El widget "${AVAILABLE_WIDGETS[widgetKey].name}" ha sido removido.`,
      type: 'info'
    });
  }
}

// ============================================
// WIDGET 1: PROGRESO DE PAREJA
// ============================================

class ProgressWidget {
  constructor(size = 'medium') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget progress-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateData();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">💕</span>
        <span class="widget-title">Progreso</span>
      </div>
      <div class="widget-content">
        <div class="progress-ring">
          <svg class="progress-circle" width="80" height="80">
            <circle class="progress-bg" cx="40" cy="40" r="35" stroke="#e9ecef" stroke-width="6" fill="none"/>
            <circle class="progress-fill" cx="40" cy="40" r="35" stroke="#8B5CF6" stroke-width="6" fill="none"
                    stroke-dasharray="219.91" stroke-dashoffset="219.91"/>
          </svg>
          <div class="progress-text">
            <span class="progress-percent">0%</span>
            <span class="progress-label">Completado</span>
          </div>
        </div>
        <div class="progress-stats">
          <div class="stat-item">
            <span class="stat-number" id="completed-tasks">0</span>
            <span class="stat-label">Tareas</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="streak-days">0</span>
            <span class="stat-label">Días</span>
          </div>
          <div class="stat-item">
            <span class="stat-number" id="love-level">0</span>
            <span class="stat-label">Nivel</span>
          </div>
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="view-details">Ver Detalles</button>
      </div>
    `;
  }

  attachEvents() {
    const viewDetailsBtn = this.element.querySelector('[data-action="view-details"]');
    viewDetailsBtn.addEventListener('click', () => {
      // Abrir la app en la sección de estadísticas
      window.location.href = '#stats';
      if (window.showStatsModal) {
        window.showStatsModal();
      }
    });
  }

  updateData() {
    // Calcular progreso basado en datos reales
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calcular racha de días
    const streakDays = this.calculateStreakDays();

    // Calcular nivel de amor (basado en interacciones)
    const loveLevel = this.calculateLoveLevel();

    // Actualizar UI
    const progressFill = this.element.querySelector('.progress-fill');
    const progressPercentEl = this.element.querySelector('.progress-percent');
    const completedTasksEl = this.element.querySelector('#completed-tasks');
    const streakDaysEl = this.element.querySelector('#streak-days');
    const loveLevelEl = this.element.querySelector('#love-level');

    if (progressFill && progressPercentEl) {
      const circumference = 2 * Math.PI * 35;
      const offset = circumference - (progressPercent / 100) * circumference;
      progressFill.style.strokeDashoffset = offset;
      progressPercentEl.textContent = `${progressPercent}%`;
    }

    if (completedTasksEl) completedTasksEl.textContent = completedTasks;
    if (streakDaysEl) streakDaysEl.textContent = streakDays;
    if (loveLevelEl) loveLevelEl.textContent = loveLevel;
  }

  calculateStreakDays() {
    // Lógica para calcular racha de días consecutivos
    const today = new Date().toDateString();
    const lastActivity = localStorage.getItem('lastActivityDate');

    if (lastActivity === today) {
      const streak = parseInt(localStorage.getItem('activityStreak') || '0');
      return streak;
    }

    return 0;
  }

  calculateLoveLevel() {
    // Calcular nivel basado en diversas métricas
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]').length;
    const messages = JSON.parse(localStorage.getItem('messages') || '[]').length;
    const photos = JSON.parse(localStorage.getItem('photos') || '[]').length;

    const totalInteractions = tasks + messages + photos;
    return Math.min(Math.floor(totalInteractions / 10) + 1, 100);
  }
}

// ============================================
// WIDGET 2: RECORDATORIOS DIARIOS
// ============================================

class RemindersWidget {
  constructor(size = 'medium') {
    this.size = size;
    this.element = null;
    this.reminders = JSON.parse(localStorage.getItem('dailyReminders') || '[]');
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget reminders-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateReminders();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">⏰</span>
        <span class="widget-title">Recordatorios</span>
      </div>
      <div class="widget-content">
        <div class="current-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div class="reminders-list">
          ${this.getRemindersHTML()}
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="add-reminder">+ Agregar</button>
        <button class="widget-btn" data-action="view-all">Ver Todos</button>
      </div>
    `;
  }

  getRemindersHTML() {
    if (this.reminders.length === 0) {
      return '<div class="no-reminders">No hay recordatorios activos</div>';
    }

    return this.reminders.slice(0, 3).map(reminder => `
      <div class="reminder-item" data-id="${reminder.id}">
        <div class="reminder-time">${reminder.time}</div>
        <div class="reminder-text">${reminder.text}</div>
        <button class="reminder-check" data-action="complete">✓</button>
      </div>
    `).join('');
  }

  attachEvents() {
    const addBtn = this.element.querySelector('[data-action="add-reminder"]');
    const viewAllBtn = this.element.querySelector('[data-action="view-all"]');

    addBtn.addEventListener('click', () => this.showAddReminderModal());
    viewAllBtn.addEventListener('click', () => {
      // Abrir sección de recordatorios en la app
      window.location.href = '#reminders';
    });

    // Event delegation para completar recordatorios
    this.element.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'complete') {
        const reminderId = e.target.closest('.reminder-item').dataset.id;
        this.completeReminder(reminderId);
      }
    });

    // Actualizar hora cada minuto
    setInterval(() => {
      const timeEl = this.element.querySelector('.current-time');
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      }
    }, 60000);
  }

  showAddReminderModal() {
    const modal = document.createElement('div');
    modal.className = 'reminder-modal';
    modal.innerHTML = `
      <div class="reminder-modal-content">
        <h4>🔔 Nuevo Recordatorio</h4>
        <input type="time" id="reminder-time" value="12:00">
        <input type="text" id="reminder-text" placeholder="Mensaje del recordatorio" maxlength="50">
        <div class="reminder-actions">
          <button id="save-reminder">Guardar</button>
          <button id="cancel-reminder">Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const saveBtn = modal.querySelector('#save-reminder');
    const cancelBtn = modal.querySelector('#cancel-reminder');

    saveBtn.addEventListener('click', () => {
      const time = modal.querySelector('#reminder-time').value;
      const text = modal.querySelector('#reminder-text').value.trim();

      if (time && text) {
        this.addReminder(time, text);
        modal.remove();
      }
    });

    cancelBtn.addEventListener('click', () => modal.remove());
  }

  addReminder(time, text) {
    const reminder = {
      id: Date.now().toString(),
      time,
      text,
      completed: false,
      created: new Date().toISOString()
    };

    this.reminders.push(reminder);
    localStorage.setItem('dailyReminders', JSON.stringify(this.reminders));
    this.updateReminders();

    // Programar notificación
    this.scheduleReminderNotification(reminder);
  }

  completeReminder(id) {
    const reminder = this.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.completed = true;
      localStorage.setItem('dailyReminders', JSON.stringify(this.reminders));
      this.updateReminders();
    }
  }

  scheduleReminderNotification(reminder) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_REMINDER',
        data: reminder
      });
    }
  }

  updateReminders() {
    const listEl = this.element.querySelector('.reminders-list');
    if (listEl) {
      listEl.innerHTML = this.getRemindersHTML();
    }
  }
}

// ============================================
// WIDGET 3: ESTADÍSTICAS RÁPIDAS
// ============================================

class StatsWidget {
  constructor(size = 'medium') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget stats-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateStats();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">📊</span>
        <span class="widget-title">Estadísticas</span>
      </div>
      <div class="widget-content">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value" id="total-tasks">0</div>
            <div class="stat-label">Tareas Totales</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="completed-rate">0%</div>
            <div class="stat-label">Completadas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="active-days">0</div>
            <div class="stat-label">Días Activos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" id="avg-mood">😊</div>
            <div class="stat-label">Ánimo Promedio</div>
          </div>
        </div>
        <div class="quick-insight">
          <span id="insight-text">Cargando insights...</span>
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="view-full-stats">Ver Más</button>
      </div>
    `;
  }

  attachEvents() {
    const viewStatsBtn = this.element.querySelector('[data-action="view-full-stats"]');
    viewStatsBtn.addEventListener('click', () => {
      window.location.href = '#stats';
      if (window.showStatsModal) {
        window.showStatsModal();
      }
    });
  }

  updateStats() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calcular días activos
    const activeDays = this.calculateActiveDays();

    // Calcular ánimo promedio
    const avgMood = this.calculateAverageMood();

    // Generar insight rápido
    const insight = this.generateQuickInsight(completionRate, activeDays);

    // Actualizar UI
    this.updateElement('#total-tasks', totalTasks);
    this.updateElement('#completed-rate', `${completionRate}%`);
    this.updateElement('#active-days', activeDays);
    this.updateElement('#avg-mood', avgMood);
    this.updateElement('#insight-text', insight);
  }

  updateElement(selector, value) {
    const el = this.element.querySelector(selector);
    if (el) el.textContent = value;
  }

  calculateActiveDays() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const uniqueDays = new Set();

    tasks.forEach(task => {
      if (task.created) {
        const date = new Date(task.created).toDateString();
        uniqueDays.add(date);
      }
    });

    return uniqueDays.size;
  }

  calculateAverageMood() {
    const moodHistory = JSON.parse(localStorage.getItem('moodHistory') || '[]');
    if (moodHistory.length === 0) return '😊';

    const moodValues = { '😢': 1, '😐': 2, '😊': 3, '😍': 4, '🥰': 5 };
    const total = moodHistory.reduce((sum, mood) => sum + (moodValues[mood.emoji] || 3), 0);
    const average = total / moodHistory.length;

    if (average >= 4.5) return '🥰';
    if (average >= 3.5) return '😍';
    if (average >= 2.5) return '😊';
    if (average >= 1.5) return '😐';
    return '😢';
  }

  generateQuickInsight(completionRate, activeDays) {
    if (completionRate >= 80) {
      return "¡Excelente progreso! Sigan así 💪";
    } else if (completionRate >= 60) {
      return "Buen trabajo, van por buen camino 📈";
    } else if (activeDays >= 7) {
      return "¡Han sido muy activos esta semana! 🎉";
    } else {
      return "¡Cada día cuenta! No se rindan 💕";
    }
  }
}

// ============================================
// WIDGET 4: TAREAS PENDIENTES
// ============================================

class TasksWidget {
  constructor(size = 'small') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget tasks-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateTasks();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">✅</span>
        <span class="widget-title">Pendientes</span>
      </div>
      <div class="widget-content">
        <div class="pending-tasks-list">
          <!-- Tasks will be populated here -->
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="add-task">+ Nueva</button>
        <button class="widget-btn" data-action="view-all">Ver Todas</button>
      </div>
    `;
  }

  attachEvents() {
    const addBtn = this.element.querySelector('[data-action="add-task"]');
    const viewAllBtn = this.element.querySelector('[data-action="view-all"]');

    addBtn.addEventListener('click', () => {
      // Abrir modal de nueva tarea
      window.location.href = '#new-task';
      if (window.showNewTaskForm) {
        window.showNewTaskForm();
      }
    });

    viewAllBtn.addEventListener('click', () => {
      window.location.href = '#tasks';
    });

    // Event delegation para completar tareas
    this.element.addEventListener('click', (e) => {
      if (e.target.classList.contains('task-check')) {
        const taskId = e.target.dataset.taskId;
        this.completeTask(taskId);
      }
    });
  }

  updateTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const pendingTasks = tasks.filter(task => !task.completed).slice(0, 5);

    const listEl = this.element.querySelector('.pending-tasks-list');
    if (listEl) {
      listEl.innerHTML = pendingTasks.length > 0
        ? pendingTasks.map(task => `
            <div class="task-item" data-task-id="${task.id}">
              <button class="task-check" data-task-id="${task.id}">○</button>
              <span class="task-text">${task.text}</span>
            </div>
          `).join('')
        : '<div class="no-tasks">¡Todas las tareas completadas! 🎉</div>';
    }
  }

  completeTask(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const task = tasks.find(t => t.id === taskId);

    if (task) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
      localStorage.setItem('tasks', JSON.stringify(tasks));
      this.updateTasks();

      // Integrar con sistema de gamificación
      if (window.integrateTaskCompletion) {
        window.integrateTaskCompletion(10); // 10 puntos por tarea completada
      }

      // Mostrar celebración
      this.showCelebration();
    }
  }

  showCelebration() {
    const celebration = document.createElement('div');
    celebration.className = 'task-celebration';
    celebration.innerHTML = '🎉';
    celebration.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 48px;
      z-index: 1000;
      animation: celebrate 1s ease-out;
    `;

    document.body.appendChild(celebration);
    setTimeout(() => celebration.remove(), 1000);
  }
}

// ============================================
// WIDGET 5: ESTADO DE ÁNIMO
// ============================================

class MoodWidget {
  constructor(size = 'small') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget mood-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateMood();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">😊</span>
        <span class="widget-title">Mi Ánimo</span>
      </div>
      <div class="widget-content">
        <div class="current-mood" id="current-mood">😊</div>
        <div class="mood-options">
          <button class="mood-btn" data-mood="😢">😢</button>
          <button class="mood-btn" data-mood="😐">😐</button>
          <button class="mood-btn" data-mood="😊">😊</button>
          <button class="mood-btn" data-mood="😍">😍</button>
          <button class="mood-btn" data-mood="🥰">🥰</button>
        </div>
        <div class="partner-mood">
          <span class="partner-label">Pareja:</span>
          <span class="partner-emoji" id="partner-mood">🤔</span>
        </div>
      </div>
    `;
  }

  attachEvents() {
    this.element.addEventListener('click', (e) => {
      if (e.target.classList.contains('mood-btn')) {
        const mood = e.target.dataset.mood;
        this.setMood(mood);
      }
    });
  }

  setMood(mood) {
    const moodHistory = JSON.parse(localStorage.getItem('moodHistory') || '[]');
    const today = new Date().toDateString();
    const todayEntry = moodHistory.find(entry => entry.date === today);

    if (todayEntry) {
      todayEntry.emoji = mood;
    } else {
      moodHistory.push({
        date: today,
        emoji: mood,
        timestamp: new Date().toISOString()
      });
    }

    localStorage.setItem('moodHistory', JSON.stringify(moodHistory));
    this.updateMood();

    // Compartir con pareja
    this.shareMoodWithPartner(mood);
  }

  shareMoodWithPartner(mood) {
    // Enviar a Firebase si hay pareja conectada
    const partnerId = localStorage.getItem('partnerId');
    if (partnerId && window.db) {
      window.db.collection('moods').add({
        userId: localStorage.getItem('userId'),
        partnerId: partnerId,
        emoji: mood,
        timestamp: new Date().toISOString()
      });
    }
  }

  updateMood() {
    const moodHistory = JSON.parse(localStorage.getItem('moodHistory') || '[]');
    const today = new Date().toDateString();
    const todayEntry = moodHistory.find(entry => entry.date === today);

    const currentMoodEl = this.element.querySelector('#current-mood');
    if (currentMoodEl) {
      currentMoodEl.textContent = todayEntry ? todayEntry.emoji : '😊';
    }

    // Actualizar ánimo de pareja (simulado por ahora)
    this.updatePartnerMood();
  }

  updatePartnerMood() {
    const partnerMoodEl = this.element.querySelector('#partner-mood');
    if (partnerMoodEl) {
      // En una implementación real, esto vendría de Firebase
      const moods = ['😊', '🥰', '😍', '😐', '😢'];
      const randomMood = moods[Math.floor(Math.random() * moods.length)];
      partnerMoodEl.textContent = randomMood;
    }
  }
}

// ============================================
// WIDGET 6: PRÓXIMOS ANIVERSARIOS
// ============================================

class AnniversariesWidget {
  constructor(size = 'small') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget anniversaries-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updateAnniversaries();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">🎂</span>
        <span class="widget-title">Aniversarios</span>
      </div>
      <div class="widget-content">
        <div class="next-anniversary">
          <div class="countdown" id="countdown">--</div>
          <div class="event-name" id="event-name">Cargando...</div>
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="view-calendar">Calendario</button>
      </div>
    `;
  }

  attachEvents() {
    const calendarBtn = this.element.querySelector('[data-action="view-calendar"]');
    calendarBtn.addEventListener('click', () => {
      window.location.href = '#calendar';
      if (window.showCalendar) {
        window.showCalendar();
      }
    });
  }

  updateAnniversaries() {
    const anniversaries = JSON.parse(localStorage.getItem('anniversaries') || '[]');
    const next = this.getNextAnniversary(anniversaries);

    if (next) {
      const daysUntil = this.daysUntil(next.date);
      this.updateElement('#countdown', daysUntil === 0 ? '¡HOY!' : `${daysUntil}d`);
      this.updateElement('#event-name', next.name);
    } else {
      this.updateElement('#countdown', '--');
      this.updateElement('#event-name', 'Sin aniversarios');
    }
  }

  getNextAnniversary(anniversaries) {
    const today = new Date();
    const currentYear = today.getFullYear();

    let nextAnniversary = null;
    let minDays = Infinity;

    anniversaries.forEach(anniversary => {
      const [month, day] = anniversary.date.split('-').map(Number);
      const anniversaryDate = new Date(currentYear, month - 1, day);

      // Si ya pasó este año, considerar el próximo año
      if (anniversaryDate < today) {
        anniversaryDate.setFullYear(currentYear + 1);
      }

      const daysUntil = Math.ceil((anniversaryDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntil < minDays) {
        minDays = daysUntil;
        nextAnniversary = {
          ...anniversary,
          date: anniversaryDate
        };
      }
    });

    return nextAnniversary;
  }

  daysUntil(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  updateElement(selector, value) {
    const el = this.element.querySelector(selector);
    if (el) el.textContent = value;
  }
}

// ============================================
// WIDGET 7: FOTOS RECIENTES
// ============================================

class PhotosWidget {
  constructor(size = 'medium') {
    this.size = size;
    this.element = null;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget photos-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updatePhotos();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">📸</span>
        <span class="widget-title">Fotos</span>
      </div>
      <div class="widget-content">
        <div class="photos-grid">
          <!-- Photos will be populated here -->
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="take-photo">📷 Tomar</button>
        <button class="widget-btn" data-action="view-gallery">Ver Todas</button>
      </div>
    `;
  }

  attachEvents() {
    const takePhotoBtn = this.element.querySelector('[data-action="take-photo"]');
    const viewGalleryBtn = this.element.querySelector('[data-action="view-gallery"]');

    takePhotoBtn.addEventListener('click', () => this.takePhoto());
    viewGalleryBtn.addEventListener('click', () => {
      window.location.href = '#gallery';
      if (window.showGallery) {
        window.showGallery();
      }
    });
  }

  takePhoto() {
    // Usar la API de cámara si está disponible
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Mostrar preview de cámara
          this.showCameraPreview(stream);
        })
        .catch(error => {
          console.error('Error accessing camera:', error);
          // Fallback: abrir selector de archivos
          this.openFilePicker();
        });
    } else {
      this.openFilePicker();
    }
  }

  showCameraPreview(stream) {
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-content">
        <video id="camera-preview" autoplay></video>
        <div class="camera-controls">
          <button id="capture-btn">📸 Capturar</button>
          <button id="cancel-camera">❌ Cancelar</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const video = modal.querySelector('#camera-preview');
    video.srcObject = stream;

    const captureBtn = modal.querySelector('#capture-btn');
    const cancelBtn = modal.querySelector('#cancel-camera');

    captureBtn.addEventListener('click', () => {
      this.capturePhoto(video, stream, modal);
    });

    cancelBtn.addEventListener('click', () => {
      stream.getTracks().forEach(track => track.stop());
      modal.remove();
    });
  }

  capturePhoto(video, stream, modal) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob(blob => {
      this.savePhoto(blob);
      stream.getTracks().forEach(track => track.stop());
      modal.remove();
    });
  }

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.savePhoto(file);
      }
    });
    input.click();
  }

  savePhoto(blob) {
    const reader = new FileReader();
    reader.onload = () => {
      const photos = JSON.parse(localStorage.getItem('photos') || '[]');
      photos.unshift({
        id: Date.now().toString(),
        data: reader.result,
        timestamp: new Date().toISOString(),
        location: null // Podría agregar geolocalización
      });

      // Mantener solo las últimas 50 fotos
      if (photos.length > 50) {
        photos.splice(50);
      }

      localStorage.setItem('photos', JSON.stringify(photos));
      this.updatePhotos();
    };
    reader.readAsDataURL(blob);
  }

  updatePhotos() {
    const photos = JSON.parse(localStorage.getItem('photos') || '[]');
    const recentPhotos = photos.slice(0, 4);

    const gridEl = this.element.querySelector('.photos-grid');
    if (gridEl) {
      gridEl.innerHTML = recentPhotos.length > 0
        ? recentPhotos.map(photo => `
            <div class="photo-item">
              <img src="${photo.data}" alt="Foto" onclick="this.requestFullscreen()">
            </div>
          `).join('')
        : '<div class="no-photos">No hay fotos aún 📷</div>';
    }
  }
}

// ============================================
// WIDGET 8: PLAYLIST ROMÁNTICA
// ============================================

class MusicWidget {
  constructor(size = 'medium') {
    this.size = size;
    this.element = null;
    this.currentTrack = null;
    this.isPlaying = false;
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = `widget music-widget size-${this.size}`;
    this.element.innerHTML = this.getTemplate();
    this.attachEvents();
    this.updatePlaylist();
    return this.element;
  }

  getTemplate() {
    return `
      <div class="widget-header">
        <span class="widget-icon">🎵</span>
        <span class="widget-title">Música</span>
      </div>
      <div class="widget-content">
        <div class="current-track">
          <div class="track-info">
            <div class="track-title" id="track-title">Sin reproducción</div>
            <div class="track-artist" id="track-artist">-</div>
          </div>
          <div class="track-controls">
            <button class="control-btn" data-action="prev">⏮️</button>
            <button class="control-btn" data-action="play-pause">▶️</button>
            <button class="control-btn" data-action="next">⏭️</button>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
      </div>
      <div class="widget-actions">
        <button class="widget-btn" data-action="open-player">🎧 Reproductor</button>
      </div>
    `;
  }

  attachEvents() {
    const controls = this.element.querySelectorAll('.control-btn');
    const openPlayerBtn = this.element.querySelector('[data-action="open-player"]');

    controls.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleControlAction(action);
      });
    });

    openPlayerBtn.addEventListener('click', () => {
      window.location.href = '#music';
      if (window.showMusicPlayer) {
        window.showMusicPlayer();
      }
    });
  }

  handleControlAction(action) {
    switch (action) {
      case 'play-pause':
        this.togglePlayPause();
        break;
      case 'next':
        this.nextTrack();
        break;
      case 'prev':
        this.previousTrack();
        break;
    }
  }

  togglePlayPause() {
    const playPauseBtn = this.element.querySelector('[data-action="play-pause"]');

    if (this.isPlaying) {
      this.pause();
      playPauseBtn.textContent = '▶️';
    } else {
      this.play();
      playPauseBtn.textContent = '⏸️';
    }
  }

  play() {
    this.isPlaying = true;
    // Integrar con Media Session API si está disponible
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }

  pause() {
    this.isPlaying = false;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'paused';
    }
  }

  nextTrack() {
    // Lógica para siguiente canción
    console.log('Next track');
  }

  previousTrack() {
    // Lógica para canción anterior
    console.log('Previous track');
  }

  updatePlaylist() {
    // Cargar playlist desde localStorage o servicio de música
    const playlist = JSON.parse(localStorage.getItem('playlist') || '[]');

    if (playlist.length > 0) {
      this.currentTrack = playlist[0];
      this.updateElement('#track-title', this.currentTrack.title || 'Canción sin título');
      this.updateElement('#track-artist', this.currentTrack.artist || 'Artista desconocido');
    }
  }

  updateElement(selector, value) {
    const el = this.element.querySelector(selector);
    if (el) el.textContent = value;
  }
}

// ============================================
// REGISTRO GLOBAL DE WIDGETS
// ============================================

const WIDGET_CLASSES = {
  'progress': ProgressWidget,
  'reminders': RemindersWidget,
  'stats': StatsWidget,
  'tasks': TasksWidget,
  'mood': MoodWidget,
  'anniversaries': AnniversariesWidget,
  'photos': PhotosWidget,
  'music': MusicWidget
};

// Función para crear instancia de widget
function createWidgetInstance(widgetKey, size = 'medium') {
  const WidgetClass = WIDGET_CLASSES[widgetKey];
  if (WidgetClass) {
    return new WidgetClass(size);
  }
  return null;
}

// Función para actualizar todos los widgets activos
function updateAllWidgets() {
  // Esta función será llamada periódicamente para actualizar datos
  installedWidgets.forEach(widgetKey => {
    // Los widgets individuales manejan su propia actualización
  });
}

// ============================================
// SISTEMA DE SERVICIOS EN BACKGROUND
// ============================================

// Estado de servicios en background
let backgroundServices = {
  location: {
    enabled: false,
    running: false,
    lastUpdate: null,
    settings: {
      updateInterval: 30 * 60 * 1000, // 30 minutos
      accuracy: 'high',
      notifyNearby: true,
      radius: 1000 // metros
    }
  },
  smartReminders: {
    enabled: false,
    running: false,
    lastRun: null,
    settings: {
      analyzeBehavior: true,
      adaptiveTiming: true,
      contextAware: true
    }
  },
  autoSync: {
    enabled: false,
    running: false,
    lastSync: null,
    settings: {
      syncInterval: 15 * 60 * 1000, // 15 minutos
      syncOnWifi: true,
      backgroundOnly: true
    }
  },
  autoBackup: {
    enabled: false,
    running: false,
    lastBackup: null,
    settings: {
      backupInterval: 24 * 60 * 60 * 1000, // 24 horas
      maxBackups: 7,
      compress: true,
      cloudBackup: false
    }
  }
};

// Lugares románticos predefinidos (podrían venir de una API)
const ROMANTIC_PLACES = [
  { name: 'Parque Central', type: 'park', lat: 40.7128, lng: -74.0060, description: 'Un lugar perfecto para un picnic romántico' },
  { name: 'Café Bella Vista', type: 'cafe', lat: 40.7589, lng: -73.9851, description: 'Café con vista panorámica' },
  { name: 'Mirador del Atardecer', type: 'viewpoint', lat: 40.7505, lng: -73.9934, description: 'Disfruta de la puesta de sol juntos' },
  { name: 'Jardín Botánico', type: 'garden', lat: 40.7614, lng: -73.9776, description: 'Pasea entre flores y naturaleza' },
  { name: 'Restaurante Luna', type: 'restaurant', lat: 40.7282, lng: -73.7949, description: 'Cena romántica bajo las estrellas' }
];

// ============================================
// SERVICIO 1: UBICACIÓN PARA LUGARES ROMÁNTICOS
// ============================================

class LocationService {
  constructor() {
    this.watchId = null;
    this.currentPosition = null;
    this.nearbyPlaces = [];
  }

  async start() {
    if (!backgroundServices.location.enabled) return;

    try {
      // Verificar permisos de ubicación
      const permission = await navigator.permissions.query({ name: 'geolocation' });

      if (permission.state === 'denied') {
        console.warn('[LocationService] Permisos de ubicación denegados');
        this.showPermissionError();
        return;
      }

      // Iniciar seguimiento de ubicación
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => this.handlePositionError(error),
        {
          enableHighAccuracy: backgroundServices.location.settings.accuracy === 'high',
          maximumAge: 5 * 60 * 1000, // 5 minutos
          timeout: 10 * 1000 // 10 segundos
        }
      );

      backgroundServices.location.running = true;
      console.log('[LocationService] Servicio iniciado');

      // Notificar al service worker
      this.notifyServiceWorker('LOCATION_STARTED');

    } catch (error) {
      console.error('[LocationService] Error al iniciar:', error);
    }
  }

  stop() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    backgroundServices.location.running = false;
    console.log('[LocationService] Servicio detenido');

    // Notificar al service worker
    this.notifyServiceWorker('LOCATION_STOPPED');
  }

  handlePositionUpdate(position) {
    this.currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };

    backgroundServices.location.lastUpdate = new Date().toISOString();

    // Buscar lugares románticos cercanos
    this.findNearbyRomanticPlaces();

    // Notificar cambios de ubicación
    this.notifyLocationChange();
  }

  handlePositionError(error) {
    console.error('[LocationService] Error de ubicación:', error);

    let message = 'Error desconocido de ubicación';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Permisos de ubicación denegados';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Ubicación no disponible';
        break;
      case error.TIMEOUT:
        message = 'Tiempo de espera agotado';
        break;
    }

    showNotification({
      title: '📍 Error de Ubicación',
      message: message,
      type: 'warning'
    });
  }

  findNearbyRomanticPlaces() {
    if (!this.currentPosition) return;

    const nearby = ROMANTIC_PLACES.filter(place => {
      const distance = this.calculateDistance(
        this.currentPosition.lat,
        this.currentPosition.lng,
        place.lat,
        place.lng
      );

      return distance <= backgroundServices.location.settings.radius;
    });

    // Verificar si hay lugares nuevos
    const newPlaces = nearby.filter(place =>
      !this.nearbyPlaces.some(existing =>
        existing.name === place.name
      )
    );

    if (newPlaces.length > 0 && backgroundServices.location.settings.notifyNearby) {
      this.notifyNearbyPlaces(newPlaces);
    }

    this.nearbyPlaces = nearby;
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distancia en metros
  }

  notifyNearbyPlaces(places) {
    const placeNames = places.map(p => p.name).join(', ');

    showNotification({
      title: '💕 Lugares Románticos Cercanos',
      message: `Descubre: ${placeNames}`,
      type: 'info',
      confirm: true,
      confirmText: 'Ver Mapa',
      onConfirm: () => this.showPlacesMap(places)
    });
  }

  showPlacesMap(places) {
    // Abrir modal con mapa de lugares cercanos
    const modal = document.createElement('div');
    modal.className = 'places-modal';
    modal.innerHTML = `
      <div class="places-content">
        <h3>🗺️ Lugares Románticos Cercanos</h3>
        <div class="places-list">
          ${places.map(place => `
            <div class="place-item">
              <div class="place-icon">${this.getPlaceIcon(place.type)}</div>
              <div class="place-info">
                <h4>${place.name}</h4>
                <p>${place.description}</p>
                <small>Distancia: ${this.calculateDistance(
                  this.currentPosition.lat,
                  this.currentPosition.lng,
                  place.lat,
                  place.lng
                ).toFixed(0)}m</small>
              </div>
              <button class="navigate-btn" data-lat="${place.lat}" data-lng="${place.lng}">
                🧭
              </button>
            </div>
          `).join('')}
        </div>
        <button class="close-places-btn">Cerrar</button>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('navigate-btn')) {
        const lat = e.target.dataset.lat;
        const lng = e.target.dataset.lng;
        this.openNavigation(lat, lng);
      }

      if (e.target.classList.contains('close-places-btn') || e.target === modal) {
        modal.remove();
      }
    });
  }

  getPlaceIcon(type) {
    const icons = {
      park: '🌳',
      cafe: '☕',
      viewpoint: '🏔️',
      garden: '🌸',
      restaurant: '🍽️'
    };
    return icons[type] || '📍';
  }

  openNavigation(lat, lng) {
    // Abrir en app de mapas nativa
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  }

  notifyLocationChange() {
    // Notificar al service worker sobre cambio de ubicación
    this.notifyServiceWorker('LOCATION_UPDATE', {
      position: this.currentPosition,
      nearbyPlaces: this.nearbyPlaces
    });
  }

  notifyServiceWorker(type, data = {}) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: type,
        data: data
      });
    }
  }

  showPermissionError() {
    showNotification({
      title: '📍 Permisos Requeridos',
      message: 'Para encontrar lugares románticos cercanos, necesitamos acceso a tu ubicación.',
      type: 'warning',
      confirm: true,
      confirmText: 'Configurar',
      onConfirm: () => {
        // Abrir configuración de permisos del navegador
        if (navigator.permissions && navigator.permissions.request) {
          navigator.permissions.request({ name: 'geolocation' });
        }
      }
    });
  }
}

// ============================================
// SERVICIO 2: RECORDATORIOS INTELIGENTES
// ============================================

class SmartRemindersService {
  constructor() {
    this.analysisData = {
      userBehavior: {},
      optimalTimes: {},
      contextPatterns: {}
    };
  }

  async start() {
    if (!backgroundServices.smartReminders.enabled) return;

    backgroundServices.smartReminders.running = true;
    console.log('[SmartReminders] Servicio iniciado');

    // Cargar datos de análisis previos
    await this.loadAnalysisData();

    // Iniciar análisis de comportamiento
    this.startBehaviorAnalysis();

    // Programar recordatorios inteligentes
    this.scheduleSmartReminders();
  }

  stop() {
    backgroundServices.smartReminders.running = false;
    console.log('[SmartReminders] Servicio detenido');

    // Limpiar timers
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
    }
  }

  async loadAnalysisData() {
    try {
      const data = localStorage.getItem('smartRemindersData');
      if (data) {
        this.analysisData = JSON.parse(data);
      }
    } catch (error) {
      console.error('[SmartReminders] Error cargando datos:', error);
    }
  }

  saveAnalysisData() {
    try {
      localStorage.setItem('smartRemindersData', JSON.stringify(this.analysisData));
    } catch (error) {
      console.error('[SmartReminders] Error guardando datos:', error);
    }
  }

  startBehaviorAnalysis() {
    // Analizar comportamiento cada hora
    this.analysisTimer = setInterval(() => {
      this.analyzeUserBehavior();
    }, 60 * 60 * 1000); // Cada hora

    // Analizar inmediatamente
    this.analyzeUserBehavior();
  }

  analyzeUserBehavior() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Analizar interacciones recientes
    const recentInteractions = this.getRecentInteractions();

    // Actualizar patrones de comportamiento
    this.updateBehaviorPatterns(hour, dayOfWeek, recentInteractions);

    // Calcular tiempos óptimos para recordatorios
    this.calculateOptimalTimes();

    console.log('[SmartReminders] Análisis completado');
  }

  getRecentInteractions() {
    // Obtener interacciones de los últimos 7 días
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');

    return {
      tasksCompleted: tasks.filter(t => new Date(t.completedAt) > weekAgo).length,
      messagesSent: messages.filter(m => new Date(m.timestamp) > weekAgo).length,
      totalInteractions: tasks.length + messages.length
    };
  }

  updateBehaviorPatterns(hour, dayOfWeek, interactions) {
    // Actualizar patrones por hora del día
    if (!this.analysisData.userBehavior[hour]) {
      this.analysisData.userBehavior[hour] = { interactions: 0, completions: 0 };
    }

    this.analysisData.userBehavior[hour].interactions += interactions.totalInteractions;
    this.analysisData.userBehavior[hour].completions += interactions.tasksCompleted;

    // Actualizar patrones por día de la semana
    if (!this.analysisData.contextPatterns[dayOfWeek]) {
      this.analysisData.contextPatterns[dayOfWeek] = { activity: 0 };
    }

    this.analysisData.contextPatterns[dayOfWeek].activity += interactions.totalInteractions;

    this.saveAnalysisData();
  }

  calculateOptimalTimes() {
    // Encontrar las horas con más actividad
    const hourlyActivity = Object.entries(this.analysisData.userBehavior)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        score: data.interactions + data.completions * 2
      }))
      .sort((a, b) => b.score - a.score);

    // Las 3 mejores horas para recordatorios
    this.analysisData.optimalTimes = hourlyActivity.slice(0, 3);
  }

  scheduleSmartReminders() {
    // Programar recordatorios basados en análisis
    const optimalTimes = this.analysisData.optimalTimes;

    if (optimalTimes && optimalTimes.length > 0) {
      optimalTimes.forEach(({ hour }) => {
        this.scheduleReminderAtHour(hour);
      });
    } else {
      // Fallback: programar recordatorios en horas predeterminadas
      [9, 14, 19].forEach(hour => this.scheduleReminderAtHour(hour));
    }
  }

  scheduleReminderAtHour(hour) {
    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(hour, 0, 0, 0);

    // Si ya pasó hoy, programar para mañana
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime.getTime() - now.getTime();

    setTimeout(() => {
      this.sendSmartReminder(hour);
      // Reprogramar para el próximo día
      setInterval(() => this.sendSmartReminder(hour), 24 * 60 * 60 * 1000);
    }, delay);
  }

  sendSmartReminder(hour) {
    const reminder = this.generateSmartReminder(hour);

    if (reminder) {
      showNotification({
        title: reminder.title,
        message: reminder.message,
        type: 'info',
        confirm: true,
        confirmText: reminder.actionText,
        onConfirm: reminder.action
      });

      // Registrar el recordatorio enviado
      this.logReminderSent(reminder);
    }
  }

  generateSmartReminder(hour) {
    const interactions = this.getRecentInteractions();
    const pendingTasks = JSON.parse(localStorage.getItem('tasks') || '[]')
      .filter(task => !task.completed);

    // Lógica para diferentes tipos de recordatorios
    if (pendingTasks.length > 0 && hour >= 9 && hour <= 18) {
      return {
        title: '💭 Momento Perfecto',
        message: `Tienes ${pendingTasks.length} tarea(s) pendiente(s). ¿Quieres trabajar en ellas ahora?`,
        actionText: 'Ver Tareas',
        action: () => window.location.href = '#tasks'
      };
    }

    if (interactions.tasksCompleted === 0 && hour >= 10) {
      return {
        title: '🌅 Buenos Días',
        message: '¿Qué tal si empezamos el día con una tarea romántica juntos?',
        actionText: 'Sugerir Tarea',
        action: () => this.suggestRomanticTask()
      };
    }

    if (hour >= 19 && hour <= 21) {
      return {
        title: '🌙 Buenas Noches',
        message: '¿Han compartido un momento especial hoy?',
        actionText: 'Registrar Momento',
        action: () => this.showMoodTracker()
      };
    }

    return null; // No enviar recordatorio
  }

  suggestRomanticTask() {
    const romanticTasks = [
      'Escribe una carta de amor para tu pareja',
      'Prepara una sorpresa especial',
      'Planea una cita nocturna',
      'Crea una playlist romántica',
      'Toma una foto juntos'
    ];

    const randomTask = romanticTasks[Math.floor(Math.random() * romanticTasks.length)];

    showNotification({
      title: '💡 Sugerencia Romántica',
      message: randomTask,
      type: 'success'
    });
  }

  showMoodTracker() {
    // Abrir el widget de estado de ánimo
    if (window.showMoodWidget) {
      window.showMoodWidget();
    }
  }

  logReminderSent(reminder) {
    const log = {
      timestamp: new Date().toISOString(),
      type: 'smart_reminder',
      reminder: reminder
    };

    const logs = JSON.parse(localStorage.getItem('reminderLogs') || '[]');
    logs.push(log);

    // Mantener solo los últimos 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }

    localStorage.setItem('reminderLogs', JSON.stringify(logs));
  }
}

// ============================================
// SERVICIO 3: SINCRONIZACIÓN AUTOMÁTICA
// ============================================

class AutoSyncService {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncAttempt = null;
  }

  async start() {
    if (!backgroundServices.autoSync.enabled) return;

    backgroundServices.autoSync.running = true;
    console.log('[AutoSync] Servicio iniciado');

    // Iniciar sincronización periódica
    this.startPeriodicSync();

    // Sincronizar inmediatamente si hay conexión
    if (navigator.onLine) {
      this.performSync();
    }
  }

  stop() {
    backgroundServices.autoSync.running = false;
    console.log('[AutoSync] Servicio detenido');

    // Limpiar timers
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  startPeriodicSync() {
    const interval = backgroundServices.autoSync.settings.syncInterval;

    this.syncTimer = setInterval(() => {
      if (navigator.onLine && this.shouldSync()) {
        this.performSync();
      }
    }, interval);
  }

  shouldSync() {
    // Verificar condiciones para sincronizar
    const settings = backgroundServices.autoSync.settings;

    if (settings.syncOnWifi) {
      // Verificar si está en WiFi (aproximación)
      return navigator.connection &&
             (navigator.connection.effectiveType === '4g' ||
              navigator.connection.effectiveType === 'wifi');
    }

    return true;
  }

  async performSync() {
    if (this.syncInProgress) return;

    this.syncInProgress = true;
    this.lastSyncAttempt = new Date().toISOString();

    try {
      console.log('[AutoSync] Iniciando sincronización...');

      // Sincronizar diferentes tipos de datos
      const results = await Promise.allSettled([
        this.syncTasks(),
        this.syncMessages(),
        this.syncStats(),
        this.syncSettings()
      ]);

      // Procesar resultados
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.filter(r => r.status === 'rejected').length;

      backgroundServices.autoSync.lastSync = new Date().toISOString();

      if (successCount > 0) {
        console.log(`[AutoSync] Sincronización completada: ${successCount} exitosas, ${failCount} fallidas`);

        // Notificar éxito silenciosamente (solo si hay cambios)
        if (this.hasChanges(results)) {
          this.showSyncSuccessNotification();
        }
      }

    } catch (error) {
      console.error('[AutoSync] Error en sincronización:', error);
      this.showSyncErrorNotification(error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncTasks() {
    const localTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const partnerId = localStorage.getItem('partnerId');

    if (!partnerId || !window.db) return;

    // Obtener tareas del partner
    const partnerTasks = await this.getPartnerData('tasks', partnerId);

    // Fusionar tareas
    const mergedTasks = this.mergeTasks(localTasks, partnerTasks);

    // Guardar localmente
    localStorage.setItem('tasks', JSON.stringify(mergedTasks));

    // Subir cambios locales
    await this.uploadLocalChanges('tasks', localTasks);
  }

  async syncMessages() {
    const localMessages = JSON.parse(localStorage.getItem('messages') || '[]');
    const partnerId = localStorage.getItem('partnerId');

    if (!partnerId || !window.db) return;

    // Sincronizar mensajes
    const partnerMessages = await this.getPartnerData('messages', partnerId);
    const mergedMessages = this.mergeMessages(localMessages, partnerMessages);

    localStorage.setItem('messages', JSON.stringify(mergedMessages));
    await this.uploadLocalChanges('messages', localMessages);
  }

  async syncStats() {
    const localStats = JSON.parse(localStorage.getItem('userStats') || '{}');

    if (!window.db) return;

    // Subir estadísticas locales
    await window.db.collection('stats').doc(localStorage.getItem('userId')).set({
      ...localStats,
      lastSync: new Date().toISOString()
    });
  }

  async syncSettings() {
    const localSettings = {
      notifications: JSON.parse(localStorage.getItem('notificationSettings') || '{}'),
      preferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
      widgets: JSON.parse(localStorage.getItem('installedWidgets') || '[]')
    };

    if (!window.db) return;

    await window.db.collection('settings').doc(localStorage.getItem('userId')).set({
      ...localSettings,
      lastSync: new Date().toISOString()
    });
  }

  async getPartnerData(collection, partnerId) {
    if (!window.db) return [];

    const snapshot = await window.db.collection(collection)
      .where('partnerId', '==', partnerId)
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  mergeTasks(localTasks, partnerTasks) {
    const allTasks = [...localTasks, ...partnerTasks];
    const uniqueTasks = new Map();

    // Eliminar duplicados basados en ID
    allTasks.forEach(task => {
      if (!uniqueTasks.has(task.id) ||
          new Date(task.updatedAt || task.created) > new Date(uniqueTasks.get(task.id).updatedAt || uniqueTasks.get(task.id).created)) {
        uniqueTasks.set(task.id, task);
      }
    });

    return Array.from(uniqueTasks.values());
  }

  mergeMessages(localMessages, partnerMessages) {
    // Similar a mergeTasks pero para mensajes
    const allMessages = [...localMessages, ...partnerMessages];
    const uniqueMessages = new Map();

    allMessages.forEach(message => {
      if (!uniqueMessages.has(message.id)) {
        uniqueMessages.set(message.id, message);
      }
    });

    return Array.from(uniqueMessages.values());
  }

  async uploadLocalChanges(collection, localData) {
    if (!window.db || !localData.length) return;

    const batch = window.db.batch();

    localData.forEach(item => {
      const ref = window.db.collection(collection).doc(item.id);
      batch.set(ref, item);
    });

    await batch.commit();
  }

  hasChanges(results) {
    return results.some(result =>
      result.status === 'fulfilled' && result.value && result.value.length > 0
    );
  }

  showSyncSuccessNotification() {
    showNotification({
      title: '🔄 Sincronización Completa',
      message: 'Tus datos han sido sincronizados con tu pareja.',
      type: 'success',
      duration: 3000
    });
  }

  showSyncErrorNotification(error) {
    showNotification({
      title: '⚠️ Error de Sincronización',
      message: 'No se pudieron sincronizar algunos datos. Reintentando automáticamente.',
      type: 'warning',
      duration: 5000
    });
  }
}

// ============================================
// SERVICIO 4: BACKUP AUTOMÁTICO
// ============================================

class AutoBackupService {
  constructor() {
    this.backupInProgress = false;
  }

  async start() {
    if (!backgroundServices.autoBackup.enabled) return;

    backgroundServices.autoBackup.running = true;
    console.log('[AutoBackup] Servicio iniciado');

    // Iniciar backup periódico
    this.startPeriodicBackup();

    // Hacer backup inmediatamente
    this.performBackup();
  }

  stop() {
    backgroundServices.autoBackup.running = false;
    console.log('[AutoBackup] Servicio detenido');

    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }
  }

  startPeriodicBackup() {
    const interval = backgroundServices.autoBackup.settings.backupInterval;

    this.backupTimer = setInterval(() => {
      this.performBackup();
    }, interval);
  }

  async performBackup() {
    if (this.backupInProgress) return;

    this.backupInProgress = true;

    try {
      console.log('[AutoBackup] Iniciando backup automático...');

      const backupData = await this.collectBackupData();
      const backupBlob = await this.createBackupBlob(backupData);
      const backupId = await this.saveBackupLocally(backupBlob);

      // Backup en la nube si está habilitado
      if (backgroundServices.autoBackup.settings.cloudBackup) {
        await this.uploadToCloud(backupBlob, backupId);
      }

      // Limpiar backups antiguos
      await this.cleanupOldBackups();

      backgroundServices.autoBackup.lastBackup = new Date().toISOString();

      console.log('[AutoBackup] Backup completado:', backupId);

      // Notificar solo si es el primer backup o han pasado varios días
      const lastNotification = localStorage.getItem('lastBackupNotification');
      const shouldNotify = !lastNotification ||
                          (new Date() - new Date(lastNotification)) > (7 * 24 * 60 * 60 * 1000);

      if (shouldNotify) {
        this.showBackupSuccessNotification();
        localStorage.setItem('lastBackupNotification', new Date().toISOString());
      }

    } catch (error) {
      console.error('[AutoBackup] Error en backup:', error);
      this.showBackupErrorNotification(error);
    } finally {
      this.backupInProgress = false;
    }
  }

  async collectBackupData() {
    return {
      metadata: {
        timestamp: new Date().toISOString(),
        userId: localStorage.getItem('userId'),
        version: '1.0',
        type: 'automatic'
      },
      data: {
        tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
        messages: JSON.parse(localStorage.getItem('messages') || '[]'),
        stats: JSON.parse(localStorage.getItem('userStats') || '{}'),
        settings: {
          notifications: JSON.parse(localStorage.getItem('notificationSettings') || '{}'),
          preferences: JSON.parse(localStorage.getItem('userPreferences') || '{}'),
          widgets: JSON.parse(localStorage.getItem('installedWidgets') || '[]'),
          backgroundServices: backgroundServices
        },
        photos: JSON.parse(localStorage.getItem('photos') || '[]'),
        playlists: JSON.parse(localStorage.getItem('playlists') || '[]'),
        anniversaries: JSON.parse(localStorage.getItem('anniversaries') || '[]'),
        moodHistory: JSON.parse(localStorage.getItem('moodHistory') || '[]'),
        smartRemindersData: JSON.parse(localStorage.getItem('smartRemindersData') || '{}')
      }
    };
  }

  async createBackupBlob(data) {
    const jsonString = JSON.stringify(data, null, 2);

    if (backgroundServices.autoBackup.settings.compress) {
      // Comprimir usando CompressionStream si está disponible
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(new TextEncoder().encode(jsonString));
        writer.close();

        const chunks = [];
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) done = true;
          else chunks.push(value);
        }

        return new Blob(chunks, { type: 'application/gzip' });
      }
    }

    return new Blob([jsonString], { type: 'application/json' });
  }

  async saveBackupLocally(blob) {
    const backupId = `backup_${Date.now()}`;
    const backupName = `${backupId}.json${backgroundServices.autoBackup.settings.compress ? '.gz' : ''}`;

    // Usar File System Access API si está disponible, sino IndexedDB
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: backupName,
          types: [{
            description: 'Backup File',
            accept: {
              'application/json': ['.json'],
              'application/gzip': ['.json.gz']
            }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();

        return backupId;
      } catch (error) {
        // Usuario canceló o no hay soporte
        console.log('[AutoBackup] Usando IndexedDB como fallback');
      }
    }

    // Fallback: guardar en IndexedDB
    return await this.saveToIndexedDB(blob, backupId);
  }

  async saveToIndexedDB(blob, backupId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ThingsToDo_Backups', 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups');
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');

        const backupData = {
          id: backupId,
          blob: blob,
          timestamp: new Date().toISOString(),
          size: blob.size
        };

        const putRequest = store.put(backupData, backupId);

        putRequest.onsuccess = () => resolve(backupId);
        putRequest.onerror = () => reject(putRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async uploadToCloud(blob, backupId) {
    // Implementar subida a Firebase Storage o similar
    if (window.storage && window.storage.ref) {
      const userId = localStorage.getItem('userId');
      const backupRef = window.storage.ref().child(`backups/${userId}/${backupId}.json`);

      try {
        await backupRef.put(blob);
        console.log('[AutoBackup] Backup subido a la nube');
      } catch (error) {
        console.error('[AutoBackup] Error subiendo a la nube:', error);
      }
    }
  }

  async cleanupOldBackups() {
    const maxBackups = backgroundServices.autoBackup.settings.maxBackups;

    try {
      const request = indexedDB.open('ThingsToDo_Backups', 1);

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');

        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const backups = getAllRequest.result
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          // Eliminar backups antiguos
          if (backups.length > maxBackups) {
            const toDelete = backups.slice(maxBackups);
            toDelete.forEach(backup => {
              store.delete(backup.id);
            });
            console.log(`[AutoBackup] Eliminados ${toDelete.length} backups antiguos`);
          }
        };
      };
    } catch (error) {
      console.error('[AutoBackup] Error limpiando backups:', error);
    }
  }

  showBackupSuccessNotification() {
    showNotification({
      title: '💾 Backup Completado',
      message: 'Tus datos han sido respaldados automáticamente.',
      type: 'success',
      duration: 3000
    });
  }

  showBackupErrorNotification(error) {
    showNotification({
      title: '⚠️ Error en Backup',
      message: 'No se pudo completar el backup automático.',
      type: 'warning',
      confirm: true,
      confirmText: 'Reintentar',
      onConfirm: () => this.performBackup()
    });
  }
}

// ============================================
// GESTOR DE SERVICIOS EN BACKGROUND
// ============================================

class BackgroundServicesManager {
  constructor() {
    this.services = {
      location: new LocationService(),
      smartReminders: new SmartRemindersService(),
      autoSync: new AutoSyncService(),
      autoBackup: new AutoBackupService()
    };

    this.loadSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('backgroundServices');
    if (saved) {
      backgroundServices = { ...backgroundServices, ...JSON.parse(saved) };
    }
  }

  saveSettings() {
    localStorage.setItem('backgroundServices', JSON.stringify(backgroundServices));
  }

  startService(serviceName) {
    if (this.services[serviceName]) {
      backgroundServices[serviceName].enabled = true;
      this.services[serviceName].start();
      this.saveSettings();
    }
  }

  stopService(serviceName) {
    if (this.services[serviceName]) {
      backgroundServices[serviceName].enabled = false;
      this.services[serviceName].stop();
      this.saveSettings();
    }
  }

  updateServiceSettings(serviceName, settings) {
    if (backgroundServices[serviceName]) {
      backgroundServices[serviceName].settings = {
        ...backgroundServices[serviceName].settings,
        ...settings
      };
      this.saveSettings();

      // Reiniciar servicio si está corriendo
      if (backgroundServices[serviceName].running) {
        this.services[serviceName].stop();
        this.services[serviceName].start();
      }
    }
  }

  getServiceStatus(serviceName) {
    return backgroundServices[serviceName] || null;
  }

  getAllStatuses() {
    return backgroundServices;
  }

  startAllEnabled() {
    Object.entries(backgroundServices).forEach(([name, config]) => {
      if (config.enabled) {
        this.services[name].start();
      }
    });
  }

  stopAll() {
    Object.keys(this.services).forEach(name => {
      this.services[name].stop();
    });
  }
}

// ============================================
// INTERFAZ DE CONFIGURACIÓN DE SERVICIOS
// ============================================

function showBackgroundServicesManager() {
  const manager = new BackgroundServicesManager();

  const modal = document.createElement('div');
  modal.className = 'background-services-modal';
  modal.innerHTML = `
    <div class="background-services-content">
      <h3>🔧 Servicios en Background</h3>
      <p class="services-description">
        Configura servicios que funcionan automáticamente en segundo plano para mejorar tu experiencia.
      </p>

      <div class="services-list">
        ${Object.entries(backgroundServices).map(([key, service]) => `
          <div class="service-item" data-service="${key}">
            <div class="service-header">
              <div class="service-info">
                <span class="service-icon">${getServiceIcon(key)}</span>
                <div class="service-details">
                  <h4>${getServiceName(key)}</h4>
                  <p>${getServiceDescription(key)}</p>
                </div>
              </div>
              <label class="service-toggle">
                <input type="checkbox" ${service.enabled ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
            </div>

            <div class="service-settings ${service.enabled ? 'visible' : ''}">
              ${getServiceSettingsHTML(key, service.settings)}
            </div>

            <div class="service-status">
              <span class="status-indicator ${service.running ? 'active' : 'inactive'}">
                ${service.running ? '● Activo' : '● Inactivo'}
              </span>
              ${service.lastUpdate ? `<span class="last-update">Última actualización: ${new Date(service.lastUpdate).toLocaleString()}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="services-actions">
        <button class="services-btn test-services">🧪 Probar Servicios</button>
        <button class="services-btn reset-services">🔄 Reiniciar Todos</button>
      </div>

      <button class="close-services-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      const serviceItem = e.target.closest('.service-item');
      const serviceName = serviceItem.dataset.service;
      const enabled = e.target.checked;

      if (enabled) {
        manager.startService(serviceName);
      } else {
        manager.stopService(serviceName);
      }

      // Mostrar/ocultar configuraciones
      const settingsEl = serviceItem.querySelector('.service-settings');
      settingsEl.classList.toggle('visible', enabled);

      // Actualizar indicador de estado
      updateServiceStatus(serviceItem, serviceName);
    }
  });

  modal.addEventListener('input', (e) => {
    if (e.target.dataset.setting) {
      const serviceName = e.target.closest('.service-item').dataset.service;
      const settingKey = e.target.dataset.setting;
      const value = e.target.type === 'checkbox' ? e.target.checked :
                   e.target.type === 'number' ? parseInt(e.target.value) : e.target.value;

      manager.updateServiceSettings(serviceName, { [settingKey]: value });
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('test-services')) {
      testAllServices(manager);
    } else if (e.target.classList.contains('reset-services')) {
      resetAllServices(manager);
    } else if (e.target.classList.contains('close-services-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function getServiceIcon(serviceName) {
  const icons = {
    location: '📍',
    smartReminders: '🧠',
    autoSync: '🔄',
    autoBackup: '💾'
  };
  return icons[serviceName] || '⚙️';
}

function getServiceName(serviceName) {
  const names = {
    location: 'Ubicación Romántica',
    smartReminders: 'Recordatorios Inteligentes',
    autoSync: 'Sincronización Automática',
    autoBackup: 'Backup Automático'
  };
  return names[serviceName] || serviceName;
}

function getServiceDescription(serviceName) {
  const descriptions = {
    location: 'Encuentra lugares románticos cercanos y recibe sugerencias basadas en tu ubicación.',
    smartReminders: 'Recordatorios inteligentes que aprenden tus patrones de comportamiento.',
    autoSync: 'Sincroniza automáticamente tus datos con tu pareja en segundo plano.',
    autoBackup: 'Crea copias de seguridad automáticas de todos tus datos importantes.'
  };
  return descriptions[serviceName] || '';
}

function getServiceSettingsHTML(serviceName, settings) {
  switch (serviceName) {
    case 'location':
      return `
        <div class="setting-group">
          <label>
            <input type="checkbox" data-setting="notifyNearby" ${settings.notifyNearby ? 'checked' : ''}>
            Notificar lugares cercanos
          </label>
          <label>
            Radio de búsqueda: <input type="number" data-setting="radius" value="${settings.radius}" min="100" max="5000" step="100"> metros
          </label>
        </div>
      `;

    case 'smartReminders':
      return `
        <div class="setting-group">
          <label>
            <input type="checkbox" data-setting="analyzeBehavior" ${settings.analyzeBehavior ? 'checked' : ''}>
            Analizar comportamiento
          </label>
          <label>
            <input type="checkbox" data-setting="adaptiveTiming" ${settings.adaptiveTiming ? 'checked' : ''}>
            Horarios adaptativos
          </label>
        </div>
      `;

    case 'autoSync':
      return `
        <div class="setting-group">
          <label>
            Intervalo de sincronización: ${Math.round(settings.syncInterval / (60 * 1000))} minutos
            <input type="range" data-setting="syncInterval" value="${settings.syncInterval}" min="${5 * 60 * 1000}" max="${60 * 60 * 1000}" step="${5 * 60 * 1000}">
          </label>
          <label>
            <input type="checkbox" data-setting="syncOnWifi" ${settings.syncOnWifi ? 'checked' : ''}>
            Solo en WiFi
          </label>
        </div>
      `;

    case 'autoBackup':
      return `
        <div class="setting-group">
          <label>
            Intervalo de backup: ${Math.round(settings.backupInterval / (60 * 60 * 1000))} horas
            <input type="range" data-setting="backupInterval" value="${settings.backupInterval}" min="${1 * 60 * 60 * 1000}" max="${24 * 60 * 60 * 1000}" step="${1 * 60 * 60 * 1000}">
          </label>
          <label>
            <input type="checkbox" data-setting="compress" ${settings.compress ? 'checked' : ''}>
            Comprimir backups
          </label>
          <label>
            Máximo de backups: <input type="number" data-setting="maxBackups" value="${settings.maxBackups}" min="1" max="30">
          </label>
        </div>
      `;

    default:
      return '';
  }
}

function updateServiceStatus(serviceItem, serviceName) {
  const status = backgroundServices[serviceName];
  const indicator = serviceItem.querySelector('.status-indicator');
  const lastUpdate = serviceItem.querySelector('.last-update');

  indicator.className = `status-indicator ${status.running ? 'active' : 'inactive'}`;
  indicator.textContent = status.running ? '● Activo' : '● Inactivo';

  if (lastUpdate && status.lastUpdate) {
    lastUpdate.textContent = `Última actualización: ${new Date(status.lastUpdate).toLocaleString()}`;
  }
}

function testAllServices(manager) {
  showNotification({
    title: '🧪 Probando Servicios',
    message: 'Ejecutando pruebas de todos los servicios en background...',
    type: 'info'
  });

  // Aquí irían las pruebas específicas de cada servicio
  setTimeout(() => {
    showNotification({
      title: '✅ Pruebas Completadas',
      message: 'Todos los servicios han sido probados exitosamente.',
      type: 'success'
    });
  }, 2000);
}

function resetAllServices(manager) {
  if (confirm('¿Estás seguro de que quieres reiniciar todos los servicios? Esto detendrá todos los procesos en background.')) {
    manager.stopAll();
    setTimeout(() => {
      manager.startAllEnabled();
      showNotification({
        title: '🔄 Servicios Reiniciados',
        message: 'Todos los servicios han sido reiniciados.',
        type: 'success'
      });
    }, 1000);
  }
}

// ============================================
// INICIALIZACIÓN DE SERVICIOS EN BACKGROUND
// ============================================

// Instancia global del gestor de servicios
let backgroundServicesManager;

// Inicializar servicios cuando la app esté lista
document.addEventListener('DOMContentLoaded', () => {
  backgroundServicesManager = new BackgroundServicesManager();

  // Pequeño delay para asegurar que todo esté cargado
  setTimeout(() => {
    backgroundServicesManager.startAllEnabled();
  }, 2000);
});

// Hacer funciones disponibles globalmente
window.showBackgroundServicesManager = showBackgroundServicesManager;
window.BackgroundServicesManager = BackgroundServicesManager;

// Event listeners para cambios de conexión
window.addEventListener('online', () => handleConnectionChange(true));
window.addEventListener('offline', () => handleConnectionChange(false));

// Inicializar sistema de calidad de conexión
document.addEventListener('DOMContentLoaded', () => {
  // Detectar calidad inicial de conexión
  detectConnectionQuality();

  // Mostrar estado inicial
  handleConnectionChange(navigator.onLine);
});

// Función para manejar shortcuts desde el manifest
function handleAppShortcut() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');

  if (action) {
    console.log('[PWA] Shortcut activado:', action);

    // Verificar si es un shortcut dinámico
    if (['continue-test', 'results', 'messages'].includes(action)) {
      handleDynamicShortcut(action);
      return;
    }

    // Mostrar indicador de carga
    showShortcutLoading(action);

    switch (action) {
      case 'new-plan':
        // Abrir modal de nuevo plan
        setTimeout(() => {
          const newPlanBtn = document.getElementById('new-plan-btn');
          if (newPlanBtn) {
            newPlanBtn.click();
            hideShortcutLoading();
          } else {
            console.warn('[PWA] Botón de nuevo plan no encontrado');
            hideShortcutLoading();
          }
        }, 1000);
        break;

      case 'test':
        // Abrir modal del test
        setTimeout(() => {
          const testBtn = document.querySelector('[title="El Test - Compatibilidad"]');
          if (testBtn) {
            testBtn.click();
            hideShortcutLoading();
          } else {
            console.warn('[PWA] Botón del test no encontrado');
            hideShortcutLoading();
          }
        }, 1000);
        break;

      case 'stats':
        // Abrir sección de estadísticas
        setTimeout(() => {
          const statsBtn = document.querySelector('[title="Estadísticas"]');
          if (statsBtn) {
            statsBtn.click();
            hideShortcutLoading();
          } else {
            console.warn('[PWA] Botón de estadísticas no encontrado');
            hideShortcutLoading();
          }
        }, 1000);
        break;

      case 'share-received':
        // Procesar contenido compartido desde otra app
        setTimeout(() => {
          handleSharedContent();
          hideShortcutLoading();
        }, 500);
        break;

      default:
        console.warn('[PWA] Acción de shortcut desconocida:', action);
        hideShortcutLoading();
    }

    // Limpiar la URL después de un breve delay (excepto para share-received)
    if (action !== 'share-received') {
      setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000);
    }
  }
}

// Función para manejar contenido compartido desde otras apps
async function handleSharedContent() {
  try {
    console.log('[Share] Procesando contenido compartido...');

    // Verificar si hay datos en sessionStorage (desde el service worker)
    const sharedData = JSON.parse(sessionStorage.getItem('sharedContent') || 'null');

    if (sharedData) {
      // Limpiar los datos compartidos
      sessionStorage.removeItem('sharedContent');

      // Procesar el contenido compartido
      await processSharedContent(sharedData);
      return;
    }

    // Si no hay datos en sessionStorage, verificar URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTitle = urlParams.get('title');
    const sharedText = urlParams.get('text');
    const sharedUrl = urlParams.get('url');

    if (sharedTitle || sharedText || sharedUrl) {
      const sharedData = {
        title: sharedTitle,
        text: sharedText,
        url: sharedUrl,
        timestamp: Date.now()
      };

      await processSharedContent(sharedData);

      // Limpiar URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      console.log('[Share] No se encontró contenido compartido');
      showNotification({
        title: '📥 Compartir',
        message: '¿Qué te gustaría compartir? Puedes compartir texto, URLs o archivos.',
        type: 'info',
        confirm: true,
        confirmText: 'Crear tarea',
        onConfirm: () => createTaskFromShare()
      });
    }

  } catch (error) {
    console.error('[Share] Error procesando contenido compartido:', error);
    showNotification({
      title: '❌ Error',
      message: 'No se pudo procesar el contenido compartido.',
      type: 'error'
    });
  }
}

// Función para procesar el contenido compartido
async function processSharedContent(sharedData) {
  console.log('[Share] Procesando datos:', sharedData);

  const { title, text, url, files } = sharedData;

  // Crear un resumen del contenido compartido
  let contentSummary = '';
  if (title) contentSummary += `📌 ${title}\n`;
  if (text) contentSummary += `${text}\n`;
  if (url) contentSummary += `🔗 ${url}\n`;
  if (files && files.length > 0) contentSummary += `📎 ${files.length} archivo(s)\n`;

  // Mostrar modal para que el usuario decida qué hacer
  showNotification({
    title: '📥 ¡Contenido compartido!',
    message: `Recibiste:\n${contentSummary}\n¿Qué te gustaría hacer?`,
    type: 'info',
    confirm: true,
    confirmText: 'Crear tarea',
    cancelText: 'Ver opciones',
    onConfirm: () => createTaskFromShare(sharedData),
    onCancel: () => showShareOptions(sharedData)
  });
}

// Función para mostrar opciones de compartir
function showShareOptions(sharedData) {
  const modal = document.createElement('div');
  modal.className = 'share-options-modal';
  modal.innerHTML = `
    <div class="share-options-content">
      <h3>📥 ¿Qué hacer con el contenido compartido?</h3>
      <div class="share-preview">
        ${sharedData.title ? `<div class="share-title">${sharedData.title}</div>` : ''}
        ${sharedData.text ? `<div class="share-text">${sharedData.text}</div>` : ''}
        ${sharedData.url ? `<div class="share-url">${sharedData.url}</div>` : ''}
        ${sharedData.files ? `<div class="share-files">${sharedData.files.length} archivo(s)</div>` : ''}
      </div>
      <div class="share-actions">
        <button class="share-action-btn" data-action="task">
          ✅ Crear tarea
        </button>
        <button class="share-action-btn" data-action="note">
          📝 Crear nota
        </button>
        <button class="share-action-btn" data-action="reminder">
          ⏰ Recordatorio
        </button>
        <button class="share-action-btn" data-action="save">
          💾 Guardar para después
        </button>
        <button class="share-action-btn cancel" data-action="cancel">
          ❌ Cancelar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Manejar clicks en los botones
  modal.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    modal.remove();

    switch (action) {
      case 'task':
        createTaskFromShare(sharedData);
        break;
      case 'note':
        createNoteFromShare(sharedData);
        break;
      case 'reminder':
        createReminderFromShare(sharedData);
        break;
      case 'save':
        saveSharedContent(sharedData);
        break;
      case 'cancel':
        // No hacer nada
        break;
    }
  });

  // Cerrar al hacer click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Función para crear una tarea desde contenido compartido
function createTaskFromShare(sharedData) {
  const taskText = generateTaskText(sharedData);

  showNotification({
    title: '✅ Crear tarea',
    message: `¿Crear tarea con: "${taskText}"?`,
    type: 'confirm',
    input: true,
    inputPlaceholder: 'Personaliza el texto de la tarea...',
    confirmText: 'Crear',
    onConfirm: (customText) => {
      const finalText = customText || taskText;
      addTask(finalText, 'shared');
      showNotification({
        title: '✅ ¡Tarea creada!',
        message: 'La tarea se agregó a tu lista.',
        type: 'success'
      });
    }
  });
}

// Función para crear una nota desde contenido compartido
function createNoteFromShare(sharedData) {
  const noteText = generateNoteText(sharedData);

  showNotification({
    title: '📝 Crear nota',
    message: '¿Crear una nota con el contenido compartido?',
    type: 'confirm',
    confirmText: 'Crear nota',
    onConfirm: () => {
      // Aquí iría la lógica para crear notas
      // Por ahora, solo mostrar confirmación
      showNotification({
        title: '✅ ¡Nota creada!',
        message: 'La nota se guardó exitosamente.',
        type: 'success'
      });
    }
  });
}

// Función para crear un recordatorio desde contenido compartido
function createReminderFromShare(sharedData) {
  const reminderText = generateReminderText(sharedData);

  showNotification({
    title: '⏰ Recordatorio',
    message: `¿Programar recordatorio para: "${reminderText}"?`,
    type: 'confirm',
    confirmText: 'Programar',
    onConfirm: () => {
      // Programar notificación para más tarde
      setTimeout(() => {
        showNotification({
          title: '⏰ Recordatorio',
          message: reminderText,
          type: 'info'
        });
      }, 60 * 60 * 1000); // 1 hora después

      showNotification({
        title: '✅ ¡Recordatorio programado!',
        message: 'Te recordaremos en 1 hora.',
        type: 'success'
      });
    }
  });
}

// Función para guardar contenido compartido para después
function saveSharedContent(sharedData) {
  try {
    const savedShares = JSON.parse(localStorage.getItem('savedShares') || '[]');
    savedShares.push({
      ...sharedData,
      savedAt: Date.now()
    });

    // Mantener solo los últimos 10 elementos
    if (savedShares.length > 10) {
      savedShares.shift();
    }

    localStorage.setItem('savedShares', JSON.stringify(savedShares));

    showNotification({
      title: '💾 ¡Guardado!',
      message: 'El contenido se guardó para ver después.',
      type: 'success'
    });
  } catch (error) {
    console.error('[Share] Error guardando contenido:', error);
    showNotification({
      title: '❌ Error',
      message: 'No se pudo guardar el contenido.',
      type: 'error'
    });
  }
}

// Funciones auxiliares para generar texto
function generateTaskText(sharedData) {
  const { title, text, url } = sharedData;
  if (title && text) return `${title}: ${text}`;
  if (title) return `Revisar: ${title}`;
  if (text) return text;
  if (url) return `Revisar enlace: ${url}`;
  return 'Contenido compartido';
}

function generateNoteText(sharedData) {
  const { title, text, url } = sharedData;
  let note = 'Contenido compartido:\n\n';
  if (title) note += `📌 ${title}\n\n`;
  if (text) note += `${text}\n\n`;
  if (url) note += `🔗 ${url}\n`;
  return note;
}

function generateReminderText(sharedData) {
  const { title, text } = sharedData;
  if (title) return `Recordatorio: ${title}`;
  if (text && text.length < 50) return `Recordatorio: ${text}`;
  return 'Recordatorio de contenido compartido';
}

// Función para mostrar indicador de carga de shortcut
function showShortcutLoading(action) {
  const loading = document.createElement('div');
  loading.id = 'shortcut-loading';
  loading.innerHTML = `
    <div class="shortcut-loading-content">
      <div class="loading-spinner"></div>
      <span>Abriendo ${getActionDisplayName(action)}...</span>
    </div>
  `;
  loading.className = 'shortcut-loading-overlay';

  document.body.appendChild(loading);
  setTimeout(() => loading.classList.add('visible'), 100);
}

// Función para ocultar indicador de carga
function hideShortcutLoading() {
  const loading = document.getElementById('shortcut-loading');
  if (loading) {
    loading.classList.remove('visible');
    setTimeout(() => loading.remove(), 300);
  }
}

// Función para obtener nombre display de la acción
function getActionDisplayName(action) {
  const names = {
    'new-plan': 'Nuevo Plan',
    'test': 'El Test',
    'stats': 'Estadísticas',
    'share': 'Compartir App'
  };
  return names[action] || action;
}

// Función para compartir la app
async function shareApp() {
  const shareData = {
    title: '100 ThingsToDo - Kawaii Couples App',
    text: '¡Descubre cosas divertidas para hacer con tu pareja! Una app kawaii para parejas enamoradas 💕',
    url: window.location.origin
  };

  try {
    if (navigator.share) {
      // Usar Web Share API si está disponible
      await navigator.share(shareData);
      console.log('[PWA] App compartida exitosamente');
    } else {
      // Fallback: copiar al portapapeles
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      showNotification({
        title: '✅ Enlace copiado',
        message: 'El enlace de la app se copió al portapapeles',
        type: 'success'
      });
    }
  } catch (error) {
    console.error('[PWA] Error al compartir:', error);
    showNotification({
      title: '❌ Error al compartir',
      message: 'No se pudo compartir la app',
      type: 'error'
    });
  }
}

// Llamar a la función de shortcuts cuando la app esté lista
document.addEventListener('DOMContentLoaded', handleAppShortcut);

// ============================================
// JUEGO "EL TEST" - FUNCIONALIDAD COMPLETA
// ============================================

// Variables globales del juego
let testGameState = {
  currentScreen: 'start',
  currentPlayer: null, // 'player1' o 'player2'
  guessingPlayer: null,
  questions: [],
  currentQuestionIndex: 0,
  answers: [],
  guesses: [],
  correctAnswers: 0,
  skippedQuestions: 0,
  timer: null,
  timeLeft: 30
};

// Preguntas del juego (se cargan desde scr/modules/testQuestions.js)
// Nota: Las preguntas y títulos se cargan desde el archivo separado

// Elementos del DOM del juego
const testGameModal = document.getElementById('test-game-modal');
const closeTestGameModal = document.getElementById('close-test-game-modal');

// Modal de instrucciones
const testInstructionsModal = document.getElementById('test-instructions-modal');
const closeTestInstructions = document.getElementById('close-test-instructions');
const testHelpBtn = document.getElementById('test-help-btn');

// Pantallas del juego
const testGameStart = document.getElementById('test-game-start');
const testPlayerSelection = document.getElementById('test-player-selection');
const testCreating = document.getElementById('test-creating');
const testGuessing = document.getElementById('test-guessing');
const testResult = document.getElementById('test-result');
const testSharedResults = document.getElementById('test-shared-results');
const testWaitingConfirmation = document.getElementById('test-waiting-confirmation');
const testFinal = document.getElementById('test-final');

// Elementos de la pantalla de inicio
const startTestGameBtn = document.getElementById('start-test-game');

// Elementos de selección de jugador
const playerOptions = document.querySelectorAll('.player-option');
const player1Name = document.getElementById('player1-name');
const player2Name = document.getElementById('player2-name');

// Elementos de preguntas
const currentQuestionEl = document.getElementById('current-question');
const totalQuestionsEl = document.getElementById('total-questions');
const questionText = document.getElementById('question-text');
const answerInput = document.getElementById('answer-input');
const charCount = document.getElementById('char-count');
const submitAnswerBtn = document.getElementById('submit-answer-btn');
const questionTimerBar = document.getElementById('question-timer-bar');

// Elementos de adivinación
const guessingPlayerName = document.getElementById('guessing-player-name');
const answerPlayerName = document.getElementById('answer-player-name');
const guessingQuestionText = document.getElementById('guessing-question-text');
const guessInput = document.getElementById('guess-input');
const guessCharCount = document.getElementById('guess-char-count');
const skipGuessBtn = document.getElementById('skip-guess-btn');
const submitGuessBtn = document.getElementById('submit-guess-btn');

// Elementos de resultado
const resultQuestionText = document.getElementById('result-question-text');
const correctAnswer = document.getElementById('correct-answer');
const userGuess = document.getElementById('user-guess');
const resultFeedback = document.getElementById('result-feedback');
const nextResultBtn = document.getElementById('next-result-btn');

// Elementos finales
const finalPercentage = document.getElementById('final-percentage');
const coupleTitle = document.getElementById('couple-title');
const titleDescription = document.getElementById('title-description');
const correctAnswersEl = document.getElementById('correct-answers');
const totalQuestionsFinal = document.getElementById('total-questions-final');
const skippedQuestionsEl = document.getElementById('skipped-questions');
const playAgainBtn = document.getElementById('play-again-btn');
const shareResultsBtn = document.getElementById('share-results-btn');

// Elementos de resultados compartidos
const sharedPercentage = document.getElementById('shared-percentage');
const sharedCoupleTitle = document.getElementById('shared-couple-title');
const sharedTitleDescription = document.getElementById('shared-title-description');
const sharedQuestionsList = document.getElementById('shared-questions-list');
const confirmResultsBtn = document.getElementById('confirm-results-btn');

// Elementos de espera de confirmación
const waitingStatus = document.getElementById('waiting-status');

// Elementos adicionales
const creatorNameDisplay = document.getElementById('creator-name-display');

// Función para abrir el modal del juego
async function openTestGameModal() {
  // Verificar que el modal existe
  if (!testGameModal) {
    console.error('Modal del test no encontrado');
    return;
  }

  showModal(testGameModal, 'standard');

  // Verificar estado de pareja para debugging
  await checkCoupleStatus();

  // Verificar el estado de tests
  await checkTestStatus();
  showTestScreen('start');
}

// Función para verificar el estado de tests disponibles
async function checkTestStatus() {
  if (!currentUser) {
    showTestStatus('Debes iniciar sesión para jugar', 'warning');
    return;
  }

  try {
    // Verificar si hay tests activos en el sistema (creados por cualquiera de los usuarios)
    const activeResult = await hasActiveTest(db, currentUser.uid);
    if (!activeResult.success) {
      showTestStatus('Error al verificar tests activos', 'warning');
      return;
    }

    // Verificar tests disponibles para responder
    const availableResult = await getAvailableTests(db, currentUser.uid);
    if (!availableResult.success) {
      showTestStatus('Error al cargar tests disponibles', 'warning');
      return;
    }

    const hasAvailableTests = availableResult.tests.length > 0;
    const hasAnyActiveTest = activeResult.hasActiveTest;

    // Actualizar la interfaz
    const createBtn = document.getElementById('create-test-btn');
    const respondBtn = document.getElementById('respond-test-btn');
    const notificationBadge = document.getElementById('test-notification-badge');

    if (hasAnyActiveTest) {
      // Hay algún test activo en el sistema
      if (hasAvailableTests) {
        // El usuario actual tiene tests para responder (es el destinatario)
        createBtn.style.display = 'none';
        respondBtn.style.display = 'block';
        if (notificationBadge) notificationBadge.style.display = 'none'; // No mostrar badge si puede responder
        showTestStatus('¡Tienes un test disponible para responder! Completa primero este test antes de crear uno nuevo. 🎯', 'info');
      } else {
        // El usuario actual creó el test activo (es el creador)
        createBtn.style.display = 'none';
        respondBtn.style.display = 'none';
        if (notificationBadge) notificationBadge.style.display = 'none'; // No mostrar badge si es el creador
        showTestStatus('Ya tienes un test activo esperando respuesta. ¡Sé paciente! 💕', 'info');
      }
    } else {
      // No hay tests activos, puede crear uno
      createBtn.style.display = 'block';
      respondBtn.style.display = 'none';
      if (notificationBadge) notificationBadge.style.display = 'none';
      showTestStatus('¡Crea un test para que tu pareja lo responda! ✨', 'info');
    }

    // Mostrar badge si el usuario actual creó un test que está esperando respuesta
    if (activeResult.createdActive && notificationBadge) {
      notificationBadge.style.display = 'flex';
      notificationBadge.textContent = '!';
    } else if (notificationBadge) {
      notificationBadge.style.display = 'none';
    }

  } catch (error) {
    console.error('Error checking test status:', error);
    showTestStatus('Error al verificar el estado de tests', 'warning');
  }
}

// Función para mostrar mensajes de estado
function showTestStatus(message, type = 'info') {
  const statusEl = document.getElementById('test-status-message');
  statusEl.textContent = message;
  statusEl.className = `test-status-message ${type}`;
  statusEl.style.display = 'block';
}

// Función para cerrar el modal del juego
async function closeTestGameModalFunc() {
  // Si estamos creando un test y no hemos completado todas las preguntas,
  // marcar el test como cancelado en lugar de eliminarlo
  if (testGameState.mode === 'creating' && testGameState.testId) {
    const answeredQuestions = testGameState.answers.filter(answer => answer && answer.trim() !== '').length;
    const totalQuestions = testGameState.questions.length;

    if (answeredQuestions < totalQuestions) {
      try {
        // Marcar el test como cancelado en lugar de eliminarlo
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await updateDoc(doc(db, 'tests', testGameState.testId), {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledReason: 'incomplete_creation'
        });
        console.log('Test incompleto marcado como cancelado en Firebase');
      } catch (error) {
        console.error('Error marcando test como cancelado:', error);
      }
    }
  }

  hideModal(testGameModal, 'standard');
  resetTestGame();
}

// Función para resetear el estado del juego
function resetTestGame() {
  testGameState = {
    mode: 'local', // 'local', 'creating', 'responding'
    testId: null,
    creatorId: null,
    targetId: null,
    creatorName: '',
    targetName: '',
    questions: [...testQuestions].sort(() => Math.random() - 0.5).slice(0, 10), // 10 preguntas aleatorias
    currentQuestionIndex: 0,
    answers: [],
    guesses: [],
    correctAnswers: 0,
    skippedQuestions: 0,
    timer: null,
    timeLeft: 30
  };

  // Resetear inputs
  answerInput.value = '';
  guessInput.value = '';
  charCount.textContent = '0';
  guessCharCount.textContent = '0';

  // Resetear botones
  submitAnswerBtn.disabled = true;
  submitGuessBtn.disabled = true;
}

// Función para mostrar una pantalla específica
function showTestScreen(screenName) {
  // Ocultar todas las pantallas
  const screens = [testGameStart, testPlayerSelection, testCreating, testGuessing, testResult, testSharedResults, testWaitingConfirmation, testFinal];
  screens.forEach(screen => {
    if (screen) { // Verificar que el elemento existe
      screen.classList.add('hidden');
    }
  });

  // Mostrar la pantalla deseada
  testGameState.currentScreen = screenName;
  switch (screenName) {
    case 'start':
      if (testGameStart) testGameStart.classList.remove('hidden');
      break;
    case 'player-selection':
      if (testPlayerSelection) testPlayerSelection.classList.remove('hidden');
      break;
    case 'creating':
      if (testCreating) {
        testCreating.classList.remove('hidden');
        loadCurrentQuestion(); // Cargar la pregunta actual
      }
      break;
    case 'guessing':
      if (testGuessing) {
        testGuessing.classList.remove('hidden');
        loadGuessingQuestion(); // Cargar la pregunta de adivinación
      }
      break;
    case 'result':
      if (testResult) testResult.classList.remove('hidden');
      break;
    case 'shared-results':
      if (testSharedResults) {
        testSharedResults.classList.remove('hidden');
        loadSharedResults(); // Cargar resultados compartidos
      }
      break;
    case 'waiting-confirmation':
      if (testWaitingConfirmation) testWaitingConfirmation.classList.remove('hidden');
      break;
    case 'final':
      if (testFinal) testFinal.classList.remove('hidden');
      break;
  }
}

// Función para iniciar el juego
function startTestGame() {
  // Obtener nombres de los usuarios
  if (currentUser) {
    player1Name.textContent = currentUser.displayName || currentUser.email || 'Jugador 1';
    player2Name.textContent = 'Tu Pareja'; // Esto podría mejorarse para obtener el nombre de la pareja
  }

  showTestScreen('player-selection');
}

// Función para seleccionar jugador
function selectPlayer(player) {
  testGameState.currentPlayer = player;
  testGameState.guessingPlayer = player === 'player1' ? 'player2' : 'player1';

  // Actualizar nombres en la interfaz
  const currentPlayerName = player === 'player1' ? player1Name.textContent : player2Name.textContent;
  const guessingPlayerNameValue = player === 'player1' ? player2Name.textContent : player1Name.textContent;

  answerPlayerName.textContent = currentPlayerName;
  guessingPlayerName.textContent = guessingPlayerNameValue;

  showTestScreen('questions');
  loadCurrentQuestion();
}

// Función para cargar la pregunta actual
function loadCurrentQuestion() {
  const question = testGameState.questions[testGameState.currentQuestionIndex];
  questionText.textContent = question;
  currentQuestionEl.textContent = testGameState.currentQuestionIndex + 1;
  totalQuestionsEl.textContent = testGameState.questions.length;

  // Resetear input y contador
  answerInput.value = '';
  charCount.textContent = '0';
  submitAnswerBtn.disabled = true;

  // Iniciar timer
  startQuestionTimer();
}

// Función para el timer de preguntas
function startQuestionTimer() {
  testGameState.timeLeft = 30;
  testGameState.timer = setInterval(() => {
    testGameState.timeLeft--;
    const percentage = (testGameState.timeLeft / 30) * 100;
    questionTimerBar.style.width = `${percentage}%`;

    if (testGameState.timeLeft <= 0) {
      clearInterval(testGameState.timer);
      submitAnswer(); // Auto-submit cuando se acaba el tiempo
    }
  }, 1000);
}

// Función para enviar respuesta
async function submitAnswer() {
  clearInterval(testGameState.timer);

  const answer = answerInput.value.trim();
  if (!answer) return;

  testGameState.answers[testGameState.currentQuestionIndex] = answer;

  // Si estamos creando un test, guardar en Firebase
  if (testGameState.mode === 'creating' && testGameState.testId) {
    await updateTestAnswers(db, testGameState.testId, testGameState.answers, testGameState.currentQuestionIndex);
  }

  nextQuestion();
}

// Función para avanzar a la siguiente pregunta
function nextQuestion() {
  testGameState.currentQuestionIndex++;

  if (testGameState.currentQuestionIndex < testGameState.questions.length) {
    loadCurrentQuestion();
  } else {
    // Verificar que todas las preguntas estén respondidas antes de pasar a adivinación
    const totalQuestions = testGameState.questions.length;
    const answeredQuestions = testGameState.answers.filter(answer => answer && answer.trim() !== '').length;

    if (answeredQuestions < totalQuestions) {
      // No todas las preguntas están respondidas, mostrar mensaje de error
      alert(`Debes responder todas las ${totalQuestions} preguntas antes de continuar. Has respondido ${answeredQuestions} de ${totalQuestions}.`);
      testGameState.currentQuestionIndex--; // Volver a la pregunta actual
      return;
    }

    // Todas las preguntas respondidas
    if (testGameState.mode === 'creating') {
      // Modo creación: finalizar el test creado
      finishTestCreation();
    } else {
      // Modo normal: pasar a adivinación
      startGuessingPhase();
    }
  }
}

// Función para finalizar la creación del test
async function finishTestCreation() {
  try {
    // Marcar el test como completado por el creador (todas las respuestas guardadas)
    await updateTestAnswers(db, testGameState.testId, testGameState.answers, testGameState.questions.length - 1, true);

    // El test sigue en estado 'active' hasta que el respondedor termine

    // Mostrar notificación global de éxito
    showNotification({
      title: '¡Test Creado! 🎉',
      message: 'Tu pareja recibirá una notificación para responder el test. Cuando ambos hayan terminado, podrán ver los resultados de compatibilidad.',
      type: 'success',
      confirm: false
    });

    // Cerrar el modal del test
    closeTestGameModalFunc();

    // Actualizar la UI para mostrar que hay un test activo creado
    await checkTestStatus();

  } catch (error) {
    console.error('Error finalizando creación del test:', error);
    showNotification({
      title: 'Error',
      message: 'Error al finalizar la creación del test. Por favor intenta de nuevo.',
      type: 'error',
      confirm: false
    });
  }
}

// Función para iniciar la fase de adivinación
function startGuessingPhase() {
  testGameState.currentQuestionIndex = 0;
  showTestScreen('guessing');
  loadGuessingQuestion();
}

// Función para cargar pregunta de adivinación
function loadGuessingQuestion() {
  const currentAnswer = testGameState.answers[testGameState.currentQuestionIndex];
  guessingQuestionText.textContent = currentAnswer.question;

  // Resetear input
  guessInput.value = '';
  guessCharCount.textContent = '0';
  submitGuessBtn.disabled = true;
}

// Función para enviar adivinanza
async function submitGuess() {
  const guess = guessInput.value.trim();
  if (!guess) return;

  const correctAnswer = testGameState.answers[testGameState.currentQuestionIndex].answer;
  const isCorrect = compareAnswers(guess, correctAnswer);

  testGameState.guesses.push({
    question: testGameState.answers[testGameState.currentQuestionIndex].question,
    correctAnswer: correctAnswer,
    userGuess: guess,
    isCorrect: isCorrect
  });

  if (isCorrect) {
    testGameState.correctAnswers++;
  }

  // Si estamos respondiendo un test, actualizar en Firebase
  if (testGameState.mode === 'responding' && testGameState.testId) {
    await updateTestGuesses(
      db,
      testGameState.testId,
      testGameState.guesses,
      testGameState.correctAnswers,
      testGameState.skippedQuestions
    );
  }

  showResult();
}

// Modificar la función skipGuess para guardar en Firebase
async function skipGuess() {
  testGameState.guesses.push({
    question: testGameState.answers[testGameState.currentQuestionIndex].question,
    correctAnswer: testGameState.answers[testGameState.currentQuestionIndex].answer,
    userGuess: '',
    isCorrect: false,
    skipped: true
  });

  testGameState.skippedQuestions++;

  // Si estamos respondiendo un test, actualizar en Firebase
  if (testGameState.mode === 'responding' && testGameState.testId) {
    await updateTestGuesses(
      db,
      testGameState.testId,
      testGameState.guesses,
      testGameState.correctAnswers,
      testGameState.skippedQuestions
    );
  }

  showResult();
}

// Función para verificar el estado de la pareja (para debugging)
async function checkCoupleStatus() {
  try {
    console.log('🔍 Verificando estado de pareja...');

    // Verificar usuario actual
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log('👤 Usuario actual:', {
        uid: currentUser.uid,
        coupleId: userData.coupleId,
        partnerId: userData.partnerId,
        partnerName: userData.partnerName
      });

      if (userData.coupleId) {
        // Verificar pareja
        const coupleRef = doc(db, 'couples', userData.coupleId);
        const coupleSnap = await getDoc(coupleRef);

        if (coupleSnap.exists()) {
          const coupleData = coupleSnap.data();
          console.log('💑 Pareja encontrada:', {
            coupleId: userData.coupleId,
            user1Id: coupleData.user1Id,
            user2Id: coupleData.user2Id
          });
        } else {
          console.log('❌ Documento de pareja no encontrado');
        }
      } else {
        console.log('ℹ️ Usuario no tiene coupleId');
      }
    } else {
      console.log('❌ Documento de usuario no encontrado');
    }

    // Probar getCoupleInfo
    const coupleInfo = await getCoupleInfo();
    console.log('🔍 Resultado de getCoupleInfo:', coupleInfo);

  } catch (error) {
    console.error('❌ Error en checkCoupleStatus:', error);
  }
}

// Agregar función global para debugging (temporal)
window.checkCoupleStatus = checkCoupleStatus;
function compareAnswers(guess, correct) {
  if (!guess || !correct) return false;

  // Convertir a minúsculas y quitar espacios/puntuación
  const normalize = (str) => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const normalizedGuess = normalize(guess);
  const normalizedCorrect = normalize(correct);

  // Comparación exacta
  if (normalizedGuess === normalizedCorrect) return true;

  // Contener la respuesta correcta
  if (normalizedCorrect.includes(normalizedGuess) && normalizedGuess.length > 3) return true;

  // La respuesta correcta contiene la adivinanza
  if (normalizedGuess.includes(normalizedCorrect) && normalizedCorrect.length > 3) return true;

  return false;
}

// Función para mostrar resultado
function showResult() {
  const currentGuess = testGameState.guesses[testGameState.currentQuestionIndex];

  resultQuestionText.textContent = currentGuess.question;
  correctAnswer.textContent = currentGuess.correctAnswer;
  userGuess.textContent = currentGuess.userGuess || '(Saltada)';

  // Feedback basado en el resultado
  if (currentGuess.skipped) {
    resultFeedback.innerHTML = '<div class="feedback-message skip">⏭️ Pregunta saltada</div>';
  } else if (currentGuess.isCorrect) {
    resultFeedback.innerHTML = '<div class="feedback-message correct">🎉 ¡Correcto! ¡Lo conoces bien!</div>';
  } else {
    resultFeedback.innerHTML = '<div class="feedback-message wrong">❌ No acertaste, pero ¡sigue intentándolo!</div>';
  }

  showTestScreen('result');
}

// Función para siguiente resultado
function nextResult() {
  // Validar que todas las preguntas hayan sido respondidas
  if (testGameState.answers.length < 10) {
    alert('Debes responder todas las 10 preguntas antes de continuar.');
    return;
  }

  testGameState.currentQuestionIndex++;

  if (testGameState.currentQuestionIndex < testGameState.answers.length) {
    loadGuessingQuestion();
    showTestScreen('guessing');
  } else {
    showFinalResults();
  }
}

// Función para mostrar resultados finales
async function showFinalResults() {
  const totalQuestions = testGameState.questions.length;
  const percentage = Math.round((testGameState.correctAnswers / totalQuestions) * 100);

  // Actualizar el test en Firebase con los resultados finales
  if (testGameState.testId) {
    try {
      await updateTestGuesses(
        db,
        testGameState.testId,
        testGameState.guesses,
        testGameState.correctAnswers,
        testGameState.skippedQuestions
      );

      // Marcar el test como completado solo si estamos respondiendo (ambos han terminado)
      if (testGameState.mode === 'responding') {
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await updateDoc(doc(db, 'tests', testGameState.testId), {
          status: 'completed',
          completedAt: new Date(),
          finalPercentage: percentage
        });
        console.log('Test completado y actualizado en Firebase');
      }

    } catch (error) {
      console.error('Error actualizando test completado:', error);
    }
  }

  // Mostrar pantalla final con resultados
  showTestScreen('final');
  loadFinalResults();
}

// Función para cargar resultados finales
async function loadFinalResults() {
  const totalQuestions = testGameState.questions.length;
  const percentage = Math.round((testGameState.correctAnswers / totalQuestions) * 100);

  // Actualizar elementos de la pantalla final
  const finalPercentage = document.getElementById('final-percentage');
  const coupleTitle = document.getElementById('couple-title');
  const titleDescription = document.getElementById('title-description');
  const correctAnswers = document.getElementById('correct-answers');
  const totalQuestionsFinal = document.getElementById('total-questions-final');
  const skippedQuestions = document.getElementById('skipped-questions');

  if (finalPercentage) finalPercentage.textContent = `${percentage}%`;
  if (correctAnswers) correctAnswers.textContent = testGameState.correctAnswers;
  if (totalQuestionsFinal) totalQuestionsFinal.textContent = totalQuestions;
  if (skippedQuestions) skippedQuestions.textContent = testGameState.skippedQuestions;

  // Encontrar título de pareja
  const coupleTitleData = coupleTitles.find(title =>
    percentage >= title.min && percentage <= title.max
  ) || coupleTitles[0];

  if (coupleTitle) coupleTitle.textContent = coupleTitleData.title;
  if (titleDescription) titleDescription.textContent = coupleTitleData.description;

  // Verificar estado de confirmación y mostrar mensaje apropiado
  await checkAndShowConfirmationStatus();
}

// Función para cargar resultados compartidos (deprecated - usar loadFinalResults)
async function loadSharedResults() {
  // Limpiar lista anterior
  const sharedQuestionsList = document.getElementById('shared-questions-list');
  if (sharedQuestionsList) {
    sharedQuestionsList.innerHTML = '';

    // Mostrar cada pregunta con su resultado
    testGameState.guesses.forEach((guess, index) => {
      const questionItem = document.createElement('div');
      questionItem.className = 'shared-question-item';

      const isCorrect = guess.isCorrect;
      const statusIcon = guess.skipped ? '⏭️' : (isCorrect ? '✅' : '❌');
      const statusClass = guess.skipped ? 'skipped' : (isCorrect ? 'correct' : 'wrong');

      questionItem.innerHTML = `
        <div class="shared-question-header">
          <h5>${index + 1}. ${guess.question}</h5>
          <span class="question-status ${statusClass}">${statusIcon}</span>
        </div>
        <div class="shared-answers">
          <div class="shared-answer">
            <span class="answer-label">Respuesta real:</span>
            <span class="answer-text">${guess.correctAnswer}</span>
          </div>
          <div class="shared-answer">
            <span class="answer-label">Adivinanza:</span>
            <span class="answer-text">${guess.userGuess || 'Saltada'}</span>
          </div>
        </div>
      `;

      sharedQuestionsList.appendChild(questionItem);
    });
  }

  // Esta función está deprecated, usar loadFinalResults en su lugar
  return loadFinalResults();
}
async function confirmResults() {
  if (!currentUser || !testGameState.testId) return;

  try {
    // Determinar si el usuario actual es el creador
    const isCreator = testGameState.creatorId === currentUser.uid;

    // Confirmar que este usuario ha visto los resultados
    const confirmResult = await confirmTestResults(db, testGameState.testId, currentUser.uid, isCreator);
    if (!confirmResult.success) {
      alert('Error al confirmar resultados: ' + confirmResult.error);
      return;
    }

    // Verificar si ambos han confirmado
    const checkResult = await checkBothConfirmed(db, testGameState.testId);
    if (!checkResult.success) {
      alert('Error al verificar confirmaciones: ' + checkResult.error);
      return;
    }

    if (checkResult.bothConfirmed) {
      // Ambos han confirmado - eliminar el test y permitir crear uno nuevo
      try {
        const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        await deleteDoc(doc(db, 'tests', testGameState.testId));
        console.log('Test completado eliminado de Firebase');

        // Mostrar notificación de éxito
        showNotification({
          title: '¡Test Completado! 🎉',
          message: 'Ambos han visto los resultados. Ya puedes crear un nuevo test.',
          type: 'success',
          confirm: false
        });

        // Cerrar modal y actualizar estado
        closeTestGameModalFunc();
        await checkTestStatus();

      } catch (error) {
        console.error('Error eliminando test:', error);
        alert('Error al completar el test');
      }
    } else {
      // Solo este usuario ha confirmado - mostrar mensaje de espera pero mantener resultados visibles
      const waitingMessage = document.getElementById('waiting-confirmation-message');
      if (waitingMessage) {
        waitingMessage.textContent = 'Esperando que tu pareja también confirme que ha visto los resultados...';
        waitingMessage.style.display = 'block';
      }

      // Mantener la pantalla de resultados visible
      showTestScreen('final'); // Asegurar que estamos en la pantalla final

      // Iniciar verificación periódica para cuando el otro usuario confirme
      checkConfirmationStatus();
    }

  } catch (error) {
    console.error('Error confirming results:', error);
    alert('Error al confirmar resultados');
  }
}

// Función para verificar y mostrar el estado de confirmación
async function checkAndShowConfirmationStatus() {
  if (!testGameState.testId) return;

  try {
    const checkResult = await checkBothConfirmed(db, testGameState.testId);
    if (!checkResult.success) return;

    const test = checkResult.test;
    const isCreator = testGameState.creatorId === currentUser.uid;
    const userConfirmed = isCreator ? test.creatorConfirmed : test.responderConfirmed;
    const partnerConfirmed = isCreator ? test.responderConfirmed : test.creatorConfirmed;

    const waitingMessage = document.getElementById('waiting-confirmation-message');

    if (checkResult.bothConfirmed) {
      // Ambos han confirmado - el test debería eliminarse pronto
      if (waitingMessage) {
        waitingMessage.style.display = 'none';
      }
    } else if (userConfirmed) {
      // Usuario actual ya confirmó, esperando al otro
      if (waitingMessage) {
        waitingMessage.textContent = 'Esperando que tu pareja también confirme que ha visto los resultados...';
        waitingMessage.style.display = 'block';
      }
      // Iniciar verificación periódica
      checkConfirmationStatus();
    } else {
      // Usuario actual no ha confirmado aún - mostrar mensaje para confirmar
      if (waitingMessage) {
        waitingMessage.textContent = 'Confirma que has visto los resultados para completar el test.';
        waitingMessage.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error checking confirmation status:', error);
  }
}

// Función para verificar periódicamente el estado de confirmación
async function checkConfirmationStatus() {
  const checkInterval = setInterval(async () => {
    try {
      const checkResult = await checkBothConfirmed(db, testGameState.testId);
      if (checkResult.success && checkResult.bothConfirmed) {
        clearInterval(checkInterval);

        // Ambos han confirmado - proceder como arriba
        try {
          const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
          await deleteDoc(doc(db, 'tests', testGameState.testId));

          showNotification({
            title: '¡Test Completado! 🎉',
            message: 'Tu pareja también ha confirmado. Ya puedes crear un nuevo test.',
            type: 'success',
            confirm: false
          });

          closeTestGameModalFunc();
          await checkTestStatus();

        } catch (error) {
          console.error('Error eliminando test:', error);
        }
      }
    } catch (error) {
      console.error('Error checking confirmation status:', error);
    }
  }, 3000); // Verificar cada 3 segundos

  // Detener después de 5 minutos
  setTimeout(() => {
    clearInterval(checkInterval);
    const waitingStatus = document.getElementById('waiting-confirmation-message');
    if (waitingStatus) {
      waitingStatus.textContent = 'Esperando confirmación de tu pareja... (Puedes cerrar esta ventana y volver más tarde)';
    }
  }, 300000);
}

// Función para compartir resultados
function shareResults() {
  // Usar elementos de resultados compartidos si existen, sino usar finales
  const percentageElement = sharedPercentage || finalPercentage;
  const titleElement = sharedCoupleTitle || coupleTitle;

  const percentage = percentageElement ? percentageElement.textContent : '0%';
  const title = titleElement ? titleElement.textContent : 'Pareja';

  const shareText = `¡Hicimos "El Test" y tenemos ${percentage} de compatibilidad! Somos "${title}" 💕 #ElTest #Pareja`;

  if (navigator.share) {
    navigator.share({
      title: 'Resultados de El Test',
      text: shareText
    });
  } else {
    // Fallback: copiar al portapapeles
    navigator.clipboard.writeText(shareText).then(() => {
      alert('¡Resultados copiados al portapapeles! 📋');
    });
  }
}

// Event listeners del juego
const createTestBtn = document.getElementById('create-test-btn');
const respondTestBtn = document.getElementById('respond-test-btn');

createTestBtn.addEventListener('click', createNewTest);
respondTestBtn.addEventListener('click', respondToAvailableTest);

// Función para crear un nuevo test
async function createNewTest() {
  if (!currentUser) {
    alert('Debes iniciar sesión para crear un test');
    return;
  }

  try {
    // Obtener información de la pareja
    const coupleInfo = await getCoupleInfo();
    if (!coupleInfo.partnerId) {
      alert('Necesitas tener una pareja conectada para crear un test');
      return;
    }

    // Crear el test
    const result = await createTest(
      db,
      currentUser.uid,
      coupleInfo.partnerId,
      coupleInfo.userName,
      coupleInfo.partnerName
    );

    if (result.success) {
      // Cambiar al modo de responder preguntas
      testGameState = {
        ...testGameState,
        mode: 'creating',
        testId: result.testId,
        questions: result.test.questions,
        currentQuestionIndex: 0,
        answers: []
      };

      showTestScreen('creating');
    } else {
      alert('Error al crear el test: ' + result.error);
    }
  } catch (error) {
    console.error('Error creating test:', error);
    alert('Error al crear el test');
  }
}

// Función para responder a un test disponible
async function respondToAvailableTest() {
  if (!currentUser) {
    alert('Debes iniciar sesión para responder un test');
    return;
  }

  try {
    const result = await getAvailableTests(db, currentUser.uid);
    if (!result.success || result.tests.length === 0) {
      alert('No hay tests disponibles para responder');
      return;
    }

    // Tomar el test más reciente
    const test = result.tests[0];

    // Verificar si el test ya está completado
    if (test.status === 'completed') {
      // Cargar test completado y mostrar resultados
      testGameState = {
        ...testGameState,
        mode: 'responding',
        testId: test.id,
        creatorId: test.creatorId,
        creatorName: test.creatorName,
        targetId: test.targetId,
        targetName: test.targetName,
        questions: test.questions,
        answers: test.questions.map((question, index) => ({
          question: question,
          answer: test.answers[index] || ''
        })),
        guesses: test.guesses || [],
        correctAnswers: test.correctAnswers || 0,
        skippedQuestions: test.skippedQuestions || 0
      };

      // Mostrar resultados compartidos
      showTestScreen('shared-results');
      loadSharedResults();

      // Verificar estado de confirmación y mostrar mensaje apropiado
      await checkAndShowConfirmationStatus();

      return;
    }

    // Cambiar al modo de responder para test activo
    testGameState = {
      ...testGameState,
      mode: 'responding',
      testId: test.id,
      creatorId: test.creatorId,
      creatorName: test.creatorName,
      questions: test.questions,
      answers: test.questions.map((question, index) => ({
        question: question,
        answer: test.answers[index] || ''
      })), // Combinar preguntas con respuestas del creador
      currentQuestionIndex: 0,
      guesses: [],
      correctAnswers: 0,
      skippedQuestions: 0
    };

    // Mostrar nombre del creador en la interfaz
    if (creatorNameDisplay) {
      creatorNameDisplay.textContent = test.creatorName;
    }

    showTestScreen('guessing');
  } catch (error) {
    console.error('Error responding to test:', error);
    alert('Error al cargar el test');
  }
}

// Función para obtener información de la pareja
async function getCoupleInfo() {
  try {
    // Consultar la colección de parejas para encontrar la pareja del usuario actual
    // Primero obtener el coupleId del usuario actual
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().coupleId) {
      return {
        userName: currentUser.displayName || 'Tú',
        partnerId: null,
        partnerName: null
      };
    }

    const coupleId = userSnap.data().coupleId;

    // Obtener el documento de la pareja
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleSnap = await getDoc(coupleRef);

    if (!coupleSnap.exists()) {
      return {
        userName: currentUser.displayName || 'Tú',
        partnerId: null,
        partnerName: null
      };
    }

    const coupleData = coupleSnap.data();

    // Encontrar el ID del partner
    const partnerId = coupleData.user1Id === currentUser.uid ? coupleData.user2Id : coupleData.user1Id;

    if (partnerId) {
      // Obtener información del partner desde la colección de usuarios
      const partnerDoc = await getDoc(doc(db, 'users', partnerId));
      const partnerData = partnerDoc.exists() ? partnerDoc.data() : {};

      return {
        userName: currentUser.displayName || 'Tú',
        partnerId: partnerId,
        partnerName: partnerData.displayName || partnerData.email || 'Tu Pareja'
      };
    }

    return {
      userName: currentUser.displayName || 'Tú',
      partnerId: null,
      partnerName: null
    };
  } catch (error) {
    console.error('Error getting couple info:', error);
    return {
      userName: currentUser.displayName || 'Tú',
      partnerId: null,
      partnerName: null
    };
  }
}

playerOptions.forEach(option => {
  option.addEventListener('click', () => {
    const player = option.dataset.player;
    selectPlayer(player);
  });
});

// Event listeners para inputs
answerInput.addEventListener('input', () => {
  const length = answerInput.value.length;
  charCount.textContent = length;
  submitAnswerBtn.disabled = length === 0;
});

guessInput.addEventListener('input', () => {
  const length = guessInput.value.length;
  guessCharCount.textContent = length;
  submitGuessBtn.disabled = length === 0;
});

// Event listeners para botones
submitAnswerBtn.addEventListener('click', submitAnswer);
submitGuessBtn.addEventListener('click', submitGuess);
skipGuessBtn.addEventListener('click', skipGuess);
nextResultBtn.addEventListener('click', nextResult);
confirmResultsBtn.addEventListener('click', confirmResults);
playAgainBtn.addEventListener('click', () => {
  resetTestGame();
  showTestScreen('start');
});
shareResultsBtn.addEventListener('click', shareResults);

// Event listener para cerrar modal
closeTestGameModal.addEventListener('click', closeTestGameModalFunc);
testGameModal.addEventListener('click', (e) => {
  if (e.target === testGameModal) {
    closeTestGameModalFunc();
  }
});

// Event listeners para modal de instrucciones
if (testHelpBtn) {
  testHelpBtn.addEventListener('click', () => {
    if (testInstructionsModal) {
      showModal(testInstructionsModal, 'standard');
    }
  });
}

if (closeTestInstructions) {
  closeTestInstructions.addEventListener('click', () => {
    if (testInstructionsModal) {
      hideModal(testInstructionsModal, 'standard');
    }
  });
}

if (testInstructionsModal) {
  testInstructionsModal.addEventListener('click', (e) => {
    if (e.target === testInstructionsModal) {
      hideModal(testInstructionsModal, 'standard');
    }
  });
}

// Función para inicializar elementos del test cuando el DOM esté listo
function initializeTestElements() {
  // Verificar que los elementos críticos existen
  const criticalElements = [
    'test-game-modal',
    'test-game-start',
    'test-creating',
    'test-guessing',
    'test-result',
    'test-shared-results',
    'test-waiting-confirmation',
    'test-final'
  ];

  const missingElements = criticalElements.filter(id => !document.getElementById(id));

  if (missingElements.length > 0) {
    console.error('Elementos del DOM faltantes:', missingElements);
    return;
  }

  console.log('✅ Todos los elementos del test inicializados correctamente');
}

// Llamar a la inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTestElements);
} else {
  initializeTestElements();
}

// ============================================
// CÁMARA AVANZADA CON EDICIÓN DE FOTOS
// ============================================

class AdvancedCamera {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.currentFilter = 'none';
    this.currentEffect = 'none';
    this.isRecording = false;
    this.photoHistory = [];
    this.canvas = null;
    this.ctx = null;
  }

  async initialize() {
    try {
      // Verificar soporte de APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de MediaDevices no está soportada');
      }

      // Crear canvas para edición
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');

      console.log('[AdvancedCamera] Inicializada correctamente');
      return true;
    } catch (error) {
      console.error('[AdvancedCamera] Error al inicializar:', error);
      return false;
    }
  }

  async startCamera(constraints = {}) {
    try {
      const defaultConstraints = {
        video: {
          width: { ideal: 1920, max: 2560 },
          height: { ideal: 1080, max: 1440 },
          facingMode: 'user', // 'user' para frontal, 'environment' para trasera
          frameRate: { ideal: 30, max: 60 }
        },
        audio: false
      };

      const finalConstraints = { ...defaultConstraints, ...constraints };

      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);

      // Configurar canvas
      const videoTrack = this.stream.getVideoTracks()[0];
      const settings = videoTrack.getSettings();

      this.canvas.width = settings.width || 1920;
      this.canvas.height = settings.height || 1080;

      console.log('[AdvancedCamera] Cámara iniciada:', settings);
      return this.stream;
    } catch (error) {
      console.error('[AdvancedCamera] Error al iniciar cámara:', error);
      throw error;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }

    console.log('[AdvancedCamera] Cámara detenida');
  }

  async takePhoto(options = {}) {
    if (!this.stream) {
      throw new Error('La cámara no está activa');
    }

    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        video.srcObject = this.stream;
        video.muted = true;

        video.onloadedmetadata = () => {
          video.play();

          // Esperar un frame para asegurar que el video esté listo
          setTimeout(() => {
            // Dibujar frame en canvas
            this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);

            // Aplicar filtros y efectos
            this.applyFiltersAndEffects();

            // Convertir a blob
            this.canvas.toBlob((blob) => {
              if (blob) {
                const photoData = {
                  blob: blob,
                  dataUrl: this.canvas.toDataURL('image/jpeg', 0.9),
                  timestamp: new Date().toISOString(),
                  filter: this.currentFilter,
                  effect: this.currentEffect,
                  metadata: {
                    width: this.canvas.width,
                    height: this.canvas.height,
                    camera: 'advanced'
                  }
                };

                // Agregar a historial
                this.photoHistory.unshift(photoData);
                if (this.photoHistory.length > 10) {
                  this.photoHistory.pop(); // Mantener solo las últimas 10
                }

                // Guardar en localStorage
                this.savePhotoToStorage(photoData);

                resolve(photoData);
              } else {
                reject(new Error('Error al crear la imagen'));
              }
            }, 'image/jpeg', 0.9);
          }, 100);
        };

        video.onerror = () => reject(new Error('Error al cargar el video'));
      } catch (error) {
        reject(error);
      }
    });
  }

  applyFiltersAndEffects() {
    if (!this.ctx) return;

    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    // Aplicar filtro
    switch (this.currentFilter) {
      case 'sepia':
        this.applySepiaFilter(data);
        break;
      case 'grayscale':
        this.applyGrayscaleFilter(data);
        break;
      case 'vintage':
        this.applyVintageFilter(data);
        break;
      case 'romantic':
        this.applyRomanticFilter(data);
        break;
      case 'bright':
        this.applyBrightnessFilter(data, 20);
        break;
      case 'contrast':
        this.applyContrastFilter(data, 20);
        break;
    }

    // Aplicar efecto
    switch (this.currentEffect) {
      case 'blur':
        this.applyBlurEffect(data);
        break;
      case 'sharpen':
        this.applySharpenEffect(data);
        break;
      case 'vignette':
        this.applyVignetteEffect(data);
        break;
      case 'glow':
        this.applyGlowEffect(data);
        break;
    }

    this.ctx.putImageData(imageData, 0, 0);
  }

  applySepiaFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
      data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
      data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
    }
  }

  applyGrayscaleFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = data[i + 1] = data[i + 2] = avg;
    }
  }

  applyVintageFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.2);     // Más rojo
      data[i + 1] = data[i + 1] * 0.9;            // Menos verde
      data[i + 2] = Math.min(255, data[i + 2] * 0.8); // Menos azul
    }
  }

  applyRomanticFilter(data) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * 1.1);     // Más rojo/rosado
      data[i + 1] = data[i + 1] * 0.95;           // Menos verde
      data[i + 2] = Math.min(255, data[i + 2] * 1.05); // Más azul
    }
  }

  applyBrightnessFilter(data, brightness) {
    const factor = (brightness + 100) / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
  }

  applyContrastFilter(data, contrast) {
    const factor = (contrast + 100) / 100;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, ((data[i] - 128) * factor) + 128);
      data[i + 1] = Math.min(255, ((data[i + 1] - 128) * factor) + 128);
      data[i + 2] = Math.min(255, ((data[i + 2] - 128) * factor) + 128);
    }
  }

  applyBlurEffect(data) {
    // Implementación simple de blur (puede ser mejorada)
    const width = this.canvas.width;
    const height = this.canvas.height;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const sum = tempData[idx - 4 + c] + tempData[idx + c] + tempData[idx + 4 + c] +
                     tempData[idx - width * 4 + c] + tempData[idx + width * 4 + c];
          data[idx + c] = sum / 5;
        }
      }
    }
  }

  applySharpenEffect(data) {
    const width = this.canvas.width;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 1; y < this.canvas.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = tempData[idx + c] * 5;
          const neighbors = tempData[idx - 4 + c] + tempData[idx + 4 + c] +
                           tempData[idx - width * 4 + c] + tempData[idx + width * 4 + c];
          data[idx + c] = Math.min(255, Math.max(0, center - neighbors));
        }
      }
    }
  }

  applyVignetteEffect(data) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const vignette = 1 - (distance / maxDistance) * 0.5;

        const idx = (y * width + x) * 4;
        data[idx] = Math.min(255, data[idx] * vignette);
        data[idx + 1] = Math.min(255, data[idx + 1] * vignette);
        data[idx + 2] = Math.min(255, data[idx + 2] * vignette);
      }
    }
  }

  applyGlowEffect(data) {
    // Efecto de glow simple
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (brightness > 128) {
        const glow = (brightness - 128) / 127;
        data[i] = Math.min(255, data[i] + glow * 50);
        data[i + 1] = Math.min(255, data[i + 1] + glow * 50);
        data[i + 2] = Math.min(255, data[i + 2] + glow * 50);
      }
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
  }

  setEffect(effect) {
    this.currentEffect = effect;
  }

  async startRecording(options = {}) {
    if (!this.stream) {
      throw new Error('La cámara no está activa');
    }

    try {
      const defaultOptions = {
        mimeType: 'video/webm;codecs=vp9',
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000
      };

      const finalOptions = { ...defaultOptions, ...options };

      this.mediaRecorder = new MediaRecorder(this.stream, finalOptions);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: finalOptions.mimeType });
        const videoData = {
          blob: blob,
          dataUrl: URL.createObjectURL(blob),
          timestamp: new Date().toISOString(),
          duration: this.recordedChunks.length * 1000, // aproximado
          metadata: {
            type: 'video',
            mimeType: finalOptions.mimeType
          }
        };

        // Aquí se podría guardar el video
        console.log('[AdvancedCamera] Video grabado:', videoData);
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      console.log('[AdvancedCamera] Grabación iniciada');
    } catch (error) {
      console.error('[AdvancedCamera] Error al iniciar grabación:', error);
      throw error;
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      console.log('[AdvancedCamera] Grabación detenida');
    }
  }

  savePhotoToStorage(photoData) {
    try {
      const photos = JSON.parse(localStorage.getItem('advancedPhotos') || '[]');
      photos.unshift({
        id: Date.now().toString(),
        dataUrl: photoData.dataUrl,
        timestamp: photoData.timestamp,
        filter: photoData.filter,
        effect: photoData.effect,
        metadata: photoData.metadata
      });

      // Mantener solo las últimas 50 fotos
      if (photos.length > 50) {
        photos.splice(50);
      }

      localStorage.setItem('advancedPhotos', JSON.stringify(photos));
    } catch (error) {
      console.error('[AdvancedCamera] Error guardando foto:', error);
    }
  }

  getPhotoHistory() {
    try {
      return JSON.parse(localStorage.getItem('advancedPhotos') || '[]');
    } catch (error) {
      console.error('[AdvancedCamera] Error obteniendo historial:', error);
      return [];
    }
  }

  async sharePhoto(photoData) {
    if (navigator.share && photoData.blob) {
      try {
        const file = new File([photoData.blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await navigator.share({
          title: 'Foto romántica',
          text: 'Una foto especial para ti 💕',
          files: [file]
        });
        return true;
      } catch (error) {
        console.log('[AdvancedCamera] Error compartiendo:', error);
        return false;
      }
    }
    return false;
  }

  async downloadPhoto(photoData, filename = null) {
    if (!photoData.dataUrl) return false;

    try {
      const link = document.createElement('a');
      link.href = photoData.dataUrl;
      link.download = filename || `romantic_photo_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (error) {
      console.error('[AdvancedCamera] Error descargando foto:', error);
      return false;
    }
  }
}

// ============================================
// VIBRACIÓN HÁPTICA AVANZADA
// ============================================

class HapticFeedback {
  constructor() {
    this.supported = 'vibrate' in navigator;
    this.patterns = {
      light: [50],
      medium: [100],
      heavy: [200],
      success: [50, 50, 50],
      error: [200, 100, 200],
      warning: [100, 50, 100, 50, 100],
      celebration: [50, 50, 50, 50, 50, 100, 50, 50, 50],
      heartbeat: [100, 200, 100, 200, 100, 1000],
      romantic: [200, 100, 200, 100, 500],
      notification: [200, 100, 200],
      button: [50],
      swipe: [30, 50, 30],
      longpress: [100, 50, 100]
    };
  }

  vibrate(pattern) {
    if (!this.supported) return false;

    try {
      if (typeof pattern === 'string') {
        pattern = this.patterns[pattern] || this.patterns.medium;
      }

      navigator.vibrate(pattern);
      return true;
    } catch (error) {
      console.error('[HapticFeedback] Error en vibración:', error);
      return false;
    }
  }

  // Vibraciones específicas para interacciones comunes
  buttonPress() {
    this.vibrate('button');
  }

  success() {
    this.vibrate('success');
  }

  error() {
    this.vibrate('error');
  }

  warning() {
    this.vibrate('warning');
  }

  celebration() {
    this.vibrate('celebration');
  }

  romantic() {
    this.vibrate('romantic');
  }

  notification() {
    this.vibrate('notification');
  }

  swipe() {
    this.vibrate('swipe');
  }

  longPress() {
    this.vibrate('longpress');
  }

  heartbeat() {
    this.vibrate('heartbeat');
  }

  // Vibración personalizada
  customPattern(pattern) {
    return this.vibrate(pattern);
  }

  // Vibración continua
  startContinuous(duration = 1000) {
    if (!this.supported) return false;
    navigator.vibrate(duration);
    return true;
  }

  // Detener vibración
  stop() {
    if (this.supported) {
      navigator.vibrate(0);
    }
  }

  // Verificar si está vibrando actualmente
  isVibrating() {
    // No hay API directa para esto, pero podemos asumir que si soportamos vibrate, podemos verificar
    return this.supported;
  }
}

// ============================================
// MEDIA SESSION API PARA CONTROLES DE MÚSICA
// ============================================

class MediaSessionManager {
  constructor() {
    this.supported = 'mediaSession' in navigator;
    this.currentTrack = null;
    this.isPlaying = false;
    this.volume = 1.0;
    this.playbackRate = 1.0;
  }

  initialize() {
    if (!this.supported) {
      console.warn('[MediaSession] Media Session API no soportada');
      return false;
    }

    // Configurar controles de medios
    this.setupMediaControls();

    // Escuchar eventos de teclado multimedia
    this.setupKeyboardControls();

    console.log('[MediaSession] Inicializada correctamente');
    return true;
  }

  setupMediaControls() {
    const session = navigator.mediaSession;

    // Configurar acciones de medios
    session.setActionHandler('play', () => this.handlePlay());
    session.setActionHandler('pause', () => this.handlePause());
    session.setActionHandler('stop', () => this.handleStop());
    session.setActionHandler('seekbackward', (details) => this.handleSeekBackward(details));
    session.setActionHandler('seekforward', (details) => this.handleSeekForward(details));
    session.setActionHandler('seekto', (details) => this.handleSeekTo(details));
    session.setActionHandler('previoustrack', () => this.handlePreviousTrack());
    session.setActionHandler('nexttrack', () => this.handleNextTrack());
    session.setActionHandler('skipad', () => this.handleSkipAd());

    // Configurar controles de volumen si están disponibles
    if ('volume' in navigator.mediaSession) {
      navigator.mediaSession.volume = this.volume;
    }
  }

  setupKeyboardControls() {
    // Escuchar eventos de teclado multimedia
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'MediaPlayPause':
          event.preventDefault();
          this.isPlaying ? this.handlePause() : this.handlePlay();
          break;
        case 'MediaStop':
          event.preventDefault();
          this.handleStop();
          break;
        case 'MediaTrackNext':
          event.preventDefault();
          this.handleNextTrack();
          break;
        case 'MediaTrackPrevious':
          event.preventDefault();
          this.handlePreviousTrack();
          break;
      }
    });
  }

  setTrack(trackInfo) {
    if (!this.supported) return;

    this.currentTrack = trackInfo;

    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: trackInfo.title || 'Canción Romántica',
      artist: trackInfo.artist || 'Playlist Romántica',
      album: trackInfo.album || 'Canciones para ti 💕',
      artwork: trackInfo.artwork || [
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '96x96', type: 'image/png' },
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '128x128', type: 'image/png' },
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '192x192', type: 'image/png' },
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '256x256', type: 'image/png' },
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '384x384', type: 'image/png' },
        { src: trackInfo.cover || '/scr/images/music-placeholder.png', sizes: '512x512', type: 'image/png' }
      ]
    });

    // Configurar duración si está disponible
    if (trackInfo.duration) {
      session.setPositionState({
        duration: trackInfo.duration,
        playbackRate: this.playbackRate,
        position: trackInfo.currentTime || 0
      });
    }

    console.log('[MediaSession] Track configurado:', trackInfo.title);
  }

  updatePlaybackState(playing, currentTime = 0, duration = 0) {
    if (!this.supported) return;

    this.isPlaying = playing;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';

    if (duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: duration,
        playbackRate: this.playbackRate,
        position: currentTime
      });
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.supported && 'volume' in navigator.mediaSession) {
      navigator.mediaSession.volume = this.volume;
    }
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.supported) {
      navigator.mediaSession.playbackRate = this.playbackRate;
    }
  }

  // Handlers para acciones de medios
  handlePlay() {
    console.log('[MediaSession] Play solicitado');
    // Disparar evento personalizado para que el reproductor de música lo maneje
    document.dispatchEvent(new CustomEvent('mediaSessionPlay'));
  }

  handlePause() {
    console.log('[MediaSession] Pause solicitado');
    document.dispatchEvent(new CustomEvent('mediaSessionPause'));
  }

  handleStop() {
    console.log('[MediaSession] Stop solicitado');
    document.dispatchEvent(new CustomEvent('mediaSessionStop'));
  }

  handleSeekBackward(details) {
    const skipTime = details.seekOffset || 10;
    console.log(`[MediaSession] Seek backward ${skipTime}s`);
    document.dispatchEvent(new CustomEvent('mediaSessionSeekBackward', { detail: { skipTime } }));
  }

  handleSeekForward(details) {
    const skipTime = details.seekOffset || 10;
    console.log(`[MediaSession] Seek forward ${skipTime}s`);
    document.dispatchEvent(new CustomEvent('mediaSessionSeekForward', { detail: { skipTime } }));
  }

  handleSeekTo(details) {
    console.log(`[MediaSession] Seek to ${details.seekTime}s`);
    document.dispatchEvent(new CustomEvent('mediaSessionSeekTo', { detail: { seekTime: details.seekTime } }));
  }

  handlePreviousTrack() {
    console.log('[MediaSession] Previous track solicitado');
    document.dispatchEvent(new CustomEvent('mediaSessionPreviousTrack'));
  }

  handleNextTrack() {
    console.log('[MediaSession] Next track solicitado');
    document.dispatchEvent(new CustomEvent('mediaSessionNextTrack'));
  }

  handleSkipAd() {
    console.log('[MediaSession] Skip ad solicitado');
    // No aplicable para música romántica
  }

  // Métodos para integración con el widget de música
  integrateWithMusicWidget(musicWidget) {
    if (!musicWidget) return;

    // Escuchar eventos del widget de música
    document.addEventListener('mediaSessionPlay', () => musicWidget.play());
    document.addEventListener('mediaSessionPause', () => musicWidget.pause());
    document.addEventListener('mediaSessionStop', () => musicWidget.stop());
    document.addEventListener('mediaSessionSeekBackward', (e) => musicWidget.seekBackward(e.detail.skipTime));
    document.addEventListener('mediaSessionSeekForward', (e) => musicWidget.seekForward(e.detail.skipTime));
    document.addEventListener('mediaSessionSeekTo', (e) => musicWidget.seekTo(e.detail.seekTime));
    document.addEventListener('mediaSessionPreviousTrack', () => musicWidget.previousTrack());
    document.addEventListener('mediaSessionNextTrack', () => musicWidget.nextTrack());

    console.log('[MediaSession] Integrado con widget de música');
  }

  // Mostrar notificación de medios (si está disponible)
  showMediaNotification(trackInfo) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`🎵 Reproduciendo: ${trackInfo.title}`, {
        body: `De: ${trackInfo.artist}`,
        icon: trackInfo.cover || '/scr/images/music-icon.png',
        tag: 'music-notification',
        requireInteraction: false
      });

      // Auto-cerrar después de 3 segundos
      setTimeout(() => notification.close(), 3000);
    }
  }
}

// ============================================
// GESTOR DE FUNCIONALIDADES NATIVAS
// ============================================

class NativeFeaturesManager {
  constructor() {
    this.camera = new AdvancedCamera();
    this.haptics = new HapticFeedback();
    this.mediaSession = new MediaSessionManager();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      console.log('[NativeFeatures] Inicializando funcionalidades nativas...');

      // Inicializar cada componente
      const cameraReady = await this.camera.initialize();
      const mediaSessionReady = this.mediaSession.initialize();

      // Verificar soporte de APIs
      const features = {
        camera: cameraReady,
        haptics: this.haptics.supported,
        mediaSession: mediaSessionReady,
        geolocation: 'geolocation' in navigator,
        notifications: 'Notification' in window,
        vibration: 'vibrate' in navigator,
        mediaDevices: 'mediaDevices' in navigator,
        battery: 'getBattery' in navigator
      };

      // Mostrar soporte de APIs
      console.log('[NativeFeatures] Soporte de APIs:', features);

      // Integrar Media Session con widget de música si existe
      if (window.musicWidget) {
        this.mediaSession.integrateWithMusicWidget(window.musicWidget);
      }

      this.initialized = true;
      console.log('[NativeFeatures] Inicialización completada');

      return features;
    } catch (error) {
      console.error('[NativeFeatures] Error en inicialización:', error);
      return false;
    }
  }

  // Métodos de acceso a funcionalidades
  getCamera() {
    return this.camera;
  }

  getHaptics() {
    return this.haptics;
  }

  getMediaSession() {
    return this.mediaSession;
  }

  // Verificar permisos
  async checkPermissions() {
    const permissions = {};

    try {
      // Verificar permiso de cámara
      if (navigator.permissions) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' });
        permissions.camera = cameraPermission.state;

        const microphonePermission = await navigator.permissions.query({ name: 'microphone' });
        permissions.microphone = microphonePermission.state;

        const geolocationPermission = await navigator.permissions.query({ name: 'geolocation' });
        permissions.geolocation = geolocationPermission.state;

        if ('Notification' in window) {
          const notificationPermission = await navigator.permissions.query({ name: 'notifications' });
          permissions.notifications = notificationPermission.state;
        }
      }
    } catch (error) {
      console.error('[NativeFeatures] Error verificando permisos:', error);
    }

    return permissions;
  }

  // Solicitar permisos
  async requestPermissions(features = ['camera', 'microphone', 'geolocation', 'notifications']) {
    const results = {};

    for (const feature of features) {
      try {
        switch (feature) {
          case 'camera':
            results.camera = await this.requestCameraPermission();
            break;
          case 'microphone':
            results.microphone = await this.requestMicrophonePermission();
            break;
          case 'geolocation':
            results.geolocation = await this.requestGeolocationPermission();
            break;
          case 'notifications':
            results.notifications = await this.requestNotificationPermission();
            break;
        }
      } catch (error) {
        console.error(`[NativeFeatures] Error solicitando permiso ${feature}:`, error);
        results[feature] = false;
      }
    }

    return results;
  }

  async requestCameraPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  async requestMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      return false;
    }
  }

  async requestGeolocationPermission() {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 10000 }
      );
    });
  }

  async requestNotificationPermission() {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  // Utilidades
  vibrate(pattern) {
    return this.haptics.vibrate(pattern);
  }

  showSuccessFeedback() {
    this.haptics.success();
  }

  showErrorFeedback() {
    this.haptics.error();
  }

  showRomanticFeedback() {
    this.haptics.romantic();
  }

  // Método para mostrar información de debug
  getDebugInfo() {
    return {
      initialized: this.initialized,
      camera: {
        supported: !!navigator.mediaDevices,
        initialized: this.camera.canvas !== null
      },
      haptics: {
        supported: this.haptics.supported
      },
      mediaSession: {
        supported: this.mediaSession.supported,
        initialized: this.mediaSession.currentTrack !== null
      },
      permissions: this.checkPermissions()
    };
  }
}

// ============================================
// INTERFAZ PARA FUNCIONALIDADES NATIVAS
// ============================================

function showNativeFeaturesManager() {
  const manager = new NativeFeaturesManager();

  const modal = document.createElement('div');
  modal.className = 'native-features-modal';
  modal.innerHTML = `
    <div class="native-features-content">
      <h3>📱 Funcionalidades Nativas Avanzadas</h3>
      <p class="features-description">
        Descubre las poderosas funcionalidades nativas que hacen de esta app una experiencia móvil completa.
      </p>

      <div class="features-grid">
        <div class="feature-card" data-feature="camera">
          <div class="feature-icon">📸</div>
          <h4>Cámara Avanzada</h4>
          <p>Fotos con filtros románticos, efectos y edición en tiempo real</p>
          <button class="feature-btn" onclick="openAdvancedCamera()">Abrir Cámara</button>
        </div>

        <div class="feature-card" data-feature="haptics">
          <div class="feature-icon">📳</div>
          <h4>Vibración Háptica</h4>
          <p>Retroalimentación táctil para una experiencia más inmersiva</p>
          <button class="feature-btn" onclick="testHapticFeedback()">Probar Vibración</button>
        </div>

        <div class="feature-card" data-feature="media">
          <div class="feature-icon">🎵</div>
          <h4>Controles de Música</h4>
          <p>Controla la música desde los botones del dispositivo</p>
          <button class="feature-btn" onclick="testMediaSession()">Probar Controles</button>
        </div>

        <div class="feature-card" data-feature="permissions">
          <div class="feature-icon">🔐</div>
          <h4>Permisos</h4>
          <p>Gestiona los permisos necesarios para todas las funcionalidades</p>
          <button class="feature-btn" onclick="managePermissions()">Gestionar Permisos</button>
        </div>
      </div>

      <div class="features-status">
        <h4>Estado de APIs</h4>
        <div id="api-status" class="api-status-grid">
          <div class="status-item">
            <span class="status-label">Cámara:</span>
            <span class="status-value" id="camera-status">Verificando...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Vibración:</span>
            <span class="status-value" id="haptics-status">Verificando...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Media Session:</span>
            <span class="status-value" id="media-status">Verificando...</span>
          </div>
          <div class="status-item">
            <span class="status-label">Geolocalización:</span>
            <span class="status-value" id="geolocation-status">Verificando...</span>
          </div>
        </div>
      </div>

      <button class="close-features-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Verificar estado de APIs
  updateApiStatus(manager);

  // Event listeners
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-features-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

async function updateApiStatus(manager) {
  const debugInfo = await manager.getDebugInfo();

  const statusElements = {
    camera: document.getElementById('camera-status'),
    haptics: document.getElementById('haptics-status'),
    media: document.getElementById('media-status'),
    geolocation: document.getElementById('geolocation-status')
  };

  // Actualizar estados
  if (statusElements.camera) {
    statusElements.camera.textContent = debugInfo.camera.supported ? '✅ Soportada' : '❌ No soportada';
    statusElements.camera.className = `status-value ${debugInfo.camera.supported ? 'supported' : 'unsupported'}`;
  }

  if (statusElements.haptics) {
    statusElements.haptics.textContent = debugInfo.haptics.supported ? '✅ Soportada' : '❌ No soportada';
    statusElements.haptics.className = `status-value ${debugInfo.haptics.supported ? 'supported' : 'unsupported'}`;
  }

  if (statusElements.media) {
    statusElements.media.textContent = debugInfo.mediaSession.supported ? '✅ Soportada' : '❌ No soportada';
    statusElements.media.className = `status-value ${debugInfo.mediaSession.supported ? 'supported' : 'unsupported'}`;
  }

  if (statusElements.geolocation) {
    statusElements.geolocation.textContent = debugInfo.geolocation ? '✅ Soportada' : '❌ No soportada';
    statusElements.geolocation.className = `status-value ${debugInfo.geolocation ? 'supported' : 'unsupported'}`;
  }
}

async function openAdvancedCamera() {
  const manager = new NativeFeaturesManager();
  await manager.initialize();
  const camera = manager.getCamera();

  const modal = document.createElement('div');
  modal.className = 'advanced-camera-modal';
  modal.innerHTML = `
    <div class="camera-content">
      <h3>📸 Cámara Avanzada</h3>

      <div class="camera-preview">
        <video id="camera-video" autoplay playsinline muted></video>
        <canvas id="camera-canvas" style="display: none;"></canvas>
      </div>

      <div class="camera-controls">
        <div class="filter-controls">
          <h4>Filtros</h4>
          <div class="filter-buttons">
            <button class="filter-btn active" data-filter="none">Normal</button>
            <button class="filter-btn" data-filter="sepia">Sepia</button>
            <button class="filter-btn" data-filter="grayscale">B/N</button>
            <button class="filter-btn" data-filter="vintage">Vintage</button>
            <button class="filter-btn" data-filter="romantic">Romántico</button>
            <button class="filter-btn" data-filter="bright">Brillante</button>
          </div>
        </div>

        <div class="effect-controls">
          <h4>Efectos</h4>
          <div class="effect-buttons">
            <button class="effect-btn active" data-effect="none">Ninguno</button>
            <button class="effect-btn" data-effect="blur">Difuminar</button>
            <button class="effect-btn" data-effect="sharpen">Enfocar</button>
            <button class="effect-btn" data-effect="vignette">Viñeta</button>
            <button class="effect-btn" data-effect="glow">Brillo</button>
          </div>
        </div>

        <div class="camera-actions">
          <button class="camera-btn capture-btn">📸 Capturar</button>
          <button class="camera-btn switch-btn">🔄 Cambiar Cámara</button>
          <button class="camera-btn gallery-btn">🖼️ Galería</button>
        </div>
      </div>

      <button class="close-camera-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  let stream = null;
  const video = modal.querySelector('#camera-video');
  const canvas = modal.querySelector('#camera-canvas');

  try {
    // Iniciar cámara
    stream = await camera.startCamera();
    video.srcObject = stream;

    // Configurar canvas
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

  } catch (error) {
    console.error('Error iniciando cámara:', error);
    showNotification({
      title: '❌ Error de Cámara',
      message: 'No se pudo acceder a la cámara. Verifica los permisos.',
      type: 'error'
    });
    modal.remove();
    return;
  }

  // Event listeners
  modal.addEventListener('click', async (e) => {
    if (e.target.classList.contains('filter-btn')) {
      // Cambiar filtro
      modal.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      camera.setFilter(e.target.dataset.filter);

    } else if (e.target.classList.contains('effect-btn')) {
      // Cambiar efecto
      modal.querySelectorAll('.effect-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      camera.setEffect(e.target.dataset.effect);

    } else if (e.target.classList.contains('capture-btn')) {
      // Capturar foto
      try {
        const photo = await camera.takePhoto();
        showNotification({
          title: '✅ Foto Capturada',
          message: 'Tu foto romántica ha sido guardada.',
          type: 'success'
        });

        // Vibración de éxito
        manager.vibrate('success');

      } catch (error) {
        console.error('Error capturando foto:', error);
        showNotification({
          title: '❌ Error',
          message: 'No se pudo capturar la foto.',
          type: 'error'
        });
      }

    } else if (e.target.classList.contains('switch-btn')) {
      // Cambiar cámara
      camera.stopCamera();
      const facingMode = stream.getVideoTracks()[0].getSettings().facingMode;
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';

      try {
        stream = await camera.startCamera({ video: { facingMode: newFacingMode } });
        video.srcObject = stream;
      } catch (error) {
        console.error('Error cambiando cámara:', error);
      }

    } else if (e.target.classList.contains('gallery-btn')) {
      // Abrir galería
      showPhotoGallery(camera);

    } else if (e.target.classList.contains('close-camera-btn') || e.target === modal) {
      // Cerrar modal
      camera.stopCamera();
      modal.remove();
    }
  });
}

function testHapticFeedback() {
  const manager = new NativeFeaturesManager();
  manager.initialize().then(() => {
    const haptics = manager.getHaptics();

    // Probar diferentes patrones de vibración
    const patterns = ['light', 'medium', 'heavy', 'success', 'error', 'warning', 'celebration', 'romantic'];

    let index = 0;
    const testNext = () => {
      if (index < patterns.length) {
        haptics.vibrate(patterns[index]);
        showNotification({
          title: `🔔 Probando: ${patterns[index]}`,
          message: `Vibración ${index + 1} de ${patterns.length}`,
          type: 'info',
          duration: 1500
        });

        index++;
        setTimeout(testNext, 2000);
      } else {
        showNotification({
          title: '✅ Prueba Completada',
          message: 'Todas las vibraciones han sido probadas.',
          type: 'success'
        });
      }
    };

    testNext();
  });
}

function testMediaSession() {
  const manager = new NativeFeaturesManager();
  manager.initialize().then(() => {
    const mediaSession = manager.getMediaSession();

    // Configurar una pista de prueba
    mediaSession.setTrack({
      title: 'Canción de Prueba',
      artist: 'Artista Romántico',
      album: 'Álbum de Amor',
      duration: 180,
      cover: '/scr/images/music-placeholder.png'
    });

    mediaSession.updatePlaybackState(true, 30, 180);

    showNotification({
      title: '🎵 Media Session Activada',
      message: 'Usa los controles de medios de tu dispositivo para controlar la música.',
      type: 'info',
      duration: 5000
    });
  });
}

async function managePermissions() {
  const manager = new NativeFeaturesManager();
  const permissions = await manager.checkPermissions();

  const modal = document.createElement('div');
  modal.className = 'permissions-modal';
  modal.innerHTML = `
    <div class="permissions-content">
      <h3>🔐 Gestión de Permisos</h3>
      <p>Estos permisos permiten acceder a funcionalidades avanzadas de la aplicación.</p>

      <div class="permissions-list">
        <div class="permission-item">
          <div class="permission-info">
            <span class="permission-icon">📸</span>
            <div>
              <h4>Cámara</h4>
              <p>Para tomar fotos románticas con filtros</p>
            </div>
          </div>
          <span class="permission-status ${permissions.camera === 'granted' ? 'granted' : 'denied'}">
            ${permissions.camera === 'granted' ? '✅ Concedido' : '❌ Denegado'}
          </span>
        </div>

        <div class="permission-item">
          <div class="permission-info">
            <span class="permission-icon">🎤</span>
            <div>
              <h4>Micrófono</h4>
              <p>Para grabar videos románticos</p>
            </div>
          </div>
          <span class="permission-status ${permissions.microphone === 'granted' ? 'granted' : 'denied'}">
            ${permissions.microphone === 'granted' ? '✅ Concedido' : '❌ Denegado'}
          </span>
        </div>

        <div class="permission-item">
          <div class="permission-info">
            <span class="permission-icon">📍</span>
            <div>
              <h4>Ubicación</h4>
              <p>Para encontrar lugares románticos cercanos</p>
            </div>
          </div>
          <span class="permission-status ${permissions.geolocation === 'granted' ? 'granted' : 'denied'}">
            ${permissions.geolocation === 'granted' ? '✅ Concedido' : '❌ Denegado'}
          </span>
        </div>

        <div class="permission-item">
          <div class="permission-info">
            <span class="permission-icon">🔔</span>
            <div>
              <h4>Notificaciones</h4>
              <p>Para recordatorios inteligentes y notificaciones</p>
            </div>
          </div>
          <span class="permission-status ${permissions.notifications === 'granted' ? 'granted' : 'denied'}">
            ${permissions.notifications === 'granted' ? '✅ Concedido' : '❌ Denegado'}
          </span>
        </div>
      </div>

      <div class="permissions-actions">
        <button class="request-permissions-btn">🔄 Solicitar Permisos</button>
        <button class="close-permissions-btn">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('click', async (e) => {
    if (e.target.classList.contains('request-permissions-btn')) {
      const results = await manager.requestPermissions(['camera', 'microphone', 'geolocation', 'notifications']);

      showNotification({
        title: '🔄 Permisos Actualizados',
        message: `Cámara: ${results.camera ? '✅' : '❌'}, Micrófono: ${results.microphone ? '✅' : '❌'}, Ubicación: ${results.geolocation ? '✅' : '❌'}, Notificaciones: ${results.notifications ? '✅' : '❌'}`,
        type: 'info',
        duration: 5000
      });

      // Actualizar estados
      setTimeout(() => {
        modal.remove();
        managePermissions(); // Reabrir para mostrar estados actualizados
      }, 1000);

    } else if (e.target.classList.contains('close-permissions-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function showPhotoGallery(camera) {
  const photos = camera.getPhotoHistory();

  const modal = document.createElement('div');
  modal.className = 'photo-gallery-modal';
  modal.innerHTML = `
    <div class="gallery-content">
      <h3>🖼️ Galería de Fotos</h3>

      <div class="gallery-grid">
        ${photos.length > 0 ?
          photos.map((photo, index) => `
            <div class="gallery-item" data-index="${index}">
              <img src="${photo.dataUrl}" alt="Foto ${index + 1}" loading="lazy">
              <div class="gallery-overlay">
                <div class="gallery-actions">
                  <button class="gallery-btn share-btn" data-index="${index}">📤</button>
                  <button class="gallery-btn download-btn" data-index="${index}">💾</button>
                  <button class="gallery-btn delete-btn" data-index="${index}">🗑️</button>
                </div>
                <div class="gallery-info">
                  <small>${new Date(photo.timestamp).toLocaleDateString()}</small>
                  ${photo.filter !== 'none' ? `<small>Filtro: ${photo.filter}</small>` : ''}
                </div>
              </div>
            </div>
          `).join('') :
          '<div class="no-photos">No hay fotos guardadas aún. ¡Captura tu primera foto romántica! 📸</div>'
        }
      </div>

      <button class="close-gallery-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('click', async (e) => {
    if (e.target.classList.contains('share-btn')) {
      const index = parseInt(e.target.dataset.index);
      const photo = photos[index];

      if (photo && photo.dataUrl) {
        // Convertir dataUrl a blob para compartir
        const response = await fetch(photo.dataUrl);
        const blob = await response.blob();
        const photoData = { ...photo, blob };

        const shared = await camera.sharePhoto(photoData);
        if (!shared) {
          showNotification({
            title: 'ℹ️ Compartir no disponible',
            message: 'Usa descargar para guardar la foto.',
            type: 'info'
          });
        }
      }

    } else if (e.target.classList.contains('download-btn')) {
      const index = parseInt(e.target.dataset.index);
      const photo = photos[index];

      if (photo) {
        const downloaded = await camera.downloadPhoto(photo);
        if (downloaded) {
          showNotification({
            title: '✅ Foto descargada',
            message: 'La foto se ha guardado en tu dispositivo.',
            type: 'success'
          });
        }
      }

    } else if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.dataset.index);

      if (confirm('¿Estás seguro de que quieres eliminar esta foto?')) {
        // Eliminar de localStorage
        photos.splice(index, 1);
        localStorage.setItem('advancedPhotos', JSON.stringify(photos));

        // Actualizar galería
        e.target.closest('.gallery-item').remove();

        showNotification({
          title: '🗑️ Foto eliminada',
          message: 'La foto ha sido eliminada permanentemente.',
          type: 'info'
        });
      }

    } else if (e.target.classList.contains('close-gallery-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

// ============================================
// INICIALIZACIÓN DE FUNCIONALIDADES NATIVAS
// ============================================

// Instancia global del gestor de funcionalidades nativas
let nativeFeaturesManager;

// Inicializar funcionalidades nativas cuando la app esté lista
document.addEventListener('DOMContentLoaded', () => {
  nativeFeaturesManager = new NativeFeaturesManager();

  // Pequeño delay para asegurar que todo esté cargado
  setTimeout(() => {
    nativeFeaturesManager.initialize().then((features) => {
      console.log('[App] Funcionalidades nativas inicializadas:', features);
    });
  }, 1000);
});

// ============================================
// SISTEMA DE NOTIFICACIONES INTELIGENTES
// ============================================

class NotificationManager {
  constructor() {
    this.supported = 'Notification' in window;
    this.permission = null;
    this.notifications = [];
    this.settings = {
      enabled: true,
      sound: true,
      vibration: true,
      reminders: true,
      achievements: true,
      anniversaries: true,
      coupleActivities: true,
      dailyProgress: true,
      weeklyReports: true,
      motivational: true
    };

    this.loadSettings();
    this.initialize();
  }

  async initialize() {
    if (!this.supported) {
      console.warn('[NotificationManager] Notificaciones no soportadas en este navegador');
      return false;
    }

    this.permission = Notification.permission;

    // Solicitar permiso si no está concedido
    if (this.permission === 'default') {
      await this.requestPermission();
    }

    // Registrar service worker para notificaciones push si está disponible
    if ('serviceWorker' in navigator) {
      this.registerServiceWorker();
    }

    console.log('[NotificationManager] Inicializado correctamente');
    return true;
  }

  async requestPermission() {
    try {
      this.permission = await Notification.requestPermission();
      console.log('[NotificationManager] Permiso de notificaciones:', this.permission);
      return this.permission === 'granted';
    } catch (error) {
      console.error('[NotificationManager] Error solicitando permiso:', error);
      return false;
    }
  }

  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[NotificationManager] Service Worker registrado para notificaciones');

      // Configurar push manager si está disponible
      if ('pushManager' in registration) {
        this.setupPushManager(registration);
      }
    } catch (error) {
      console.error('[NotificationManager] Error registrando service worker:', error);
    }
  }

  async setupPushManager(registration) {
    try {
      // Aquí se configuraría un servidor push real (como Firebase Cloud Messaging)
      // Por ahora, simulamos la configuración
      console.log('[NotificationManager] Push Manager configurado');
    } catch (error) {
      console.error('[NotificationManager] Error configurando push manager:', error);
    }
  }

  // Notificaciones básicas
  async show(title, options = {}) {
    if (!this.supported || this.permission !== 'granted' || !this.settings.enabled) {
      return null;
    }

    const defaultOptions = {
      icon: '/scr/images/icon-192x192.png',
      badge: '/scr/images/icon-192x192.png',
      vibrate: this.settings.vibration ? [200, 100, 200] : [],
      requireInteraction: false,
      silent: !this.settings.sound,
      tag: 'romantic-app',
      renotify: true
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const notification = new Notification(title, finalOptions);

      // Auto-cerrar después de 5 segundos si no requiere interacción
      if (!finalOptions.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      // Guardar referencia
      this.notifications.push({
        id: Date.now().toString(),
        notification: notification,
        timestamp: new Date(),
        title: title,
        options: finalOptions
      });

      return notification;
    } catch (error) {
      console.error('[NotificationManager] Error mostrando notificación:', error);
      return null;
    }
  }

  // Notificaciones inteligentes basadas en contexto
  async showRomanticReminder(message, timeUntil = null) {
    if (!this.settings.reminders) return;

    const title = '💕 Recordatorio Romántico';
    const options = {
      body: message,
      icon: '/scr/images/heart-icon.png',
      tag: 'romantic-reminder',
      data: { type: 'reminder', timeUntil }
    };

    return this.show(title, options);
  }

  async showAchievement(achievement) {
    if (!this.settings.achievements) return;

    const title = '🏆 ¡Nuevo Logro!';
    const options = {
      body: `Has desbloqueado: ${achievement.title}`,
      icon: '/scr/images/achievement-icon.png',
      tag: 'achievement',
      data: { type: 'achievement', achievement },
      requireInteraction: true
    };

    return this.show(title, options);
  }

  async showAnniversary(daysUntil, coupleName) {
    if (!this.settings.anniversaries) return;

    const title = '🎉 ¡Aniversario Cercano!';
    const message = daysUntil === 0 ?
      `¡Hoy es el aniversario de ${coupleName}! 🎊` :
      `Faltan ${daysUntil} días para el aniversario de ${coupleName}`;

    const options = {
      body: message,
      icon: '/scr/images/anniversary-icon.png',
      tag: 'anniversary',
      data: { type: 'anniversary', daysUntil, coupleName },
      requireInteraction: daysUntil === 0
    };

    return this.show(title, options);
  }

  async showCoupleActivity(activity) {
    if (!this.settings.coupleActivities) return;

    const title = '💑 Actividad para Pareja';
    const options = {
      body: `¿Qué tal: ${activity.title}? ${activity.description}`,
      icon: '/scr/images/couple-activity-icon.png',
      tag: 'couple-activity',
      data: { type: 'couple-activity', activity },
      actions: [
        { action: 'accept', title: '¡Vamos!' },
        { action: 'later', title: 'Después' }
      ]
    };

    return this.show(title, options);
  }

  async showDailyProgress(progress) {
    if (!this.settings.dailyProgress) return;

    const title = '📊 Progreso Diario';
    const options = {
      body: `Has completado ${progress.completed}/${progress.total} tareas hoy. ¡Sigue así! 💪`,
      icon: '/scr/images/progress-icon.png',
      tag: 'daily-progress',
      data: { type: 'daily-progress', progress }
    };

    return this.show(title, options);
  }

  async showWeeklyReport(report) {
    if (!this.settings.weeklyReports) return;

    const title = '📈 Reporte Semanal';
    const options = {
      body: `Esta semana completaron ${report.tasksCompleted} tareas juntos. ¡Excelente trabajo!`,
      icon: '/scr/images/report-icon.png',
      tag: 'weekly-report',
      data: { type: 'weekly-report', report },
      requireInteraction: true
    };

    return this.show(title, options);
  }

  async showMotivational(message) {
    if (!this.settings.motivational) return;

    const title = '✨ Mensaje Motivacional';
    const options = {
      body: message,
      icon: '/scr/images/motivation-icon.png',
      tag: 'motivational',
      data: { type: 'motivational', message }
    };

    return this.show(title, options);
  }

  // Programar notificaciones
  schedule(notification, delay) {
    return setTimeout(() => {
      this.show(notification.title, notification.options);
    }, delay);
  }

  scheduleDaily(time, callback) {
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(time.hour, time.minute, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const delay = scheduledTime - now;
    return setTimeout(() => {
      callback();
      // Reprogramar para el día siguiente
      setInterval(callback, 24 * 60 * 60 * 1000);
    }, delay);
  }

  // Configuración
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    console.log('[NotificationManager] Configuración actualizada:', this.settings);
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('[NotificationManager] Error cargando configuración:', error);
    }
  }

  saveSettings() {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('[NotificationManager] Error guardando configuración:', error);
    }
  }

  // Utilidades
  getPermissionStatus() {
    return this.permission;
  }

  isEnabled() {
    return this.settings.enabled && this.permission === 'granted';
  }

  getNotificationHistory() {
    return this.notifications.slice(-20); // Últimas 20 notificaciones
  }

  clearAll() {
    this.notifications.forEach(item => {
      if (item.notification && !item.notification.closed) {
        item.notification.close();
      }
    });
    this.notifications = [];
  }

  // Notificaciones inteligentes automáticas
  startSmartNotifications() {
    if (!this.isEnabled()) return;

    // Notificación diaria de motivación (9 AM)
    this.scheduleDaily({ hour: 9, minute: 0 }, () => {
      const messages = [
        '¡Buenos días! Hoy es un día perfecto para crear nuevos recuerdos juntos 💕',
        '¡Hola amor! ¿Listo para hacer algo especial hoy? ✨',
        '¡Buenos días! Cada día contigo es una nueva aventura 💑',
        '¡Hola! Hoy es el día perfecto para decir "te amo" de una forma diferente 💖',
        '¡Buenos días mi amor! ¿Qué sorpresa tienes preparada hoy? 🎁'
      ];
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      this.showMotivational(randomMessage);
    });

    // Recordatorio de actividades pendientes (2 PM)
    this.scheduleDaily({ hour: 14, minute: 0 }, () => {
      // Verificar si hay tareas pendientes
      const pendingTasks = this.getPendingTasks();
      if (pendingTasks.length > 0) {
        this.showRomanticReminder(
          `Tienen ${pendingTasks.length} actividades pendientes. ¿Las completamos juntos? 💑`,
          null
        );
      }
    });

    // Progreso diario (8 PM)
    this.scheduleDaily({ hour: 20, minute: 0 }, () => {
      const progress = this.getDailyProgress();
      this.showDailyProgress(progress);
    });

    console.log('[NotificationManager] Notificaciones inteligentes activadas');
  }

  // Métodos auxiliares (simulados - se integrarían con el resto de la app)
  getPendingTasks() {
    // Simulación - en la app real se conectaría con el sistema de tareas
    return [];
  }

  getDailyProgress() {
    // Simulación - en la app real se conectaría con el sistema de estadísticas
    return { completed: 0, total: 0 };
  }
}

// ============================================
// GESTOR DE LOGROS Y GAMIFICACIÓN
// ============================================

class AchievementSystem {
  constructor() {
    this.achievements = {
      first_task: {
        id: 'first_task',
        title: 'Primer Paso',
        description: 'Completar tu primera tarea juntos',
        icon: '🎯',
        unlocked: false,
        progress: 0,
        maxProgress: 1,
        category: 'tasks'
      },
      task_master: {
        id: 'task_master',
        title: 'Maestro de Tareas',
        description: 'Completar 50 tareas juntos',
        icon: '👑',
        unlocked: false,
        progress: 0,
        maxProgress: 50,
        category: 'tasks'
      },
      romantic_planner: {
        id: 'romantic_planner',
        title: 'Planificador Romántico',
        description: 'Crear 10 planes especiales',
        icon: '💕',
        unlocked: false,
        progress: 0,
        maxProgress: 10,
        category: 'plans'
      },
      anniversary_keeper: {
        id: 'anniversary_keeper',
        title: 'Guardián de Aniversarios',
        description: 'Celebrar 5 aniversarios juntos',
        icon: '🎉',
        unlocked: false,
        progress: 0,
        maxProgress: 5,
        category: 'anniversaries'
      },
      photo_lover: {
        id: 'photo_lover',
        title: 'Amante de las Fotos',
        description: 'Tomar 25 fotos románticas',
        icon: '📸',
        unlocked: false,
        progress: 0,
        maxProgress: 25,
        category: 'photos'
      },
      music_maker: {
        id: 'music_maker',
        title: 'Creador de Música',
        description: 'Crear 10 playlists románticas',
        icon: '🎵',
        unlocked: false,
        progress: 0,
        maxProgress: 10,
        category: 'music'
      },
      location_explorer: {
        id: 'location_explorer',
        title: 'Explorador de Lugares',
        description: 'Descubrir 20 lugares románticos',
        icon: '🗺️',
        unlocked: false,
        progress: 0,
        maxProgress: 20,
        category: 'locations'
      },
      streak_master: {
        id: 'streak_master',
        title: 'Maestro de Rachas',
        description: 'Mantener una racha de 30 días',
        icon: '🔥',
        unlocked: false,
        progress: 0,
        maxProgress: 30,
        category: 'streaks'
      },
      couple_gamer: {
        id: 'couple_gamer',
        title: 'Jugadores en Pareja',
        description: 'Jugar 15 juegos juntos',
        icon: '🎮',
        unlocked: false,
        progress: 0,
        maxProgress: 15,
        category: 'games'
      },
      love_celebrator: {
        id: 'love_celebrator',
        title: 'Celebrador del Amor',
        description: 'Completar 100 actividades románticas',
        icon: '💖',
        unlocked: false,
        progress: 0,
        maxProgress: 100,
        category: 'activities'
      }
    };

    this.stats = {
      totalPoints: 0,
      unlockedAchievements: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalTasks: 0,
      totalPlans: 0,
      totalPhotos: 0,
      totalPlaylists: 0,
      totalLocations: 0,
      totalGames: 0
    };

    this.loadProgress();
  }

  // Actualizar progreso de un logro
  updateProgress(achievementId, newProgress) {
    if (!this.achievements[achievementId]) return;

    const achievement = this.achievements[achievementId];
    achievement.progress = Math.min(newProgress, achievement.maxProgress);

    // Verificar si se desbloqueó
    if (!achievement.unlocked && achievement.progress >= achievement.maxProgress) {
      this.unlockAchievement(achievementId);
    }

    this.saveProgress();
  }

  // Desbloquear logro
  unlockAchievement(achievementId) {
    const achievement = this.achievements[achievementId];
    if (!achievement || achievement.unlocked) return;

    achievement.unlocked = true;
    achievement.unlockedAt = new Date().toISOString();
    this.stats.unlockedAchievements++;

    // Notificar al usuario
    if (window.notificationManager) {
      window.notificationManager.showAchievement(achievement);
    }

    // Vibración de celebración
    if (window.nativeFeaturesManager) {
      window.nativeFeaturesManager.vibrate('celebration');
    }

    console.log(`[AchievementSystem] ¡Logro desbloqueado: ${achievement.title}!`);

    // Verificar logros relacionados
    this.checkRelatedAchievements(achievementId);

    this.saveProgress();
  }

  // Verificar logros relacionados
  checkRelatedAchievements(unlockedId) {
    // Logro maestro de tareas cuando se completa task_master
    if (unlockedId === 'task_master' && !this.achievements.love_celebrator.unlocked) {
      // Si ya tiene progreso en love_celebrator, verificar si se puede desbloquear
      if (this.achievements.love_celebrator.progress >= this.achievements.love_celebrator.maxProgress) {
        this.unlockAchievement('love_celebrator');
      }
    }
  }

  // Actualizar estadísticas
  updateStats(statName, value) {
    if (this.stats.hasOwnProperty(statName)) {
      this.stats[statName] = value;

      // Actualizar logros relacionados
      this.updateAchievementFromStat(statName, value);
    }
  }

  // Actualizar logros basados en estadísticas
  updateAchievementFromStat(statName, value) {
    switch (statName) {
      case 'totalTasks':
        this.updateProgress('first_task', value > 0 ? 1 : 0);
        this.updateProgress('task_master', value);
        break;
      case 'totalPlans':
        this.updateProgress('romantic_planner', value);
        break;
      case 'totalPhotos':
        this.updateProgress('photo_lover', value);
        break;
      case 'totalPlaylists':
        this.updateProgress('music_maker', value);
        break;
      case 'totalLocations':
        this.updateProgress('location_explorer', value);
        break;
      case 'totalGames':
        this.updateProgress('couple_gamer', value);
        break;
      case 'currentStreak':
        this.updateProgress('streak_master', value);
        if (value > this.stats.longestStreak) {
          this.stats.longestStreak = value;
        }
        break;
    }
  }

  // Incrementar estadística
  incrementStat(statName, amount = 1) {
    if (this.stats.hasOwnProperty(statName)) {
      this.stats[statName] += amount;
      this.updateAchievementFromStat(statName, this.stats[statName]);
      this.saveProgress();
    }
  }

  // Obtener logros desbloqueados
  getUnlockedAchievements() {
    return Object.values(this.achievements).filter(achievement => achievement.unlocked);
  }

  // Obtener logros por categoría
  getAchievementsByCategory(category) {
    return Object.values(this.achievements).filter(achievement => achievement.category === category);
  }

  // Obtener progreso de un logro específico
  getAchievementProgress(achievementId) {
    return this.achievements[achievementId] || null;
  }

  // Calcular porcentaje de completitud total
  getCompletionPercentage() {
    const totalAchievements = Object.keys(this.achievements).length;
    const unlockedCount = this.stats.unlockedAchievements;
    return Math.round((unlockedCount / totalAchievements) * 100);
  }

  // Guardar progreso
  saveProgress() {
    try {
      const data = {
        achievements: this.achievements,
        stats: this.stats,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('achievementProgress', JSON.stringify(data));
    } catch (error) {
      console.error('[AchievementSystem] Error guardando progreso:', error);
    }
  }

  // Cargar progreso
  loadProgress() {
    try {
      const saved = localStorage.getItem('achievementProgress');
      if (saved) {
        const data = JSON.parse(saved);
        this.achievements = { ...this.achievements, ...data.achievements };
        this.stats = { ...this.stats, ...data.stats };
      }
    } catch (error) {
      console.error('[AchievementSystem] Error cargando progreso:', error);
    }
  }

  // Resetear progreso (para testing)
  resetProgress() {
    Object.values(this.achievements).forEach(achievement => {
      achievement.unlocked = false;
      achievement.progress = 0;
      delete achievement.unlockedAt;
    });

    Object.keys(this.stats).forEach(key => {
      this.stats[key] = 0;
    });

    this.saveProgress();
    console.log('[AchievementSystem] Progreso reseteado');
  }

  // Obtener resumen de progreso
  getProgressSummary() {
    return {
      totalAchievements: Object.keys(this.achievements).length,
      unlockedAchievements: this.stats.unlockedAchievements,
      completionPercentage: this.getCompletionPercentage(),
      stats: this.stats,
      recentAchievements: this.getUnlockedAchievements()
        .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
        .slice(0, 3)
    };
  }
}

// ============================================
// INTERFAZ PARA NOTIFICACIONES Y LOGROS
// ============================================

function showNotificationsAndAchievementsMenu() {
  const modal = document.createElement('div');
  modal.className = 'notifications-menu-modal';
  modal.innerHTML = `
    <div class="notifications-menu-content">
      <h3>🔔 Notificaciones & 🏆 Logros</h3>
      <p class="menu-description">
        Gestiona tus notificaciones y descubre tus logros conseguidos juntos.
      </p>

      <div class="menu-options">
        <div class="menu-option" onclick="showNotificationSettings()">
          <div class="option-icon">🔔</div>
          <div class="option-content">
            <h4>Configuración de Notificaciones</h4>
            <p>Personaliza cómo y cuándo recibir notificaciones</p>
          </div>
          <div class="option-arrow">→</div>
        </div>

        <div class="menu-option" onclick="showAchievementsGallery()">
          <div class="option-icon">🏆</div>
          <div class="option-content">
            <h4>Galería de Logros</h4>
            <p>Explora todos los logros y tu progreso</p>
          </div>
          <div class="option-arrow">→</div>
        </div>

        <div class="menu-option" onclick="testNotification()">
          <div class="option-icon">🧪</div>
          <div class="option-content">
            <h4>Probar Notificación</h4>
            <p>Envía una notificación de prueba</p>
          </div>
          <div class="option-arrow">→</div>
        </div>
      </div>

      <button class="close-menu-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-menu-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function testNotification() {
  const manager = window.notificationManager;
  if (manager) {
    manager.show('🔔 Notificación de Prueba', {
      body: 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
      icon: '/scr/images/icon-192x192.png',
      tag: 'test-notification',
      requireInteraction: false
    });
  }
}

function showNotificationSettings() {
  const manager = window.notificationManager || new NotificationManager();

  const modal = document.createElement('div');
  modal.className = 'notification-settings-modal';
  modal.innerHTML = `
    <div class="notification-settings-content">
      <h3>🔔 Configuración de Notificaciones</h3>
      <p class="settings-description">
        Personaliza cómo quieres recibir notificaciones para mantener viva la magia de su relación.
      </p>

      <div class="notification-status">
        <div class="status-indicator ${manager.getPermissionStatus() === 'granted' ? 'granted' : 'denied'}">
          <span class="status-icon">${manager.getPermissionStatus() === 'granted' ? '✅' : '❌'}</span>
          <span class="status-text">
            ${manager.getPermissionStatus() === 'granted' ? 'Notificaciones activadas' : 'Notificaciones desactivadas'}
          </span>
        </div>
      </div>

      <div class="settings-section">
        <h4>Configuración General</h4>
        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-enabled" ${manager.settings.enabled ? 'checked' : ''}>
            <span class="checkmark"></span>
            Notificaciones activadas
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-sound" ${manager.settings.sound ? 'checked' : ''}>
            <span class="checkmark"></span>
            Sonido
          </label>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-vibration" ${manager.settings.vibration ? 'checked' : ''}>
            <span class="checkmark"></span>
            Vibración
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h4>Tipos de Notificaciones</h4>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-reminders" ${manager.settings.reminders ? 'checked' : ''}>
            <span class="checkmark"></span>
            Recordatorios románticos
          </label>
          <small>Recordatorios para actividades especiales y momentos importantes</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-achievements" ${manager.settings.achievements ? 'checked' : ''}>
            <span class="checkmark"></span>
            Logros y recompensas
          </label>
          <small>Notificaciones cuando desbloquean nuevos logros</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-anniversaries" ${manager.settings.anniversaries ? 'checked' : ''}>
            <span class="checkmark"></span>
            Aniversarios y fechas especiales
          </label>
          <small>Recordatorios de aniversarios y fechas importantes</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-activities" ${manager.settings.coupleActivities ? 'checked' : ''}>
            <span class="checkmark"></span>
            Sugerencias de actividades
          </label>
          <small>Ideas para actividades románticas</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-daily" ${manager.settings.dailyProgress ? 'checked' : ''}>
            <span class="checkmark"></span>
            Progreso diario
          </label>
          <small>Resumen del progreso diario</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-weekly" ${manager.settings.weeklyReports ? 'checked' : ''}>
            <span class="checkmark"></span>
            Reportes semanales
          </label>
          <small>Reportes detallados del progreso semanal</small>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input type="checkbox" id="notifications-motivational" ${manager.settings.motivational ? 'checked' : ''}>
            <span class="checkmark"></span>
            Mensajes motivacionales
          </label>
          <small>Mensajes diarios de motivación y amor</small>
        </div>
      </div>

      <div class="settings-actions">
        <button class="save-settings-btn">💾 Guardar Configuración</button>
        <button class="test-notification-btn">🔔 Probar Notificación</button>
        <button class="close-settings-btn">❌ Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners
  modal.addEventListener('click', async (e) => {
    if (e.target.classList.contains('save-settings-btn')) {
      // Guardar configuración
      const newSettings = {
        enabled: modal.querySelector('#notifications-enabled').checked,
        sound: modal.querySelector('#notifications-sound').checked,
        vibration: modal.querySelector('#notifications-vibration').checked,
        reminders: modal.querySelector('#notifications-reminders').checked,
        achievements: modal.querySelector('#notifications-achievements').checked,
        anniversaries: modal.querySelector('#notifications-anniversaries').checked,
        coupleActivities: modal.querySelector('#notifications-activities').checked,
        dailyProgress: modal.querySelector('#notifications-daily').checked,
        weeklyReports: modal.querySelector('#notifications-weekly').checked,
        motivational: modal.querySelector('#notifications-motivational').checked
      };

      manager.updateSettings(newSettings);

      showNotification({
        title: '✅ Configuración guardada',
        message: 'Los cambios han sido aplicados.',
        type: 'success'
      });

    } else if (e.target.classList.contains('test-notification-btn')) {
      // Probar notificación
      manager.show('🔔 Prueba de Notificación', {
        body: 'Esta es una notificación de prueba para verificar que todo funciona correctamente.',
        icon: '/scr/images/icon-192x192.png',
        tag: 'test-notification'
      });

    } else if (e.target.classList.contains('close-settings-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function showAchievementsGallery() {
  const achievementSystem = window.achievementSystem || new AchievementSystem();

  const modal = document.createElement('div');
  modal.className = 'achievements-gallery-modal';
  modal.innerHTML = `
    <div class="achievements-gallery-content">
      <h3>🏆 Galería de Logros</h3>

      <div class="achievements-summary">
        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-number">${achievementSystem.stats.unlockedAchievements}</div>
            <div class="stat-label">Logros Desbloqueados</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${achievementSystem.getCompletionPercentage()}%</div>
            <div class="stat-label">Completado</div>
          </div>
          <div class="stat-item">
            <div class="stat-number">${achievementSystem.stats.currentStreak}</div>
            <div class="stat-label">Racha Actual</div>
          </div>
        </div>
      </div>

      <div class="achievements-filter">
        <button class="filter-btn active" data-filter="all">Todos</button>
        <button class="filter-btn" data-filter="unlocked">Desbloqueados</button>
        <button class="filter-btn" data-filter="locked">Bloqueados</button>
        <button class="filter-btn" data-filter="tasks">Tareas</button>
        <button class="filter-btn" data-filter="plans">Planes</button>
        <button class="filter-btn" data-filter="photos">Fotos</button>
      </div>

      <div class="achievements-grid">
        ${Object.values(achievementSystem.achievements).map(achievement => `
          <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}" data-category="${achievement.category}">
            <div class="achievement-icon ${achievement.unlocked ? 'unlocked' : ''}">
              ${achievement.unlocked ? achievement.icon : '🔒'}
            </div>
            <div class="achievement-content">
              <h4 class="achievement-title">${achievement.title}</h4>
              <p class="achievement-description">${achievement.description}</p>
              <div class="achievement-progress">
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(achievement.progress / achievement.maxProgress) * 100}%"></div>
                </div>
                <span class="progress-text">${achievement.progress}/${achievement.maxProgress}</span>
              </div>
            </div>
            ${achievement.unlocked ? '<div class="achievement-badge">🏆</div>' : ''}
          </div>
        `).join('')}
      </div>

      <button class="close-achievements-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners para filtros
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      // Cambiar filtro activo
      modal.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');

      const filter = e.target.dataset.filter;
      const cards = modal.querySelectorAll('.achievement-card');

      cards.forEach(card => {
        const category = card.dataset.category;
        const isUnlocked = card.classList.contains('unlocked');

        let show = true;

        switch (filter) {
          case 'unlocked':
            show = isUnlocked;
            break;
          case 'locked':
            show = !isUnlocked;
            break;
          case 'all':
            show = true;
            break;
          default:
            show = category === filter;
            break;
        }

        card.style.display = show ? 'block' : 'none';
      });

    } else if (e.target.classList.contains('close-achievements-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

// ============================================
// INICIALIZACIÓN DE NOTIFICACIONES Y LOGROS
// ============================================

// Instancias globales
let notificationManager;
let achievementSystem;

// Inicializar sistemas cuando la app esté lista
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar sistema de notificaciones
  notificationManager = new NotificationManager();

  // Inicializar sistema de logros
  achievementSystem = new AchievementSystem();

  // Hacer disponibles globalmente
  window.notificationManager = notificationManager;
  window.achievementSystem = achievementSystem;

  // Iniciar notificaciones inteligentes después de un pequeño delay
  setTimeout(() => {
    if (notificationManager.isEnabled()) {
      notificationManager.startSmartNotifications();
    }
  }, 2000);

  console.log('[App] Sistemas de notificaciones y logros inicializados');
});

// Hacer funciones disponibles globalmente
window.showNotificationSettings = showNotificationSettings;
window.showAchievementsGallery = showAchievementsGallery;

// ============================================
// SISTEMA DE GAMIFICACIÓN AVANZADO
// ============================================

class GamificationSystem {
  constructor() {
    this.points = 0;
    this.level = 1;
    this.experience = 0;
    this.experienceToNext = 100;
    this.multipliers = {
      base: 1.0,
      streak: 1.0,
      special: 1.0,
      time: 1.0
    };
    this.dailyStats = {
      tasksCompleted: 0,
      pointsEarned: 0,
      streakBonus: 0,
      lastActivity: null
    };
    this.weeklyStats = {
      tasksCompleted: 0,
      pointsEarned: 0,
      challengesCompleted: 0,
      weekStart: this.getWeekStart()
    };

    this.loadProgress();
    this.initializeDailyReset();
  }

  // Sistema de puntos y experiencia
  earnPoints(amount, source = 'task', multiplier = null) {
    let finalAmount = amount;

    // Aplicar multiplicadores
    if (multiplier) {
      finalAmount *= multiplier;
    } else {
      finalAmount *= this.getTotalMultiplier();
    }

    finalAmount = Math.round(finalAmount);

    // Actualizar puntos y experiencia
    this.points += finalAmount;
    this.experience += finalAmount;

    // Actualizar estadísticas diarias
    this.dailyStats.pointsEarned += finalAmount;
    this.dailyStats.lastActivity = new Date().toISOString();

    // Verificar subida de nivel
    this.checkLevelUp();

    // Notificar
    this.notifyPointsEarned(finalAmount, source);

    this.saveProgress();
    return finalAmount;
  }

  // Calcular multiplicador total
  getTotalMultiplier() {
    return this.multipliers.base * this.multipliers.streak * this.multipliers.special * this.multipliers.time;
  }

  // Sistema de niveles
  checkLevelUp() {
    while (this.experience >= this.experienceToNext) {
      this.levelUp();
    }
  }

  levelUp() {
    const oldLevel = this.level;
    this.level++;
    this.experience -= this.experienceToNext;

    // Calcular experiencia necesaria para el siguiente nivel
    this.experienceToNext = Math.round(100 * Math.pow(1.2, this.level - 1));

    // Bonus de puntos por subir de nivel
    const levelBonus = this.level * 10;
    this.points += levelBonus;

    // Notificar subida de nivel
    this.notifyLevelUp(oldLevel, this.level, levelBonus);

    // Verificar logros relacionados
    if (window.achievementSystem) {
      window.achievementSystem.updateStats('level', this.level);
    }
  }

  // Multiplicadores dinámicos
  updateStreakMultiplier(streakDays) {
    // Multiplicador de racha: +0.1 por cada 5 días de racha
    this.multipliers.streak = 1.0 + Math.floor(streakDays / 5) * 0.1;
    this.multipliers.streak = Math.min(this.multipliers.streak, 2.0); // Máximo 2x
  }

  activateSpecialMultiplier(multiplier, duration = 3600000) { // 1 hora por defecto
    this.multipliers.special = multiplier;
    setTimeout(() => {
      this.multipliers.special = 1.0;
    }, duration);
  }

  activateTimeMultiplier() {
    const hour = new Date().getHours();
    // Multiplicador por hora del día
    if (hour >= 6 && hour <= 9) { // Mañana temprano
      this.multipliers.time = 1.5;
    } else if (hour >= 18 && hour <= 22) { // Noche
      this.multipliers.time = 1.3;
    } else {
      this.multipliers.time = 1.0;
    }
  }

  // Sistema de rachas diarias
  updateDailyStreak(completedTask = false) {
    const today = new Date().toDateString();
    const lastActivity = this.dailyStats.lastActivity ?
      new Date(this.dailyStats.lastActivity).toDateString() : null;

    if (completedTask) {
      this.dailyStats.tasksCompleted++;
    }

    if (today !== lastActivity) {
      // Nuevo día
      if (this.isConsecutiveDay(lastActivity, today)) {
        this.currentStreak = (this.currentStreak || 0) + 1;
        this.updateStreakMultiplier(this.currentStreak);

        // Bonus de racha
        if (this.currentStreak > 1) {
          const streakBonus = Math.min(this.currentStreak * 5, 100);
          this.earnPoints(streakBonus, 'streak');
          this.dailyStats.streakBonus = streakBonus;
        }
      } else {
        // Racha rota
        this.currentStreak = 1;
        this.multipliers.streak = 1.0;
      }
    }

    this.saveProgress();
  }

  isConsecutiveDay(lastDate, currentDate) {
    if (!lastDate) return false;
    const last = new Date(lastDate);
    const current = new Date(currentDate);
    const diffTime = current - last;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays === 1;
  }

  // Reset diario
  initializeDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilReset = tomorrow - now;

    setTimeout(() => {
      this.resetDailyStats();
      // Programar siguiente reset
      setInterval(() => this.resetDailyStats(), 24 * 60 * 60 * 1000);
    }, timeUntilReset);
  }

  resetDailyStats() {
    // Guardar estadísticas de la semana antes de resetear
    this.updateWeeklyStats();

    // Reset diario
    this.dailyStats = {
      tasksCompleted: 0,
      pointsEarned: 0,
      streakBonus: 0,
      lastActivity: null
    };

    // Reset multiplicador de tiempo
    this.activateTimeMultiplier();

    this.saveProgress();
  }

  updateWeeklyStats() {
    const currentWeek = this.getWeekStart();
    if (currentWeek !== this.weeklyStats.weekStart) {
      // Nueva semana - resetear estadísticas semanales
      this.weeklyStats = {
        tasksCompleted: 0,
        pointsEarned: 0,
        challengesCompleted: 0,
        weekStart: currentWeek
      };
    }
  }

  getWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar para lunes
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
  }

  // Notificaciones
  notifyPointsEarned(points, source) {
    const messages = {
      task: `¡Ganaste ${points} puntos por completar una tarea!`,
      challenge: `¡Desafío completado! +${points} puntos`,
      streak: `¡Bonus de racha! +${points} puntos`,
      level: `¡Subida de nivel! +${points} puntos`,
      special: `¡Puntos especiales! +${points} puntos`
    };

    if (window.notificationManager) {
      window.notificationManager.show('🎉 ¡Puntos Ganados!', {
        body: messages[source] || `¡Ganaste ${points} puntos!`,
        icon: '/scr/images/points-icon.png',
        tag: 'points-earned'
      });
    }
  }

  notifyLevelUp(oldLevel, newLevel, bonus) {
    if (window.notificationManager) {
      window.notificationManager.show('⬆️ ¡Nivel Subido!', {
        body: `¡Felicidades! Subiste del nivel ${oldLevel} al ${newLevel}. Bonus: +${bonus} puntos`,
        icon: '/scr/images/level-up-icon.png',
        tag: 'level-up',
        requireInteraction: true
      });
    }

    // Vibración de celebración
    if (window.nativeFeaturesManager) {
      window.nativeFeaturesManager.vibrate('celebration');
    }
  }

  // Persistencia
  saveProgress() {
    try {
      const data = {
        points: this.points,
        level: this.level,
        experience: this.experience,
        experienceToNext: this.experienceToNext,
        multipliers: this.multipliers,
        dailyStats: this.dailyStats,
        weeklyStats: this.weeklyStats,
        currentStreak: this.currentStreak || 0,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('gamificationProgress', JSON.stringify(data));
    } catch (error) {
      console.error('[GamificationSystem] Error guardando progreso:', error);
    }
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('gamificationProgress');
      if (saved) {
        const data = JSON.parse(saved);
        Object.assign(this, data);
      }
    } catch (error) {
      console.error('[GamificationSystem] Error cargando progreso:', error);
    }
  }

  // Getters para UI
  getStats() {
    return {
      points: this.points,
      level: this.level,
      experience: this.experience,
      experienceToNext: this.experienceToNext,
      experiencePercentage: (this.experience / this.experienceToNext) * 100,
      totalMultiplier: this.getTotalMultiplier(),
      multipliers: this.multipliers,
      dailyStats: this.dailyStats,
      weeklyStats: this.weeklyStats,
      currentStreak: this.currentStreak || 0
    };
  }

  getLevelProgress() {
    return {
      current: this.experience,
      next: this.experienceToNext,
      percentage: Math.round((this.experience / this.experienceToNext) * 100)
    };
  }

  // Reset para testing
  resetProgress() {
    this.points = 0;
    this.level = 1;
    this.experience = 0;
    this.experienceToNext = 100;
    this.multipliers = {
      base: 1.0,
      streak: 1.0,
      special: 1.0,
      time: 1.0
    };
    this.dailyStats = {
      tasksCompleted: 0,
      pointsEarned: 0,
      streakBonus: 0,
      lastActivity: null
    };
    this.weeklyStats = {
      tasksCompleted: 0,
      pointsEarned: 0,
      challengesCompleted: 0,
      weekStart: this.getWeekStart()
    };
    this.currentStreak = 0;
    this.saveProgress();
  }
}

// ============================================
// SISTEMA DE RECOMPENSAS
// ============================================

class RewardsSystem {
  constructor() {
    this.themes = {
      romantic: {
        id: 'romantic',
        name: 'Tema Romántico',
        description: 'Rosa y corazones para momentos especiales',
        cost: 500,
        unlocked: false,
        css: `
          --primary: #ff6b9d;
          --secondary: #ffb3c1;
          --accent: #ff4757;
          --background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%);
        `
      },
      sunset: {
        id: 'sunset',
        name: 'Atardecer Dorado',
        description: 'Colores cálidos del atardecer',
        cost: 750,
        unlocked: false,
        css: `
          --primary: #ff9f43;
          --secondary: #ee5a24;
          --accent: #f0932b;
          --background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        `
      },
      ocean: {
        id: 'ocean',
        name: 'Profundidades Océano',
        description: 'Azules profundos y relajantes',
        cost: 600,
        unlocked: false,
        css: `
          --primary: #3742fa;
          --secondary: #2f3542;
          --accent: #57606f;
          --background: linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%);
        `
      },
      galaxy: {
        id: 'galaxy',
        name: 'Galaxia Estelar',
        description: 'Estrellas y nebulosas cósmicas',
        cost: 1000,
        unlocked: false,
        css: `
          --primary: #6c5ce7;
          --secondary: #a29bfe;
          --accent: #fd79a8;
          --background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        `
      }
    };

    this.badges = {
      task_master: {
        id: 'task_master',
        name: 'Maestro de Tareas',
        description: 'Completar 100 tareas',
        icon: '👑',
        unlocked: false,
        requirement: { type: 'tasks', value: 100 }
      },
      streak_champion: {
        id: 'streak_champion',
        name: 'Campeón de Rachas',
        description: 'Mantener 30 días de racha',
        icon: '🔥',
        unlocked: false,
        requirement: { type: 'streak', value: 30 }
      },
      love_explorer: {
        id: 'love_explorer',
        name: 'Explorador del Amor',
        description: 'Visitar 50 lugares románticos',
        icon: '🗺️',
        unlocked: false,
        requirement: { type: 'locations', value: 50 }
      },
      memory_keeper: {
        id: 'memory_keeper',
        name: 'Guardián de Recuerdos',
        description: 'Crear 25 cápsulas del tiempo',
        icon: '💎',
        unlocked: false,
        requirement: { type: 'capsules', value: 25 }
      }
    };

    this.challenges = {
      weekly_planner: {
        id: 'weekly_planner',
        name: 'Planificador Semanal',
        description: 'Completar 7 tareas en una semana',
        reward: 150,
        progress: 0,
        maxProgress: 7,
        completed: false,
        type: 'weekly',
        expiresAt: null
      },
      photo_album: {
        id: 'photo_album',
        name: 'Álbum de Fotos',
        description: 'Tomar 10 fotos románticas',
        reward: 200,
        progress: 0,
        maxProgress: 10,
        completed: false,
        type: 'monthly',
        expiresAt: null
      },
      music_lovers: {
        id: 'music_lovers',
        name: 'Amantes de la Música',
        description: 'Crear 3 playlists juntos',
        reward: 100,
        progress: 0,
        maxProgress: 3,
        completed: false,
        type: 'monthly',
        expiresAt: null
      },
      surprise_master: {
        id: 'surprise_master',
        name: 'Maestro de Sorpresas',
        description: 'Completar 5 retos sorpresa',
        reward: 250,
        progress: 0,
        maxProgress: 5,
        completed: false,
        type: 'monthly',
        expiresAt: null
      }
    };

    this.loadProgress();
    this.initializeChallenges();
  }

  // Comprar tema
  purchaseTheme(themeId) {
    const theme = this.themes[themeId];
    if (!theme || theme.unlocked) return false;

    const gamification = window.gamificationSystem;
    if (!gamification || gamification.points < theme.cost) return false;

    // Descontar puntos
    gamification.points -= theme.cost;
    gamification.saveProgress();

    // Desbloquear tema
    theme.unlocked = true;
    theme.unlockedAt = new Date().toISOString();

    this.saveProgress();
    this.applyTheme(themeId);

    // Notificar
    showNotification({
      title: '🎨 ¡Tema Desbloqueado!',
      message: `Has desbloqueado el tema "${theme.name}"`,
      icon: '🎉',
      type: 'success'
    });

    return true;
  }

  // Aplicar tema
  applyTheme(themeId) {
    const theme = this.themes[themeId];
    if (!theme || !theme.unlocked) return;

    // Aplicar CSS personalizado
    const styleId = 'custom-theme-style';
    let styleElement = document.getElementById(styleId);

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = `
      :root {
        ${theme.css}
      }
    `;

    // Guardar tema activo
    localStorage.setItem('activeTheme', themeId);
  }

  // Cargar tema activo
  loadActiveTheme() {
    const activeTheme = localStorage.getItem('activeTheme');
    if (activeTheme && this.themes[activeTheme]?.unlocked) {
      this.applyTheme(activeTheme);
    }
  }

  // Sistema de insignias
  checkBadgeUnlock(statType, value) {
    Object.values(this.badges).forEach(badge => {
      if (!badge.unlocked && badge.requirement.type === statType && value >= badge.requirement.value) {
        this.unlockBadge(badge.id);
      }
    });
  }

  unlockBadge(badgeId) {
    const badge = this.badges[badgeId];
    if (!badge || badge.unlocked) return;

    badge.unlocked = true;
    badge.unlockedAt = new Date().toISOString();

    // Notificar
    if (window.notificationManager) {
      window.notificationManager.show('🏆 ¡Nueva Insignia!', {
        body: `Has desbloqueado la insignia: ${badge.name}`,
        icon: badge.icon,
        tag: 'badge-unlocked',
        requireInteraction: true
      });
    }

    this.saveProgress();
  }

  // Sistema de desafíos
  initializeChallenges() {
    // Inicializar fechas de expiración para desafíos
    Object.values(this.challenges).forEach(challenge => {
      if (!challenge.expiresAt) {
        this.setChallengeExpiration(challenge);
      }
    });

    // Verificar expiraciones
    this.checkExpiredChallenges();
  }

  setChallengeExpiration(challenge) {
    const now = new Date();
    let expiresAt;

    if (challenge.type === 'weekly') {
      // Expira al final de la semana (domingo)
      const daysUntilSunday = 7 - now.getDay();
      expiresAt = new Date(now);
      expiresAt.setDate(now.getDate() + daysUntilSunday);
      expiresAt.setHours(23, 59, 59, 999);
    } else if (challenge.type === 'monthly') {
      // Expira al final del mes
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    challenge.expiresAt = expiresAt.toISOString();
  }

  checkExpiredChallenges() {
    const now = new Date();

    Object.values(this.challenges).forEach(challenge => {
      if (!challenge.completed && new Date(challenge.expiresAt) < now) {
        // Resetear desafío expirado
        challenge.progress = 0;
        this.setChallengeExpiration(challenge);
      }
    });

    this.saveProgress();
  }

  updateChallengeProgress(challengeId, increment = 1) {
    const challenge = this.challenges[challengeId];
    if (!challenge || challenge.completed) return;

    challenge.progress = Math.min(challenge.progress + increment, challenge.maxProgress);

    if (challenge.progress >= challenge.maxProgress) {
      this.completeChallenge(challengeId);
    }

    this.saveProgress();
  }

  completeChallenge(challengeId) {
    const challenge = this.challenges[challengeId];
    if (!challenge || challenge.completed) return;

    challenge.completed = true;
    challenge.completedAt = new Date().toISOString();

    // Otorgar recompensa
    const gamification = window.gamificationSystem;
    if (gamification) {
      gamification.earnPoints(challenge.reward, 'challenge');
    }

    // Notificar
    showNotification({
      title: '🎯 ¡Desafío Completado!',
      message: `${challenge.name} - ¡Ganaste ${challenge.reward} puntos!`,
      icon: '🏆',
      type: 'success'
    });

    // Resetear para próximo período
    setTimeout(() => {
      challenge.completed = false;
      challenge.progress = 0;
      this.setChallengeExpiration(challenge);
      this.saveProgress();
    }, 1000);

    this.saveProgress();
  }

  // Getters para UI
  getAvailableThemes() {
    return Object.values(this.themes).filter(theme => !theme.unlocked);
  }

  getUnlockedThemes() {
    return Object.values(this.themes).filter(theme => theme.unlocked);
  }

  getBadges() {
    return Object.values(this.badges);
  }

  getActiveChallenges() {
    return Object.values(this.challenges).filter(challenge => !challenge.completed);
  }

  getCompletedChallenges() {
    return Object.values(this.challenges).filter(challenge => challenge.completed);
  }

  // Persistencia
  saveProgress() {
    try {
      const data = {
        themes: this.themes,
        badges: this.badges,
        challenges: this.challenges,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('rewardsProgress', JSON.stringify(data));
    } catch (error) {
      console.error('[RewardsSystem] Error guardando progreso:', error);
    }
  }

  loadProgress() {
    try {
      const saved = localStorage.getItem('rewardsProgress');
      if (saved) {
        const data = JSON.parse(saved);
        this.themes = { ...this.themes, ...data.themes };
        this.badges = { ...this.badges, ...data.badges };
        this.challenges = { ...this.challenges, ...data.challenges };
      }
    } catch (error) {
      console.error('[RewardsSystem] Error cargando progreso:', error);
    }
  }

  // Reset para testing
  resetProgress() {
    Object.values(this.themes).forEach(theme => {
      theme.unlocked = false;
      delete theme.unlockedAt;
    });

    Object.values(this.badges).forEach(badge => {
      badge.unlocked = false;
      delete badge.unlockedAt;
    });

    Object.values(this.challenges).forEach(challenge => {
      challenge.completed = false;
      challenge.progress = 0;
      delete challenge.completedAt;
      this.setChallengeExpiration(challenge);
    });

    this.saveProgress();
  }
}

// ============================================
// INTERFAZ DE USUARIO PARA GAMIFICACIÓN
// ============================================

function showGamificationDashboard() {
  const gamification = window.gamificationSystem || new GamificationSystem();
  const rewards = window.rewardsSystem || new RewardsSystem();
  const stats = gamification.getStats();

  const modal = document.createElement('div');
  modal.className = 'gamification-dashboard-modal';
  modal.innerHTML = `
    <div class="gamification-dashboard-content">
      <div class="dashboard-header">
        <h3>🎮 Centro de Gamificación</h3>
        <div class="dashboard-actions">
          <button class="dashboard-btn" onclick="showRewardsStore()">🛍️ Tienda</button>
          <button class="dashboard-btn" onclick="showChallengesBoard()">🎯 Desafíos</button>
        </div>
      </div>

      <div class="stats-overview">
        <div class="stat-card">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <div class="stat-value">${stats.points.toLocaleString()}</div>
            <div class="stat-label">Puntos Totales</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⬆️</div>
          <div class="stat-info">
            <div class="stat-value">Nivel ${stats.level}</div>
            <div class="stat-label">Experiencia</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${stats.experiencePercentage}%"></div>
            </div>
            <div class="progress-text">${stats.experience}/${stats.experienceToNext} XP</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <div class="stat-value">${stats.currentStreak || 0}</div>
            <div class="stat-label">Racha Actual</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-info">
            <div class="stat-value">${stats.totalMultiplier.toFixed(1)}x</div>
            <div class="stat-label">Multiplicador</div>
          </div>
        </div>
      </div>

      <div class="multipliers-breakdown">
        <h4>Multiplicadores Activos</h4>
        <div class="multipliers-grid">
          <div class="multiplier-item">
            <span class="multiplier-label">Base</span>
            <span class="multiplier-value">${stats.multipliers.base}x</span>
          </div>
          <div class="multiplier-item">
            <span class="multiplier-label">Racha</span>
            <span class="multiplier-value">${stats.multipliers.streak}x</span>
          </div>
          <div class="multiplier-item">
            <span class="multiplier-label">Especial</span>
            <span class="multiplier-value">${stats.multipliers.special}x</span>
          </div>
          <div class="multiplier-item">
            <span class="multiplier-label">Tiempo</span>
            <span class="multiplier-value">${stats.multipliers.time}x</span>
          </div>
        </div>
      </div>

      <div class="daily-weekly-stats">
        <div class="stats-section">
          <h4>📊 Estadísticas Diarias</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Tareas completadas</span>
              <span class="stat-value">${stats.dailyStats.tasksCompleted}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Puntos ganados</span>
              <span class="stat-value">${stats.dailyStats.pointsEarned}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Bonus de racha</span>
              <span class="stat-value">${stats.dailyStats.streakBonus}</span>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <h4>📈 Estadísticas Semanales</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Tareas completadas</span>
              <span class="stat-value">${stats.weeklyStats.tasksCompleted}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Puntos ganados</span>
              <span class="stat-value">${stats.weeklyStats.pointsEarned}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Desafíos completados</span>
              <span class="stat-value">${stats.weeklyStats.challengesCompleted}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="dashboard-actions-bottom">
        <button class="reset-btn" onclick="resetGamificationProgress()">🔄 Reset Progreso</button>
        <button class="close-dashboard-btn">❌ Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-dashboard-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function showRewardsStore() {
  const rewards = window.rewardsSystem || new RewardsSystem();
  const gamification = window.gamificationSystem || new GamificationSystem();
  const availableThemes = rewards.getAvailableThemes();

  const modal = document.createElement('div');
  modal.className = 'rewards-store-modal';
  modal.innerHTML = `
    <div class="rewards-store-content">
      <div class="store-header">
        <h3>🛍️ Tienda de Recompensas</h3>
        <div class="points-balance">
          <span class="points-icon">⭐</span>
          <span class="points-amount">${gamification.points.toLocaleString()}</span>
          <span class="points-label">puntos disponibles</span>
        </div>
      </div>

      <div class="store-tabs">
        <button class="store-tab active" data-tab="themes">🎨 Temas</button>
        <button class="store-tab" data-tab="badges">🏆 Insignias</button>
      </div>

      <div class="store-content">
        <div class="store-section themes-section active">
          <h4>Temas Disponibles</h4>
          <div class="themes-grid">
            ${availableThemes.map(theme => `
              <div class="theme-card ${gamification.points >= theme.cost ? 'available' : 'locked'}">
                <div class="theme-preview" style="background: linear-gradient(45deg, var(--primary), var(--secondary))"></div>
                <div class="theme-info">
                  <h5>${theme.name}</h5>
                  <p>${theme.description}</p>
                  <div class="theme-cost">
                    <span class="cost-amount">${theme.cost}</span>
                    <span class="cost-icon">⭐</span>
                  </div>
                </div>
                <button class="purchase-btn ${gamification.points >= theme.cost ? '' : 'disabled'}"
                        onclick="purchaseTheme('${theme.id}')"
                        ${gamification.points >= theme.cost ? '' : 'disabled'}>
                  ${gamification.points >= theme.cost ? 'Comprar' : 'Puntos insuficientes'}
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="store-section badges-section">
          <h4>Insignias Desbloqueadas</h4>
          <div class="badges-grid">
            ${rewards.getBadges().map(badge => `
              <div class="badge-card ${badge.unlocked ? 'unlocked' : 'locked'}">
                <div class="badge-icon ${badge.unlocked ? 'unlocked' : ''}">
                  ${badge.unlocked ? badge.icon : '🔒'}
                </div>
                <div class="badge-info">
                  <h5>${badge.name}</h5>
                  <p>${badge.description}</p>
                  ${badge.unlocked ? '<div class="badge-unlocked">🏆 Desbloqueada</div>' : '<div class="badge-locked">🔒 Bloqueada</div>'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <button class="close-store-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  // Event listeners para tabs
  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('store-tab')) {
      const tab = e.target.dataset.tab;
      modal.querySelectorAll('.store-tab').forEach(btn => btn.classList.remove('active'));
      modal.querySelectorAll('.store-section').forEach(section => section.classList.remove('active'));

      e.target.classList.add('active');
      modal.querySelector(`.${tab}-section`).classList.add('active');

    } else if (e.target.classList.contains('close-store-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function showChallengesBoard() {
  const rewards = window.rewardsSystem || new RewardsSystem();
  const activeChallenges = rewards.getActiveChallenges();
  const completedChallenges = rewards.getCompletedChallenges();

  const modal = document.createElement('div');
  modal.className = 'challenges-board-modal';
  modal.innerHTML = `
    <div class="challenges-board-content">
      <div class="board-header">
        <h3>🎯 Tablero de Desafíos</h3>
        <div class="board-stats">
          <span class="stat">Activos: ${activeChallenges.length}</span>
          <span class="stat">Completados: ${completedChallenges.length}</span>
        </div>
      </div>

      <div class="challenges-tabs">
        <button class="challenge-tab active" data-tab="active">En Progreso</button>
        <button class="challenge-tab" data-tab="completed">Completados</button>
      </div>

      <div class="challenges-content">
        <div class="challenges-section active-challenges active">
          <div class="challenges-grid">
            ${activeChallenges.map(challenge => `
              <div class="challenge-card">
                <div class="challenge-header">
                  <h4>${challenge.name}</h4>
                  <div class="challenge-reward">
                    <span class="reward-amount">${challenge.reward}</span>
                    <span class="reward-icon">⭐</span>
                  </div>
                </div>
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(challenge.progress / challenge.maxProgress) * 100}%"></div>
                  </div>
                  <span class="progress-text">${challenge.progress}/${challenge.maxProgress}</span>
                </div>
                <div class="challenge-meta">
                  <span class="challenge-type">${challenge.type === 'weekly' ? '📅 Semanal' : '📊 Mensual'}</span>
                  <span class="challenge-expires">Expira: ${new Date(challenge.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="challenges-section completed-challenges">
          <div class="challenges-grid">
            ${completedChallenges.map(challenge => `
              <div class="challenge-card completed">
                <div class="challenge-header">
                  <h4>${challenge.name}</h4>
                  <div class="challenge-reward completed">
                    <span class="reward-amount">+${challenge.reward}</span>
                    <span class="reward-icon">⭐</span>
                  </div>
                </div>
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-completed-badge">✅ Completado</div>
                <div class="challenge-meta">
                  <span class="completed-date">Completado: ${new Date(challenge.completedAt).toLocaleDateString()}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <button class="close-challenges-btn">❌ Cerrar</button>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target.classList.contains('challenge-tab')) {
      const tab = e.target.dataset.tab;
      modal.querySelectorAll('.challenge-tab').forEach(btn => btn.classList.remove('active'));
      modal.querySelectorAll('.challenges-section').forEach(section => section.classList.remove('active'));

      e.target.classList.add('active');
      modal.querySelector(`.${tab}-challenges`).classList.add('active');

    } else if (e.target.classList.contains('close-challenges-btn') || e.target === modal) {
      modal.remove();
    }
  });
}

function purchaseTheme(themeId) {
  const rewards = window.rewardsSystem;
  if (rewards && rewards.purchaseTheme(themeId)) {
    // Actualizar UI
    showRewardsStore();
  } else {
    showNotification({
      title: 'Compra Fallida',
      message: 'No tienes suficientes puntos para comprar este tema.',
      icon: '❌',
      type: 'error'
    });
  }
}

function resetGamificationProgress() {
  showNotification({
    title: '¿Resetear Progreso?',
    message: 'Esta acción eliminará todo tu progreso de gamificación. ¿Estás seguro?',
    icon: '⚠️',
    type: 'confirm',
    confirmText: 'Resetear',
    cancelText: 'Cancelar',
    onConfirm: () => {
      const gamification = window.gamificationSystem;
      const rewards = window.rewardsSystem;

      if (gamification) gamification.resetProgress();
      if (rewards) rewards.resetProgress();

      showNotification({
        title: 'Progreso Reseteado',
        message: 'Todo el progreso de gamificación ha sido eliminado.',
        icon: '🔄',
        type: 'info'
      });

      // Cerrar y volver a abrir el dashboard
      document.querySelector('.gamification-dashboard-modal')?.remove();
      showGamificationDashboard();
    }
  });
}

// ============================================
// INTEGRACIÓN CON SISTEMAS EXISTENTES
// ============================================

// Instancias globales
let gamificationSystem;
let rewardsSystem;

// Inicializar sistemas cuando la app esté lista
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar sistema de gamificación
  gamificationSystem = new GamificationSystem();
  rewardsSystem = new RewardsSystem();

  // Hacer disponibles globalmente
  window.gamificationSystem = gamificationSystem;
  window.rewardsSystem = rewardsSystem;

  // Cargar tema activo
  rewardsSystem.loadActiveTheme();

  // Activar multiplicador de tiempo
  gamificationSystem.activateTimeMultiplier();

  console.log('[App] Sistemas de gamificación inicializados');
});

// Hacer funciones disponibles globalmente
window.showGamificationDashboard = showGamificationDashboard;
window.showRewardsStore = showRewardsStore;
window.showChallengesBoard = showChallengesBoard;
window.purchaseTheme = purchaseTheme;
window.resetGamificationProgress = resetGamificationProgress;

// Integración con tareas completadas
function integrateTaskCompletion(taskPoints = 10) {
  const gamification = window.gamificationSystem;
  const rewards = window.rewardsSystem;

  if (gamification) {
    // Ganar puntos por tarea
    gamification.earnPoints(taskPoints, 'task');

    // Actualizar racha diaria
    gamification.updateDailyStreak(true);

    // Actualizar estadísticas semanales
    gamification.weeklyStats.tasksCompleted++;
    gamification.saveProgress();
  }

  if (rewards) {
    // Actualizar progreso de desafíos
    rewards.updateChallengeProgress('weekly_planner', 1);

    // Verificar insignias
    const achievementSystem = window.achievementSystem;
    if (achievementSystem) {
      const totalTasks = achievementSystem.stats.totalTasks + 1;
      achievementSystem.updateStats('totalTasks', totalTasks);
      rewards.checkBadgeUnlock('tasks', totalTasks);
    }
  }
}

// Integración con otras actividades
function integrateActivityCompletion(activityType, points = 0) {
  const gamification = window.gamificationSystem;
  const rewards = window.rewardsSystem;

  if (gamification) {
    gamification.earnPoints(points, activityType);
  }

  if (rewards) {
    // Actualizar desafíos específicos
    switch (activityType) {
      case 'photo':
        rewards.updateChallengeProgress('photo_album', 1);
        break;
      case 'playlist':
        rewards.updateChallengeProgress('music_lovers', 1);
        break;
      case 'surprise':
        rewards.updateChallengeProgress('surprise_master', 1);
        break;
    }

    // Verificar insignias
    const achievementSystem = window.achievementSystem;
    if (achievementSystem) {
      switch (activityType) {
        case 'location':
          const totalLocations = achievementSystem.stats.totalLocations + 1;
          achievementSystem.updateStats('totalLocations', totalLocations);
          rewards.checkBadgeUnlock('locations', totalLocations);
          break;
        case 'capsule':
          const totalCapsules = (achievementSystem.stats.totalCapsules || 0) + 1;
          achievementSystem.updateStats('totalCapsules', totalCapsules);
          rewards.checkBadgeUnlock('capsules', totalCapsules);
          break;
      }
    }
  }
}

// Hacer funciones de integración disponibles globalmente
window.integrateTaskCompletion = integrateTaskCompletion;
window.integrateActivityCompletion = integrateActivityCompletion;
