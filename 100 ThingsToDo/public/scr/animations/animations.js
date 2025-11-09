/**
 * ANIMATIONS.JS
 * Sistema centralizado de animaciones y micro-animaciones
 * Maneja todas las interacciones visuales de la aplicación
 */

class AnimationManager {
  constructor() {
    this.observers = new Map();
    this.init();
  }

  /**
   * Inicializa todas las animaciones
   */
  init() {
    this.initButtonAnimations();
    this.initModalAnimations();
    this.initCardAnimations();
    this.initInputAnimations();
    this.initListAnimations();
    this.initSpecialButtons();
    this.initMiniAppsAnimations();
    this.observeNewElements();
  }

  /**
   * ANIMACIONES DE BOTONES
   * Aplica efectos a todos los botones de la aplicación
   */
  initButtonAnimations() {
    // Delegación de eventos para todos los botones
    document.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('.btn, .btn-primary, .btn-outline, .icon-btn, .delete-btn, .google-btn');
      if (btn) {
        btn.classList.add('btn-press');
      }
    });

    document.addEventListener('mouseup', () => {
      document.querySelectorAll('.btn-press').forEach(btn => {
        btn.classList.remove('btn-press');
      });
    });

    // Efecto hover con iconos
    document.addEventListener('mouseenter', (e) => {
      if (!e.target || !e.target.closest) return;
      const btn = e.target.closest('.btn, .btn-primary, .btn-outline');
      if (btn) {
        const icon = btn.querySelector('svg');
        if (icon) {
          icon.classList.add('icon-bounce');
        }
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (!e.target || !e.target.closest) return;
      const btn = e.target.closest('.btn, .btn-primary, .btn-outline');
      if (btn) {
        const icon = btn.querySelector('svg');
        if (icon) {
          icon.classList.remove('icon-bounce');
        }
      }
    }, true);
  }

  /**
   * ANIMACIONES ESPECIALES PARA BOTONES ESPECÍFICOS
   */
  initSpecialButtons() {
    // Agregar clase google-btn al botón de Google
    const googleBtn = document.querySelector('button[aria-label*="Google"]');
    if (googleBtn) {
      googleBtn.classList.add('google-btn');
    }

    // Efecto especial al botón de crear nuevo plan
    const newPlanBtn = document.getElementById('newPlanBtn');
    if (newPlanBtn) {
      newPlanBtn.addEventListener('mouseenter', () => {
        const sparkle = newPlanBtn.querySelector('.sparkle-text');
        if (sparkle) {
          sparkle.style.animation = 'none';
          setTimeout(() => {
            sparkle.style.animation = 'shimmer 1s ease-in-out';
          }, 10);
        }
      });
    }
  }

  /**
   * ANIMACIONES DE MODALES
   * Controla la apertura y cierre de modales
   */
  initModalAnimations() {
    // Observer para detectar cuando se muestran modales
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
          const modal = mutation.target;
          if (modal.classList.contains('modal')) {
            const isVisible = modal.style.display === 'flex' || modal.classList.contains('active');
            
            if (isVisible && !modal.classList.contains('modal-animating')) {
              this.animateModalOpen(modal);
            }
          }
        }
      });
    });

    // Observar todos los modales
    document.querySelectorAll('.modal').forEach(modal => {
      modalObserver.observe(modal, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    });

    this.observers.set('modals', modalObserver);

    // Detectar clics en botones de cerrar
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('close-btn') || e.target.closest('.close-btn')) {
        const modal = e.target.closest('.modal');
        if (modal) {
          this.animateModalClose(modal);
        }
      }
    });
  }

  /**
   * Anima la apertura de un modal
   */
  animateModalOpen(modal) {
    modal.classList.add('modal-animating', 'modal-enter');
    
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.classList.add('modal-content-enter');
    }

    setTimeout(() => {
      modal.classList.remove('modal-animating', 'modal-enter');
      if (content) {
        content.classList.remove('modal-content-enter');
      }
    }, 300);
  }

  /**
   * Anima el cierre de un modal
   */
  animateModalClose(modal) {
    modal.classList.add('modal-exit');
    
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.classList.add('modal-content-exit');
    }

    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove('modal-exit');
      if (content) {
        content.classList.remove('modal-content-exit');
      }
    }, 250);
  }

  /**
   * ANIMACIONES DE TARJETAS
   * Plan cards, feature cards, etc.
   */
  initCardAnimations() {
    // Entrada de tarjetas al hacer scroll
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const cardObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('card-visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.plan-card, .feature-card').forEach(card => {
      cardObserver.observe(card);
    });

    this.observers.set('cards', cardObserver);

    // Hover en tarjetas
    document.addEventListener('mouseenter', (e) => {
      if (!e.target || !e.target.closest) return;
      const card = e.target.closest('.plan-card, .feature-card');
      if (card) {
        card.classList.add('card-hover');
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      if (!e.target || !e.target.closest) return;
      const card = e.target.closest('.plan-card, .feature-card');
      if (card) {
        card.classList.remove('card-hover');
      }
    }, true);
  }

  /**
   * ANIMACIONES DE INPUTS
   * Focus, typing, validación
   */
  initInputAnimations() {
    // Focus
    document.addEventListener('focus', (e) => {
      if (e.target.matches('.input, .textarea')) {
        e.target.classList.add('input-focus');
        const label = e.target.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
          label.classList.add('label-active');
        }
      }
    }, true);

    // Blur
    document.addEventListener('blur', (e) => {
      if (e.target.matches('.input, .textarea')) {
        e.target.classList.remove('input-focus');
        const label = e.target.previousElementSibling;
        if (label && label.tagName === 'LABEL' && !e.target.value) {
          label.classList.remove('label-active');
        }
      }
    }, true);

    // Typing animation
    document.addEventListener('input', (e) => {
      if (e.target.matches('.input, .textarea')) {
        e.target.classList.add('input-typing');
        clearTimeout(e.target._typingTimeout);
        e.target._typingTimeout = setTimeout(() => {
          e.target.classList.remove('input-typing');
        }, 500);
      }
    });
  }

  /**
   * ANIMACIONES DE LISTAS
   * Tareas, items dinámicos
   */
  initListAnimations() {
    // Observar cambios en listas de tareas
    const listObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList.contains('task-item')) {
            this.animateItemEntry(node);
          }
        });
      });
    });

    const taskList = document.getElementById('taskList');
    if (taskList) {
      listObserver.observe(taskList, {
        childList: true
      });
    }

    this.observers.set('tasks', listObserver);
  }

  /**
   * Anima la entrada de un nuevo item
   */
  animateItemEntry(item) {
    item.classList.add('item-enter');
    setTimeout(() => {
      item.classList.remove('item-enter');
    }, 400);
  }

  /**
   * Anima la salida de un item
   */
  animateItemExit(item, callback) {
    item.classList.add('item-exit');
    setTimeout(() => {
      if (callback) callback();
    }, 300);
  }

  /**
   * OBSERVER GLOBAL
   * Detecta nuevos elementos y aplica animaciones
   */
  observeNewElements() {
    const globalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Re-aplicar observadores a nuevos modales
            if (node.classList && node.classList.contains('modal')) {
              this.initModalAnimations();
            }
            // Re-aplicar observadores a nuevas tarjetas
            if (node.classList && (node.classList.contains('plan-card') || node.classList.contains('feature-card'))) {
              this.initCardAnimations();
            }
          }
        });
      });
    });

    globalObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.set('global', globalObserver);
  }

  /**
   * UTILIDADES PÚBLICAS
   */

  /**
   * ANIMACIONES DE MINI-APPS
   */
  initMiniAppsAnimations() {
    // Animar iconos de apps en el homescreen
    document.querySelectorAll('.phone-app-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        icon.classList.add('btn-press');
        setTimeout(() => icon.classList.remove('btn-press'), 200);
      });
    });

    // Observar cambios en las vistas de apps
    const appObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const appView = mutation.target;
          if (appView.classList.contains('phone-app-view') && appView.classList.contains('active')) {
            this.animateAppContent(appView);
          }
        }
      });
    });

    document.querySelectorAll('.phone-app-view').forEach(view => {
      appObserver.observe(view, {
        attributes: true,
        attributeFilter: ['class']
      });
    });

    this.observers.set('apps', appObserver);
  }

  /**
   * Anima el contenido de una app cuando se abre
   */
  animateAppContent(appView) {
    // Animar elementos específicos según la app
    const appId = appView.id;

    // Música - animar casete y controles
    if (appId === 'phone-view-player') {
      const cassette = appView.querySelector('.cassette-player');
      const turntable = appView.querySelector('.turntable-container');
      if (cassette) {
        cassette.style.animation = 'none';
        setTimeout(() => {
          cassette.style.animation = '';
        }, 10);
      }
    }

    // Reto Diario - animar tarjeta
    if (appId === 'phone-view-surprise') {
      const card = appView.querySelector('.surprise-card');
      if (card) {
        card.style.animation = 'none';
        setTimeout(() => {
          card.style.animation = '';
        }, 10);
      }
    }

    // Cápsula Temporal - animar items
    if (appId === 'phone-view-timecapsule') {
      const items = appView.querySelectorAll('.capsule-item');
      items.forEach((item, index) => {
        item.style.animation = 'none';
        setTimeout(() => {
          item.style.animation = '';
        }, 10 + (index * 50));
      });
    }

    // Metas Futuras - animar goals
    if (appId === 'phone-view-budget') {
      const goals = appView.querySelectorAll('.goal-item');
      goals.forEach((goal, index) => {
        goal.style.animation = 'none';
        setTimeout(() => {
          goal.style.animation = '';
        }, 10 + (index * 50));
      });

      // Animar barras de progreso
      const progressBars = appView.querySelectorAll('.goal-progress-bar');
      progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
          bar.style.width = width;
        }, 300);
      });
    }
  }

  /**
   * UTILIDADES PÚBLICAS
   */

  /**
   * Agrega efecto de shake a un elemento (para errores)
   */
  shake(element) {
    element.classList.add('shake');
    setTimeout(() => {
      element.classList.remove('shake');
    }, 500);
  }

  /**
   * Efecto de pulse (para notificaciones)
   */
  pulse(element) {
    element.classList.add('pulse');
    setTimeout(() => {
      element.classList.remove('pulse');
    }, 600);
  }

  /**
   * Efecto de éxito (checkmark animado)
   */
  success(element) {
    element.classList.add('success-flash');
    setTimeout(() => {
      element.classList.remove('success-flash');
    }, 800);
  }

  /**
   * Limpieza de observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Inicializar el sistema de animaciones cuando el DOM esté listo
let animationManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    animationManager = new AnimationManager();
    window.animationManager = animationManager; // Exponer globalmente para uso en app.js
  });
} else {
  animationManager = new AnimationManager();
  window.animationManager = animationManager;
}

// Exportar para módulos (si se usa en el futuro)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationManager;
}
