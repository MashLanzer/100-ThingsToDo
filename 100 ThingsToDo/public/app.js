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
import { 
  createCoupon, 
  getCoupons, 
  redeemCoupon, 
  deleteCoupon 
} from './scr/modules/coupons.js';
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
  onConfirm = null,
  onCancel = null
}) {
  const modal = document.getElementById('notification-modal');
  const iconEl = document.getElementById('notification-icon');
  const titleEl = document.getElementById('notification-title');
  const messageEl = document.getElementById('notification-message');
  const btn = document.getElementById('notification-btn');
  
  // Iconos predeterminados por tipo
  const typeIcons = {
    success: '✅',
    error: '❌',
    info: '💬',
    warning: '⚠️',
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
  
  // Si es confirmación, agregar botón Cancelar
  if (confirm) {
    btn.textContent = 'Aceptar';
    btn.style.marginRight = '0.5rem';
    
    // Crear botón Cancelar si no existe
    let cancelBtn = document.getElementById('notification-cancel-btn');
    if (!cancelBtn) {
      cancelBtn = document.createElement('button');
      cancelBtn.id = 'notification-cancel-btn';
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = 'Cancelar';
      btn.parentNode.appendChild(cancelBtn);
    }
    cancelBtn.style.display = 'inline-block';
    
    // Handler para cancelar
    const cancelHandler = () => {
      modal.classList.remove('is-open');
      if (onCancel) onCancel();
      cancelBtn.removeEventListener('click', cancelHandler);
    };
    cancelBtn.addEventListener('click', cancelHandler);
  } else {
    btn.textContent = 'Aceptar';
    btn.style.marginRight = '0';
    const cancelBtn = document.getElementById('notification-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
  }
  
  // Mostrar modal
  modal.classList.add('is-open');
  
  // Animar icono (reiniciar animación)
  iconEl.style.animation = 'none';
  setTimeout(() => {
    iconEl.style.animation = 'notification-icon-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }, 10);
  
  // Cerrar al hacer click en el botón
  const closeHandler = () => {
    modal.classList.remove('is-open');
    if (onConfirm) onConfirm();
    btn.removeEventListener('click', closeHandler);
  };
  btn.addEventListener('click', closeHandler);
  
  // Cerrar al hacer click fuera del contenido
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('is-open');
      if (onCancel) onCancel();
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
const phoneModal = document.getElementById('phone-modal');
const closePhoneModalBtn = document.getElementById('close-phone-modal-btn');
const phoneHomescreen = document.getElementById('phone-homescreen');
const backToHomeBtns = document.querySelectorAll('.back-to-home-btn');
const phoneTimeDisplay = document.getElementById('phone-time-display');


const surpriseCard = document.querySelector('.surprise-card'); // Obtenemos la tarjeta una sola vez

// Reutilizamos las referencias de la tarea sorpresa, pero las hacemos más específicas
// CORRECCIÓN
const surpriseEmoji = document.querySelector('#phone-view-surprise .surprise-emoji');
const surpriseText = document.querySelector('#phone-view-surprise .surprise-text');
const acceptSurpriseTaskBtn = document.querySelector('#phone-view-surprise #accept-surprise-task-btn');
const rerollSurpriseTaskBtn = document.querySelector('#phone-view-surprise #reroll-surprise-task-btn');

// ... al final de la sección de elementos del DOM ...

// Elementos de la Cápsula del Tiempo
const capsulesList = document.getElementById('capsules-list'); // <--- ASEGÚRATE DE QUE SE LLAME "capsulesList"
const capsulesEmptyState = document.getElementById('capsules-empty-state');
const goToCreateCapsuleBtn = document.getElementById('go-to-create-capsule-btn');
const backToCapsuleListBtn = document.querySelector('.back-to-capsule-list-btn');
const capsuleMessageInput = document.getElementById('capsule-message-input');
const capsuleUnlockDateInput = document.getElementById('capsule-unlock-date-input');
const saveCapsuleBtn = document.getElementById('save-capsule-btn');

// ... al final de la sección de elementos del DOM ...

// Elementos de Presupuesto Compartido
const goalsList = document.getElementById('goals-list');
const goalsEmptyState = document.getElementById('goals-empty-state');
const goToCreateGoalBtn = document.getElementById('go-to-create-goal-btn');
const backToBudgetListBtn = document.querySelector('.back-to-budget-list-btn');
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

// Elementos del Reproductor de Música (Tocadiscos)
const youtubePlayerContainer = document.getElementById('youtube-player-container');
const turntableContainer = document.querySelector('.turntable-container');
const turntableDisc = document.querySelector('.turntable-disc');
const playerSongTitle = document.getElementById('player-song-title');
const playerAddedBy = document.getElementById('player-added-by');

// ... justo después de los elementos del tocadiscos ...
const cassettePlayer = document.querySelector('.cassette-player');

// Elementos de Cupones de Amor
const couponsList = document.getElementById('coupons-list');
const couponsEmptyState = document.getElementById('coupons-empty-state');
const addCouponBtn = document.getElementById('add-coupon-btn');
const backToCouponsBtn = document.getElementById('back-to-coupons-btn');
const couponTitleInput = document.getElementById('coupon-title-input');
const couponDescriptionInput = document.getElementById('coupon-description-input');
const couponColorPicker = document.querySelector('.color-picker');
const saveCouponBtn = document.getElementById('save-coupon-btn');




















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
  editPlanModal.style.display = 'flex';
}

function closeEditPlanModal() {
  editPlanModal.style.display = 'none';
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

  if (!confirm(`¿Estás seguro de que quieres eliminar el plan "${planTitle}"? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    // Animar la tarjeta del plan antes de eliminarla (si está visible)
    const planCard = plansContainer.querySelector(`[data-plan-id="${planId}"]`);
    if (planCard) {
      planCard.classList.add('animate-delete');
      await new Promise(res => planCard.addEventListener('animationend', res, { once: true }));
    }

    await deletePlan(planId);
    closeEditPlanModal();
    await loadPlans();
  } catch (error) {
    alert('Error al eliminar el plan.');
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
  if (!currentCoupleId) return;
  try {
    // NOTA: Esto eliminará el plan pero no sus subtareas en Firestore.
    // Para una eliminación completa, se necesitaría una Cloud Function.
    // Por ahora, esto es suficiente para que desaparezca de la UI.
    const planRef = doc(db, 'couples', currentCoupleId, 'plans', planId);
    await deleteDoc(planRef);
  } catch (error) {
    console.error('Error al eliminar plan:', error);
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
      renderPlans(plans);
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
      checkbox.onclick = () => handleToggleTask(task.id, task.completed);
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
  coupleModal.style.display = 'flex';
  loadCoupleData();
}

function closeCoupleModal() {
  coupleModal.style.display = 'none';
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
  logoutConfirmModal.style.display = 'flex'; // Abre el modal de confirmación
});

// Función para cerrar el modal
function closeLogoutConfirmModal() {
  logoutConfirmModal.style.display = 'none';
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
    if (targetApp === 'homescreen' && surpriseCard) {
      surpriseCard.classList.remove('is-flipped');
    }
  });
});





// ... en la sección EVENT LISTENERS ...

// Listeners para el Teléfono Kawaii (VERSIÓN CORREGIDA)
openPhoneModalBtn.addEventListener('click', openPhoneModal);
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
    surpriseCard.classList.remove('is-flipped');
  });
});

// Listeners para la app de Tarea Sorpresa
rerollSurpriseTaskBtn.addEventListener('click', handleReroll); // <== Usa la nueva función
acceptSurpriseTaskBtn.addEventListener('click', acceptSurpriseTask);



// Listeners para la app de Cápsula del Tiempo
goToCreateCapsuleBtn.addEventListener('click', () => showPhoneApp('createcapsule'));
backToCapsuleListBtn.addEventListener('click', () => showPhoneApp('timecapsule'));
saveCapsuleBtn.addEventListener('click', handleSaveCapsule);



// Listeners para la app de Presupuesto Compartido
goToCreateGoalBtn.addEventListener('click', openCreateGoalView);
backToBudgetListBtn.addEventListener('click', () => showPhoneApp('budget'));
saveGoalBtn.addEventListener('click', handleSaveGoal);
addContributionBtn.addEventListener('click', handleAddContribution);

// Listeners para la app de Cupones de Amor
addCouponBtn.addEventListener('click', () => showPhoneApp('create-coupon'));
backToCouponsBtn.addEventListener('click', () => showPhoneApp('coupons'));
saveCouponBtn.addEventListener('click', handleSaveCoupon);

// Event delegation para color picker
if (couponColorPicker) {
  couponColorPicker.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-option')) {
      // Quitar selección de todos
      couponColorPicker.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      // Marcar el clickeado
      e.target.classList.add('selected');
    }
  });
}





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
        thumb.innerHTML = `<img src="${event.target.result}" alt="Previsualización">`;
        journalGalleryContainer.insertBefore(thumb, journalAddPhotoBtn);
      };
      reader.readAsDataURL(file);
    }
  }
});

saveJournalEntryBtn.addEventListener('click', handleSaveJournalEntry);

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
  statsModal.style.display = 'flex';
  
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
  statsModal.style.display = 'none';
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
  phoneModal.style.display = 'flex';
}

function closePhoneModal() {
  phoneModal.style.display = 'none';
  // Al cerrar, reseteamos la tarjeta a su estado inicial (sin voltear)
  surpriseCard.classList.remove('is-flipped');
  // Y volvemos a la pantalla de inicio del teléfono
  showPhoneApp('homescreen');

   // ===> AÑADE UNA COMPROBACIÓN DE SEGURIDAD <===
  if (phoneContainer && deviceSwitchBtn) {
    phoneContainer.classList.remove('is-tablet');
    deviceSwitchBtn.title = "Cambiar a modo Tablet";
    deviceSwitchBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="18" rx="2"></rect><line x1="2" y1="12" x2="22" y2="12"></line></svg>`;
  }  
  if (surpriseCard) {
    surpriseCard.classList.remove('is-flipped');
  }

}




// Función simplificada para generar y mostrar el contenido de la tarea
function updateSurpriseContent() {
  currentSurpriseTask = getRandomTask();
  surpriseEmoji.textContent = currentSurpriseTask.emoji;
  surpriseText.textContent = currentSurpriseTask.text;
}

// Función para manejar el botón "Buscar otra idea" (reroll)
function handleReroll() {
  // 1. Ocultar la tarjeta (volteándola de vuelta a la pregunta)
  surpriseCard.classList.remove('is-flipped');

  // 2. Esperar a que la animación de vuelta termine (aprox. 400ms)
  setTimeout(() => {
    // 3. Cambiar el contenido de la tarea
    updateSurpriseContent();
    
    // 4. Voltear la tarjeta de nuevo para mostrar el nuevo reto
    // Usamos otro pequeño delay para asegurar que el contenido se ha actualizado
    setTimeout(() => {
      surpriseCard.classList.add('is-flipped');
    }, 50);
  }, 400); // Este tiempo debe coincidir con la mitad de la transición en CSS (0.8s / 2)
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
    
    await loadPlans();
    closePhoneModal();
    showNotification({
      title: '¡Reto Aceptado!',
      message: '¡Nuevo reto con sus pasos añadido a vuestra lista!',
      icon: '🎉',
      type: 'party'
    });

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
        // Añadimos un pequeño retardo para que la animación de volteo se vea bien
        setTimeout(() => { if (surpriseCard) surpriseCard.classList.add('is-flipped'); }, 100);
        break;
      case 'timecapsule':
        loadAndRenderCapsules();
        break;
      case 'budget':
        renderGoalsList();
        break;
      case 'coupons':
        renderCouponsList();
        break;
      case 'journal':
        fetchJournalEntriesForMonth();
        break;
      case 'soundtrack':
        renderPlaylists();
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

async function createCapsule(message, unlockDate) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const capsulesRef = collection(db, 'couples', currentCoupleId, 'capsules');
    await addDoc(capsulesRef, {
      message,
      unlockDate: Timestamp.fromDate(new Date(unlockDate)),
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al crear la cápsula:', error);
    throw error;
  }
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
      unlockDate: doc.data().unlockDate.toDate(),
    }));
  } catch (error) {
    console.error('Error al obtener cápsulas:', error);
    return [];
  }
}

// ============================================
// FUNCIONES DE UI - CÁPSULA DEL TIEMPO
// ============================================

async function loadAndRenderCapsules() {
  const capsules = await getCapsules();
  capsulesList.innerHTML = ''; // Limpiar la lista
  
  if (capsules.length === 0) {
    capsulesList.appendChild(capsulesEmptyState);
    capsulesEmptyState.style.display = 'block';
  } else {
    capsulesEmptyState.style.display = 'none';
    const now = new Date();
    
    capsules.forEach(capsule => {
      const isLocked = capsule.unlockDate > now;
      const item = document.createElement('div');
      item.className = `capsule-item ${isLocked ? 'locked' : 'unlocked'}`;
      item.onclick = () => openCapsule(capsule, isLocked);
      
      item.innerHTML = `
        <div class="capsule-icon">${isLocked ? '🔒' : '🔓'}</div>
        <div class="capsule-info">
          <p>Cápsula de ${capsule.creatorName}</p>
          <span class="capsule-date">
            ${isLocked ? `Se abre el ${capsule.unlockDate.toLocaleDateString()}` : `Abierta el ${capsule.unlockDate.toLocaleDateString()}`}
          </span>
        </div>
      `;
      capsulesList.appendChild(item);
    });
  }
}

function openCapsule(capsule, isLocked) {
  if (isLocked) {
    showNotification({
      title: '¡Paciencia!',
      message: `Esta cápsula del tiempo no se puede abrir hasta el ${capsule.unlockDate.toLocaleDateString()}.\n\nFue creada por ${capsule.creatorName}.`,
      icon: '⏳',
      type: 'time'
    });
  } else {
    showNotification({
      title: '¡Cápsula del Tiempo Abierta!',
      message: `Mensaje de ${capsule.creatorName}:\n\n"${capsule.message}"`,
      icon: '🎉',
      type: 'success'
    });
  }
}

async function handleSaveCapsule() {
  const message = capsuleMessageInput.value.trim();
  const unlockDate = capsuleUnlockDateInput.value;

  if (!message || !unlockDate) {
    showNotification({
      title: 'Campos Requeridos',
      message: 'Por favor, escribe un mensaje y elige una fecha de apertura.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }

  // Validar que la fecha sea en el futuro
  const today = new Date();
  const selectedDate = new Date(unlockDate);
  today.setHours(0, 0, 0, 0); // Poner la hora a cero para comparar solo fechas
  if (selectedDate <= today) {
    showNotification({
      title: 'Fecha Inválida',
      message: 'La fecha de apertura debe ser en el futuro.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }

  try {
    saveCapsuleBtn.disabled = true;
    saveCapsuleBtn.textContent = 'Sellando...';
    
    await createCapsule(message, unlockDate);
    
    // Limpiar formulario y volver a la lista
    capsuleMessageInput.value = '';
    capsuleUnlockDateInput.value = '';
    showPhoneApp('timecapsule');
    await loadAndRenderCapsules();
    
    showNotification({
      title: '¡Cápsula Sellada!',
      message: 'Tu cápsula del tiempo ha sido creada exitosamente.',
      icon: '⏳',
      type: 'success'
    });

  } catch (error) {
    showNotification({
      title: 'Error',
      message: 'No se pudo sellar la cápsula. Inténtalo de nuevo.',
      icon: '❌',
      type: 'error'
    });
  } finally {
    saveCapsuleBtn.disabled = false;
    saveCapsuleBtn.textContent = 'Sellar Cápsula';
  }
}


// ============================================
// FUNCIONES DE FIRESTORE - METAS DE AHORRO
// ============================================

async function createGoal(name, total) {
  if (!currentCoupleId) return;
  const goalRef = doc(collection(db, 'couples', currentCoupleId, 'goals'));
  await setDoc(goalRef, {
    name,
    total: Number(total),
    current: 0,
    createdAt: Timestamp.now(),
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
        <div class="goal-icon">🎯</div>
        <div class="goal-info">
          <p>${goal.name}</p>
          <span class="goal-progress-text">${Math.round(percentage)}% completado</span>
        </div>
      `;
      goalsList.appendChild(item);
    });
  }
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
    goalCurrentAmount.textContent = `${goal.current.toFixed(2)}€`;
    goalTotalAmount.textContent = `${goal.total.toFixed(2)}€`;
    
    goalContributionsList.innerHTML = '';
    contributions.forEach(c => {
      const item = document.createElement('div');
      item.className = 'contribution-item';
      item.innerHTML = `
        <span class="contribution-item-user">${c.userName}</span>
        <strong class="contribution-item-amount">+${c.amount.toFixed(2)}€</strong>
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
    message: `${currentUser.displayName} aportó ${Number(amount).toFixed(2)}€ a "${goalData.name}"`,
    icon: '🐖',
    type: 'save'
  });
}

// ============================================
// FUNCIONES DE UI - CUPONES DE AMOR
// ============================================

async function renderCouponsList() {
  if (!currentCoupleId || !currentUser) {
    couponsList.innerHTML = '';
    couponsList.appendChild(couponsEmptyState);
    couponsEmptyState.style.display = 'flex';
    return;
  }
  
  const coupons = await getCoupons(db, currentCoupleId);
  couponsList.innerHTML = '';
  
  if (coupons.length === 0) {
    couponsList.appendChild(couponsEmptyState);
    couponsEmptyState.style.display = 'flex';
  } else {
    couponsEmptyState.style.display = 'none';
    coupons.forEach((coupon, index) => {
      const card = document.createElement('div');
      card.className = `coupon-card ${coupon.redeemed ? 'redeemed' : ''}`;
      card.style.background = `linear-gradient(135deg, ${coupon.color}, ${adjustColorBrightness(coupon.color, -15)})`;
      card.style.animationDelay = `${index * 0.1}s`;
      
      const isMyGift = coupon.createdBy === currentUser.uid;
      const canRedeem = !coupon.redeemed && !isMyGift;
      
      card.innerHTML = `
        <div class="coupon-icon">🎟️</div>
        <h3 class="coupon-title">${coupon.title}</h3>
        <p class="coupon-description">${coupon.description}</p>
        <div class="coupon-footer">
          <span class="coupon-from">De: ${coupon.creatorName}</span>
          ${canRedeem ? `<button class="coupon-redeem-btn" data-id="${coupon.id}">Canjear ✓</button>` : ''}
          ${isMyGift && !coupon.redeemed ? `<button class="coupon-delete-btn" data-id="${coupon.id}">🗑️</button>` : ''}
        </div>
      `;
      
      couponsList.appendChild(card);
    });
    
    // Event listeners para botones de canjear y eliminar
    document.querySelectorAll('.coupon-redeem-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRedeemCoupon(btn.dataset.id);
      });
    });
    
    document.querySelectorAll('.coupon-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteCoupon(btn.dataset.id);
      });
    });
  }
}

async function handleSaveCoupon() {
  const title = couponTitleInput.value.trim();
  const description = couponDescriptionInput.value.trim();
  const selectedColor = couponColorPicker.querySelector('.color-option.selected');
  
  if (!title) {
    showNotification({
      title: 'Título Requerido',
      message: 'Por favor, escribe un título para el cupón.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  if (!description) {
    showNotification({
      title: 'Descripción Requerida',
      message: 'Por favor, escribe una descripción para el cupón.',
      icon: '⚠️',
      type: 'warning'
    });
    return;
  }
  
  const color = selectedColor ? selectedColor.dataset.color : '#e8d5f2';
  
  try {
    await createCoupon(
      db,
      currentCoupleId,
      currentUser.uid,
      currentUser.displayName,
      title,
      description,
      color
    );
    
    // Limpiar formulario
    couponTitleInput.value = '';
    couponDescriptionInput.value = '';
    couponColorPicker.querySelectorAll('.color-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    couponColorPicker.querySelector('.color-option:last-child').classList.add('selected');
    
    showNotification({
      title: '¡Cupón Creado!',
      message: `"${title}" ha sido añadido al banco de cupones.`,
      icon: '🎟️',
      type: 'success'
    });
    
    await renderCouponsList();
    showPhoneApp('coupons');
  } catch (error) {
    console.error('Error creando cupón:', error);
    showNotification({
      title: 'Error',
      message: 'No se pudo crear el cupón. Intenta de nuevo.',
      icon: '❌',
      type: 'error'
    });
  }
}

async function handleRedeemCoupon(couponId) {
  showNotification({
    title: '¿Canjear Cupón?',
    message: '¿Estás seguro de que quieres canjear este cupón? Esta acción no se puede deshacer.',
    icon: '🎟️',
    type: 'info',
    confirm: true,
    onConfirm: async () => {
      try {
        // Añadir clase de animación antes de canjear
        const card = document.querySelector(`.coupon-redeem-btn[data-id="${couponId}"]`)?.closest('.coupon-card');
        if (card) {
          card.classList.add('coupon-redeeming');
        }
        
        await redeemCoupon(db, currentCoupleId, couponId, currentUser.uid);
        
        // Esperar a que termine la animación
        setTimeout(async () => {
          showNotification({
            title: '¡Cupón Canjeado!',
            message: 'Disfruta de tu regalo especial 💕',
            icon: '✓',
            type: 'success'
          });
          
          await renderCouponsList();
        }, 800);
      } catch (error) {
        console.error('Error canjeando cupón:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo canjear el cupón. Intenta de nuevo.',
          icon: '❌',
          type: 'error'
        });
      }
    }
  });
}

async function handleDeleteCoupon(couponId) {
  showNotification({
    title: '¿Eliminar Cupón?',
    message: '¿Estás seguro de que quieres eliminar este cupón?',
    icon: '🗑️',
    type: 'warning',
    confirm: true,
    onConfirm: async () => {
      try {
        await deleteCoupon(db, currentCoupleId, couponId);
        showNotification({
          title: 'Cupón Eliminado',
          message: 'El cupón ha sido eliminado del banco.',
          icon: '✓',
          type: 'success'
        });
        await renderCouponsList();
      } catch (error) {
        console.error('Error eliminando cupón:', error);
        showNotification({
          title: 'Error',
          message: 'No se pudo eliminar el cupón. Intenta de nuevo.',
          icon: '❌',
          type: 'error'
        });
      }
    }
  });
}

// Función helper para ajustar brillo de color
function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
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
      const indicator = document.createElement('span');
      indicator.className = 'day-entry-indicator';
      indicator.textContent = '💕';
      dayCell.appendChild(indicator);
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
  journalReadDate.textContent = entry.date.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
  
  // ===> MODIFICACIÓN: Configurar el carrusel <===
  setupCarousel(entry.imageUrls);

  // Rellenar el texto
  journalReadText.textContent = entry.text || 'No hay nada escrito para este día.';
  
  showPhoneApp('journalread');
}


async function openJournalEditView(date) {
  selectedJournalDate = date;
  journalEntryDate.textContent = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Resetear la vista
  journalEntryText.value = '';
  journalGalleryContainer.querySelectorAll('.gallery-thumbnail').forEach(el => el.remove()); // Limpiar galería
  journalImageInput.value = null;

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  if (journalEntriesCache.has(dateStr)) {
    const entry = journalEntriesCache.get(dateStr);
    journalEntryText.value = entry.text || '';
    // Si hay imágenes, renderizarlas
    if (entry.imageUrls && entry.imageUrls.length > 0) {
      entry.imageUrls.forEach(url => {
        const thumb = document.createElement('div');
        thumb.className = 'gallery-thumbnail';
        thumb.innerHTML = `<img src="${url}" alt="Recuerdo">`;
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

  // Obtener las URLs de las imágenes ya existentes
  const existingImageUrls = Array.from(journalGalleryContainer.querySelectorAll('.gallery-thumbnail img')).map(img => img.src);

  if (!text && imageFiles.length === 0 && existingImageUrls.length === 0) {
    alert('Añade fotos o escribe algo para guardar el recuerdo.');
    return;
  }

  saveJournalEntryBtn.disabled = true;
  saveJournalEntryBtn.textContent = 'Guardando...';

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
      lastUpdatedBy: currentUser.uid,
    }, { merge: true });

    await fetchJournalEntriesForMonth();
    showPhoneApp('journal');

  } catch (error) {
    console.error("Error guardando la entrada:", error);
    alert("No se pudo guardar el recuerdo.");
  } finally {
    saveJournalEntryBtn.disabled = false;
    saveJournalEntryBtn.textContent = 'Guardar Recuerdo';
  }
}


// Nueva función para el widget
function updateJournalPreview() {
  const sortedEntries = Array.from(journalEntriesCache.values()).sort((a, b) => b.date.toDate() - a.date.toDate());
  
  if (sortedEntries.length > 0) {
    const latestEntry = sortedEntries[0];
    const date = latestEntry.date.toDate();
    
    previewDate.textContent = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    previewSnippet.textContent = latestEntry.text || 'Un recuerdo guardado en imágenes.';
    previewImage.src = latestEntry.imageUrls?.[0] || 'scr/images/icon-192x192.png'; // Usa la primera imagen o un icono por defecto
    
    journalPreviewWidget.style.display = 'block';
    // Trigger animation
    journalPreviewWidget.classList.remove('journal-preview-show');
    setTimeout(() => journalPreviewWidget.classList.add('journal-preview-show'), 10);
    journalPreviewWidget.onclick = () => openJournalReadView(latestEntry);
  } else {
    journalPreviewWidget.style.display = 'none';
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


// ============================================
// FUNCIONES DE UI - BANDA SONORA
// ============================================



async function renderPlaylists() {
  const playlists = await getPlaylists();
  playlistsList.innerHTML = '';
  if (playlists.length > 0) {
    playlists.forEach(p => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.onclick = () => openPlaylistDetail(p.id, p.name);
      item.innerHTML = `
        <span class="playlist-item-icon">🎵</span>
        <span class="playlist-item-name">${p.name}</span>
      `;
      playlistsList.appendChild(item);
    });
  }
}

async function openPlaylistDetail(playlistId, playlistName) {
  currentPlaylistId = playlistId;
  playlistDetailTitle.textContent = playlistName;
  cassetteLabelTitle.textContent = playlistName;
  
  const songs = await getSongsFromPlaylist(playlistId);
  songList.innerHTML = '';
  if (songs.length > 0) {
// DESPUÉS (CÓDIGO CORREGIDO)
songs.forEach(song => {
  const item = document.createElement('div');
  item.className = 'song-item';

  // Creamos el contenido del item sin el botón
  item.innerHTML = `
    <span class="song-icon">🎧</span>
    <div class="song-info">
      <p class="song-title">${song.name}</p>
      <span class="song-added-by">Añadida por ${song.addedBy}</span>
    </div>
  `;

  // Creamos el botón por separado
  const playButton = document.createElement('button');
  playButton.className = 'play-song-btn';
  playButton.textContent = '▶';

  // Añadimos el listener de clic, que llamará a la función playSong
  playButton.addEventListener('click', () => {
    playSong(song.url, song.name, song.addedBy);
  });

  // Añadimos el botón al item y el item a la lista
  item.appendChild(playButton);
  songList.appendChild(item);
});

  } else {
    songList.innerHTML = '<p style="text-align: center; font-size: 0.8rem; color: #aaa;">Añade la primera canción a esta playlist.</p>';
  }
  
  showPhoneApp('playlistdetail');
}

async function handleCreatePlaylist() {
  const name = newPlaylistNameInput.value.trim();
  if (!name) {
    alert('Por favor, dale un nombre a tu playlist.');
    return;
  }
  await createPlaylist(name);
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
    alert('Por favor, completa el nombre y el enlace de la canción.');
    return;
  }
  // Validación simple del enlace de YouTube
  if (!youtubeLink.includes('youtu.be/') && !youtubeLink.includes('youtube.com/watch')) {
    alert('El enlace no parece ser un vídeo de YouTube válido.');
    return;
  }
  
  await addSongToPlaylist(currentPlaylistId, songName, youtubeLink);
  const currentPlaylistName = playlistDetailTitle.textContent;
  await openPlaylistDetail(currentPlaylistId, currentPlaylistName); // Recargar la vista de la playlist
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
  if (event.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    turntableContainer.classList.add('playing');
  } else {
    isPlaying = false;
    turntableContainer.classList.remove('playing');
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

  if (playerState === YT.PlayerState.PLAYING) {
    // Si está sonando, lo pausamos
    youtubePlayer.pauseVideo();
    isPlaying = false;
    turntableContainer.classList.remove('playing'); // Detiene la animación
  } else {
    // Si está pausado, en buffer o finalizado, lo reproducimos
    youtubePlayer.playVideo();
    isPlaying = true;
    turntableContainer.classList.add('playing'); // Inicia la animación
  }
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
