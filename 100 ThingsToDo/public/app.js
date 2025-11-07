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
  where
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
} from './scr/couple.js';
// ===> AÑADE ESTA LÍNEA <===
import { calculateCoupleStats } from './scr/stats.js';
// import { initializeNotifications, requestNotificationPermission } from './scr/notifications.js';
import { getRandomTask } from './scr/surpriseTasks.js';


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

let wheelOptions = ["Pizza 🍕", "Sushi 🍣", "Peli en casa 🎬", "Paseo ✨"];
let wheelColors = ["#FFDDC1", "#FFABAB", "#FFC3A0", "#FF677D", "#D4A5A5", "#392F5A"];
let startAngle = 0;
let isSpinning = false;

let selectedCouponIcon = 'gift'; // Añade esta línea con las otras variables de estado



// ============================================
// ELEMENTOS DEL DOM
// ============================================

// Pantallas
const loadingScreen = document.getElementById('loading-screen');
const homePage = document.getElementById('home-page');
const dashboardPage = document.getElementById('dashboard-page');
const planDetailPage = document.getElementById('plan-detail-page');

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
const appIcons = document.querySelectorAll('.app-icon');
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

// ===> RESTAURA ESTAS LÍNEAS <===
const wheelCanvas = document.getElementById('decision-wheel-canvas');
const spinWheelBtn = document.getElementById('spin-wheel-btn');
const newWheelOptionInput = document.getElementById('new-wheel-option-input');
const addWheelOptionBtn = document.getElementById('add-wheel-option-btn');
const wheelOptionsList = document.getElementById('wheel-options-list');

// Elementos de la App de Cupones
const couponsList = document.getElementById('coupons-list');
const couponsEmptyState = document.getElementById('coupons-empty-state');
const goToCreateCouponBtn = document.getElementById('go-to-create-coupon-btn');
const couponLivePreview = document.getElementById('coupon-live-preview');
const couponCreatorPreview = document.getElementById('coupon-creator-preview');
const couponTextInput = document.getElementById('coupon-text-input');
const couponIconGrid = document.getElementById('coupon-icon-grid');
const couponIconPreview = document.querySelector('.coupon-icon-preview');
const saveCouponBtn = document.getElementById('save-coupon-btn');





// ============================================
// FUNCIONES DE UI - DASHBOARD
// ============================================

/**
 * Actualiza el estado del botón "Crear Nuevo Plan" basado en si el usuario tiene pareja.
 * @param {boolean} isLinked - True si el usuario está vinculado con una pareja.
 */
function updateNewPlanButtonState(isLinked) {
  const wasDisabled = newPlanBtn.disabled;

  if (isLinked) {
    newPlanBtn.disabled = false;
    newPlanBtn.title = 'Crear un nuevo plan compartido';
    // Si el botón ESTABA desactivado y ahora se activa, añade la animación
    if (wasDisabled) {
      newPlanBtn.classList.add('btn-activated-animation');
      // Elimina la clase después de que termine la animación para que no se repita
      setTimeout(() => {
        newPlanBtn.classList.remove('btn-activated-animation');
      }, 800); // 800ms es la duración de la animación
    }
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
    alert('El título no puede estar vacío.');
    return;
  }

  try {
    await updatePlan(planId, title, description);
    closeEditPlanModal();
    await loadPlans(); // Recargar la lista de planes
  } catch (error) {
    alert('Error al guardar los cambios.');
  }
}

async function handleDeletePlan() {
  const planId = editPlanIdInput.value;
  const planTitle = editPlanTitleInput.value;

  if (!confirm(`¿Estás seguro de que quieres eliminar el plan "${planTitle}"? Esta acción no se puede deshacer.`)) {
    return;
  }

  try {
    await deletePlan(planId);
    closeEditPlanModal();
    await loadPlans();
  } catch (error) {
    alert('Error al eliminar el plan.');
  }
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
    alert('Error al iniciar sesión. Por favor, intenta de nuevo.');
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Error al cerrar sesión. Por favor, intenta de nuevo.');
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
    
    await addDoc(tasksRef, {
      title,
      icon,
      completed: false,
      order,
      createdAt: Timestamp.now(),
    });
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
  
  plans.forEach(plan => {
    const planCard = document.createElement('div');
    planCard.className = 'plan-card';
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
    alert('Por favor, ingresa un título para el plan');
    return;
  }
  
  try {
    await createPlan(title, description);
    toggleNewPlanForm();
    await loadPlans();
  } catch (error) {
    alert('Error al crear el plan. Por favor, intenta de nuevo.');
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
  } else {
    tasksContainer.style.display = 'flex';
    tasksEmptyState.style.display = 'none';
    tasksContainer.innerHTML = '';
    
    tasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
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
    btn.textContent = icon;
    btn.type = 'button';
    btn.onclick = () => {
      selectedIcon = key;
      renderIconGrid();
    };
    
    iconGrid.appendChild(btn);
  });
}

async function handleCreateTask() {
  const title = taskTitleInput.value.trim();
  
  if (!title) {
    alert('Por favor, ingresa un título para la tarea');
    return;
  }
  
  try {
    await createTask(currentPlanId, title, selectedIcon);
    toggleNewTaskForm();
    await loadPlanDetail(currentPlanId);
  } catch (error) {
    alert('Error al crear la tarea. Por favor, intenta de nuevo.');
  }
}

async function handleToggleTask(taskId, currentCompleted) {
  try {
    await toggleTask(currentPlanId, taskId, !currentCompleted);
    await loadPlanDetail(currentPlanId);
  } catch (error) {
    alert('Error al actualizar la tarea. Por favor, intenta de nuevo.');
  }
}

async function handleDeleteTask(taskId) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
    return;
  }
  
  try {
    await deleteTask(currentPlanId, taskId);
    await loadPlanDetail(currentPlanId);
  } catch (error) {
    alert('Error al eliminar la tarea. Por favor, intenta de nuevo.');
  }
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
    alert('No se pudo copiar el código');
  }
}

async function handleLinkPartner() {
  const partnerCode = partnerCodeInput.value.trim().toUpperCase();
  
  if (!partnerCode) {
    alert('Por favor, ingresa un código');
    return;
  }
  
  if (partnerCode.length !== 6) {
    alert('El código debe tener 6 caracteres');
    return;
  }
  
  if (partnerCode === coupleData.code) {
    alert('No puedes vincularte contigo mismo');
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

    
    alert(`¡Vinculado exitosamente con ${result.partnerName}! 💕`);
  } catch (error) {
    console.error('Error al vincular:', error);
    
    if (error.message === 'Código no encontrado') {
      alert('Código no encontrado. Verifica que sea correcto.');
    } else if (error.message === 'No puedes vincularte contigo mismo') {
      alert('No puedes usar tu propio código.');
    } else if (error.message.includes('ya está vinculado')) {
      alert('Este código ya está vinculado con otra persona.');
    } else {
      alert('Error al vincular. Por favor, intenta de nuevo.');
    }
  } finally {
    linkPartnerBtn.disabled = false;
    linkPartnerBtn.textContent = 'Vincular';
  }
}

async function handleUnlinkPartner() {
  if (!confirm('¿Estás seguro de que quieres desvincular tu pareja? Los planes creados juntos ya no serán compartidos.')) {
    return;
  }
  
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

    
    alert('Pareja desvinculada correctamente');
  } catch (error) {
    console.error('Error al desvincular:', error);
    alert('Error al desvincular. Por favor, intenta de nuevo.');
  } finally {
    unlinkPartnerBtn.disabled = false;
    unlinkPartnerBtn.textContent = 'Desvincular Pareja';
  }
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


// Añade estos nuevos listeners
goToCreateCouponBtn.addEventListener('click', openCreateCouponView);
couponTextInput.addEventListener('input', (e) => {
    couponLivePreview.textContent = e.target.value || 'Un gesto de amor increíble';
});
saveCouponBtn.addEventListener('click', handleSaveCoupon);



// En la sección EVENT LISTENERS

// REEMPLAZA todos los bloques de appIcons.forEach por este único bloque:

appIcons.forEach(icon => {
  icon.addEventListener('click', () => {
    const appName = icon.dataset.app;
    if (appName) {
      showPhoneApp(appName); // La única responsabilidad es esta.
    }
  });
});










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
      // Rellenar los campos del modal con los datos calculados
      document.getElementById('stat-total-plans').textContent = stats.totalPlans;
      document.getElementById('stat-completed-plans').textContent = stats.completedPlans;
      document.getElementById('stat-total-tasks').textContent = stats.totalTasks;
      document.getElementById('stat-completion-percentage').textContent = `${stats.completionPercentage}%`;
      
      document.getElementById('stat-user-name').textContent = currentUser.displayName || 'Tú';
      document.getElementById('stat-user-tasks').textContent = stats.userCompletedTasks;
      
      document.getElementById('stat-partner-name').textContent = coupleData.partnerName || 'Pareja';
      document.getElementById('stat-partner-tasks').textContent = stats.partnerCompletedTasks;

      // Mostrar contenido y ocultar carga
      statsLoadingView.style.display = 'none';
      statsContentView.style.display = 'block';
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
    alert('¡Nuevo reto con sus pasos añadido a vuestra lista! 🎉');

  } catch (error) {
    alert('Hubo un error al crear el plan sorpresa.');
    console.error("Error aceptando tarea sorpresa:", error);
  } finally {
    acceptSurpriseTaskBtn.disabled = false;
    acceptSurpriseTaskBtn.textContent = '¡Aceptamos!';
  }
}


// REEMPLAZA tu función showPhoneApp con esta versión final y más inteligente

function showPhoneApp(appName) {
  // Detener animaciones y video si salimos del reproductor
  if (appName !== 'player' && youtubePlayer && typeof youtubePlayer.stopVideo === 'function') {
    youtubePlayer.stopVideo();
    turntableContainer.classList.remove('playing');
    if (cassettePlayer) cassettePlayer.classList.remove('playing');
  }

  // Ocultar todas las vistas
  document.querySelectorAll('.phone-app-view').forEach(view => {
    view.classList.remove('active');
  });

  // Encontrar y mostrar la nueva vista
  const viewToShow = document.getElementById(`phone-view-${appName}`);
  if (viewToShow) {
    viewToShow.classList.add('active'); // Muestra la vista INMEDIATAMENTE

    // Ahora, ejecuta la lógica de inicialización específica para esa app
    switch (appName) {
      case 'surprise':
        updateSurpriseContent();
        setTimeout(() => { if (surpriseCard) surpriseCard.classList.add('is-flipped'); }, 100);
        break;
      case 'timecapsule':
        loadAndRenderCapsules();
        break;
      case 'budget':
        renderGoalsList();
        break;
      case 'journal':
        currentJournalDate = new Date();
        fetchJournalEntriesForMonth();
        break;
      case 'soundtrack':
        renderPlaylists();
        break;
      case 'decision-wheel':
        requestAnimationFrame(() => { initDecisionWheel(); });
        break;
      case 'coupons':
        loadAndRenderCoupons();
        break;
      case 'gratitude':
        loadAndRenderGratitudeNotes();
        break;
      case 'map':
        loadAndRenderMapMarkers();
        break;
      case 'quiz':
        // No necesita inicialización especial
        break;
      case 'calendar':
        renderCalendar();
        break;
      // No se necesita lógica para 'homescreen' u otras vistas estáticas
    }
  } else {
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
    alert(`¡Paciencia! ⏳

Esta cápsula del tiempo no se puede abrir hasta el ${capsule.unlockDate.toLocaleDateString()}.

Fue creada por ${capsule.creatorName}.`);
  } else {
    alert(`🎉 ¡Cápsula del Tiempo Abierta! 🎉

Mensaje de ${capsule.creatorName}:

"${capsule.message}"`);
  }
}

async function handleSaveCapsule() {
  const message = capsuleMessageInput.value.trim();
  const unlockDate = capsuleUnlockDateInput.value;

  if (!message || !unlockDate) {
    alert('Por favor, escribe un mensaje y elige una fecha de apertura.');
    return;
  }

  // Validar que la fecha sea en el futuro
  const today = new Date();
  const selectedDate = new Date(unlockDate);
  today.setHours(0, 0, 0, 0); // Poner la hora a cero para comparar solo fechas
  if (selectedDate <= today) {
    alert('La fecha de apertura debe ser en el futuro.');
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

  } catch (error) {
    alert('No se pudo sellar la cápsula. Inténtalo de nuevo.');
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
    alert('Introduce una cantidad válida para aportar.');
    return;
  }
  await addContribution(currentGoalId, amount);
  await openGoalDetail(currentGoalId); // Recargar la vista
  contributionAmountInput.value = '';
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

        // ===> MODIFICACIÓN: Comprobar si es el día de hoy <===
    const currentDayStr = `${year}-${month}-${i}`;
    if (currentDayStr === todayStr) {
      dayCell.classList.add('today');
    }
    
    if (journalEntriesCache.has(dateStr)) {
            // ===> MODIFICACIÓN: Añadir un span en lugar de una clase <===
      const indicator = document.createElement('span');
      indicator.className = 'day-entry-indicator';
      indicator.textContent = '❤️';
      dayCell.classList.add('has-entry');
    
    }
    
    dayCell.onclick = () => handleDayClick(new Date(year, month, i));

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
    previewImage.src = latestEntry.imageUrls?.[0] || 'images/icon-192x192.png'; // Usa la primera imagen o un icono por defecto
    
    journalPreviewWidget.style.display = 'block';
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
// FUNCIONES DE LA APP: RUEDA DE DECISIONES (VERSIÓN FINAL)
// ============================================

function initDecisionWheel() {
  // Esta comprobación ya la tienes y es muy importante. ¡Mantenla!
  if (!wheelCanvas || !spinWheelBtn || !newWheelOptionInput || !addWheelOptionBtn || !wheelOptionsList) {
    console.error("Error crítico: Faltan elementos de la ruleta en el DOM...");
    return;
  }

  // 2. FUNCIONES INTERNAS (se mantienen igual, pero ahora usan las constantes globales)
  function drawWheel() {
    const ctx = wheelCanvas.getContext('2d');
    const numOptions = wheelOptions.length;
    if (numOptions === 0) {
        ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
        return;
    };
    const arc = Math.PI * 2 / numOptions;
    
    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    ctx.font = '14px Fredoka, sans-serif';

    wheelOptions.forEach((option, i) => {
      const angle = startAngle + i * arc;
      ctx.fillStyle = wheelColors[i % wheelColors.length];

      ctx.beginPath();
      ctx.arc(140, 140, 140, angle, angle + arc, false);
      ctx.lineTo(140, 140);
      ctx.fill();

      ctx.save();
      ctx.fillStyle = "#333";
      ctx.translate(140 + Math.cos(angle + arc / 2) * 90, 140 + Math.sin(angle + arc / 2) * 90);
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      const text = option.length > 15 ? option.substring(0, 13) + '...' : option;
      ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
      ctx.restore();
    });
  }

  function updateList() {
    wheelOptionsList.innerHTML = '';
    wheelOptions.forEach((option, index) => {
      const li = document.createElement('li');
      li.textContent = option;
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-option-btn';
      removeBtn.textContent = '✖';
      removeBtn.onclick = () => {
        wheelOptions.splice(index, 1);
        updateList();
        drawWheel();
      };
      li.appendChild(removeBtn);
      wheelOptionsList.appendChild(li);
    });
    spinWheelBtn.disabled = wheelOptions.length < 2;
  }

  function addOption() {
    const newOption = newWheelOptionInput.value.trim();
    if (newOption && !wheelOptions.includes(newOption)) {
      wheelOptions.push(newOption);
      newWheelOptionInput.value = '';
      updateList();
      drawWheel();
    }
  }

  function spin() {
    if (isSpinning || wheelOptions.length < 2) return;
    isSpinning = true;
    spinWheelBtn.disabled = true;
    
    const spinAngle = Math.random() * 20 + 15;
    const finalAngle = startAngle + spinAngle;

    wheelCanvas.style.transition = 'transform 6s cubic-bezier(0.1, 0.7, 0.3, 1)';
    wheelCanvas.style.transform = `rotate(${finalAngle}rad)`;

    setTimeout(() => {
      const degrees = (finalAngle * 180 / Math.PI) % 360;
      const arcSize = 360 / wheelOptions.length;
      const winningIndex = Math.floor((360 - degrees + 270) % 360 / arcSize);
      const winner = wheelOptions[winningIndex];
      
      alert(`🎉 ¡La decisión es: ${winner}! 🎉`);

      isSpinning = false;
      updateList();
      
      wheelCanvas.style.transition = 'none';
      startAngle = finalAngle % (Math.PI * 2);
      wheelCanvas.style.transform = `rotate(${startAngle}rad)`;
    }, 6000);
  }

  // 3. ASIGNAR LISTENERS (solo una vez)
  spinWheelBtn.onclick = spin;
  addWheelOptionBtn.onclick = addOption;
  newWheelOptionInput.onkeypress = (e) => {
    if (e.key === 'Enter') addOption();
  };

  // 4. DIBUJAR LA RUEDA INICIAL
  updateList();
  drawWheel();
}



// ============================================
// FUNCIONES DE FIRESTORE - CUPONES DE AMOR
// ============================================

async function createCoupon(text, icon) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const couponsRef = collection(db, 'couples', currentCoupleId, 'coupons');
    await addDoc(couponsRef, {
      text,
      icon,
      redeemed: false,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now(),
      redeemedAt: null,
      redeemedBy: null
    });
  } catch (error) {
    console.error('Error al crear cupón:', error);
    throw error;
  }
}

async function getCoupons() {
  if (!currentCoupleId) return [];
  
  try {
    const couponsRef = collection(db, 'couples', currentCoupleId, 'coupons');
    const q = query(couponsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error al obtener cupones:', error);
    return [];
  }
}

async function redeemCoupon(couponId) {
    if (!currentCoupleId || !currentUser) return;
    try {
        const couponRef = doc(db, 'couples', currentCoupleId, 'coupons', couponId);
        await updateDoc(couponRef, {
            redeemed: true,
            redeemedAt: Timestamp.now(),
            redeemedBy: currentUser.displayName
        });
    } catch (error) {
        console.error('Error al canjear cupón:', error);
        throw error;
    }
}

// ============================================
// FUNCIONES DE UI - CUPONES DE AMOR
// ============================================

async function loadAndRenderCoupons() {
  const allCoupons = await getCoupons();
  couponsList.innerHTML = '';
  
  if (allCoupons.length === 0) {
    couponsEmptyState.style.display = 'block';
  } else {
    couponsEmptyState.style.display = 'none';
    allCoupons.forEach(coupon => {
      const couponEl = document.createElement('div');
      couponEl.className = `coupon-ticket ${coupon.redeemed ? 'redeemed' : ''}`;
      couponEl.dataset.couponId = coupon.id;

      let redeemButtonHTML = '';
      if (!coupon.redeemed) {
          redeemButtonHTML = `<button class="coupon-redeem-btn" title="Canjear Cupón">🎟️</button>`;
      }

      couponEl.innerHTML = `
        <div class="coupon-stub">${KAWAII_ICONS[coupon.icon] || '🎟️'}</div>
        <div class="coupon-main">
            <p>${coupon.text}</p>
            <span>De: <strong>${coupon.creatorName}</strong></span>
            ${coupon.redeemed ? `<span>Canjeado por: <strong>${coupon.redeemedBy}</strong></span>` : ''}
        </div>
        ${redeemButtonHTML}
      `;
      
      couponsList.appendChild(couponEl);

      if (!coupon.redeemed) {
        couponEl.querySelector('.coupon-redeem-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`¿Seguro que quieres canjear el cupón: "${coupon.text}"?`)) {
                await handleRedeemCoupon(coupon.id);
            }
        });
      }
    });
  }
}

function openCreateCouponView() {
    couponTextInput.value = '';
    couponLivePreview.textContent = 'Un gesto de amor increíble';
    couponCreatorPreview.textContent = currentUser.displayName || 'Tú';
    selectedCouponIcon = 'gift';
    renderCouponIconGrid();
    showPhoneApp('createcoupon');
}

function renderCouponIconGrid() {
  couponIconGrid.innerHTML = '';
  const couponIcons = ['gift', 'pizza', 'movie', 'bath', 'music', 'travel', 'cup', 'star', 'heart'];

  couponIcons.forEach(key => {
    const btn = document.createElement('button');
    btn.className = `icon-btn ${key === selectedCouponIcon ? 'selected' : ''}`;
    btn.textContent = KAWAII_ICONS[key];
    btn.type = 'button';
    btn.onclick = () => {
      selectedCouponIcon = key;
      couponIconPreview.textContent = KAWAII_ICONS[key];
      renderCouponIconGrid();
    };
    couponIconGrid.appendChild(btn);
  });
  couponIconPreview.textContent = KAWAII_ICONS[selectedCouponIcon];
}

async function handleSaveCoupon() {
  const text = couponTextInput.value.trim();
  if (!text) {
    alert('Por favor, escribe el contenido de tu vale.');
    return;
  }

  try {
    saveCouponBtn.disabled = true;
    saveCouponBtn.textContent = 'Regalando...';
    await createCoupon(text, selectedCouponIcon);
    await loadAndRenderCoupons();
    showPhoneApp('coupons');
  } catch (error) {
    alert('No se pudo crear el cupón. Inténtalo de nuevo.');
  } finally {
    saveCouponBtn.disabled = false;
    saveCouponBtn.textContent = 'Crear y Regalar Cupón';
  }
}

async function handleRedeemCoupon(couponId) {
    try {
        await redeemCoupon(couponId);
        // Animación de canjeo
        const couponEl = document.querySelector(`.coupon-ticket[data-coupon-id="${couponId}"]`);
        if (couponEl) {
            couponEl.classList.add('redeemed');
            couponEl.querySelector('.coupon-redeem-btn')?.remove();
            // Recargamos toda la lista para actualizar el texto "Canjeado por"
            setTimeout(loadAndRenderCoupons, 800); 
        }
    } catch (error) {
        alert('Error al canjear el cupón.');
    }
}

// ============================================
// FUNCIONES DE FIRESTORE - TARRO DE AGRADECIMIENTOS
// ============================================

async function addGratitudeNote(text, isAnonymous) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const notesRef = collection(db, 'couples', currentCoupleId, 'gratitudeNotes');
    await addDoc(notesRef, {
      text,
      isAnonymous: isAnonymous || false,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al añadir nota de agradecimiento:', error);
    throw error;
  }
}

async function getGratitudeNotes() {
  if (!currentCoupleId) return [];
  
  try {
    const notesRef = collection(db, 'couples', currentCoupleId, 'gratitudeNotes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error al obtener notas de agradecimiento:', error);
    return [];
  }
}

// ============================================
// FUNCIONES DE FIRESTORE - MAPA DE AVENTURAS
// ============================================

async function addMapMarker(title, description, latitude, longitude) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const markersRef = collection(db, 'couples', currentCoupleId, 'mapMarkers');
    await addDoc(markersRef, {
      title,
      description,
      latitude,
      longitude,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al añadir marcador:', error);
    throw error;
  }
}

async function getMapMarkers() {
  if (!currentCoupleId) return [];
  
  try {
    const markersRef = collection(db, 'couples', currentCoupleId, 'mapMarkers');
    const q = query(markersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error al obtener marcadores:', error);
    return [];
  }
}

// ============================================
// FUNCIONES DE FIRESTORE - CALENDARIO DE CITAS
// ============================================

async function addDate(title, date, time, location, description) {
  if (!currentCoupleId || !currentUser) return;
  
  try {
    const datesRef = collection(db, 'couples', currentCoupleId, 'dates');
    await addDoc(datesRef, {
      title,
      date: Timestamp.fromDate(new Date(`${date}T${time}`)),
      location,
      description,
      createdBy: currentUser.uid,
      creatorName: currentUser.displayName,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error al añadir cita:', error);
    throw error;
  }
}

async function getDates() {
  if (!currentCoupleId) return [];
  
  try {
    const datesRef = collection(db, 'couples', currentCoupleId, 'dates');
    const q = query(datesRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate(),
    }));
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return [];
  }
}

async function deleteDate(dateId) {
  if (!currentCoupleId || !dateId) return;
  
  try {
    const dateRef = doc(db, 'couples', currentCoupleId, 'dates', dateId);
    await deleteDoc(dateRef);
  } catch (error) {
    console.error('Error al eliminar cita:', error);
    throw error;
  }
}

// ============================================
// FUNCIONES DE UI - TARRO DE AGRADECIMIENTOS
// ============================================

async function loadAndRenderGratitudeNotes() {
  const notes = await getGratitudeNotes();
  const container = document.getElementById('gratitude-notes-container');
  
  if (container) {
    container.innerHTML = '';
    
    notes.forEach((note, index) => {
      const noteEl = document.createElement('div');
      noteEl.className = 'gratitude-note';
      noteEl.style.left = `${Math.random() * 70 + 15}%`;
      noteEl.style.top = `${Math.random() * 70 + 15}%`;
      noteEl.style.backgroundColor = getRandomPastelColor();
      noteEl.style.transform = `rotate(${Math.random() * 20 - 10}deg)`;
      noteEl.title = note.text;
      
      // Mostrar solo las primeras letras del texto
      const shortText = note.text.length > 10 ? note.text.substring(0, 10) + '...' : note.text;
      noteEl.textContent = shortText;
      
      noteEl.addEventListener('click', () => {
        const creator = note.isAnonymous ? 'Anónimo' : note.creatorName;
        alert(`Nota de agradecimiento de ${creator}:\n\n"${note.text}"`);
      });
      
      container.appendChild(noteEl);
    });
  }
}

function getRandomPastelColor() {
  const colors = [
    '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', 
    '#E0BBE4', '#FEC8D8', '#FF9AA2', '#FFB7B2', '#FFDAC1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function handleAddGratitudeNote() {
  const noteInput = document.getElementById('gratitude-note-input');
  const anonymousCheckbox = document.getElementById('anonymous-checkbox');
  
  const text = noteInput.value.trim();
  if (!text) {
    alert('Por favor, escribe algo por lo que estés agradecido.');
    return;
  }
  
  try {
    const addButton = document.getElementById('add-gratitude-note-btn');
    addButton.disabled = true;
    addButton.textContent = 'Añadiendo...';
    
    await addGratitudeNote(text, anonymousCheckbox.checked);
    noteInput.value = '';
    anonymousCheckbox.checked = false;
    
    await loadAndRenderGratitudeNotes();
  } catch (error) {
    alert('No se pudo añadir la nota. Inténtalo de nuevo.');
  } finally {
    const addButton = document.getElementById('add-gratitude-note-btn');
    addButton.disabled = false;
    addButton.textContent = 'Añadir Nota';
  }
}

function handleShakeJar() {
  const notes = document.querySelectorAll('.gratitude-note');
  if (notes.length === 0) {
    alert('¡El tarro está vacío! Añade algunas notas de agradecimiento primero.');
    return;
  }
  
  // Animar todas las notas
  notes.forEach(note => {
    note.style.transition = 'all 1s ease';
    note.style.transform = `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px) rotate(${Math.random() * 360}deg)`;
  });
  
  // Seleccionar una nota al azar después de la animación
  setTimeout(() => {
    const randomNote = notes[Math.floor(Math.random() * notes.length)];
    const rect = randomNote.getBoundingClientRect();
    const containerRect = document.getElementById('gratitude-notes-container').getBoundingClientRect();
    
    // Centrar la nota seleccionada
    randomNote.style.transition = 'all 0.5s ease';
    randomNote.style.left = '50%';
    randomNote.style.top = '50%';
    randomNote.style.transform = 'translate(-50%, -50%) rotate(0deg)';
    randomNote.style.zIndex = '100';
    randomNote.style.fontSize = '1rem';
    randomNote.style.width = 'auto';
    randomNote.style.height = 'auto';
    randomNote.style.padding = '10px';
    
    // Mostrar el contenido completo de la nota
    setTimeout(() => {
      const creator = randomNote.title.includes('Anónimo') ? 'Anónimo' : randomNote.title.split(':')[0];
      alert(`Nota seleccionada al azar:

"${randomNote.title.split(':')[1].trim()}"

De: ${creator}`);
    }, 600);
  }, 1000);
}

// ============================================
// FUNCIONES DE UI - MAPA DE AVENTURAS
// ============================================

async function loadAndRenderMapMarkers() {
  const markers = await getMapMarkers();
  const container = document.getElementById('markers-container');
  const emptyState = document.getElementById('markers-empty-state');
  
  if (container && emptyState) {
    container.innerHTML = '';
    
    if (markers.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
      
      markers.forEach(marker => {
        const markerEl = document.createElement('div');
        markerEl.className = 'marker-item';
        markerEl.innerHTML = `
          <div class="marker-icon">📍</div>
          <div class="marker-info">
            <div class="marker-title">${marker.title}</div>
            <div class="marker-date">${marker.createdAt.toDate().toLocaleDateString()}</div>
          </div>
        `;
        
        markerEl.addEventListener('click', () => {
          alert(`Marcador: ${marker.title}

${marker.description || 'Sin descripción'}

Añadido por: ${marker.creatorName}`);
        });
        
        container.appendChild(markerEl);
      });
    }
  }
}

function openAddMapMarkerView() {
  const title = prompt('Nombre del lugar:');
  if (!title) return;
  
  const description = prompt('Descripción (opcional):') || '';
  
  // En una implementación real, aquí obtendríamos las coordenadas reales
  // Por ahora usamos coordenadas de ejemplo
  const latitude = 40.4168 + (Math.random() - 0.5) * 0.1;
  const longitude = -3.7038 + (Math.random() - 0.5) * 0.1;
  
  handleAddMapMarker(title, description, latitude, longitude);
}

async function handleAddMapMarker(title, description, latitude, longitude) {
  try {
    const addButton = document.getElementById('add-map-marker-btn');
    if (addButton) {
      addButton.disabled = true;
      addButton.textContent = 'Añadiendo...';
    }
    
    await addMapMarker(title, description, latitude, longitude);
    await loadAndRenderMapMarkers();
    
    // Mostrar mensaje de éxito
    alert(`¡Marcador añadido!\n\n"${title}" ha sido añadido a tu mapa de aventuras.`);
  } catch (error) {
    alert('No se pudo añadir el marcador. Inténtalo de nuevo.');
  } finally {
    const addButton = document.getElementById('add-map-marker-btn');
    if (addButton) {
      addButton.disabled = false;
      addButton.textContent = '+ Añadir Marcador';
    }
  }
}

// ============================================
// FUNCIONES DE UI - CUÁNTO NOS CONOCEMOS
// ============================================

// Preguntas predefinidas para el quiz
const QUIZ_QUESTIONS = [
  {
    question: "¿Cuál es mi comida favorita?",
    options: ["Pizza", "Sushi", "Ensalada César", "Paella"],
    correct: 1
  },
  {
    question: "¿Cuál es mi película favorita?",
    options: ["Titanic", "El Padrino", "Harry Potter", "Star Wars"],
    correct: 0
  },
  {
    question: "¿Cuál es mi color favorito?",
    options: ["Rojo", "Azul", "Verde", "Morado"],
    correct: 2
  },
  {
    question: "¿Cuál es mi hobby favorito?",
    options: ["Leer", "Cocinar", "Bailar", "Dormir"],
    correct: 1
  },
  {
    question: "¿Cuál es mi estación del año favorita?",
    options: ["Primavera", "Verano", "Otoño", "Invierno"],
    correct: 2
  }
];

let currentQuizQuestion = 0;
let quizScore = 0;
let selectedQuizOption = null;

function startQuiz() {
  currentQuizQuestion = 0;
  quizScore = 0;
  selectedQuizOption = null;
  
  document.getElementById('quiz-start-screen').style.display = 'none';
  document.getElementById('quiz-question-screen').style.display = 'flex';
  document.getElementById('quiz-results-screen').style.display = 'none';
  
  showQuizQuestion();
}

function showQuizQuestion() {
  if (currentQuizQuestion >= QUIZ_QUESTIONS.length) {
    showQuizResults();
    return;
  }
  
  const question = QUIZ_QUESTIONS[currentQuizQuestion];
  const questionText = document.getElementById('quiz-question-text');
  const optionsContainer = document.getElementById('quiz-options-container');
  const progressText = document.getElementById('quiz-progress-text');
  const progressFill = document.getElementById('quiz-progress-fill');
  const nextBtn = document.getElementById('quiz-next-btn');
  
  if (questionText && optionsContainer && progressText && progressFill && nextBtn) {
    questionText.textContent = question.question;
    
    optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'quiz-option';
      optionEl.textContent = option;
      optionEl.addEventListener('click', () => selectQuizOption(optionEl, index));
      optionsContainer.appendChild(optionEl);
    });
    
    progressText.textContent = `Pregunta ${currentQuizQuestion + 1} de ${QUIZ_QUESTIONS.length}`;
    progressFill.style.width = `${((currentQuizQuestion) / QUIZ_QUESTIONS.length) * 100}%`;
    
    nextBtn.disabled = true;
    selectedQuizOption = null;
  }
}

function selectQuizOption(optionElement, optionIndex) {
  // Deseleccionar opciones anteriores
  document.querySelectorAll('.quiz-option').forEach(el => {
    el.classList.remove('selected');
  });
  
  // Seleccionar la nueva opción
  optionElement.classList.add('selected');
  selectedQuizOption = optionIndex;
  
  // Habilitar el botón siguiente
  const nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) {
    nextBtn.disabled = false;
  }
}

function nextQuizQuestion() {
  if (selectedQuizOption === null) return;
  
  // Verificar si la respuesta es correcta
  const question = QUIZ_QUESTIONS[currentQuizQuestion];
  if (selectedQuizOption === question.correct) {
    quizScore++;
  }
  
  currentQuizQuestion++;
  showQuizQuestion();
}

function showQuizResults() {
  document.getElementById('quiz-question-screen').style.display = 'none';
  document.getElementById('quiz-results-screen').style.display = 'flex';
  
  const scorePercentage = Math.round((quizScore / QUIZ_QUESTIONS.length) * 100);
  const scoreText = document.getElementById('quiz-score-text');
  const titleText = document.getElementById('quiz-title-text');
  const correctAnswers = document.getElementById('correct-answers');
  const totalQuestions = document.getElementById('total-questions');
  
  if (scoreText && titleText && correctAnswers && totalQuestions) {
    scoreText.textContent = `${scorePercentage}%`;
    correctAnswers.textContent = quizScore;
    totalQuestions.textContent = QUIZ_QUESTIONS.length;
    
    // Determinar título basado en el puntaje
    let title = "";
    if (scorePercentage >= 90) {
      title = "Pareja Perfecta 💖";
    } else if (scorePercentage >= 70) {
      title = "Almas Gemelas 🌟";
    } else if (scorePercentage >= 50) {
      title = "Dúo Dinámico ⚡";
    } else {
      title = "Aprendices de Amor 🌱";
    }
    
    titleText.textContent = title;
  }
}

function restartQuiz() {
  startQuiz();
}

// ============================================
// FUNCIONES DE UI - CALENDARIO DE CITAS
// ============================================

let currentDate = new Date();

function renderCalendar() {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYear = document.getElementById('calendar-month-year');
  
  if (!calendarGrid || !monthYear) return;
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  monthYear.textContent = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  
  // Primer día del mes
  const firstDay = new Date(year, month, 1);
  // Último día del mes
  const lastDay = new Date(year, month + 1, 0);
  // Día de la semana del primer día (0 = domingo, 1 = lunes, etc.)
  const firstDayOfWeek = firstDay.getDay();
  // Número de días en el mes
  const daysInMonth = lastDay.getDate();
  
  calendarGrid.innerHTML = '';
  
  // Rellenar días vacíos al principio
  for (let i = 0; i < firstDayOfWeek; i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day other-month';
    calendarGrid.appendChild(dayEl);
  }
  
  // Rellenar días del mes
  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = day;
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Marcar día actual
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
      dayEl.classList.add('today');
    }
    
    // Añadir evento de clic
    dayEl.addEventListener('click', () => openDateDetailView(new Date(year, month, day)));
    
    calendarGrid.appendChild(dayEl);
  }
}

function navigateCalendar(direction) {
  currentDate.setMonth(currentDate.getMonth() + direction);
  renderCalendar();
}

function openDateDetailView(date) {
  // Mostrar la vista de detalle de cita
  showPhoneApp('date-detail');
  
  // Prellenar la fecha
  const dateInput = document.getElementById('date-date-input');
  if (dateInput) {
    dateInput.value = date.toISOString().split('T')[0];
  }
  
  // Limpiar otros campos
  const titleInput = document.getElementById('date-title-input');
  const timeInput = document.getElementById('date-time-input');
  const locationInput = document.getElementById('date-location-input');
  const descriptionInput = document.getElementById('date-description-input');
  const deleteBtn = document.getElementById('delete-date-btn');
  
  if (titleInput) titleInput.value = '';
  if (timeInput) timeInput.value = '19:00';
  if (locationInput) locationInput.value = '';
  if (descriptionInput) descriptionInput.value = '';
  if (deleteBtn) deleteBtn.style.display = 'none';
  
  // Guardar la fecha actual para referencia
  window.currentEditingDate = null;
}

async function handleSaveDate() {
  const titleInput = document.getElementById('date-title-input');
  const dateInput = document.getElementById('date-date-input');
  const timeInput = document.getElementById('date-time-input');
  const locationInput = document.getElementById('date-location-input');
  const descriptionInput = document.getElementById('date-description-input');
  
  if (!titleInput || !dateInput || !timeInput) return;
  
  const title = titleInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;
  const location = locationInput ? locationInput.value.trim() : '';
  const description = descriptionInput ? descriptionInput.value.trim() : '';
  
  if (!title || !date || !time) {
    alert('Por favor, completa todos los campos obligatorios.');
    return;
  }
  
  try {
    const saveBtn = document.getElementById('save-date-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';
    }
    
    await addDate(title, date, time, location, description);
    
    // Volver al calendario
    showPhoneApp('calendar');
    renderCalendar();
    
    alert('¡Cita guardada con éxito!');
  } catch (error) {
    alert('No se pudo guardar la cita. Inténtalo de nuevo.');
  } finally {
    const saveBtn = document.getElementById('save-date-btn');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Guardar';
    }
  }
}

// Inicializar event listeners para nuevas funcionalidades
function initializeNewFeatureEventListeners() {
  // Event Listeners para el Tarro de Agradecimientos
  const addGratitudeBtn = document.getElementById('add-gratitude-note-btn');
  const shakeJarBtn = document.getElementById('shake-jar-btn');
  
  if (addGratitudeBtn) {
    addGratitudeBtn.addEventListener('click', handleAddGratitudeNote);
  }
  
  if (shakeJarBtn) {
    shakeJarBtn.addEventListener('click', handleShakeJar);
  }

  // Event Listeners para el Mapa de Aventuras
  const addMapMarkerBtn = document.getElementById('add-map-marker-btn');
  
  if (addMapMarkerBtn) {
    addMapMarkerBtn.addEventListener('click', openAddMapMarkerView);
  }

  // Event Listeners para el Quiz de Pareja
  const startQuizBtn = document.getElementById('start-quiz-btn');
  const quizNextBtn = document.getElementById('quiz-next-btn');
  const restartQuizBtn = document.getElementById('restart-quiz-btn');
  
  if (startQuizBtn) {
    startQuizBtn.addEventListener('click', startQuiz);
  }
  
  if (quizNextBtn) {
    quizNextBtn.addEventListener('click', nextQuizQuestion);
  }
  
  if (restartQuizBtn) {
    restartQuizBtn.addEventListener('click', restartQuiz);
  }

  // Event Listeners para el Calendario de Citas
  const prevMonthBtn = document.getElementById('prev-month-btn');
  const nextMonthBtn = document.getElementById('next-month-btn');
  const addDateBtn = document.getElementById('add-date-btn');
  const saveDateBtn = document.getElementById('save-date-btn');
  
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => navigateCalendar(-1));
  }
  
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => navigateCalendar(1));
  }
  
  if (addDateBtn) {
    addDateBtn.addEventListener('click', () => openDateDetailView(new Date()));
  }
  
  if (saveDateBtn) {
    saveDateBtn.addEventListener('click', handleSaveDate);
  }
  
  // Event Listeners para los iconos de las nuevas apps
  const appIcons = document.querySelectorAll('.app-icon[data-app]');
  appIcons.forEach(icon => {
    const app = icon.getAttribute('data-app');
    if (['gratitude', 'map', 'quiz', 'calendar'].includes(app)) {
      icon.addEventListener('click', () => showPhoneApp(app));
    }
  });
}

// Llamar a la función de inicialización cuando el DOM esté cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNewFeatureEventListeners);
} else {
  initializeNewFeatureEventListeners();
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
