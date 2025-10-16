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

// Chamadas das funções para preencher as tabelas e selects da página
listarMarcas("tabelaMarcas");    // Popula a tabela de marcas
listarcategorias("#pCategoria"); // Popula o select de categoria principal
listarcategorias("#prodcat");    // Popula outro select de categorias (ex: produtos)
