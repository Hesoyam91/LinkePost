document.addEventListener('DOMContentLoaded', async () => {
  const storageNamespace = typeof browser !== 'undefined' ? browser.storage : chrome.storage;
  const storageAPI = storageNamespace.local;
  
  const themeSelect = document.getElementById('themeSelect');
  const positionSelect = document.getElementById('positionSelect');
  const saveBtn = document.getElementById('saveBtn');

  const applyTheme = (theme) => {
    document.body.setAttribute('data-theme', theme === 'shuffle-zone' ? 'shuffle-zone' : 'default');
  };

  const applySavedSettings = (data) => {
    if (data.selectedTheme) {
      themeSelect.value = data.selectedTheme;
      applyTheme(data.selectedTheme);
    }
    if (data.floatingButtonPosition) positionSelect.value = data.floatingButtonPosition;
  };

  const saveConfig = async () => {
    const nextSettings = {
      selectedTheme: themeSelect.value,
      floatingButtonPosition: positionSelect.value
    };

    await storageAPI.set(nextSettings);
    saveBtn.textContent = 'Guardado';
    saveBtn.disabled = true;

    window.setTimeout(() => {
      saveBtn.textContent = 'Guardar Configuración';
      saveBtn.disabled = false;
    }, 900);
  };

  // Cargar valores guardados
  const data = await storageAPI.get(['geminiApiKey', 'selectedTheme', 'floatingButtonPosition']);
  applySavedSettings({ selectedTheme: 'default', ...data });

  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
    saveConfig();
  });
  positionSelect.addEventListener('change', saveConfig);

  saveBtn.addEventListener('click', saveConfig);

  storageNamespace.onChanged?.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    const nextData = {};
    if (changes.selectedTheme) nextData.selectedTheme = changes.selectedTheme.newValue || 'default';
    if (changes.floatingButtonPosition) nextData.floatingButtonPosition = changes.floatingButtonPosition.newValue;
    applySavedSettings(nextData);
  });
});