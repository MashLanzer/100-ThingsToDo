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
  Timestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
};

// ============================================
// ESTADO DE LA APLICACIÓN
// ============================================

let currentUser = null;
let currentCoupleId = null;
let currentPlanId = null;
let selectedIcon = 'clipboard';

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
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    currentCoupleId = `couple-${user.uid}`;
    userName.textContent = user.displayName || user.email;
    navigateToDashboard();
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
    await addDoc(plansRef, {
      title,
      description: description || '',
      createdBy: currentUser.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
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
    planCard.onclick = () => navigateToPlanDetail(plan.id);
    
    const title = document.createElement('h3');
    title.className = 'plan-card-title';
    title.textContent = plan.title;
    
    planCard.appendChild(title);
    
    if (plan.description) {
      const desc = document.createElement('p');
      desc.className = 'plan-card-desc';
      desc.textContent = plan.description;
      planCard.appendChild(desc);
    }
    
    const date = document.createElement('p');
    date.className = 'plan-card-date';
    date.textContent = `Creado ${plan.createdAt.toLocaleDateString('es-ES')}`;
    planCard.appendChild(date);
    
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
// EVENT LISTENERS
// ============================================

// Home
loginBtn.addEventListener('click', handleLogin);

// Dashboard
logoutBtn.addEventListener('click', handleLogout);
newPlanBtn.addEventListener('click', toggleNewPlanForm);
createPlanBtn.addEventListener('click', handleCreatePlan);
cancelPlanBtn.addEventListener('click', toggleNewPlanForm);

// Plan Detail
backBtn.addEventListener('click', navigateToDashboard);
newTaskBtn.addEventListener('click', toggleNewTaskForm);
createTaskBtn.addEventListener('click', handleCreateTask);
cancelTaskBtn.addEventListener('click', toggleNewTaskForm);

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

// ============================================
// INICIALIZACIÓN
// ============================================

// Inicializar grid de iconos
renderIconGrid();

// Mostrar pantalla de carga inicialmente
showLoading();
