// Função para listar categorias (usada em selects de produtos, por exemplo)
function listarcategorias(nomeid) {
  // Função assíncrona autoexecutável (IIFE) para permitir uso de await
  (async () => {
    // Seleciona o elemento HTML informado no parâmetro (ex: um <select>)
    const sel = document.querySelector(nomeid);

    try {
      // Faz a requisição ao PHP que retorna a lista de categorias
      const r = await fetch("../PHP/cadastro_categorias.php?listar=1");

      // Se o retorno do servidor for inválido (status diferente de 200), lança erro
      if (!r.ok) throw new Error("Falha ao listar categorias!");

      /*
        Se os dados vierem corretamente, o conteúdo retornado pelo PHP 
        (geralmente <option>...</option>) é inserido dentro do elemento HTML.
        innerHTML é usado para injetar esse conteúdo diretamente no campo.
      */
      sel.innerHTML = await r.text();
    } catch (e) {
      // Caso haja erro (rede, servidor, etc.), exibe uma mensagem dentro do select
      sel.innerHTML = "<option disable>Erro ao carregar</option>";
    }
  })();
}



function marcasSelect(selector, options = {}) {
  const {
    endpoint = '../PHP/cadastro_marcas.php?listar=1',
    placeholder = 'Selecione...',
    preselectValue = null
  } = options;

  // Pequeno helper para escapar textos (evita injeção no HTML)
  const esc = s => (s || '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  (async () => {
    const sel = document.querySelector(selector);
    if (!sel) return;

    // feedback visual
    const wasDisabled = sel.disabled;
    sel.disabled = true;
    sel.innerHTML = `<option>${esc('Carregando...')}</option>`;

    try {
      const r = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('Falha na requisição de marcas');

      const data = await r.json();
      if (!data || data.ok !== true || !Array.isArray(data.marcas)) {
        throw new Error('Formato inválido de resposta');
      }

      // Monta options
      let opts = '';
      // Placeholder
      opts += `<option value="">${esc(placeholder)}</option>`;

      for (const m of data.marcas) {
        const id   = Number(m.idMarcas) || '';
        const nome = esc(m.nome || `Marca ${id}`);
        opts += `<option value="${id}">${nome}</option>`;
      }

      sel.innerHTML = opts;

      // Pré-seleção (se informada e existir na lista)
      if (preselectValue !== null && preselectValue !== '') {
        sel.value = String(preselectValue);
        // se não existir, mantém placeholder
        if (sel.value !== String(preselectValue)) {
          sel.value = '';
        }
      } else {
        sel.value = ''; // deixa placeholder selecionado
      }

    } catch (e) {
      console.error(e);
      sel.innerHTML = `<option value="">${esc('Erro ao carregar')}</option>`;
    } finally {
      sel.disabled = wasDisabled; // restaura estado anterior
    }
  })();
}




function listarMarcas(tbodyId) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbodyId);
    const url   = '../PHP/cadastro_marcas.php?listar=1';

    const esc = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ph  = n => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="12" fill="#999">${(n||'?').slice(0,2).toUpperCase()}</text>
       </svg>`
    );

    const row = m => {
      const src = m.imagem ? `data:image/jpeg;base64,${m.imagem}` : ph(m.nome);
      return `
        <tr data-id="${m.idMarcas}" data-nome="${esc(m.nome)}" data-img="${m.imagem ? m.imagem : ''}">
          <td><img src="${src}" alt="${esc(m.nome)}" style="width:60px;height:60px;object-fit:cover;border-radius:8px"></td>
          <td>${esc(m.nome)}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary btnMarcaSelecionar">Selecionar</button>
            <button class="btn btn-sm btn-danger btnMarcaExcluir">Excluir</button>
          </td>
        </tr>`;
    };

    fetch(url, { cache:'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || 'Erro ao listar marcas');
        tbody.innerHTML = d.marcas?.length ? d.marcas.map(row).join('') :
          `<tr><td colspan="3" class="text-center text-muted">Nenhuma marca cadastrada.</td></tr>`;
      })
      .catch(err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="3" class="text-danger text-center">Falha ao carregar marcas.</td></tr>`;
      });

    // Delegação de eventos da tabela (Selecionar / Excluir)
    tbody.addEventListener('click', (ev) => {
      const tr = ev.target.closest('tr');
      if (!tr) return;

      if (ev.target.closest('.btnMarcaSelecionar')) {
        entrarModoEdicaoMarca(tr.dataset);
      }

      if (ev.target.closest('.btnMarcaExcluir')) {
        excluirMarca(tr.dataset.id);
      }
    });
  });
}

function entrarModoEdicaoMarca({ id, nome, img }) {
  const form      = document.querySelector('form[action="../PHP/cadastro_marcas.php"]');
  if (!form) return;

  // garante hidden acao/id
  let inAcao = form.querySelector('input[name="acao"]');
  if (!inAcao) { inAcao = document.createElement('input'); inAcao.type='hidden'; inAcao.name='acao'; form.prepend(inAcao); }
  let inId = form.querySelector('input[name="id"]');
  if (!inId) { inId = document.createElement('input'); inId.type='hidden'; inId.name='id'; form.prepend(inId); }

  // campos
  const inNome = document.getElementById('brandNome');   // name="nomemarca"
  const inImg  = document.getElementById('brandImg');    // name="imagemmarca"
  const prev   = document.getElementById('brandPreview');
  const ph     = document.getElementById('brandPlaceholder');

  inId.value   = id;
  inAcao.value = 'atualizar';
  if (inNome) inNome.value = nome || '';

  // prévia da imagem atual (não é possível preencher <input type="file"> via JS)
  if (prev) {
    if (img) {
      prev.src = `data:image/jpeg;base64,${img}`;
      prev.classList.remove('d-none');
      ph?.classList.add('d-none');
    } else {
      prev.src = '';
      prev.classList.add('d-none');
      ph?.classList.remove('d-none');
    }
  }
  if (inImg) inImg.value = ''; // limpar seleção anterior

  // UI: troca botão principal e habilita excluir
  const btnSalvar = document.getElementById('marcaBtnCadastrar');
  const btnDel    = document.getElementById('marcaBtnExcluir');
  if (btnSalvar) { btnSalvar.textContent = 'Salvar alterações'; btnSalvar.classList.remove('btn-primary'); btnSalvar.classList.add('btn-success'); }
  if (btnDel)    { btnDel.disabled = false; }

  // Se o usuário anexar nova imagem, ela substituirá a antiga no PHP (já trata).
}

function excluirMarca(id) {
  if (!id) return;
  if (!confirm('Deseja realmente excluir esta marca?')) return;

  // cria e envia um formulário “one-shot” para POST acao=excluir
  const form = document.createElement('form');
  form.action = '../PHP/cadastro_marcas.php';
  form.method = 'POST';

  const ac = document.createElement('input');
  ac.type = 'hidden'; ac.name = 'acao'; ac.value = 'excluir';
  const iid = document.createElement('input');
  iid.type = 'hidden'; iid.name = 'id'; iid.value = String(id);

  form.append(ac, iid);
  document.body.appendChild(form);
  form.submit(); // seu PHP redireciona de volta e a lista recarrega
}

document.addEventListener('DOMContentLoaded', () => {
  const form   = document.querySelector('form[action="../PHP/cadastro_marcas.php"]');
  const btnDel = document.getElementById('marcaBtnExcluir');
  if (!form || !btnDel) return;

  btnDel.addEventListener('click', (ev) => {
    ev.preventDefault();
    const id = form.querySelector('input[name="id"]')?.value;
    if (!id) return alert('Selecione uma marca na tabela.');
    excluirMarca(id);
  });
});

function limparFormMarca() {
  const form = document.querySelector('form[action="../PHP/cadastro_marcas.php"]');
  if (!form) return;
  form.reset();

  const inAcao = form.querySelector('input[name="acao"]');
  const inId   = form.querySelector('input[name="id"]');
  if (inAcao) inAcao.value = '';
  if (inId)   inId.value   = '';

  const prev = document.getElementById('brandPreview');
  const ph   = document.getElementById('brandPlaceholder');
  if (prev) { prev.src=''; prev.classList.add('d-none'); }
  ph?.classList.remove('d-none');

  const btnSalvar = document.getElementById('marcaBtnCadastrar');
  const btnDel    = document.getElementById('marcaBtnExcluir');
  if (btnSalvar) { btnSalvar.textContent = 'Cadastrar'; btnSalvar.classList.remove('btn-success'); btnSalvar.classList.add('btn-primary'); }
  if (btnDel)    { btnDel.disabled = true; }
}




// ====== Ajuste da tabela para ter um botão "Selecionar" ======
function listarProdutos(tbodyId) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbodyId);
    const url   = '../PHP/cadastro_produtos.php?listar=1';

    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));

    const ph = () => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="10" fill="#999">SEM IMAGEM</text>
       </svg>`
    );

    const fmt = v => (typeof v==='number' && !isNaN(v))
      ? v.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})
      : '-';

    fetch(url)
      .then(r => { if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        if (!data.ok) throw new Error(data.error || 'Erro ao listar');
        const rows = (data.produtos||[]).map(p => {
          const imgSrc = p.imagem ? `data:image/jpeg;base64,${p.imagem}` : ph();
          return `
            <tr>
              <td>${p.idProdutos}</td>
              <td><img src="${imgSrc}" alt="${esc(p.texto_alternativo || p.nome)}" width="64" height="48" class="rounded"></td>
              <td>${esc(p.nome)}</td>
              <td>${esc(p.marca || '-')}</td>
              <td>${esc(p.categoria || '-')}</td>
              <td>${fmt(p.preco)}</td>
              <td>${p.preco_promocional!=null? fmt(p.preco_promocional) : '-'}</td>
              <td>${p.quantidade}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-primary btnSelecionar" data-id="${p.idProdutos}">Selecionar</button>
              </td>
            </tr>`;
        }).join('');

        const headerAction = `<th style="text-align:right">Ações</th>`;
        // garante que o <thead> tenha a coluna "Ações"
        const thead = tbody.closest('table').querySelector('thead tr');
        if (thead && !thead.querySelector('th:last-child')?.textContent?.match(/Ações/i)) {
          thead.insertAdjacentHTML('beforeend', headerAction);
        }

        tbody.innerHTML = rows || `<tr><td colspan="9" class="text-center text-muted">Nenhum produto</td></tr>`;
      })
      .catch(err => {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="9" class="text-danger text-center">Erro ao carregar produtos</td></tr>`;
      });

    // Delegação de evento: clique no "Selecionar"
    tbody.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('.btnSelecionar');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      try{
        const r = await fetch(`../PHP/cadastro_produtos.php?ver=1&id=${encodeURIComponent(id)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || 'Falha ao carregar detalhes');
        preencherFormProduto(d.produto);
        // rola a página até o formulário (opcional)
        document.querySelector('form[action="../PHP/cadastro_produtos.php"]')?.scrollIntoView({behavior:'smooth', block:'start'});
      }catch(e){ alert('Não foi possível carregar o produto.'); console.error(e); }
    });
  });
}

function preencherFormProduto(prod) {
  const form = document.querySelector('form[action="../PHP/cadastro_produtos.php"]');
  if (!form) return;

  // hidden
  let acao = form.querySelector('input[name="acao"]') || (() => {
    const x = document.createElement('input'); x.type='hidden'; x.name='acao'; form.prepend(x); return x;
  })();
  let id   = form.querySelector('input[name="id"]') || (() => {
    const x = document.createElement('input'); x.type='hidden'; x.name='id';   form.prepend(x); return x;
  })();

  acao.value = 'atualizar';
  id.value   = prod.id;

  // helper seguro p/ inputs
  const setVal = (sel, v='') => { const el = document.querySelector(sel); if (el) el.value = v ?? ''; };

  setVal('#pNome',        prod.nome);
  setVal('#pDescricao',   prod.descricao);
  setVal('#pQtd',         (prod.quantidade ?? 0));          // number
  setVal('#pPreco',       (prod.preco ?? ''));              // **type=number → usar ponto, sem toLocale**
  setVal('#pTamanho',     (prod.tamanho ?? ''));
  setVal('#pCor',         (prod.cor ?? ''));
  setVal('#pCodigo',      (prod.codigo ?? ''));
  setVal('#pPrecoPromo',  (prod.preco_promocional ?? ''));  // number

  // selects (garanta que já foram populados antes)
  const selMarca = document.getElementById('proMarca');
  const selCat   = document.getElementById('prodcat'); // name="categoriaproduto"
  if (selMarca) selMarca.value = String(prod.marca_id ?? '');
  if (selCat)   selCat.value   = String(prod.categoria_id ?? '');

  // prévias de imagens (mesma lógica que você já tinha)
  const slots = {
    1: { img: document.getElementById('pImg1Prev'), ph: document.getElementById('pImg1Ph') },
    2: { img: document.getElementById('pImg2Prev'), ph: document.getElementById('pImg2Ph') },
    3: { img: document.getElementById('pImg3Prev'), ph: document.getElementById('pImg3Ph') },
  };
  [1,2,3].forEach(n => {
    if (slots[n].img) { slots[n].img.src=''; slots[n].img.classList.add('d-none'); }
    if (slots[n].ph)  { slots[n].ph.classList.remove('d-none'); }
  });
  (prod.imagens||[]).forEach(it => {
    const s = slots[it.slot];
    if (s?.img && it.base64) {
      s.img.src = `data:image/jpeg;base64,${it.base64}`;
      s.img.classList.remove('d-none');
      s.ph?.classList.add('d-none');
    }
  });

  // marcar substituição de imagens quando enviar novas
  let subImgs = form.querySelector('input[name="substituir_imagens"]');
  if (!subImgs) { subImgs = document.createElement('input'); subImgs.type='hidden'; subImgs.name='substituir_imagens'; form.appendChild(subImgs); }
  subImgs.value = '0';
  ['pImg1','pImg2','pImg3'].forEach(idIn => {
    const inp = document.getElementById(idIn);
    if (inp) inp.addEventListener('change', () => { if (inp.files?.length) subImgs.value = '1'; });
  });

  // UI
  const btnCadastrar = document.getElementById('marcaBtnCadastrar');
  const btnExcluir   = document.getElementById('marcaBtnExcluir');
  if (btnCadastrar) { btnCadastrar.textContent = 'Salvar alterações'; btnCadastrar.classList.remove('btn-primary'); btnCadastrar.classList.add('btn-success'); }
  if (btnExcluir)   { btnExcluir.disabled = false; }
}

function renderProdutosRows(produtos) {
  const tbody = document.getElementById('tabelaProdutos');
  if (!tbody) return;

  const esc = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ph  = () => 'data:image/svg+xml;base64,' + btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
       <rect width="100%" height="100%" fill="#eee"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="sans-serif" font-size="10" fill="#999">SEM IMAGEM</text>
     </svg>`
  );
  const fmt = v => (typeof v==='number' && !isNaN(v)) ? v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}) : '-';

  tbody.innerHTML = (produtos||[]).map(p => {
    const imgSrc = p.imagem ? `data:image/jpeg;base64,${p.imagem}` : ph();
    return `
      <tr>
        <td>${p.idProdutos}</td>
        <td><img src="${imgSrc}" alt="${esc(p.texto_alternativo || p.nome)}" width="64" height="48" class="rounded"></td>
        <td>${esc(p.nome)}</td>
        <td>${esc(p.marca || '-')}</td>
        <td>${esc(p.categoria || '-')}</td>
        <td>${fmt(p.preco)}</td>
        <td>${p.preco_promocional!=null? fmt(p.preco_promocional) : '-'}</td>
        <td>${p.quantidade}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary btnSelecionar" data-id="${p.idProdutos}">Selecionar</button>
        </td>
      </tr>`;
  }).join('') || `<tr><td colspan="9" class="text-center text-muted">Nenhum produto</td></tr>`;
}

async function reloadProdutosTable() {
  try {
    const r = await fetch('../PHP/cadastro_produtos.php?listar=1', { cache:'no-store' });
    const d = await r.json();
    if (!r.ok || !d.ok) throw new Error(d.error || 'Erro ao listar');
    renderProdutosRows(d.produtos);
  } catch (e) {
    const tbody = document.getElementById('tabelaProdutos');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-danger text-center">Erro ao recarregar produtos</td></tr>`;
    console.error(e);
  }
}


// ====== Envio de ações (Cadastrar/Atualizar/Excluir) ======
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action="../PHP/cadastro_produtos.php"]');
  if (!form) return;

  const btnCadastrar = document.getElementById('marcaBtnCadastrar');
  const btnExcluir   = document.getElementById('marcaBtnExcluir');
  const inputAcao    = (function(){ let x=form.querySelector('input[name="acao"]'); if(!x){x=document.createElement('input');x.type='hidden';x.name='acao';form.prepend(x);} return x; })();
  const inputId      = (function(){ let x=form.querySelector('input[name="id"]');   if(!x){x=document.createElement('input');x.type='hidden';x.name='id';form.prepend(x);} return x; })();

  // SUBMIT padrão do form vai para o PHP; interceptamos para receber JSON e dar feedback sem recarregar (opcional)
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    // garante name no select de categoria
    const catSel = document.getElementById('prodcat');
    if (catSel && !catSel.name) catSel.name = 'categoriaproduto';

    const fd = new FormData(form);
    if (!fd.get('acao')) fd.set('acao', inputId.value ? 'atualizar' : 'cadastrar');

    try{
      const r = await fetch(form.getAttribute('action'), { method:'POST', body: fd });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || 'Falha na operação');

      alert(d.msg || 'Sucesso!');
      // recarrega listagem
      listarProdutos('tabelaProdutos');
      // se cadastrou novo, limpa form
      if (fd.get('acao')==='cadastrar') form.reset();
    }catch(e){
      alert(e.message || 'Erro');
      console.error(e);
    }
  });

  // Excluir
  if (btnExcluir) {
    btnExcluir.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!inputId.value) return alert('Selecione um produto.');
      if (!confirm('Deseja excluir este produto?')) return;

      const fd = new FormData(form);
      fd.set('acao','excluir');
      fd.set('id', inputId.value);

      try{
        const r = await fetch(form.getAttribute('action'), { method:'POST', body: fd });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || 'Falha ao excluir');

        alert('Excluído!');
        form.reset();
        inputId.value='';
        inputAcao.value='';
        listarProdutos('tabelaProdutos');

        if (btnCadastrar){ btnCadastrar.textContent='Cadastrar'; btnCadastrar.classList.remove('btn-success'); btnCadastrar.classList.add('btn-primary'); }
      }catch(e){
        alert(e.message || 'Erro ao excluir');
      }
    });
  }
});


function carregarMarcasSelect(selectId) {
  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById(selectId);
    const url    = '../PHP/cadastro_marcas.php?listar=1';

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Erro HTTP: ${r.status}`);
        return r.json();
      })
      .then(data => {
        // Limpa o select e adiciona a opção padrão
        select.innerHTML = '<option value="">Selecione uma marca</option>';

        // Verifica se há resultados
        if (!data.ok || !data.marcas?.length) {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'Nenhuma marca encontrada';
          opt.disabled = true;
          select.appendChild(opt);
          return;
        }

        // Popula o select com as marcas
        data.marcas.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.idMarcas;
          opt.textContent = m.nome;
          select.appendChild(opt);
        });
      })
      .catch(err => {
        console.error('Erro ao carregar marcas:', err);
        select.innerHTML = '<option value="">Erro ao carregar marcas</option>';
      });
  });
}





// Chamadas das funções para preencher as tabelas e selects da página
listarMarcas("tabelaMarcas");    // Popula a tabela de marcas
listarcategorias("#pCategoria"); // Popula o select de categoria principal
listarcategorias("#prodcat");    // Popula outro select de categorias (ex: produtos)
carregarMarcasSelect("#proMarca");
reloadProdutosTable();



(function categoriasCRUD(){
  document.addEventListener('DOMContentLoaded', async () => {
    // pega o form de categorias pelo action (igual ao seu HTML)
    const form = document.querySelector('form[action="../php/cadastro_categorias.php"]');
    if (!form) return;

    const sel       = document.getElementById('pCategoria');               // seu select
    const inNome    = form.querySelector('input[name="nomecategoria"]');   // campo nome
    const inDesc    = form.querySelector('input[name="desconto"]');        // campo desconto

    // garante campos ocultos (acao, id)
    let inAcao = form.querySelector('input[name="acao"]');
    if (!inAcao) {
      inAcao = document.createElement('input');
      inAcao.type = 'hidden'; inAcao.name = 'acao'; inAcao.id = 'catAcao';
      form.prepend(inAcao);
    }
    let inId = form.querySelector('input[name="id"]');
    if (!inId) {
      inId = document.createElement('input');
      inId.type = 'hidden'; inId.name = 'id'; inId.id = 'catId';
      form.prepend(inId);
    }

    // pega os 3 botões na ordem em que estão no seu HTML
    const [btnCadastrar, btnEditar, btnExcluir] = form.querySelectorAll('button');

    // util: troca rótulo/estilo do botão principal quando entrar em modo edição
    function modoEdicaoOn(){
      if (!btnCadastrar) return;
      btnCadastrar.textContent = 'Salvar alterações';
      btnCadastrar.classList.remove('btn-primary');
      btnCadastrar.classList.add('btn-success');
    }
    function modoEdicaoOff(){
      if (!btnCadastrar) return;
      btnCadastrar.textContent = 'Cadastrar';
      btnCadastrar.classList.remove('btn-success');
      btnCadastrar.classList.add('btn-primary');
      inAcao.value = '';
      inId.value = '';
    }

    // carrega mapa JSON das categorias (seu PHP já suporta ?format=json)
    // OBS: sua listagem padrão não inclui "desconto". Se puder, ajuste o PHP para
    // SELECT idCategoriaProduto AS id, nome, desconto ... quando format=json.
    let byId = new Map();
    try {
      const r = await fetch('../php/cadastro_categorias.php?listar=1&format=json', { cache: 'no-store' });
      const d = await r.json();
      if (d?.ok && Array.isArray(d.categorias)) {
        d.categorias.forEach(c => byId.set(String(c.id), c));
      }
    } catch(e) {
      // se falhar, o preenchimento usará apenas o nome digitado
    }

    // quando selecionar no combo, preenche campos e entra em modo edição
    sel?.addEventListener('change', () => {
      const id = sel.value;
      if (!id) return;

      const c = byId.get(String(id));  // pode ser undefined se backend não trouxe JSON
      inId.value   = id;
      inNome.value = c?.nome ?? inNome.value;  // se não tiver JSON, não sobrescreve

      // preenche desconto se o backend mandar no JSON (campo "desconto")
      if (c && typeof c.desconto !== 'undefined' && c.desconto !== null) {
        // converte para vírgula se você quiser ver como 0,00
        inDesc.value = String(c.desconto).replace('.', ',');
      }

      inAcao.value = 'atualizar';
      modoEdicaoOn();
    });

    // botão EDITAR -> acao=atualizar
    btnEditar?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!inId.value) {
        alert('Selecione uma categoria em "Categorias criadas" para editar.');
        return;
      }
      inAcao.value = 'atualizar';
      form.submit();
    });

    // botão EXCLUIR -> acao=excluir
    btnExcluir?.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (!inId.value) {
        alert('Selecione uma categoria em "Categorias criadas" para excluir.');
        return;
      }
      if (!confirm('Deseja realmente excluir esta categoria?')) return;
      inAcao.value = 'excluir';
      form.submit();
    });

    // se o usuário voltar a cadastrar algo novo manualmente, saia do modo edição
    inNome?.addEventListener('input', () => { if (!inId.value) modoEdicaoOff(); });
    inDesc?.addEventListener('input', () => { if (!inId.value) modoEdicaoOff(); });
  });
})();


document.addEventListener('DOMContentLoaded', () => {
  // Carrega as marcas no select
  marcasSelect('#proMarca');
});



