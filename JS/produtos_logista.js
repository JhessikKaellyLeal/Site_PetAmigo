function listarcategorias(nomeid){
(async () => {
    // selecionando o elemento html da tela de cadastro de produtos
    const sel = document.querySelector(nomeid);
    try {
        // criando a váriavel que guardar os dados vindo do php, que estão no metodo de listar
        const r = await fetch("../PHP/cadastro_categorias.php?listar=1");
        // se o retorno do php vier false, significa que não foi possivel listar os dados
        if (!r.ok) throw new Error("Falha ao listar categorias!");
        /* se vier dados do php, ele joga as 
        informações dentro do campo html em formato de texto
        innerHTML- inserir dados em elementos html
        */
        sel.innerHTML = await r.text();
    } catch (e) {
        // se dê erro na listagem, aparece Erro ao carregar dentro do campo html
        sel.innerHTML = "<option disable>Erro ao carregar</option>"
    }
})();
}


// função de listar marcas em tabelas
function listarMarcas(nometabelamarcas){
// Espera o HTML carregar para só então buscar e preencher a tabela
document.addEventListener('DOMContentLoaded', () => {
  // <tbody> onde as linhas serão inseridas
  const tbody = document.getElementById('tabelaMarcas');

  // Endpoint que devolve JSON { ok, count, marcas[] }
  const url = '../PHP/cadastro_marcas.php?listar=1';

  // --- util 1) esc(): escapa caracteres especiais no texto (evita quebrar o HTML)
  const esc = s => (s||'').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  // --- util 2) ph(): gera um SVG base64 com as iniciais, usado quando não há imagem
  const ph  = n => 'data:image/svg+xml;base64,' + btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
       <rect width="100%" height="100%" fill="#eee"/>
       <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
             font-family="sans-serif" font-size="12" fill="#999">
         ${(n||'?').slice(0,2).toUpperCase()}
       </text>
     </svg>`
  );

  // --- util 3) row(): recebe 1 marca e retorna o HTML <tr> correspondente
  // Usa a imagem em base64 se existir; senão usa o placeholder SVG
  const row = m => `
    <tr>
      <td>
        <img
          src="${m.imagem ? `data:${m.mime||'image/jpeg'};base64,${m.imagem}` : ph(m.nome)}"
          alt="${esc(m.nome||'Marca')}"
          style="width:60px;height:60px;object-fit:cover;border-radius:8px">
      </td>
      <td>${esc(m.nome||'-')}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-warning" data-id="${m.idMarcas}">Editar</button>
        <button class="btn btn-sm btn-danger"  data-id="${m.idMarcas}">Excluir</button>
      </td>
    </tr>`;

  // Faz a requisição ao PHP (sem cache) e preenche a tabela
  fetch(url, { cache: 'no-store' })
    // Converte a resposta em JSON
    .then(r => r.json())
    // Trata o JSON e renderiza
    .then(d => {
      // Se o backend sinalizou erro, lança para o .catch
      if (!d.ok) throw new Error(d.error || 'Erro ao listar');

      // Se houver marcas, monta as linhas; senão, mostra mensagem de vazio
      tbody.innerHTML = d.marcas?.length
        ? d.marcas.map(row).join('')            // junta todas as <tr> num único HTML
        : `<tr><td colspan="3">Nenhuma marca cadastrada.</td></tr>`;
    })
    // Qualquer erro (rede, JSON inválido, etc.) cai aqui
    .catch(err => {
      tbody.innerHTML = `<tr><td colspan="3">Falha ao carregar: ${esc(err.message)}</td></tr>`;
    });
});
}





listarMarcas("#tabelaMarcas");
listarcategorias("#pCategoria");
listarcategorias("#prodcat");




