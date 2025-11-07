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


// ====== CATEGORIAS (chips) + PRODUTOS (cards) com filtro no BACKEND ====== //
// Página: index.html na raiz | Endpoints: PHP/cadastro_categorias.php, PHP/cadastro_produtos.php
(function () {
  // --------- Helpers ---------
  const $ = sel => document.querySelector(sel);
  const esc = s => (s ?? "").toString().replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] || c)
  );
  const moneyBR = v => isFinite(v) ? v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' }) : "";

  const placeholder = (w = 600, h = 400, txt = "SEM IMAGEM") =>
    "data:image/svg+xml;base64," + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
        <rect width="100%" height="100%" fill="#f2f2f2"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial, sans-serif" font-size="18" fill="#6c757d">${txt}</text>
      </svg>`
    );

  function resolveImg(prod) {
    const cand = [
      prod?.imagem, prod?.img, prod?.img_url, prod?.url_imagem,
      prod?.imagem_base64, prod?.base64
    ].find(Boolean);

    if (!cand) return placeholder();

    const s = String(cand).trim();

    // data URL completa
    if (s.startsWith("data:")) return s;

    // URL http(s) ou absoluta
    if (/^(https?:)?\/\//i.test(s) || s.startsWith("/")) return s;

    // base64 cru
    if (/^[A-Za-z0-9+/=\s]+$/.test(s.replace(/\s+/g, ""))) {
      return `data:image/jpeg;base64,${s}`;
    }

    return placeholder();
  }

  function produtoCard(prod) {
    const src  = resolveImg(prod);
    const nome = esc(prod?.nome ?? "Produto");
    const alt  = esc(prod?.texto_alternativo ?? nome);
    const marca= esc(prod?.marca ?? "");
    const cat  = esc(prod?.categoria ?? "");

    const temPromo   = prod?.preco_promocional && Number(prod.preco_promocional) > 0;
    const precoNorm  = isFinite(prod?.preco) ? moneyBR(Number(prod.preco)) : "";
    const precoPromo = temPromo ? moneyBR(Number(prod.preco_promocional)) : null;

    return `
      <div class="col">
        <div class="card h-100 shadow-sm">
          <img src="${src}" class="card-img-top" alt="${alt}" loading="lazy" style="object-fit:cover; aspect-ratio: 4/3;">
          <div class="card-body d-flex flex-column">
            <h6 class="card-title mb-1 text-truncate" title="${nome}">${nome}</h6>
            <div class="text-muted small mb-2">${marca ? `Marca: ${marca}` : ""} ${cat ? `• ${cat}` : ""}</div>
            <div class="mb-2">
              ${
                temPromo
                  ? `<div class="fw-bold">${precoPromo} <span class="text-decoration-line-through text-muted ms-2">${precoNorm}</span></div>`
                  : `<div class="fw-bold">${precoNorm}</div>`
              }
            </div>
            <div class="mt-auto d-grid gap-2">
              <button class="btn btn-primary btn-sm" data-id="${prod.id}">Adicionar ao carrinho</button>
              <button class="btn btn-outline-secondary btn-sm" data-id="${prod.id}">Detalhes</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  async function fetchText(url, acceptJson = true) {
    const r = await fetch(url, {
      headers: acceptJson ? { "Accept": "application/json" } : {},
      credentials: "same-origin",
      cache: "no-store"
    });
    const raw = await r.text();
    return { ok: r.ok, status: r.status, raw, contentType: r.headers.get("content-type") || "" };
  }

  function parseMaybeJson(raw) {
    try { return JSON.parse(raw); } catch { return null; }
  }

  // --------- Endpoints fixos (index.html na raiz) ---------
  const URLS = {
    categoriasJson: "PHP/cadastro_categorias.php?listar=1&format=json",
    categoriasOpt : "PHP/cadastro_categorias.php?listar=1",
    produtosAll   : "PHP/cadastro_produtos.php?listar=1",
    // candidatos para filtro (aceita backends diferentes)
    produtosByCatCandidates: (id) => ([
      `PHP/cadastro_produtos.php?listar_por_categoria=1&idCategoria=${encodeURIComponent(id)}`,
      `PHP/cadastro_produtos.php?listar=1&idCategoria=${encodeURIComponent(id)}`,
      `PHP/cadastro_produtos.php?listar_por_categoria=1&idcategoria=${encodeURIComponent(id)}`,
      `PHP/cadastro_produtos.php?listar_por_categoria=1&categoria_id=${encodeURIComponent(id)}`
    ])
  };

  // --------- Estado ---------
  const state = {
    categorias: [],     // [{id, nome}]
    catMap: new Map(),  // id -> nome
    activeCat: "",      // "" = todas
    produtos: []        // último payload exibido (para re-render somente)
  };

  // --------- Normalizadores ---------
  function normalizeCategorias(payload) {
    // aceita: {categorias:[{id,nome}]} | [{id,nome}] | [{idCategoriaProduto,nome}]
    const arr = Array.isArray(payload?.categorias) ? payload.categorias
             : Array.isArray(payload) ? payload : [];
    return arr.map(c => ({
      id: Number(c.id ?? c.idCategoriaProduto ?? c.idcategoria ?? c.categoria_id ?? c.value ?? c.ID ?? 0),
      nome: String(c.nome ?? c.label ?? c.text ?? "Categoria")
    })).filter(c => c.id);
  }

  function normalizeProdutos(payload) {
    // aceita: {produtos:[...]} | [...] 
    const arr = Array.isArray(payload?.produtos) ? payload.produtos
             : Array.isArray(payload) ? payload : [];
    return arr.map(p => {
      const id = Number(p.idProdutos ?? p.id ?? p.produto_id ?? p.ID ?? 0);
      const nome = String(p.nome ?? p.titulo ?? p.nome_produto ?? "Produto");
      const preco = Number(p.preco ?? p.valor ?? p.preco_unitario ?? p.precoNormal ?? 0);
      const preco_promocional = Number(p.preco_promocional ?? p.promocao ?? p.precoPromo ?? 0) || null;
      const categoria = String(p.categoria ?? p.categoria_nome ?? p.nome_categoria ?? "");
      const marca = String(p.marca ?? p.nome_marca ?? "");
      const imagem = p.imagem ?? p.img ?? p.img_url ?? p.url_imagem ?? p.imagem_base64 ?? p.base64 ?? null;
      const texto_alternativo = p.texto_alternativo ?? p.alt ?? nome;

      return { id, nome, preco, preco_promocional, categoria, marca, imagem, texto_alternativo };
    });
  }

  // --------- UI: chips ---------
  function buildChip({ id, nome }) {
    const isActive = String(id) === String(state.activeCat);
    const base = "btn btn-sm rounded-pill px-3";
    const cls  = isActive ? `btn-primary ${base}` : `btn-outline-primary ${base}`;
    return `<button type="button" class="${cls}" data-cat="${id}" title="${esc(nome)}">${esc(nome)}</button>`;
  }

  function renderChips() {
    const wrap = $("#cats-chips");
    if (!wrap) return;

    const chips = [
      `<button type="button" class="${state.activeCat==="" ? "btn btn-primary" : "btn btn-outline-primary"} btn-sm rounded-pill px-3" data-cat="">Todas as categorias</button>`
    ].concat(state.categorias.map(buildChip));

    wrap.innerHTML = chips.join("");
  }

  function setActiveChip(catId) {
    state.activeCat = String(catId ?? "");
    renderChips();
    const sel = $("#filtro-categoria");
    if (sel) sel.value = state.activeCat;
  }

  // --------- Carregamento de categorias ---------
  async function carregarCategorias() {
    const sel = $("#filtro-categoria");

    // 1) tenta JSON
    const r1 = await fetchText(URLS.categoriasJson, true);
    if (r1.ok) {
      const data = parseMaybeJson(r1.raw);
      const lista = normalizeCategorias(data);
      if (lista.length) {
        state.categorias = lista;
        state.catMap = new Map(lista.map(c => [c.id, c.nome]));
        if (sel) {
          sel.innerHTML = [`<option value="">Todas as categorias</option>`]
            .concat(lista.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`)).join("");
        }
        renderChips();
        return;
      }
    }

    // 2) fallback: <option>
    const r2 = await fetchText(URLS.categoriasOpt, false);
    if (r2.ok && /<option/i.test(r2.raw) && sel) {
      sel.innerHTML = `<option value="">Todas as categorias</option>` + r2.raw;
      state.catMap.clear();
      [...sel.querySelectorAll("option")].forEach(op => {
        if (op.value !== "") state.catMap.set(Number(op.value), op.textContent.trim());
      });
      state.categorias = [...state.catMap.entries()].map(([id, nome]) => ({ id, nome }));
    }
    renderChips();
  }

  // --------- Carregamento de produtos ---------
  async function carregarProdutosAll() {
    const status = $("#produtos-status");
    const grid   = $("#produtos-grid");
    status && (status.textContent = "Carregando produtos…");
    grid && (grid.innerHTML = "");

    const r = await fetchText(URLS.produtosAll, true);
    if (!r.ok) {
      status && (status.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os produtos.</div>`);
      return;
    }
    const data = parseMaybeJson(r.raw) ?? [];
    const lista = normalizeProdutos(data);
    state.produtos = lista;
    status && (status.textContent = "");
    renderProdutos(state.produtos);
  }

  async function carregarProdutosPorCategoria(idCat) {
    const status = $("#produtos-status");
    const grid   = $("#produtos-grid");
    status && (status.textContent = "Carregando produtos…");
    grid && (grid.innerHTML = "");

    // Se vazio, cai para “todas”
    if (!idCat) return carregarProdutosAll();

    // Tenta múltiplos formatos de rota
    const urls = URLS.produtosByCatCandidates(idCat);
    for (const u of urls) {
      const r = await fetchText(u, true);
      const data = parseMaybeJson(r.raw);

      // Aceita {ok:true, produtos:[...]}, {produtos:[...]}, ou [...]
      const payload = (data && (Array.isArray(data?.produtos) || Array.isArray(data)))
        ? data : null;

      if (r.ok && payload) {
        const lista = normalizeProdutos(payload);
        state.produtos = lista;
        status && (status.textContent = "");
        renderProdutos(state.produtos);
        return;
      }
    }

    // se nada funcionar
    status && (status.innerHTML = `<div class="alert alert-danger">Não foi possível carregar os produtos desta categoria.</div>`);
  }

  // --------- Renderização ---------
  function renderProdutos(lista) {
    const grid   = $("#produtos-grid");
    const status = $("#produtos-status");
    if (!grid) return;

    if (!lista || !lista.length) {
      grid.innerHTML = "";
      status && (status.innerHTML = `<div class="alert alert-warning mt-3 mb-0">Nenhum produto encontrado.</div>`);
      return;
    }

    status && (status.textContent = "");
    grid.innerHTML = lista.map(produtoCard).join("");
  }

  // --------- Eventos ---------
  function wireEvents() {
    // chips
    $("#cats-chips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-cat]");
      if (!btn) return;
      // se o atributo existir sem valor (como no seu HTML inicial), trata como ""
      const catId = btn.hasAttribute("data-cat") ? (btn.getAttribute("data-cat") ?? "") : "";
      setActiveChip(catId);
      carregarProdutosPorCategoria(catId);
    });

    // select (fallback)
    $("#filtro-categoria")?.addEventListener("change", (e) => {
      const catId = e.target.value ?? "";
      setActiveChip(catId);
      carregarProdutosPorCategoria(catId);
    });
  }

  // --------- Boot ---------
  document.addEventListener("DOMContentLoaded", async () => {
    state.activeCat = "";              // todas
    await carregarCategorias();        // popula chips/select
    await carregarProdutosAll();       // carrega produtos iniciais
    wireEvents();
  });
})();




