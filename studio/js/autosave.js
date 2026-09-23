/** autosave.js — ordered background persistence for Wrapped Studio. */
const Autosave = (() => {
  let _debounceTimer = null;
  let _saveQueue = Promise.resolve();
  const DEBOUNCE_MS = 2500;
  const setStatus = (text, hide = false) => {
    const element = document.getElementById('save-status');
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('opacity-0', hide);
  };
  function trigger() {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    setStatus('Menyimpan...');
    _debounceTimer = setTimeout(() => { _debounceTimer = null; saveConfiguration(); }, DEBOUNCE_MS);
  }
  function cancel() {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = null;
    setStatus('', true);
  }
  function saveNow() {
    if (_debounceTimer) clearTimeout(_debounceTimer);
    _debounceTimer = null;
    setStatus('Menyimpan...');
    return saveConfiguration();
  }
  function saveConfiguration() {
    const runSave = async () => {
      if (Uploader.isUploading() || Music.isUploading()) { trigger(); return false; }
      const token = Auth.getToken();
      if (!token) return false;
      try {
        const response = await fetch(`${Auth.getWorkerUrl()}/save-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(_buildState(token)),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || `Server returned ${response.status}`);
        setStatus('Tersimpan Otomatis ✓');
        setTimeout(() => setStatus('', true), 2000);
        return true;
      } catch (error) {
        console.warn('Autosave failed:', error);
        setStatus('Gagal Menyimpan');
        setTimeout(() => setStatus('', true), 4000);
        return false;
      }
    };
    const queued = _saveQueue.then(runSave, runSave);
    _saveQueue = queued.then(() => undefined, () => undefined);
    return queued;
  }
  function _buildState(token) {
    return {
      id: token,
      locale: WrappedI18n.get(),
      studioPassword: document.getElementById('input-studio-password')?.value || Studio.getStudioPassword(),
      active_pages: AppManager.getActivePages(),
      login: {
        password: document.getElementById('input-login-password')?.value.trim() || '',
        instruction: document.getElementById('input-login-hint')?.value.trim() || '',
      },
      music: Music.getPlaylistArray().map((track) => ({ ...track, songTitle: track.title, audioSrc: track.url, coverSrc: track.coverUrl, lyrics: track.quotes })),
      gallery: {
        title: document.getElementById('input-gallery-title')?.value.trim() || '',
        subtitle: document.getElementById('input-gallery-subtitle')?.value.trim() || '',
        photos: Uploader.getPhotos(),
      },
      wrapped: {
        imageUrl: WrappedUploader.getImageUrl(),
        minutesTogether: document.getElementById('input-wrapped-date')?.value || '',
        vibe: document.getElementById('input-wrapped-vibe')?.value.trim() || '',
        topPlaces: WrappedItems.getPlaces(),
        coreMemories: WrappedItems.getMemories(),
        topPlacesLabel: document.getElementById('select-top-places-label')?.value || 'Top Places',
        coreMemoriesLabel: document.getElementById('select-core-memories-label')?.value || 'Core Memories',
      },
      surat: {
        to: document.getElementById('input-letter-to')?.value.trim() || '',
        message: document.getElementById('input-letter-msg')?.value || '',
        from: document.getElementById('input-letter-from')?.value.trim() || '',
      },
      invitation: {
        question: document.getElementById('input-inv-question')?.value.trim() || '',
        successMessage: document.getElementById('input-inv-success')?.value.trim() || '',
      },
    };
  }
  function buildState() { return _buildState(Auth.getToken()); }
  return { trigger, cancel, saveNow, buildState };
})();
