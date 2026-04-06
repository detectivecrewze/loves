/**
 * Loves Insights Dashboard JS
 * Interfaces with worker.js /admin/list-gifts
 */

const API_BASE_URL = 'https://loves-edition.aldoramadhan16.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const btnRefresh = document.getElementById('btn-refresh');
    const adminSecretInput = document.getElementById('admin-secret');
    const tableBody = document.getElementById('gift-table-body');
    
    // Bulk elements
    const bulkActions = document.getElementById('bulk-actions');
    const selectedCount = document.getElementById('selected-count');
    const btnBulkDelete = document.getElementById('btn-bulk-delete');
    const selectAllCheckbox = document.getElementById('select-all');
    
    // Filters
    const searchInput = document.getElementById('search-input');
    const filterTheme = document.getElementById('filter-theme');
    const filterVoice = document.getElementById('filter-voice');
    const filterStatus = document.getElementById('filter-status');

    let allGiftsRaw = [];
    let allGifts = [];
    let selectedIds = new Set();

    // Recover secret
    if (localStorage.getItem('loves_admin_secret') && adminSecretInput) {
        adminSecretInput.value = localStorage.getItem('loves_admin_secret');
    }

    const updateBulkActionsUI = () => {
        if (selectedIds.size > 0) {
            bulkActions.classList.remove('hidden');
            selectedCount.innerText = `${selectedIds.size} Kado Terpilih`;
        } else {
            bulkActions.classList.add('hidden');
        }

        if (allGifts.length > 0) {
            selectAllCheckbox.checked = selectedIds.size === allGifts.length;
        } else {
            selectAllCheckbox.checked = false;
        }
    };

    const fetchGifts = async () => {
        const secret = adminSecretInput ? adminSecretInput.value.trim() : '';
        if (!secret) return alert('Kunci Secret diperlukan untuk mengakses memori ini.');

        localStorage.setItem('loves_admin_secret', secret);
        
        btnRefresh.innerText = 'MEMUAT...';
        btnRefresh.disabled = true;
        selectedIds.clear();
        updateBulkActionsUI();

        try {
            const response = await fetch(`${API_BASE_URL}/admin/list-gifts`, {
                headers: { 'Authorization': `Bearer ${secret}` }
            });

            const data = await response.json();

            if (data.success) {
                allGiftsRaw = data.gifts;
                renderSummary(data.gifts);
                applyFilters();
            } else {
                alert('Akses Ditolak: ' + (data.error || 'Autentikasi gagal.'));
                tableBody.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-rose-400 text-xs font-bold">ERROR: ${data.error}</td></tr>`;
            }
        } catch (err) {
            console.error('[Admin] Fetch detail:', err);
            alert('Gangguan koneksi antar dimensi. Silakan coba lagi.');
        } finally {
            btnRefresh.innerText = 'SYNCHRONIZE';
            btnRefresh.disabled = false;
        }
    };

    const renderSummary = (gifts) => {
        const summarySection = document.getElementById('summary-section');
        if (!gifts || gifts.length === 0) {
            summarySection.classList.add('hidden');
            return;
        }
        summarySection.classList.remove('hidden');

        // Total
        document.getElementById('stat-total').innerText = gifts.length;

        // Today
        const now = new Date();
        const oneDayAgo = now.getTime() - (24 * 60 * 60 * 1000);
        const newToday = gifts.filter(g => new Date(g.publishedAt).getTime() > oneDayAgo).length;
        document.getElementById('stat-today').innerText = newToday;

        // Top Theme
        const themeCounts = {};
        gifts.forEach(g => {
            const t = String(g.theme || 'original').toLowerCase();
            themeCounts[t] = (themeCounts[t] || 0) + 1;
        });
        const topThemeRaw = Object.keys(themeCounts).reduce((a, b) => themeCounts[a] > themeCounts[b] ? a : b, 'original');
        const themeNames = {
            'original': 'Original / Rose', 'rose': 'Original', 
            'magenta': 'Magenta', 'pinky': 'Magenta',
            'rosewood': 'Rosewood', 'beige': 'Rosewood',
            'midnight': 'Midnight', 'blanc': 'Midnight',
            'mossy': 'Mossy', 'sage': 'Mossy', 'silver': 'Silver'
        };
        document.getElementById('stat-theme').innerText = themeNames[topThemeRaw] || topThemeRaw.toUpperCase();

        // Top Audio
        const audioCounts = {};
        gifts.forEach(g => {
            const a = String(g.ambient || 'none').toLowerCase();
            audioCounts[a] = (audioCounts[a] || 0) + 1;
        });
        let topAudioRaw = Object.keys(audioCounts).reduce((a, b) => audioCounts[a] > audioCounts[b] ? a : b, 'none');
        if(topAudioRaw === 'none' && Object.keys(audioCounts).length > 1) {
             const others = Object.keys(audioCounts).filter(k => k !== 'none');
             topAudioRaw = others.reduce((a, b) => audioCounts[a] > audioCounts[b] ? a : b);
        }

        const audioNames = {
            'none': 'Suasana Hening', 'rain': 'Rain in Paris', 'cafe': 'Quiet Cafe', 
            'waves': 'Ocean Waves', 'fireplace': 'Warm Fire', 'forest': 'Deep Forest', 
            'nadin-ah': 'Nadin Amizah', 'daniel': 'Daniel Caesar', 'mitski': 'Mitski', 'custom': 'Custom Uploads'
        };
        document.getElementById('stat-audio').innerText = audioNames[topAudioRaw] || topAudioRaw.toUpperCase();
    };

    const renderTable = (gifts) => {
        allGifts = gifts;
        if (!gifts || gifts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="p-12 text-center text-brand-cream/40 text-[11px] italic">Memori pada rentang ini kosong.</td></tr>`;
            return;
        }

        // Sort descending by date
        gifts.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

        tableBody.innerHTML = gifts.map(gift => {
            const isSelected = selectedIds.has(gift.id);
            const dateStr = gift.publishedAt ? new Date(gift.publishedAt).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';
            
            const lastOpenedStr = gift.lastOpened ? new Date(gift.lastOpened).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '<span class="opacity-30 italic">Belum tersentuh</span>';

            const isStale = gift.lastOpened && (new Date() - new Date(gift.lastOpened)) > (30 * 24 * 60 * 60 * 1000);

            const theme = String(gift.theme || 'original').toLowerCase();
            let badgeClass = 'badge-gold';
            let themeName = 'Original';

            if(theme.includes('magenta') || theme.includes('pinky')) { badgeClass = 'badge-rose'; themeName = 'Magenta'; }
            else if(theme.includes('midnight') || theme.includes('blanc')) { badgeClass = 'badge-night'; themeName = 'Midnight'; }
            else if(theme.includes('mossy') || theme.includes('sage')) { badgeClass = 'badge-moss'; themeName = 'Mossy'; }
            else if(theme.includes('rosewood') || theme.includes('beige')) { badgeClass = 'badge-wood'; themeName = 'Rosewood'; }
            else if(theme.includes('silver')) { badgeClass = 'badge-night'; themeName = 'Silver'; }

            // Loves uses URL query parameter on app.html
            const giftUrl = `${window.location.origin}/app.html?to=${gift.id}`;
            // Let's assume the editing dashboard is either /studio or /studio-premium
            const editorUrl = `../studio/index.html?token=${gift.id}`;

            // Format Pages active
            const apps = gift.activePages || {};
            const appCount = Object.values(apps).filter(v => v).length;

            return `
                <tr class="${isSelected ? 'bg-brand-cream/5' : ''}">
                    <td class="p-5 border-b border-brand-gold/5 text-center">
                        <input type="checkbox" data-id="${gift.id}" ${isSelected ? 'checked' : ''} class="custom-checkbox row-checkbox">
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-mono font-bold text-brand-cream tracking-tight">${gift.id}</span>
                            <a href="${giftUrl}" target="_blank" class="text-[9px] text-brand-gold font-bold uppercase tracking-widest hover:underline w-max">Tinjau Kado ↗</a>
                        </div>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <span class="text-xs font-medium text-brand-cream/90">${gift.recipientName || '<i>(Rahasia)</i>'}</span>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <div class="flex flex-col gap-1.5 items-start">
                            <span class="badge-tag ${badgeClass}">${themeName}</span>
                            <span class="text-[9px] text-brand-cream/50 mt-1 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                <span class="text-[12px]">📦</span> ${appCount} Ruang Aktif
                            </span>
                        </div>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <div class="flex flex-col gap-1">
                            <span class="text-[9px] uppercase tracking-widest text-brand-cream/60 font-medium">📸 ${gift.photosCount} Foto</span>
                            <span class="text-[9px] uppercase tracking-widest text-brand-cream/60 font-medium">🎵 ${gift.musicCount} Lagu</span>
                        </div>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <span class="text-[10px] text-brand-cream/40 font-mono">${dateStr}</span>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <div class="flex flex-col gap-0.5">
                            <span class="text-[10px] ${isStale ? 'text-rose-400' : 'text-brand-cream/50'} font-mono">${lastOpenedStr}</span>
                            ${isStale ? '<span class="text-[7.5px] uppercase tracking-[0.15em] text-rose-500 font-bold">Aktivitas Mengering</span>' : ''}
                        </div>
                    </td>
                    <td class="p-5 border-b border-brand-gold/5">
                        <a href="${editorUrl}" target="_blank" class="bg-brand-gold/10 text-brand-gold border border-brand-gold/20 text-[9px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg hover:bg-brand-gold hover:text-brand-deep transition-all whitespace-nowrap inline-block">Bongkar</a>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const applyFilters = () => {
        const query = searchInput.value.toLowerCase().trim();
        const themeFilter = filterTheme.value;
        const voiceFilter = filterVoice.value;
        const statusFilter = filterStatus.value;

        const filtered = allGiftsRaw.filter(g => {
            const matchesSearch = g.id.toLowerCase().includes(query) || (g.recipientName || '').toLowerCase().includes(query);
            
            let matchesTheme = true;
            if(themeFilter !== 'all') {
                const t = String(g.theme || 'original').toLowerCase();
                const map = { 'rose': 'original', 'original': 'original', 'pinky': 'magenta', 'magenta': 'magenta', 'rosewood': 'rosewood', 'beige': 'rosewood', 'midnight': 'midnight', 'blanc': 'midnight', 'mossy': 'mossy', 'sage': 'mossy', 'silver': 'silver' };
                matchesTheme = map[t] === themeFilter;
            }

            let matchesVoice = true; // Doesn't exactly apply well cleanly if hasVoice is not recorded accurately but leaving filter struct.
            
            let matchesStatus = true;
            if(statusFilter !== 'all') {
                const now = new Date();
                const lo = g.lastOpened ? new Date(g.lastOpened) : null;
                const days = lo ? (now - lo) / (1000 * 60 * 60 * 24) : null;
                if(statusFilter === 'active') matchesStatus = (lo && days <= 30);
                else if(statusFilter === 'stale') matchesStatus = (lo && days > 30);
                else if(statusFilter === 'never') matchesStatus = !lo;
            }

            return matchesSearch && matchesTheme && matchesVoice && matchesStatus;
        });

        renderTable(filtered);
    };

    // ── Bindings ──
    btnRefresh.addEventListener('click', fetchGifts);
    
    if (adminSecretInput) {
        adminSecretInput.addEventListener('keydown', e => { if(e.key === 'Enter') fetchGifts(); });
    }

    searchInput.addEventListener('input', applyFilters);
    filterTheme.addEventListener('change', applyFilters);
    filterVoice.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    selectAllCheckbox.addEventListener('change', e => {
        if(e.target.checked) allGifts.forEach(g => selectedIds.add(g.id));
        else selectedIds.clear();
        renderTable(allGifts);
        updateBulkActionsUI();
    });

    tableBody.addEventListener('change', e => {
        if(e.target.classList.contains('row-checkbox')) {
            const id = e.target.dataset.id;
            if(e.target.checked) selectedIds.add(id);
            else selectedIds.delete(id);
            renderTable(allGifts);
            updateBulkActionsUI();
        }
    });

    btnBulkDelete.addEventListener('click', async () => {
        const ids = Array.from(selectedIds);
        if(ids.length === 0) return;
        
        if(!confirm(`🔥 Peringatan!\nAnda akan membakar ${ids.length} kenangan secara permanen.\nTindakan ini ireversibel. Lanjutkan?`)) return;

        const secret = adminSecretInput.value.trim();
        btnBulkDelete.innerText = 'MEMBAKAR...';
        btnBulkDelete.disabled = true;

        try {
            const res = await fetch(`${API_BASE_URL}/admin/delete-gift`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
                body: JSON.stringify({ ids })
            });
            const data = await res.json();
            if(data.success) {
                alert(`Memori berhasil dihapus dari dimensi ini.`);
                fetchGifts();
            } else {
                alert(`Tolak akses penghapusan: ${data.error}`);
            }
        } catch(e) {
            alert('Gangguan saat membakar memori.');
        } finally {
            btnBulkDelete.innerText = 'Hapus Terpilih';
            btnBulkDelete.disabled = false;
        }
    });

});
