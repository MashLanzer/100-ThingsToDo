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
import { getRandomTask } from './scr/modules/surpriseTasks.js';
import { RANDOM_CHALLENGES } from './scr/modules/randomTasks.js';
import { testQuestions } from './scr/modules/questions.js';
import { coupleTitles, createTest, getAvailableTests, getCreatedTests, updateTestAnswers, updateTestGuesses, hasActiveTest, getTest } from './scr/modules/testQuestions.js';
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
   // initializeNotifications(user.uid);


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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration);
      })
      .catch(error => {
        console.log('Error en el registro del Service Worker:', error);
      });
  });
}

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

// Pantallas del juego
const testGameStart = document.getElementById('test-game-start');
const testPlayerSelection = document.getElementById('test-player-selection');
const testQuestionsScreen = document.getElementById('test-questions');
const testGuessing = document.getElementById('test-guessing');
const testResult = document.getElementById('test-result');
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

// Función para abrir el modal del juego
async function openTestGameModal() {
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
    // Verificar si hay tests activos
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
    const hasActiveTestCreated = activeResult.createdActive;

    // Actualizar la interfaz
    const createBtn = document.getElementById('create-test-btn');
    const respondBtn = document.getElementById('respond-test-btn');

    if (hasActiveTestCreated) {
      // Usuario creó un test activo, no puede crear otro hasta que se responda
      createBtn.style.display = 'none';
      respondBtn.style.display = 'none';
      showTestStatus('Ya tienes un test activo esperando respuesta. ¡Sé paciente! 💕', 'info');
    } else if (hasAvailableTests) {
      // Hay tests disponibles para responder (creados por la pareja)
      createBtn.style.display = 'block'; // Puede crear uno nuevo mientras responde
      respondBtn.style.display = 'block';
      showTestStatus(`¡Tienes ${availableResult.tests.length} test(s) disponible(s) para responder! 🎉`, 'success');
    } else {
      // No hay tests activos, puede crear uno
      createBtn.style.display = 'block';
      respondBtn.style.display = 'none';
      showTestStatus('¡Crea un test para que tu pareja lo responda! ✨', 'info');
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
  const screens = [testGameStart, testPlayerSelection, testQuestionsScreen, testGuessing, testResult, testFinal];
  screens.forEach(screen => screen.classList.add('hidden'));

  // Mostrar la pantalla deseada
  testGameState.currentScreen = screenName;
  switch (screenName) {
    case 'start':
      testGameStart.classList.remove('hidden');
      break;
    case 'player-selection':
      testPlayerSelection.classList.remove('hidden');
      break;
    case 'questions':
      testQuestionsScreen.classList.remove('hidden');
      break;
    case 'guessing':
      testGuessing.classList.remove('hidden');
      break;
    case 'result':
      testResult.classList.remove('hidden');
      break;
    case 'final':
      testFinal.classList.remove('hidden');
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
    // Marcar el test como completado por el creador
    await updateTestAnswers(db, testGameState.testId, testGameState.answers, testGameState.questions.length - 1, true);

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
    // Recargar el estado de los tests para actualizar los botones
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
function showFinalResults() {
  const totalQuestions = testGameState.questions.length;
  const percentage = Math.round((testGameState.correctAnswers / totalQuestions) * 100);

  // Mostrar porcentaje
  finalPercentage.textContent = `${percentage}%`;

  // Encontrar título de pareja
  const coupleTitleData = coupleTitles.find(title =>
    percentage >= title.min && percentage <= title.max
  ) || coupleTitles[0];

  coupleTitle.textContent = coupleTitleData.title;
  titleDescription.textContent = coupleTitleData.description;

  // Estadísticas
  correctAnswersEl.textContent = testGameState.correctAnswers;
  totalQuestionsFinal.textContent = totalQuestions;
  skippedQuestionsEl.textContent = testGameState.skippedQuestions;

  showTestScreen('final');
}

// Función para compartir resultados
function shareResults() {
  const percentage = finalPercentage.textContent;
  const title = coupleTitle.textContent;

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

      showTestScreen('questions');
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

    // Cambiar al modo de responder
    testGameState = {
      ...testGameState,
      mode: 'responding',
      testId: test.id,
      questions: test.questions,
      answers: test.answers, // Respuestas del creador
      currentQuestionIndex: 0,
      guesses: [],
      correctAnswers: 0,
      skippedQuestions: 0
    };

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

// ============================================
// INICIALIZACIÓN DE COMPONENTES
// ============================================

// Inicializar cápsulas del tiempo
initTimeCapsules();
