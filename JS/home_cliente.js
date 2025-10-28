// ===================== CARROSSEL DE BANNERS (robusto p/ imagem) ===================== //
(function () {
  const esc = s => (s ?? "").toString().replace(/[&<>"']/g, c => (
    {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]
  ));

  const placeholder = (w = 1200, h = 400, txt = "SEM IMAGEM") =>
    "data:image/svg+xml;base64," + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="100%" height="100%" fill="#e9ecef"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial, sans-serif" font-size="28" fill="#6c757d">${txt}</text>
      </svg>`
    );

  const hojeYMD = new Date().toISOString().slice(0,10);
  const dentroDaValidade = d => (!d ? true : d >= hojeYMD);

  // Resolve qualquer forma de imagem enviada pelo backend
  function resolveImagemSrc(b) {
    if (!b) return placeholder();

    // 1) data URL completa
    if (typeof b.imagem === "string" && b.imagem.trim().startsWith("data:")) {
      return b.imagem.trim();
    }

    // 2) URL absoluta/relativa
    const urlCands = [b.imagem, b.img, b.url_imagem, b.img_url, b.caminho, b.path].filter(Boolean);
    for (const s of urlCands) {
      const v = String(s).trim();
      if (/^(https?:)?\/\//i.test(v) || v.startsWith("/")) return v;
    }

    // 3) base64 crua + mime opcional
    const base64Raw = (b.imagem_base64 || b.base64 || b.imagem || "").toString().trim();
    if (base64Raw && /^[A-Za-z0-9+/=\s]+$/.test(base64Raw.replace(/\s+/g, ""))) {
      if (base64Raw.replace(/\s+/g, "").length > 64) {
        const mime = (b.mime || b.mimetype || "image/jpeg").toString().trim();
        return `data:${mime};base64,${base64Raw}`;
      }
    }

    // 4) endpoint por id
    if (b.img_endpoint && b.id != null) {
      const base = String(b.img_endpoint);
      const url = base.includes("?")
        ? `${base}&id=${encodeURIComponent(b.id)}`
        : `${base}?id=${encodeURIComponent(b.id)}`;
      return url;
    }

    return placeholder();
  }

  function renderErro(container, titulo, detalhesHtml) {
    container.innerHTML = `
      <div class="carousel-item active">
        <div class="p-3">
          <div class="alert alert-danger mb-2"><strong>${esc(titulo)}</strong></div>
          <div class="alert alert-light border small" style="white-space:pre-wrap">${detalhesHtml}</div>
        </div>
      </div>`;
    const ind = document.getElementById("banners-indicators");
    if (ind) ind.innerHTML = "";
  }

  function renderCarrossel(container, indicators, banners) {
    if (!Array.isArray(banners) || !banners.length) {
      renderErro(container, "Nenhum banner disponível.", "O servidor respondeu com sucesso, porém a lista veio vazia.");
      return;
    }

    const itemsHtml = banners.map((b, i) => {
      const active = i === 0 ? "active" : "";
      const src = resolveImagemSrc(b);
      const desc = (b.descricao ?? "Banner").toString();
      const link = b.link ? String(b.link) : null;

      const imgTag = `<img src="${src}" class="d-block w-100" alt="${esc(desc)}" loading="lazy" style="object-fit:cover; height:400px;">`;
      const wrapped = link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
        : imgTag;

      return `<div class="carousel-item ${active}">${wrapped}</div>`;
    }).join("");

    const indicatorsHtml = banners.map((_, i) =>
      `<button type="button" data-bs-target="#carouselBanners" data-bs-slide-to="${i}" class="${i===0?"active":""}" aria-label="Slide ${i+1}"></button>`
    ).join("");

    container.innerHTML = itemsHtml;
    if (indicators) indicators.innerHTML = indicatorsHtml;
  }

  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 10000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(resource, { ...options, signal: controller.signal, headers: { "Accept": "application/json" } });
    } finally { clearTimeout(id); }
  }

  async function tentarCaminhos(urls) {
    for (const url of urls) {
      try {
        const r = await fetchWithTimeout(url, { timeout: 12000 });
        const contentType = r.headers.get("content-type") || "";
        const raw = await r.text();

        let data = null;
        if (/application\/json/i.test(contentType) || raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
          try { data = JSON.parse(raw); } catch {}
        }

        // Aceita: { ok:true, banners:[...] } | { banners:[...] } | [ ... ]
        let banners = null;
        if (data) {
          if (Array.isArray(data)) banners = data;
          else if (Array.isArray(data.banners)) banners = data.banners;
        }

        if (r.ok && Array.isArray(banners)) {
          return { ok: true, url, data: { banners } };
        }
      } catch (err) {
        // segue testando os próximos caminhos
      }
    }
    return { ok: false };
  }

  async function listarBannersCarrossel({
    containerSelector = "#banners-home",
    indicatorsSelector = "#banners-indicators",
    // Ajuste conforme a pasta do seu HTML em relação ao PHP:
    urlCandidates = [
      "../PHP/banners.php?listar=1",   // se o HTML estiver em PAGINAS_CLIENTE/
      "PHP/banners.php?listar=1",      // se o HTML estiver na raiz do projeto
      "../../PHP/banners.php?listar=1" // se o HTML estiver uma pasta mais fundo
    ],
    apenasValidos = true
  } = {}) {
    const container = document.querySelector(containerSelector);
    const indicators = document.querySelector(indicatorsSelector);
    if (!container) return;

    container.innerHTML = `<div class="carousel-item active"><div class="p-3 text-muted">Carregando banners…</div></div>`;
    if (indicators) indicators.innerHTML = "";

    const tentativa = await tentarCaminhos(urlCandidates);
    if (!tentativa.ok) {
      renderErro(container, "Não foi possível carregar os banners.",
        "• Verifique o caminho do PHP (?listar=1)\n• Garanta header JSON no PHP\n• Retorne { ok:true, banners:[...] } ou [ ... ]");
      return;
    }

    // filtro por validade, se houver campo data_validade
    let lista = tentativa.data.banners.slice();
    if (apenasValidos) lista = lista.filter(b => dentroDaValidade(b.data_validade));

    renderCarrossel(container, indicators, lista);
  }

  document.addEventListener("DOMContentLoaded", () => {
    listarBannersCarrossel({
      // se o seu HTML estiver na raiz, troque a ordem para ["PHP/banners.php?listar=1", "../PHP/banners.php?listar=1", ...]
      urlCandidates: ["../PHP/banners.php?listar=1", "PHP/banners.php?listar=1", "../../PHP/banners.php?listar=1"],
      apenasValidos: true
    });
  });
})();
