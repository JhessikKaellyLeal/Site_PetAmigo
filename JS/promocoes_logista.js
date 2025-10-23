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






function listarCupons(tbcupom) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbcupom);
    const url   = '../PHP/cupom.php?listar=1';

    // Escapa texto (evita injeção de HTML)
    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    // Converte data YYYY-MM-DD → DD/MM/YYYY
    const dtbr = iso => {
      if (!iso) return '-';
      const [y,m,d] = String(iso).split('-');
      return (y && m && d) ? `${d}/${m}/${y}` : '-';
    };

    // Monta a <tr> de cada cupom
    const row = c => `
      <tr>
        <td>${c.id}</td>
        <td>${esc(c.nome)}</td>
        <td>R$ ${parseFloat(c.valor).toFixed(2).replace('.', ',')}</td>
        <td>${dtbr(c.data_validade)}</td>
        <td>${c.quantidade}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-warning" data-id="${c.id}">Editar</button>
          <button class="btn btn-sm btn-danger"  data-id="${c.id}">Excluir</button>
        </td>
      </tr>`;

    // Busca os dados e preenche a tabela
    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || 'Erro ao listar cupons');
        const arr = d.cupons || [];
        tbody.innerHTML = arr.length
          ? arr.map(row).join('')
          : `<tr><td colspan="6" class="text-center text-muted">Nenhum cupom cadastrado.</td></tr>`;
      })
      .catch(err => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });
  });
}




// Lista banners e habilita "Editar" para preencher o formulário acima
function listarBanners(tbbanner) {
  document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById(tbbanner);

    
    const url   = '../PHP/banners.php?listar=1';

    // Map em memória para recuperar rapidamente o banner pelo id
    let byId = new Map();

    const esc = s => (s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));

    const ph = () => 'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64">
         <rect width="100%" height="100%" fill="#eee"/>
         <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
               font-family="sans-serif" font-size="12" fill="#999">SEM IMAGEM</text>
       </svg>`
    );

    const dtbr = iso => {
      if (!iso) return '-';
      const [y,m,d] = String(iso).split('-');
      return (y && m && d) ? `${d}/${m}/${y}` : '-';
    };

    const row = b => {
      const src  = b.imagem ? `data:image/*;base64,${b.imagem}` : ph();
      const cat  = b.categoria_nome || '-';
      const link = b.link ? `<a href="${esc(b.link)}" target="_blank" rel="noopener">abrir</a>` : '-';

      // guardamos no Map
      byId.set(String(b.id), b);

      return `
        <tr>
          <td><img src="${src}" alt="banner"
                   style="width:96px;height:64px;object-fit:cover;border-radius:6px"></td>
          <td>${esc(b.descricao || '-')}</td>
          <td class="text-nowrap">${dtbr(b.data_validade)}</td>
          <td>${esc(cat)}</td>
          <td>${link}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-warning btn-edit" data-id="${b.id}">Selecionar</button>
           
          </td>
        </tr>`;
    };

    // 1) carrega e desenha
    fetch(url, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || 'Erro ao listar banners');
        const arr = d.banners || [];
        byId = new Map(); // zera e repopula
        tbody.innerHTML = arr.length
          ? arr.map(row).join('')
          : `<tr><td colspan="6" class="text-center text-muted">Nenhum banner cadastrado.</td></tr>`;
      })
      .catch(err => {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Falha ao carregar: ${esc(err.message)}</td></tr>`;
      });

    // 2) delegação de eventos: clicar em "Editar" preenche o formulário
    tbody.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;

      if (btn.classList.contains('btn-edit')) {
        const id = btn.getAttribute('data-id');
        const banner = byId.get(String(id));
        if (!banner) {
          alert('Não foi possível localizar os dados deste banner.');
          return;
        }
        preencherFormBanner(banner);
      }

      
    });
  });
}

/* ========= helper de prévia (reaproveita sua .banner-thumb) ========= */
function setPreview(src) {
  const previewBox =
    document.getElementById('previewBanner') ||
    document.querySelector('.banner-thumb');
  if (!previewBox) return;

  const ph = () =>
    'data:image/svg+xml;base64,' + btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160">
         <rect width="100%" height="100%" fill="#f2f2f2"/>
         <text x="50%" y="50%" font-size="14" fill="#999"
               text-anchor="middle" dominant-baseline="middle">Prévia</text>
       </svg>`
    );

  previewBox.innerHTML = '';
  const img = document.createElement('img');
  img.src = src || ph();
  img.alt = 'Prévia do banner';
  img.className = 'img-fluid';
  img.style.maxHeight = '160px';
  img.style.objectFit  = 'contain';
  previewBox.appendChild(img);
}

/* ========= preencher o formulário com os dados do banner ========= */
function preencherFormBanner(banner) {
  const form      = document.getElementById('formBanner') || document.querySelector('form');
  const acaoInput = document.getElementById('acao')      || form.querySelector('input[name="acao"]');
  const idInput   = document.getElementById('idBanner')  || form.querySelector('input[name="id"]');

  // Campos
  form.querySelector('input[name="descricao"]').value = banner.descricao || '';
  form.querySelector('input[name="data"]').value      = banner.data_validade || ''; // formato YYYY-MM-DD
  form.querySelector('input[name="link"]').value      = banner.link || '';
  const sel = form.querySelector('select[name="categoriab"]');
  if (sel) sel.value = (banner.categoria_id ?? '') + '';

  // ID e modo edição
  idInput.value   = banner.id;
  acaoInput.value = 'atualizar';

  // limpar arquivo para não trocar a imagem sem querer
  const file = form.querySelector('input[name="foto"]');
  if (file) file.value = '';

  // Prévia da imagem existente
  setPreview(banner.imagem ? `data:image/*;base64,${banner.imagem}` : null);

  // feedback visual no botão principal (opcional)
  const btnCadastrar = document.getElementById('btnCadastrar');
  if (btnCadastrar) {
    btnCadastrar.textContent = 'Salvar alterações';
    btnCadastrar.classList.remove('btn-primary');
    btnCadastrar.classList.add('btn-success');
  }

  // rola até o formulário
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ========= botão "Editar" do formulário -> enviar UPDATE ========= */
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('formBanner') || document.querySelector('form');
  const btnEditar = document.getElementById('btnEditar');  // <button type="button" id="btnEditar">
  const acaoInput = document.getElementById('acao')      || form.querySelector('input[name="acao"]');
  const idInput   = document.getElementById('idBanner')  || form.querySelector('input[name="id"]');

  if (!form || !btnEditar) return;

  btnEditar.addEventListener('click', () => {
    if (!idInput.value) {
      alert('Clique em "Editar" na linha da tabela para carregar um banner primeiro.');
      return;
    }
    // sinaliza ao PHP que é atualização
    acaoInput.value = 'atualizar';
    form.submit(); // seu PHP já faz o UPDATE e redireciona
  });
});


/* ========= botão "Excluir" do formulário -> deletar o banner ========= */
document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('formBanner') || document.querySelector('form');
  const btnExcluir = document.getElementById('btnExcluir'); // <button type="button" id="btnExcluir">
  const idInput   = document.getElementById('idBanner')  || form.querySelector('input[name="id"]');
  const previewBox = document.getElementById('previewBanner') || document.querySelector('.banner-thumb');
  const btnCadastrar = document.getElementById('btnCadastrar');
  const acaoInput = document.getElementById('acao') || form.querySelector('input[name="acao"]');

  if (!form || !btnExcluir) return;

  btnExcluir.addEventListener('click', async () => {
    const id = idInput.value;
    if (!id) {
      alert('Selecione um banner na tabela para excluir.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este banner?')) return;

    try {
      const fd = new FormData();
      fd.append('acao', 'excluir');
      fd.append('id', id);

      const r = await fetch('../php/banners.php', {
        method: 'POST',
        body: fd
      });

      if (!r.ok) throw new Error('Falha na exclusão.');

      alert('Banner excluído com sucesso!');

      // Limpa o formulário
      form.reset();
      idInput.value = '';
      acaoInput.value = '';
      if (previewBox) previewBox.innerHTML = '<span class="text-muted">Prévia</span>';

      // volta botão principal ao modo "Cadastrar"
      if (btnCadastrar) {
        btnCadastrar.textContent = 'Cadastrar';
        btnCadastrar.classList.remove('btn-success');
        btnCadastrar.classList.add('btn-primary');
      }

      // Recarrega a tabela
      listarBanners('tbBanners');
    } catch (e) {
      alert('Erro ao excluir: ' + (e.message || e));
    }
  });
});


listarBanners('tbBanners');
listarCupons("tabelaCupons");

listarcategorias("#categoriaBanner");
listarcategorias("#categoriasPromocoes");