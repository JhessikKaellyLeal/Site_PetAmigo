document.addEventListener('DOMContentLoaded', () => {
  const form  = document.getElementById('form-login');
  const cpfEl = document.getElementById('cpf');
  const senEl = document.getElementById('senha');

  const showMsg = (msg) => {
    alert(msg); // pode trocar por toast Bootstrap, se quiser
  };

  // Evento de envio do formulário
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Remove pontos e traços do CPF antes de enviar
    const cpf   = (cpfEl.value || '').replace(/\D+/g, '').trim();
    const senha = (senEl.value || '').trim();

    if (!cpf || !senha) {
      showMsg('Preencha CPF e senha.');
      return;
    }

    try {
      const resp = await fetch('../PHP/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha })
      });

      // captura a resposta do php
      const data = await resp.json();

      if (data.ok) {
        window.location.href = data.redirect; // Redireciona conforme o tipo de usuário
      } else {
        showMsg(data.msg || 'Credenciais inválidas.');
      }
    } catch (err) {
      showMsg('Erro de conexão com o servidor.');
    }
  });
});
