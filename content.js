function getStorageLocal() {
  return (typeof browser !== 'undefined' ? browser.storage : chrome.storage).local;
}

function getStorageAPI() {
  return typeof browser !== 'undefined' ? browser.storage : chrome.storage;
}

function getRuntimeAPI() {
  return typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;
}

function updateThemeButtonIcon(themeBtn, theme) {
  if (!themeBtn) return;

  const isDarkTheme = theme === 'shuffle-zone';
  themeBtn.innerHTML = isDarkTheme ? '<span aria-hidden="true">🌙</span>' : '<span aria-hidden="true">☀️</span>';
  themeBtn.setAttribute('aria-label', isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  themeBtn.title = isDarkTheme ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}

function applyStoredThemeState() {
  getStorageLocal().get(['selectedTheme', 'floatingButtonPosition']).then(({ selectedTheme = 'default', floatingButtonPosition = 'bottom-right' }) => {
    const modal = document.getElementById('gemini-modal');
    const btn = document.getElementById('gemini-floating-btn');
    const themeBtn = document.getElementById('gemini-theme-toggle');

    if (modal) {
      modal.setAttribute('data-theme', selectedTheme);
      updateThemeButtonIcon(themeBtn, selectedTheme);
    }

    if (btn) {
      btn.dataset.theme = selectedTheme;
      btn.dataset.position = floatingButtonPosition;
      applyFloatingButtonPosition(btn);
    }
  });
}

// 1. Delegar la petición API al background script mediante mensajería
function requestGeminiGeneration(apiKey, promptInput) {
  return new Promise((resolve, reject) => {
    const runtime = getRuntimeAPI();

    runtime.sendMessage(
      { action: 'GENERATE_POST', apiKey, promptInput },
      (response) => {
        if (runtime.lastError) {
          reject(new Error(runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.text);
        } else {
          reject(new Error(response?.error || 'Error desconocido al comunicar con el background script'));
        }
      }
    );
  });
}

// 2. Crear Botón Flotante Global
function applyFloatingButtonPosition(button) {
  const position = button.dataset.position || 'bottom-right';
  button.setAttribute('data-position', position);
  button.style.top = '';
  button.style.right = '';
  button.style.bottom = '';
  button.style.left = '';
}

function createFloatingWidget() {
  if (document.getElementById('gemini-floating-btn')) return;

  const floatingBtn = document.createElement('button');
  floatingBtn.id = 'gemini-floating-btn';
  floatingBtn.innerHTML = '✨ Generar Post';
  floatingBtn.title = 'Abrir generador de posts';
  floatingBtn.setAttribute('data-theme', 'default');

  getStorageLocal().get(['floatingButtonPosition']).then(({ floatingButtonPosition = 'bottom-right' }) => {
    floatingBtn.dataset.position = floatingButtonPosition;
    getStorageLocal().get(['selectedTheme']).then(({ selectedTheme = 'default' }) => {
      floatingBtn.dataset.theme = selectedTheme;
    });
    applyFloatingButtonPosition(floatingBtn);
  });

  floatingBtn.addEventListener('click', (event) => {
    event.preventDefault();
    createCustomModal();

    const modal = document.getElementById('gemini-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  });

  document.body.appendChild(floatingBtn);

  getStorageAPI().onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.floatingButtonPosition) return;
    const btn = document.getElementById('gemini-floating-btn');
    if (btn) {
      btn.dataset.position = changes.floatingButtonPosition.newValue || 'bottom-right';
      applyFloatingButtonPosition(btn);
    }
  });

  getStorageAPI().onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes.selectedTheme) return;
    const btn = document.getElementById('gemini-floating-btn');
    const modal = document.getElementById('gemini-modal');
    if (btn) {
      btn.dataset.theme = changes.selectedTheme.newValue || 'default';
    }
    if (modal) {
      modal.setAttribute('data-theme', changes.selectedTheme.newValue || 'default');
      updateThemeButtonIcon(document.getElementById('gemini-theme-toggle'), changes.selectedTheme.newValue || 'default');
    }
  });
}

getStorageAPI().onChanged?.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.selectedTheme || changes.floatingButtonPosition) {
    applyStoredThemeState();
  }
});

createFloatingWidget();

// Mensajes de espera alternos
const WAITING_MESSAGES = [
  'Elaborando ganchos virales...',
  'Sintetizando dosis justa de vulnerabilidad profesional...',
  'Poniendo emojis...',
  'Puliendo lección de humildad y agradecimiento...'
];

let messageInterval = null;
let progressInterval = null;

async function getStoredSettings() {
  return await getStorageLocal().get(['selectedTheme']);
}

function createCustomModal() {
  if (document.getElementById('gemini-modal')) return;

  getStoredSettings().then(({ selectedTheme = 'default' }) => {
    const overlay = document.createElement('div');
    overlay.id = 'gemini-modal';
    overlay.className = 'gemini-modal-overlay';
    overlay.setAttribute('data-theme', selectedTheme);

    overlay.innerHTML = `
      <div class="gemini-modal-card">
        <div class="gemini-modal-header">
          <span class="gemini-modal-title">LinkePost</span>
          <button id="gemini-theme-toggle" class="theme-toggle-btn" aria-label="Cambiar tema" title="Cambiar tema">
            <span aria-hidden="true">☀️</span>
          </button>
        </div>

        <div id="gemini-form-body">
          <label style="font-size: 12px; display:block; margin-bottom: 6px;">
            ¿Qué hito o idea quieres publicar hoy?
          </label>
          <textarea id="gemini-prompt-input" class="gemini-input-textarea" rows="4" placeholder="Ej: Renuncié a mi trabajo para emprender en IA..."></textarea>

          <div class="gemini-action-row">
            <button id="gemini-submit-btn" class="gemini-submit-btn">
              Generar Publicación
            </button>
            <button id="gemini-close-modal-btn" class="gemini-close-inline-btn" type="button">
              Cerrar
            </button>
          </div>
        </div>

        <div id="gemini-loading-zone" class="gemini-loading-container" style="display: none;">
          <div id="gemini-loading-text" class="gemini-loading-message"></div>
          <div class="gemini-progress-bar-track">
            <div id="gemini-progress-fill" class="gemini-progress-bar-fill"></div>
          </div>
        </div>

        <div id="gemini-result-zone" style="display: none; margin-top: 12px;">
          <textarea id="gemini-result-text" class="gemini-input-textarea" rows="6"></textarea>

          <div id="gemini-copy-toast" class="gemini-copy-toast"></div>

          <div class="gemini-action-group">
            <button id="gemini-copy-btn" class="gemini-btn-secondary">Copiar</button>
            <button id="gemini-close-btn" class="gemini-btn-secondary">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const themeBtn = document.getElementById('gemini-theme-toggle');

    updateThemeButtonIcon(themeBtn, overlay.getAttribute('data-theme') || 'default');

    themeBtn?.addEventListener('click', () => {
      const currentTheme = overlay.getAttribute('data-theme');
      const nextTheme = currentTheme === 'default' ? 'shuffle-zone' : 'default';
      overlay.setAttribute('data-theme', nextTheme);
      const floatingBtn = document.getElementById('gemini-floating-btn');
      if (floatingBtn) {
        floatingBtn.dataset.theme = nextTheme;
      }
      updateThemeButtonIcon(themeBtn, nextTheme);

      getStorageLocal().set({ selectedTheme: nextTheme });
    });

    document.getElementById('gemini-submit-btn')?.addEventListener('click', async () => {
      const promptInput = document.getElementById('gemini-prompt-input').value.trim();
      if (!promptInput) return alert('Por favor ingresa un texto.');

      startLoadingState();

      getRuntimeAPI().sendMessage({
        action: 'GENERATE_POST',
        promptInput
      }, (response) => {
        stopLoadingState();
        if (response && response.success) {
          showResult(response.text);
        } else {
          alert('Error: ' + (response?.error || 'Falló la generación'));
        }
      });
    });

    document.getElementById('gemini-copy-btn')?.addEventListener('click', () => {
      const resultText = document.getElementById('gemini-result-text').value;
      navigator.clipboard.writeText(resultText);

      const toast = document.getElementById('gemini-copy-toast');
      if (toast) {
        toast.textContent = '¡Mensaje copiado!';
        setTimeout(() => {
          toast.textContent = '';
        }, 3000);
      }
    });

    document.getElementById('gemini-close-modal-btn')?.addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('gemini-close-btn')?.addEventListener('click', () => {
      overlay.remove();
    });
  });
}

function startLoadingState() {
  const formBody = document.getElementById('gemini-form-body');
  const loadingZone = document.getElementById('gemini-loading-zone');
  const loadingText = document.getElementById('gemini-loading-text');
  const progressFill = document.getElementById('gemini-progress-fill');

  if (formBody) formBody.style.display = 'none';
  if (loadingZone) loadingZone.style.display = 'flex';

  let msgIndex = 0;
  if (loadingText) {
    loadingText.textContent = WAITING_MESSAGES[0];
  }

  messageInterval = setInterval(() => {
    if (!loadingText) return;

    loadingText.classList.add('fade-out');

    setTimeout(() => {
      msgIndex = (msgIndex + 1) % WAITING_MESSAGES.length;
      loadingText.textContent = WAITING_MESSAGES[msgIndex];
      loadingText.classList.remove('fade-out');
    }, 500);
  }, 4000);

  let progress = 5;
  if (progressFill) {
    progressFill.style.width = '5%';
  }

  progressInterval = setInterval(() => {
    if (!progressFill) return;

    if (progress < 90) {
      progress += Math.random() * 5;
      progressFill.style.width = `${Math.min(progress, 90)}%`;
    }
  }, 300);
}

function stopLoadingState() {
  clearInterval(messageInterval);
  clearInterval(progressInterval);

  const progressFill = document.getElementById('gemini-progress-fill');
  if (progressFill) progressFill.style.width = '100%';

  setTimeout(() => {
    const loadingZone = document.getElementById('gemini-loading-zone');
    if (loadingZone) loadingZone.style.display = 'none';
  }, 300);
}

function showResult(text) {
  const resultZone = document.getElementById('gemini-result-zone');
  const resultText = document.getElementById('gemini-result-text');

  if (resultZone) resultZone.style.display = 'block';
  if (resultText) resultText.value = text;
}