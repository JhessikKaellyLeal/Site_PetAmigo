document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector('input[name="foto"]');
  const previewBox = document.querySelector(".banner-thumb");
  if (!input || !previewBox) return;

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];

    if (!file) {
      previewBox.innerHTML = '<span class="text-muted">Prévia</span>';
      return;
    }
    if (!file.type.startsWith("image/")) {
      previewBox.innerHTML = '<span class="text-danger small">Arquivo inválido</span>';
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      previewBox.innerHTML = `<img src="${e.target.result}" alt="Prévia do banner">`;
    };
    reader.readAsDataURL(file);
  });
});







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



// Lista banners em um <tbody> de tabela
function listarBanners(tbodyId) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbodyId);
    const url   = '../PHP/banners.php?listar=1';

    // Escapa texto para evitar injeção de HTML
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    // Placeholder (imagem cinza com "SEM IMAGEM")
    const ph = () => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="12" fill="#999">SEM IMAGEM</text>
       </svg>`
    );

    // Formata YYYY-MM-DD → DD/MM/YYYY
    const dtbr = iso => {
      if (!iso) return '-';
      const [y,m,d] = String(iso).split('-');
      return (y && m && d) ? `${d}/${m}/${y}` : '-';
    };

    // Monta a <tr> de cada banner
    const row = b => {
      const src = b.imagem ? `data:image/jpeg;base64,${b.imagem}` : ph();
      const cat = b.categoria_nome || '-';
      const link = b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener">abrir</a>` : '-';

      return `
        <tr>
          <td>
            <img src="${src}" alt="banner" 
                 style="width:96px;height:64px;object-fit:cover;border-radius:6px">
          </td>
          <td>${esc(b.descricao || '-')}</td>
          <td class="text-nowrap">${dtbr(b.data_validade)}</td>
          <td>${esc(cat)}</td>
          <td>${link}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-warning" data-id="${b.id}">Editar</button>
            <button class="btn btn-sm btn-danger"  data-id="${b.id}">Excluir</button>
          </td>
        </tr>`;
    };

    // Busca e preenche
    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || 'Erro ao listar banners');
        const arr = d.banners || [];
        tbody.innerHTML = arr.length
          ? arr.map(row).join('')
          : `<tr><td colspan="6" class="text-center text-muted">Nenhum banner cadastrado.</td></tr>`;
      })
      .catch(err => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });
  });
}



listarBanners('tbBanners');


listarcategorias("#categoriaBanner");
listarcategorias("#categoriasPromocoes");