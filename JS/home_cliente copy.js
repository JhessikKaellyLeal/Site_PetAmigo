// ===================== CARROSSEL DE BANNERS (com debug automático) ===================== //

(function () {
  const esc = s => (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));

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
  const fmtData = d => d ? d.split("-").reverse().join("/") : "—";

  function renderErro(container, titulo, detalhesHtml) {
    container.innerHTML = `
      <div class="carousel-item active">
        <div class="p-3">
          <div class="alert alert-danger mb-2"><strong>${esc(titulo)}</strong></div>
          <div class="alert alert-light border small" style="white-space:pre-wrap">${detalhesHtml}</div>
        </div>
      </div>`;
    // zera indicadores
    const ind = document.getElementById("banners-indicators");
    if (ind) ind.innerHTML = "";
  }

  function renderCarrossel(container, indicators, banners) {
    if (!banners.length) {
      renderErro(container, "Nenhum banner disponível.", "O servidor respondeu com sucesso, porém a lista veio vazia.");
      return;
    }

    const itemsHtml = banners.map((b, i) => {
      const active = i === 0 ? "active" : "";
      const src = b.imagem ? `data:image/jpeg;base64,${b.imagem}` : placeholder();
      const desc = esc(b.descricao ?? "Banner");
      const link = b.link ? esc(b.link) : null;
      const validade = fmtData(b.data_validade);
      const categoria = b.categoria_nome ? esc(b.categoria_nome) : "Sem categoria";

      const imgTag = `<img src="${src}" class="d-block w-100" alt="${desc}" style="object-fit:cover; height:400px;">`;
      const wrapped = link
        ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${imgTag}</a>`
        : imgTag;

      return `
        <div class="carousel-item ${active}">
          ${wrapped}
          
        </div>`;
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
      const resp = await fetch(resource, { ...options, signal: controller.signal, headers: { "Accept": "application/json" } });
      return resp;
    } finally {
      clearTimeout(id);
    }
  }

  async function tentarCaminhos(urls) {
    // Testa os caminhos em sequência até um retornar JSON ok:true
    for (const url of urls) {
      console.log("[BANNERS] testando URL:", url);
      try {
        const r = await fetchWithTimeout(url, { timeout: 12000 });

        const contentType = r.headers.get("content-type") || "";
        const raw = await r.text(); // pega texto para log/inspeção

        // Tenta JSON (quando aplicável)
        let data = null;
        if (/application\/json/i.test(contentType) || raw.trim().startsWith("{")) {
          try { data = JSON.parse(raw); } catch { /* segue em frente */ }
        }

        if (r.ok && data && data.ok === true && Array.isArray(data.banners)) {
          console.log("[BANNERS] sucesso na URL:", url, "count:", data.count);
          return { ok: true, url, data };
        }

        // log detalhado
        console.warn("[BANNERS] URL falhou:", url, {
          status: r.status,
          contentType,
          bodyPreview: raw.slice(0, 500)
        });

      } catch (err) {
        console.error("[BANNERS] erro de rede/timeout na URL:", url, err);
      }
    }
    return { ok: false };
  }

  async function listarBannersCarrossel({
    containerSelector = "#banners-home",
    indicatorsSelector = "#banners-indicators",
    // Ajuste a lista conforme a profundidade da sua página:
    urlCandidates = [
      "PHP/cadastro_banners.php?listar=1",
      "../PHP/cadastro_banners.php?listar=1",
      "../../PHP/cadastro_banners.php?listar=1"
    ],
    apenasValidos = true
  } = {}) {
    const container = document.querySelector(containerSelector);
    const indicators = document.querySelector(indicatorsSelector);
    if (!container) {
      console.error("[BANNERS] container não encontrado:", containerSelector);
      return;
    }

    container.innerHTML = `<div class="carousel-item active"><div class="p-3 text-muted">Carregando banners…</div></div>`;
    if (indicators) indicators.innerHTML = "";

    const tentativa = await tentarCaminhos(urlCandidates);

 
    const { url, data } = tentativa;
    let lista = data.banners.slice();
    if (apenasValidos) lista = lista.filter(b => dentroDaValidade(b.data_validade));

    console.log("[BANNERS] usando URL:", url, "exibindo:", lista.length, "de", data.banners.length);

    renderCarrossel(container, indicators, lista);
  }

  // Auto-execução quando o DOM estiver pronto
  document.addEventListener("DOMContentLoaded", () => {
    listarBannersCarrossel({
      // ajuste a ordem para o seu projeto (deixe a que bate primeiro no seu ambiente no topo)
      urlCandidates: [
        "../PHP/banners.php?listar=1",
        "PHP/banners.php?listar=1",
        "../../PHP/banners.php?listar=1"
      ],
      apenasValidos: true
    });
  });
})();
