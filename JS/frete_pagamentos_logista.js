// função de listar formas de pagamento em tabela
function listarFormasPagamento(tabelaPG) {
  // Aguarda o carregamento completo do DOM antes de executar
  document.addEventListener('DOMContentLoaded', () => {
    // Obtém o elemento <tbody> onde as linhas serão inseridas
    const tbody = document.getElementById(tabelaPG);
    // URL da requisição que retorna os dados em formato JSON
    const url   = '../PHP/cadastro_formas_pagamento.php?listar=1&format=json';

    // Função para escapar caracteres especiais e evitar injeção de HTML
    const esc = s => (s||'').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    // Função que monta uma linha (<tr>) da tabela para cada forma de pagamento
    const row = f => `
      <tr>
        <td>${Number(f.id) || ''}</td>
        <td>${esc(f.nome || '-')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-warning" data-id="${f.id}">Editar</button>
          <button class="btn btn-sm btn-danger"  data-id="${f.id}">Excluir</button>
        </td>
      </tr>`;

    // Faz a requisição dos dados e preenche a tabela
    fetch(url, { cache: 'no-store' })
      .then(r => r.json()) // Converte a resposta para JSON
      .then(d => {
        // Verifica se a resposta é válida
        if (!d.ok) throw new Error(d.error || 'Erro ao listar formas de pagamento');
        // Extrai o array de formas de pagamento (pode ter nomes diferentes no JSON)
        const arr = d.formas_pagamento || d.formas || [];
        // Insere as linhas na tabela ou mostra mensagem se não houver dados
        tbody.innerHTML = arr.length
          ? arr.map(row).join('')
          : `<tr><td colspan="3">Nenhuma forma de pagamento cadastrada.</td></tr>`;
      })
      .catch(err => {
        // Exibe mensagem de erro caso a requisição falhe
        tbody.innerHTML = `<tr><td colspan="3">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });
  });
}


// função de listar fretes em tabela
function listarFretes(tabelaFt) {
  // Aguarda o carregamento completo do DOM antes de executar
  document.addEventListener('DOMContentLoaded', () => {
    // <tbody> onde as linhas serão inseridas
    const tbody = document.getElementById(tabelaFt);
    // URL da requisição que retorna os fretes em formato JSON
    const url   = '../PHP/cadastro_frete.php?listar=1&format=json';

    // Função para escapar caracteres especiais (evita injeção de HTML)
    const esc = s => (s||'').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    // Cria um formatador de moeda para exibir valores em reais
    const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Função que monta cada linha (<tr>) da tabela com os dados do frete
    const row = f => `
      <tr>
        <td>${Number(f.id) || ''}</td>
        <td>${esc(f.bairro || '-')}</td>
        <td>${esc(f.transportadora || '-')}</td>
        <td class="text-end">${moeda.format(parseFloat(f.valor ?? 0))}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-warning" data-id="${f.id}">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-sm btn-danger" data-id="${f.id}">
            <i class="bi bi-trash"></i> Excluir
          </button>
        </td>
      </tr>`;

    // Faz a requisição e preenche a tabela com os dados dos fretes
    fetch(url, { cache: 'no-store' })
      .then(r => r.json()) // Converte a resposta para JSON
      .then(d => {
        // Verifica se o retorno está OK
        if (!d.ok) throw new Error(d.error || 'Erro ao listar fretes');
        // Extrai o array de fretes
        const fretes = d.fretes || [];
        // Preenche a tabela ou mostra mensagem se estiver vazia
        tbody.innerHTML = fretes.length
          ? fretes.map(row).join('')
          : `<tr><td colspan="5" class="text-center text-muted">Nenhum frete cadastrado.</td></tr>`;
      })
      .catch(err => {
        // Exibe mensagem de erro em caso de falha na requisição
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });
  });
}

// Chama as funções para listar os dados nas tabelas correspondentes
listarFormasPagamento("tbPagamentos");
listarFretes("tbFretes");
