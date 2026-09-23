/**
 * preview.js — two-stage preview for Wrapped Studio
 * Page/demo previews stay in Studio; final preview opens a browser tab.
 */
const Preview = (() => {
  let _bound = false;
  let _lastRequest = null;
  let _previousFocus = null;
  let _requestId = 0;
  const t = (value) => window.WrappedI18n?.t?.(value) || value;
  const labels = {
    'page-login': 'Login Gate',
    'page-music': 'Music',
    'page-gallery': 'Gallery',
    'page-wrapped': 'Love Wrapped',
    'page-surat': 'Love Letter',
    'page-invitation': 'Invitation',
  };

  const elements = () => ({
    modal: document.getElementById('wrapped-preview-modal'),
    card: document.querySelector('#wrapped-preview-modal .studio-preview-card'),
    title: document.getElementById('wrapped-preview-title'),
    subtitle: document.getElementById('wrapped-preview-subtitle'),
    status: document.getElementById('wrapped-preview-status'),
    statusText: document.getElementById('wrapped-preview-status-text'),
    retry: document.getElementById('wrapped-preview-retry'),
    stage: document.getElementById('wrapped-preview-stage'),
    device: document.getElementById('wrapped-preview-device'),
    close: document.getElementById('wrapped-preview-close'),
  });
  const buildUrl = (token, page = null) => {
    let url = `../index.html?to=${encodeURIComponent(token)}&preview=true`;
    if (page) url += `&page=${encodeURIComponent(page)}`;
    return `${url}&t=${Date.now()}`;
  };
  const setViewport = () => {
    const { stage } = elements();
    if (stage) stage.dataset.previewViewport = window.matchMedia('(min-width: 721px)').matches ? 'desktop' : 'mobile';
  };
  const setStatus = (message, state = 'loading') => {
    const { status, statusText, retry } = elements();
    if (status) status.dataset.state = state;
    if (statusText) statusText.textContent = t(message);
    if (retry) retry.hidden = state !== 'error';
  };
  const removeFrame = () => {
    const frame = elements().device?.querySelector('iframe');
    if (!frame) return;
    frame.src = 'about:blank';
    frame.remove();
  };
  const showModal = (title, subtitle) => {
    const ui = elements();
    if (!ui.modal) return false;
    const firstOpen = ui.modal.classList.contains('hidden');
    if (firstOpen) _previousFocus = document.activeElement;
    if (ui.title) ui.title.textContent = t(title);
    if (ui.subtitle) ui.subtitle.textContent = t(subtitle);
    ui.modal.classList.remove('hidden');
    ui.modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('studio-preview-open');
    document.body.classList.add('studio-preview-open');
    setViewport();
    if (firstOpen) requestAnimationFrame(() => ui.close?.focus());
    return true;
  };
  const closeModal = () => {
    const { modal } = elements();
    if (!modal || modal.classList.contains('hidden')) return;
    _requestId += 1;
    removeFrame();
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('studio-preview-open');
    document.body.classList.remove('studio-preview-open');
    _lastRequest = null;
    _previousFocus?.focus?.({ preventScroll: true });
    _previousFocus = null;
  };
  const mountFrame = (url, title, requestId) => {
    const { device } = elements();
    if (!device) return;
    removeFrame();
    const frame = document.createElement('iframe');
    frame.title = t(title);
    frame.loading = 'eager';
    frame.allow = 'autoplay; fullscreen; picture-in-picture';
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.addEventListener('load', () => {
      if (requestId !== _requestId || elements().modal?.classList.contains('hidden')) return;
      try { frame.contentWindow?.addEventListener('keydown', (event) => event.key === 'Escape' && closeModal()); } catch {}
      setStatus('Preview siap. Semua interaksi dapat dicoba di dalam layar.', 'ready');
    }, { once: true });
    frame.src = url;
    device.appendChild(frame);
  };
  const loadRequest = async (request) => {
    const requestId = ++_requestId;
    _lastRequest = request;
    if (!showModal(request.title, request.subtitle)) return Studio.showToast('Modal preview tidak tersedia.');
    removeFrame();
    setStatus(request.save === false ? 'Menyiapkan preview...' : 'Menyimpan perubahan...', 'loading');
    try {
      if (request.save !== false) {
        const saved = await Autosave.saveNow();
        if (!saved) throw new Error('SAVE_FAILED');
        if (requestId !== _requestId) return;
      }
      setStatus('Menyiapkan preview...', 'loading');
      mountFrame(buildUrl(request.token, request.page), request.title, requestId);
    } catch (error) {
      if (requestId !== _requestId) return;
      console.warn('[Wrapped preview]', error);
      setStatus('Perubahan belum berhasil disimpan. Coba lagi agar preview memakai data terbaru.', 'error');
    }
  };
  const handleKeydown = (event) => {
    const { modal, card } = elements();
    if (!modal || modal.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab' || !card) return;
    const focusable = [...card.querySelectorAll('button:not([disabled]):not([hidden]), iframe')].filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  function init() {
    if (_bound) return;
    _bound = true;
    document.getElementById('btn-preview-loves')?.addEventListener('click', openPreview);
    document.body.addEventListener('click', (event) => {
      const section = event.target.closest('.btn-section-preview');
      if (section?.dataset.previewPage) openPagePreview(section.dataset.previewPage);
      const demo = event.target.closest('#btn-preview-demo');
      if (demo) { event.preventDefault(); openDemoPreview(); }
    });
    document.getElementById('wrapped-preview-close')?.addEventListener('click', closeModal);
    document.getElementById('wrapped-preview-backdrop')?.addEventListener('click', closeModal);
    document.getElementById('wrapped-preview-retry')?.addEventListener('click', () => _lastRequest && loadRequest(_lastRequest));
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', () => { if (!elements().modal?.classList.contains('hidden')) setViewport(); });
  }
  async function openPreview() {
    const token = Auth.getToken();
    if (!token) return Studio.showToast('Token tidak ditemukan.');
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) return Studio.showToast('Browser memblokir popup. Izinkan popup untuk preview.');
    Studio.showToast('Menyimpan & membuka preview...');
    try {
      const saved = await Autosave.saveNow();
      if (!saved) throw new Error('SAVE_FAILED');
      previewWindow.location.href = buildUrl(token);
    } catch (error) {
      previewWindow.close();
      Studio.showToast('Gagal membuka preview. Coba lagi.');
    }
  }
  function openPagePreview(page) {
    const token = Auth.getToken();
    if (!token) return Studio.showToast('Token tidak ditemukan.');
    const label = labels[page] || page;
    return loadRequest({ token, page, title: `Preview ${label}`, subtitle: 'Perubahan terbaru disimpan sebelum preview dimuat.' });
  }
  function openDemoPreview() {
    return loadRequest({ token: 'love-test', page: 'page-wrapped', title: 'Contoh Jadi', subtitle: 'Jelajahi contoh lengkap tanpa meninggalkan Studio.', save: false });
  }
  return { init, closeModal, openPreview, openPagePreview, openDemoPreview };
})();
