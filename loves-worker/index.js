/**
 * Loves Edition — Cloudflare Worker
 * For You, Always — Valentine Gift Platform
 *
 * ARSITEKTUR UPLOAD (Direct to R2):
 * Browser → POST /presign          → Worker generates key + CDN URL
 * Browser → PUT  /upload-direct/:key → Worker streams binary to R2
 * Customer → GET cdn.domain/loves/{key} → Direct from R2 CDN
 *
 * KV Structure:
 * LOVES_KV.get(token) → JSON config (login, music, gallery, wrapped, surat, invitation, active_pages)
 */

export default {
  async fetch(request, env) {
    const CDN_URL = env.CDN_URL || 'https://arcade-assets.for-you-always.my.id';
    const DOMAIN = 'https://love.for-you-always.my.id';

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Cache-Control",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // ── Helper ────────────────────────────────────────────────────────────────
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /presign — Minta nama file unik + CDN URL (tidak ada file dikirim)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/presign") {
      try {
        const body = await request.json().catch(() => ({}));
        const filename = body.filename || 'upload';
        const contentType = body.contentType || 'application/octet-stream';

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 9);
        const ext = filename.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

        // Prefix "loves/" agar tidak bentrok dengan file Arcade di R2 yang sama
        const key = `loves/${timestamp}-${randomStr}.${ext}`;

        return json({ success: true, key, publicUrl: `${CDN_URL}/${key}` });
      } catch (error) {
        return json({ error: error.message || 'Presign failed' }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUT /upload-direct/:key — Upload binary stream langsung ke R2
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "PUT" && url.pathname.startsWith("/upload-direct/")) {
      try {
        const key = decodeURIComponent(url.pathname.replace("/upload-direct/", ""));

        // Security: hanya izinkan key dengan prefix loves/
        if (!key.startsWith("loves/") || key.includes("..")) {
          return json({ error: "Invalid key — must start with loves/" }, 400);
        }

        const contentType = request.headers.get("Content-Type") || "application/octet-stream";
        await env.BUCKET.put(key, request.body, { httpMetadata: { contentType } });

        return json({ success: true, url: `${CDN_URL}/${key}` });
      } catch (error) {
        return json({ error: error.message || "Upload failed" }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GET /files/* — Proxy fallback dari R2 (sebelum custom domain aktif)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "GET" && url.pathname.startsWith("/files/")) {
      const key = decodeURIComponent(url.pathname.replace("/files/", ""));
      try {
        const object = await env.BUCKET.get(key);
        if (!object) return json({ error: "File not found" }, 404);

        const headers = new Headers(corsHeaders);
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        return new Response(object.body, { headers });
      } catch (error) {
        return json({ error: "Error reading file" }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GET /get-config?id=TOKEN — Baca config customer dari KV
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "GET" && url.pathname === "/get-config") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Missing 'id'" }, 400);

      try {
        const data = await env.LOVES_KV.get(id);
        if (!data) return json({ error: "Not found" }, 404);
        return new Response(data, {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /save-config — Autosave draft ke KV (dari Studio Editor)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/save-config") {
      try {
        const body = await request.json();
        const id = body.id || url.searchParams.get("id");
        if (!id) return json({ error: "Missing 'id'" }, 400);

        // Cek apakah ID sudah ada
        const existingRaw = await env.LOVES_KV.get(id);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          // Preserve password if not provided in update
          if (!body.studioPassword && existing.studioPassword) {
            body.studioPassword = existing.studioPassword;
          }
        }

        body.updated_at = new Date().toISOString();
        await env.LOVES_KV.put(id, JSON.stringify(body));

        return json({ success: true, message: "Saved!", id });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /submit — Publish final (lock + timestamp)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/submit") {
      try {
        const body = await request.json();
        const id = body.id;
        if (!id) return json({ error: "Missing 'id'" }, 400);

        // Cek apakah ID sudah ada
        const existingRaw = await env.LOVES_KV.get(id);
        if (existingRaw) {
          const existing = JSON.parse(existingRaw);
          // Preserve password if not provided in submit
          if (!body.studioPassword && existing.studioPassword) {
            body.studioPassword = existing.studioPassword;
          }
        }

        body.submitted_at = new Date().toISOString();
        body.updated_at = new Date().toISOString();
        await env.LOVES_KV.put(id, JSON.stringify(body));

        return json({
          success: true,
          message: "Published!",
          id,
          giftUrl: `${DOMAIN}/loves/${id}`,
          studioUrl: `${DOMAIN}/studio/${id}`
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /generate-ai — Proxy aman ke Qwen AI API
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/generate-ai") {
      try {
        const apiKey = env.QWEN_API_KEY;
        if (!apiKey) {
          return json({ error: "QWEN_API_KEY belum dikonfigurasi di Cloudflare Secrets." }, 503);
        }

        const body = await request.json();
        const userPrompt = body.prompt;
        const requestedTone = body.tone || 'romantis';

        if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
          return json({ error: "Prompt tidak boleh kosong." }, 400);
        }

        let toneInstruction = "";
        switch (requestedTone) {
          case 'lucu':
            toneInstruction = "Penulisan bergaya LUCU, SANTAI, dan BERCANDA. Gunakan bahasa gaul anak muda Indonesia, buat pembaca tersenyum atau tertawa kecil. Jangan terlalu serius atau baku.";
            break;
          case 'santai':
            toneInstruction = "Penulisan bergaya SANTAI dan BERSAHABAT. Gunakan kata ganti 'aku' dan 'kamu'. Mengalir natural seperti ngobrol santai dengan teman dekat atau pacar di cafe.";
            break;
          case 'tulus':
            toneInstruction = "Penulisan bergaya FORMAL TAPI TULUS. Gunakan bahasa Indonesia yang baik, sopan, namun tetap menyentuh hati dan sarat makna mendalam. Cocok untuk orang tua, guru, atau atasan.";
            break;
          case 'romantis':
          default:
            toneInstruction = "Penulisan bergaya ROMANTIS ANAK MUDA (usia SMA sampai 27 tahun). Gunakan bahasa gaul kasual sehari-hari tapi rapi (selalu gunakan 'Aku' dan 'Kamu'). Buat pesannya sangat manis, hangat, dan *green flag*, tapi JANGAN terlalu puitis, JANGAN kaku, dan JANGAN cringe/lebay. Bicara seperti pacar yang suportif.";
            break;
        }

        const systemInstruction = `Kamu adalah penulis pesan untuk kado digital "Loves Edition".
Tugasmu: Tuliskan pesan dari hati yang menyesuaikan dengan gaya berikut: [${toneInstruction}]
ATURAN WAJIB:
1. Panjang pesan harus berkisar antara 60 hingga 80 kata (sekitar 400-500 karakter).
2. Tulis hanya dalam 1 PARAGRAF yang padat dan bermakna.
3. DILARANG KERAS memotong tulisan di tengah kalimat! Pastikan surat diakhiri dengan tanda titik.
4. Buang format markdown (tanpa asterisk, bold, atau pagar).
5. Langsung isi pesan tanpa ada ucapan pengantar.`;

        const qwenPayload = {
          model: "qwen-plus",
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: `[INSTRUKSI/TEMA DARI PENGGUNA:]\n${userPrompt.trim()}` }
          ],
          temperature: 0.85,
          top_p: 0.95
        };

        const qwenResponse = await fetch(
          "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(qwenPayload)
          }
        );

        if (!qwenResponse.ok) {
          const errText = await qwenResponse.text();
          return json({ error: `Qwen API (Status ${qwenResponse.status}): ${errText.substring(0, 150)}` }, 502);
        }

        const qwenData = await qwenResponse.json();
        const generatedText = qwenData?.choices?.[0]?.message?.content || "";

        return json({ success: true, text: generatedText.trim() });

      } catch (error) {
        return json({ error: error.message || "Gagal menghubungi AI." }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /generator-login — Auth untuk halaman Generator Admin
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/generator-login") {
      try {
        const { password } = await request.json();
        const expected = env.GENERATOR_SECRET || "loves2026";

        if (password === expected) {
          return json({ success: true });
        } else {
          return json({ success: false, error: "Password salah" }, 401);
        }
      } catch (error) {
        return json({ success: false, error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /generate-link — Buat entry KV kosong + return Studio URL
    // Dipanggil dari halaman Generator (Admin only)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/generate-link") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.GENERATOR_SECRET || "loves2026";

        if (!authHeader || authHeader !== `Bearer ${secret}`) {
          return json({ success: false, error: "Unauthorized" }, 401);
        }

        const body = await request.json();
        const customId = body.id?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const studioPassword = body.studioPassword || null;

        if (!customId || customId.length < 3) {
          return json({ error: "ID minimal 3 karakter (huruf kecil, angka, strip)" }, 400);
        }

        // Cek apakah ID sudah ada
        const existing = await env.LOVES_KV.get(customId);
        if (existing) {
          return json({ error: `ID '${customId}' sudah digunakan. Pilih ID lain.` }, 409);
        }

        // Buat entry kosong di KV
        const initialConfig = {
          id: customId,
          studioPassword: studioPassword,
          active_pages: {
            login: true,
            music: true,
            gallery: true,
            wrapped: true,
            surat: true,
            invitation: true
          },
          login: { title: "Key to My Heart", instruction: "Masukkan kata sandimu", password: "123" },
          music: [],
          gallery: { title: "Kenangan Kita", subtitle: "Scratch untuk reveal", photos: [] },
          wrapped: { minutesTogether: "", vibe: "", topPlaces: [], coreMemories: [] },
          surat: { to: "", message: "", from: "" },
          invitation: { question: "Maukah kamu menjadi Valentineku?", successMessage: "Yay! Terima kasih! ❤️" },
          created_at: new Date().toISOString()
        };

        await env.LOVES_KV.put(customId, JSON.stringify(initialConfig));

        const studioUrl = `${DOMAIN}/studio/${customId}${studioPassword ? `/${studioPassword}` : ''}`;
        const giftUrl = `${DOMAIN}/loves/${customId}`;

        return json({
          success: true,
          id: customId,
          studioUrl,
          giftUrl,
          message: `Link berhasil dibuat untuk ID: ${customId}`
        });
      } catch (error) {
        return json({ error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GET /admin/list-gifts — Daftar semua gift (Admin only)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "GET" && url.pathname === "/admin/list-gifts") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.ADMIN_SECRET;

        if (!secret) return json({ error: "ADMIN_SECRET belum dikonfigurasi." }, 503);
        if (!authHeader || authHeader !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);

        const kvList = await env.LOVES_KV.list();
        const gifts = [];

        for (const keyObj of kvList.keys) {
          const raw = await env.LOVES_KV.get(keyObj.name);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              gifts.push({
                id: parsed.id,
                recipientName: parsed.surat?.to || '',
                loginPassword: parsed.login?.password || '',
                musicCount: Array.isArray(parsed.music) ? parsed.music.length : 0,
                photosCount: Array.isArray(parsed.gallery?.photos) ? parsed.gallery.photos.length : 0,
                activePages: parsed.active_pages || {},
                publishedAt: parsed.submitted_at || null,
                createdAt: parsed.created_at || null,
                updatedAt: parsed.updated_at || null,
              });
            } catch (e) { /* skip corrupt entries */ }
          }
        }

        return json({ success: true, count: gifts.length, gifts });
      } catch (error) {
        return json({ success: false, error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /admin/delete-gift — Hapus gift dari KV (Admin only)
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/admin/delete-gift") {
      try {
        const authHeader = request.headers.get("Authorization");
        const secret = env.ADMIN_SECRET;
        if (!secret) return json({ error: "ADMIN_SECRET belum dikonfigurasi." }, 503);
        if (!authHeader || authHeader !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);

        const { ids } = await request.json();
        if (!Array.isArray(ids)) return json({ error: "Invalid ids array" }, 400);

        for (const id of ids) {
          await env.LOVES_KV.delete(id);
        }

        return json({ success: true, message: `Berhasil menghapus ${ids.length} gift.` });
      } catch (error) {
        return json({ success: false, error: error.message }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // POST /submit-premium — VIP Request + Telegram Notification
    // ═══════════════════════════════════════════════════════════════════
    if (request.method === "POST" && url.pathname === "/submit-premium") {
      try {
        const body = await request.json();
        const token = body.id || '(unknown)';
        const requestDomain = body.requestDomain || '(tidak diisi)';
        const requestedAt = body.requestedAt || new Date().toISOString();

        // Format waktu WIB
        const dtWib = new Date(requestedAt);
        const wibStr = dtWib.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit', month: '2-digit', year: '2-digit',
          hour: '2-digit', minute: '2-digit',
        }) + ' WIB';

        const recipientName = body.surat?.to || body.recipientName || '-';
        const photoCount = Array.isArray(body.gallery?.photos) ? body.gallery.photos.length : 0;
        const musicCount = Array.isArray(body.music) ? body.music.length : 0;
        const hasVoice = body.voiceNote ? 'Ada ✅' : 'Tidak ❌';
        const ambient = body.login?.ambient || body.ambient || '-';
        const hasPassword = body.login?.password ? `(${body.login.password})` : '(Tanpa Password)';
        const hint = body.login?.passwordHint || '-';

        const summaryMsg =
          `🎁 *REQUEST LINK PERSONAL — LOVES EDITION*\n\n` +
          `👤 Penerima: *${recipientName}*\n` +
          `🔑 Gift ID: \`${token}\`\n` +
          `🌐 Request Domain: \`${requestDomain}.vercel.app\`\n` +
          `🕐 Waktu: ${wibStr}\n\n` +
          `📸 Foto: ${photoCount} foto\n` +
          `🎵 Lagu: ${musicCount} lagu\n` +
          `🎙 Voice Note: ${hasVoice}\n` +
          `🎧 Ambient: ${ambient}\n` +
          `🔒 Password: *${hasPassword}*\n` +
          `💡 Hint: ${hint}\n\n` +
          `──────────────────\n` +
          `Cek pesan berikutnya untuk data.js`;

        // Mapping dari Editor ke struktur yang dibutuhkan oleh SPA App (app.html / data.js)
        const valentineData = {
          theme: body.theme || { backgroundColor: "#ffe5ec", fontDisplay: "Cinzel, serif", fontSans: "Inter, sans-serif", particles: "hearts" },
          login: body.login || {},
          music: body.music || [],
          musicSectionTitle: body.musicSectionTitle || "Our Playlist",
          gallery: {
            title: body.gallery?.title || "Galleries Memories",
            subtitle: body.gallery?.subtitle || "Scratch untuk reveal",
            memories: (body.gallery?.photos || []).map(p => ({
              type: p.type || 'image',
              src: p.url || '',
              caption: p.caption || '',
              tape: 'washi-tape',
              rotation: 'rotate-2'
            }))
          },
          wrapped: {
            vibeLabel: body.wrapped?.vibeLabel || "Our Vibe",
            vibe: body.wrapped?.vibe || "",
            HoursTogetherLabel: body.wrapped?.minutesTogetherLabel || "Hours Together",
            HoursTogether: body.wrapped?.minutesTogether || "",
            imageSrc: body.wrapped?.imageUrl || "",
            topPlacesLabel: body.wrapped?.topPlacesLabel || "Top Places",
            topPlaces: body.wrapped?.topPlaces || [],
            coreMemoriesLabel: body.wrapped?.coreMemoriesLabel || "Core Memories",
            coreMemories: body.wrapped?.coreMemories || []
          },
          letter: {
            recipient: body.surat?.to || "",
            message: body.surat?.message || "",
            signature: body.surat?.from || ""
          },
          invitation: body.invitation || {},
          metadata: {
            ...body.metadata,
            requestDomain: requestDomain,
            requestedAt: requestedAt
          }
        };

        const dataJs =
          `// data.js untuk ${token}\n` +
          `// Taruh di folder proyek kado lalu deploy ke Vercel.\n\n` +
          `window.VALENTINE_DATA = ${JSON.stringify(valentineData, null, 2)};\n`;

        const tgToken = env.TELEGRAM_BOT_TOKEN;
        const tgChat = env.TELEGRAM_CHAT_ID;

        if (tgToken && tgChat) {
          const tgBase = `https://api.telegram.org/bot${tgToken}`;

          // 1. Kirim pesan ringkasan
          await fetch(`${tgBase}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgChat,
              text: summaryMsg,
              parse_mode: 'Markdown'
            })
          });

          // 2. Kirim data.js sebagai file dokumen
          const fd = new FormData();
          fd.append('chat_id', tgChat);
          fd.append('caption',
            `data.js untuk ${token}\n🌐 Domain: ${requestDomain}.vercel.app\nMasukkan ke dalam folder kado lalu deploy ke Vercel.`
          );
          fd.append('document', new Blob([dataJs], { type: 'text/javascript' }), `data-${token}.js`);

          await fetch(`${tgBase}/sendDocument`, { method: 'POST', body: fd });
        }

        return json({ success: true, message: 'Request VIP diterima!', domain: requestDomain });

      } catch (error) {
        console.error('[submit-premium] Error:', error);
        return json({ error: error.message || 'Gagal memproses request VIP.' }, 500);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // GET /debug — Cek status binding
    // ═══════════════════════════════════════════════════════════════════
    if (url.pathname === "/debug") {
      return json({
        project: "Loves Edition — For You, Always",
        version: "v1.0",
        hasBucket: !!env.BUCKET,
        hasKV: !!env.LOVES_KV,
        hasTelegram: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
        cdnUrl: env.CDN_URL || '(not set — using worker proxy fallback)',
        domain: DOMAIN,
        url: request.url,
        method: request.method
      });
    }

    return new Response("Loves Edition API v1 Running ❤️", {
      headers: { ...corsHeaders, "Content-Type": "text/plain" }
    });
  }
};
