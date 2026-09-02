/* Locale control for Wrapped Edition. Clean, performant, and mobile-optimized. */
(function (global) {
  'use strict';
  let locale = 'en';
  const normalize = (value, fallback = 'en') => value === 'id' || value === 'en' ? value : fallback;

  const pairs = [
    ['Memuat kado...', 'Loading gift...'], ['Kado tidak ditemukan.', 'Gift not found.'],
    ['Kado ini tidak ditemukan atau belum dipublish.', 'This gift was not found or has not been published yet.'],
    ['Gagal memuat. Coba muat ulang.', 'Failed to load. Please try reloading.'],
    ['Memuat Studio...', 'Loading Studio...'], ['Akses Ditolak', 'Access Denied'],
    ['Project tidak ditemukan atau token tidak valid.', 'Project not found or token is invalid.'],
    ['Akses Terkunci', 'Access Locked'], ['Masukkan Password Studio Anda', 'Enter Your Studio Password'],
    ['Buka Kunci', 'Unlock'], ['Password Salah', 'Incorrect Password'],
    ['Studio Curator — Loves Edition', 'Studio Curator — Loves Edition'],
    ['Loves Studio', 'Loves Studio'],
    ['The Valentine Experience', 'The Valentine Experience'],
    ['Free Edition', 'Free Edition'],
    ['Aktifkan Halaman', 'Enable Pages'],
    ['Pilih halaman-halaman yang ingin ditampilkan di Kado ini. Halaman yang dinonaktifkan akan diabaikan dan dilewati.', 'Choose which pages appear in this gift. Disabled pages will be skipped.'],
    ['Wajib', 'Required'], ['Gate / Login', 'Gate / Login'], ['Login Gate', 'Login Gate'],
    ['✨ Pintu Masuk Kado', '✨ Gift Entrance'],
    ['Password Akses', 'Access Password'], ['Pertanyaan Hint Password', 'Password Hint Question'],
    ['💡 Hint ini akan muncul di halaman gembok agar penerima tahu password yang kamu maksud.', '💡 This hint appears on the lock screen to help the recipient identify the password.'],
    ['Ubah Password Studio', 'Change Studio Password'],
    ['⚙ Gunakan password ini saat ingin login ke dashboard Studio kembali. Jangan sampai lupa!', '⚙ Use this password to access the Studio again. Do not forget it!'],
    ['Music', 'Music'],
    ['✨ Soundtrack Perjalanan', '✨ Your Journey Soundtrack'], ['Memuat daftar putar...', 'Loading playlist...'],
    ['Moments (Gallery)', 'Moments (Gallery)'], ['Gallery', 'Gallery'], ['✨ Kenangan Indah', '✨ Beautiful Memories'],
    ['+ Tambah Foto / Video', '+ Add Photos / Videos'], ['Klik atau letakkan foto / video di sini', 'Click or drop photos / videos here'],
    ['☰ Tahan & Geser foto untuk ubah urutan', '☰ Hold & drag media to reorder'],
    ['video pendek 1-10 detik, video akan play otomatis tanpa suara.', 'short videos of 1–10 seconds play automatically without sound.'],
    ['Max 20', 'Max 20'],
    ['Love Wrapped', 'Love Wrapped'], ['Wrapped', 'Wrapped'], ['✨ Rekap Kebersamaan', '✨ Your Story Recap'],
    ['Media & Identity', 'Media & Identity'], ['Upload Foto Utama', 'Upload Main Photo'],
    ['Foto ini tampil sebagai polaroid di halaman Wrapped', 'This photo appears as a polaroid on the Wrapped page'],
    ['Tanggal Spesial', 'Special Date'], ['Dihitung otomatis jadi menit kebersamaan.', 'Automatically converted into your time together.'],
    ['Our Vibe', 'Our Vibe'],
    ['Tokoh, artis, atau hobi favorit kalian.', 'A character, artist, or hobby you both love.'],
    ['Top Places', 'Top Places'], ['Singkat agar pas di tampilan — maks 5', 'Keep each one short — maximum 5'],
    ['Ubah Judul', 'Change Title'], ['+ Tambah', '+ Add'], ['Belum ada tempat', 'No places yet'],
    ['Core Memories', 'Core Memories'], ['Momen terbaik kalian — maks 5', 'Your best moments — maximum 5'],
    ['Belum ada kenangan', 'No memories yet'], ['Lihat Contoh Jadi (Demo)', 'View Finished Example (Demo)'],
    ['Pilih Judul', 'Choose a Title'], ['Select a variant for your card', 'Select a variant for your card'], ['Tutup', 'Close'],
    ['Surat Cinta', 'Love Letter'], ['Surat', 'Letter'], ['✨ Pesan dari Hati', '✨ Message from the Heart'], ['Pesan dari Hati', 'Message from the Heart'],
    ['Buat dengan AI', 'Create with AI'], ['Invitation (Card)', 'Invitation (Card)'], ['Invitation', 'Invitation'],
    ['✨ Call to action', '✨ Call to Action'],
    ['Pertanyaan', 'Question'], ['Respon jika tekan YES', 'Response when YES is pressed'],
    ['👁 Preview', '👁 Preview'],
    ['Lihat Live Preview', 'View Live Preview'], ['👁 Lihat Live Preview', '👁 View Live Preview'],
    ['Publikasikan Kado ❤️', 'Publish Gift ❤️'],
    ['Request Domain / Link Pribadi', 'Request Domain / Private Link'],
    ['🌟 Request Domain / Link Pribadi', '🌟 Request Domain / Private Link'],
    ['Request Domain / Link Pribadi ( +10.000 )', 'Request Domain / Private Link ( +10K )'],
    ['Link Pribadi:', 'Private Link:'],
    ['Tersimpan Otomatis', 'Saved Automatically'], ['Publikasikan Kado', 'Publish Gift'],
    ['Kado akan dipublish dengan nama link berikut:', 'The gift will be published with this link:'],
    ['(Ditetapkan otomatis)', '(Set automatically)'], ['Gunakan huruf, angka, dan tanda hubung saja.', 'Use letters, numbers, and hyphens only.'],
    ['Optimasi Perangkat', 'Device Optimization'], ['Mobile terbaik', 'Best Mobile Experience'],
    ['Kado ini sudah dioptimalkan sepenuhnya untuk pengalaman', 'This gift is fully optimized for the'],
    ['Lanjutkan & Publish', 'Continue & Publish'], ['Batal', 'Cancel'], ['Kado Tercipta', 'Gift Created'],
    ['Siap untuk dikirimkan', 'Ready to Share'], ['Download Barcode', 'Download Barcode'], ['Salin Link', 'Copy Link'],
    ['Lihat Hasil', 'View Gift'], ['Sudah Selesai?', 'All Done?'],
    ['Apakah anda sudah yakin dengan desain kado ini?', 'Are you sure this gift design is ready?'],
    ['Request Nama Domain Vercel', 'Request a Vercel Domain Name'],
    ['Gunakan huruf, angka, atau tanda strip (-) saja', 'Use letters, numbers, or hyphens (-) only'],
    ['Rekomendasi Nama', 'Name Recommendation'], ['Pilih nama yang unik atau lucu biar makin berkesan!', 'Choose a unique or playful name to make it memorable!'],
    ['Lanjutkan & Request', 'Continue & Request'], ['Request Terkirim!', 'Request Sent!'],
    ['Kado VIP Sedang Diproses', 'VIP Gift Is Being Processed'],
    ['Terima kasih! Request desain VIP Anda sedang kami hubungkan ke domain eksklusif Anda. Admin akan memprosesnya setelah Anda mengonfirmasi via WhatsApp.', 'Thank you! Your VIP design request is being connected to its exclusive domain. Admin will process it after your WhatsApp confirmation.'],
    ['Kabari Admin di WhatsApp', 'Notify Admin on WhatsApp'], ['Selesai', 'Done'],
    ['Contoh:', 'Example:'], ['atau', 'or'],
    ['✦ scan to open your gift ✦', '✦ scan to open your gift ✦'],
    ['wrapped edition', 'wrapped edition'],
    ['✨ Tulis dengan AI', '✨ Write with AI'], ['Untuk Surat Cinta', 'For Your Love Letter'],
    ['Instruksi untuk AI', 'Instructions for AI'], ['Semakin detail instruksimu, semakin personal hasilnya.', 'The more detailed your instructions, the more personal the result.'],
    ['Pilih Gaya Bahasa', 'Choose a Writing Style'], ['Romantis', 'Romantic'], ['Lucu / Canda', 'Funny / Playful'],
    ['Santai (Aku/Kamu)', 'Casual (I/You)'], ['Formal & Tulus', 'Formal & Sincere'],
    ['Generate Surat', 'Generate Letter'], ['AI sedang menulis...', 'AI is writing...'],
    ['Sebentar ya, lagi merangkai kata-kata ✨', 'Just a moment, crafting the words ✨'],
    ['Hasil dari AI :', 'AI Result:'], ['Coba Lagi', 'Try Again'], ['✓ Gunakan Surat', '✓ Use This Letter'],
    ['Masukkan kata sandimu', 'Enter your password'], ['Tutup ❤️', 'Close ❤️'],
    ['Yay! Terima kasih! ❤️', 'Yay! Thank you! ❤️'],
    ['Scratch untuk reveal', 'Scratch to reveal'],
    ['✉️ Tap amplop untuk membuka surat', '✉️ Tap the envelope to open letter'],
    ['Yang Tercinta', 'Dearest'], ['Dengan Cinta', 'With Love'],
    ['Surat ini untukmu ❤️', 'This letter is for you ❤️'],
    ['Maukah kamu menjadi Valentineku?', 'Will you be my Valentine?'],
    ['Simpan sebagai gambar', 'Save as image'],
    ['Memuat...', 'Loading...']
  ];

  const dictionary = Object.fromEntries(pairs.flatMap(([id, en]) => [[id, { id, en }], [en, { id, en }]]));
  function t(value) { return dictionary[value]?.[locale] || value; }

  function applyKnownCopy(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'].includes(parent.tagName) || parent.isContentEditable) continue;
      const source = node.nodeValue;
      const key = source.replace(/\s+/g, ' ').trim();
      const translated = t(key);
      if (translated !== key) {
        const next = source.replace(key, translated);
        if (node.nodeValue !== next) node.nodeValue = next;
      }
    }
    root.querySelectorAll?.('[placeholder], [title], [aria-label]').forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
        const source = element.getAttribute(attribute);
        if (source) {
          const translated = t(source);
          if (translated !== source) element.setAttribute(attribute, translated);
        }
      });
    });
  }

  function set(value, fallback) {
    locale = normalize(value, fallback);
    document.documentElement.lang = locale;
    return locale;
  }

  function get() { return locale; }

  function replaceKnown(selector, indonesian, english) {
    const element = document.querySelector(selector);
    if (!element) return;
    const current = element.textContent.trim();
    if (current === indonesian || current === english) {
      const target = get() === 'id' ? indonesian : english;
      if (element.textContent !== target) element.textContent = target;
    }
  }

  function applyGiftCopy() {
    applyKnownCopy();
    const isId = get() === 'id';
    replaceKnown('.login-instruction', 'Masukkan kata sandimu', 'Enter your password');
    replaceKnown('.modal-close', 'Tutup ❤️', 'Close ❤️');
    replaceKnown('.success-message', 'Yay! Terima kasih! ❤️', 'Yay! Thank you! ❤️');

    const passwordInput = document.getElementById('login-input');
    if (passwordInput && ['*kunci rahasia...*', '*secret key...*'].includes(passwordInput.placeholder)) {
      passwordInput.placeholder = isId ? '*kunci rahasia...*' : '*secret key...*';
    }
    const downloadButton = document.getElementById('wrapped-download-btn');
    if (downloadButton && ['Simpan sebagai gambar', 'Save as image'].includes(downloadButton.title)) {
      downloadButton.title = isId ? 'Simpan sebagai gambar' : 'Save as image';
    }

    // Scratch gallery hint
    const gallerySub = document.querySelector('#page-gallery .gallery-header p, .scratch-hint');
    if (gallerySub && (gallerySub.textContent.includes('Scratch') || gallerySub.textContent.includes('scratch'))) {
      gallerySub.textContent = isId ? 'Scratch untuk reveal' : 'Scratch to reveal';
    }

    // Envelope hint
    const tapHint = document.getElementById('tap-hint');
    if (tapHint && (tapHint.textContent.includes('Tap') || tapHint.textContent.includes('buka'))) {
      tapHint.textContent = isId ? '✉️ Tap amplop untuk membuka surat' : '✉️ Tap the envelope to open letter';
    }

    // Letter default signatures if fallback
    const sig = document.getElementById('letter-signature');
    if (sig && (sig.textContent === 'Dengan Cinta' || sig.textContent === 'With Love')) {
      sig.textContent = isId ? 'Dengan Cinta' : 'With Love';
    }
    const rec = document.getElementById('letter-recipient');
    if (rec && (rec.textContent === 'Yang Tercinta' || rec.textContent === 'Dearest')) {
      rec.textContent = isId ? 'Yang Tercinta' : 'Dearest';
    }
  }

  function initGift(config) {
    document.getElementById('wrapped-language-picker')?.remove();
    set(config?.locale, 'en');
    applyGiftCopy();
  }

  function initStudio(config, onChange) {
    set(config?.locale, 'en');
    let wrap = document.getElementById('wrapped-studio-language');
    if (!wrap) {
      if (!document.getElementById('wrapped-studio-language-style')) {
        const style = document.createElement('style');
        style.id = 'wrapped-studio-language-style';
        style.textContent = `
          #wrapped-studio-language {
            position: fixed;
            top: 14px;
            right: 14px;
            z-index: 9999;
            display: flex;
            gap: 6px;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.94);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            font: 600 12px system-ui, -apple-system, sans-serif;
            color: #4b352d;
            border: 1px solid rgba(0, 0, 0, 0.06);
          }
          #wrapped-studio-language select {
            background: transparent;
            border: none;
            font: inherit;
            color: inherit;
            cursor: pointer;
            outline: none;
          }
          @media (max-width: 480px) {
            #wrapped-studio-language {
              top: 10px;
              right: 10px;
              padding: 4px 8px;
              gap: 0;
            }
            #wrapped-studio-language > span {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(style);
      }
      wrap = document.createElement('label');
      wrap.id = 'wrapped-studio-language';
      wrap.innerHTML = '<span></span><select aria-label="Studio language"><option value="id">Indonesia</option><option value="en">English</option></select>';
      document.body.appendChild(wrap);
      wrap.querySelector('select').addEventListener('change', (event) => {
        onChange(event.target.value);
        wrap.querySelector('span').textContent = get() === 'id' ? 'Bahasa' : 'Language';
        applyKnownCopy();
      });
    }
    wrap.querySelector('select').value = get();
    wrap.querySelector('span').textContent = get() === 'id' ? 'Bahasa' : 'Language';
    applyKnownCopy();
  }

  global.WrappedI18n = { normalize, set, get, t, initGift, applyGiftCopy, initStudio, applyKnownCopy };
})(window);
