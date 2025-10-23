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


// Função para listar marcas em uma tabela
function listarMarcas(nometabelamarcas) {
  // Aguarda o carregamento completo do documento antes de executar
  document.addEventListener('DOMContentLoaded', () => {
    // Seleciona o <tbody> onde as linhas da tabela serão inseridas
    const tbody = document.getElementById(nometabelamarcas);

    // URL do PHP que retorna os dados das marcas em formato JSON
    const url = '../PHP/cadastro_marcas.php?listar=1';

    // --- util 1) esc(): função para escapar caracteres especiais do texto
    // Evita problemas de injeção de HTML e preserva o conteúdo seguro na tela
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));

    // --- util 2) ph(): cria uma imagem SVG simples com iniciais da marca
    // É usada como "imagem padrão" quando a marca não possui imagem cadastrada
    const ph = n => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="12" fill="#999">
           ${(n || '?').slice(0, 2).toUpperCase()}
         </text>
       </svg>`
    );

    // --- util 3) row(): função que recebe um objeto marca e devolve uma linha <tr>
    // Exibe imagem (ou placeholder), nome e botões de ação (editar/excluir)
    const row = m => `
      <tr>
        <td>
          <img
            src="${m.imagem ? `data:${m.mime || 'image/jpeg'};base64,${m.imagem}` : ph(m.nome)}"
            alt="${esc(m.nome || 'Marca')}"
            style="width:60px;height:60px;object-fit:cover;border-radius:8px">
        </td>
        <td>${esc(m.nome || '-')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-warning" data-id="${m.idMarcas}">Editar</button>
          <button class="btn btn-sm btn-danger" data-id="${m.idMarcas}">Excluir</button>
        </td>
      </tr>`;

    // Faz a requisição dos dados para o PHP
    fetch(url, { cache: 'no-store' })
      .then(r => r.json()) // Converte a resposta em JSON
      .then(d => {
        // Se o PHP indicar erro, lança exceção para o catch tratar
        if (!d.ok) throw new Error(d.error || 'Erro ao listar');

        // Monta o conteúdo da tabela com base nas marcas recebidas
        tbody.innerHTML = d.marcas?.length
          ? d.marcas.map(row).join('') // Gera todas as linhas <tr>
          : `<tr><td colspan="3">Nenhuma marca cadastrada.</td></tr>`; // Caso não tenha dados
      })
      .catch(err => {
        // Se ocorrer erro (conexão, JSON inválido, etc.), exibe mensagem na tabela
        tbody.innerHTML = `<tr><td colspan="3">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });
  });
}

function listarProdutos(tbodyId) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbodyId);
    const url   = '../PHP/cadastro_produtos.php?listar=1';

    // Escapa texto para evitar injeção de HTML
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));

    // Placeholder (imagem cinza com "SEM IMAGEM")
    const ph = () => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="10" fill="#999">SEM IMAGEM</text>
       </svg>`
    );

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Erro HTTP: ${r.status}`);
        return r.json();
      })
      .then(data => {
        tbody.innerHTML = ''; // limpa antes de preencher

        if (!data.ok || !data.produtos?.length) {
          tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Nenhum produto encontrado.</td></tr>`;
          return;
        }

        data.produtos.forEach(p => {
          const precoFmt = p.preco.toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
          const promoFmt = p.preco_promocional ? 
            p.preco_promocional.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '-';
          const imgSrc = p.imagem ? `data:image/jpeg;base64,${p.imagem}` : ph();

          const linha = `
            <tr>
              <td>${p.idProdutos}</td>
              <td><img src="${imgSrc}" alt="${esc(p.texto_alternativo || p.nome)}" width="64" height="48" class="rounded"></td>
              <td>${esc(p.nome)}</td>
              <td>${esc(p.marca || '-')}</td>
              <td>${esc(p.categoria || '-')}</td>
              <td>${precoFmt}</td>
              <td>${promoFmt}</td>
              <td>${p.quantidade}</td>
            </tr>`;
          tbody.insertAdjacentHTML('beforeend', linha);
        });
      })
      .catch(err => {
        console.error('Erro ao listar produtos:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="text-danger text-center">Erro ao carregar produtos.</td></tr>`;
      });
  });
}

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
listarProdutos("tabelaProdutos");
carregarMarcasSelect("#proMarca");




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