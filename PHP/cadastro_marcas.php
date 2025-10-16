<?php

// Inclui o arquivo de conexão com o banco de dados
require_once __DIR__ . '/conexao.php';

// Função utilitária para redirecionar o usuário com parâmetros opcionais
function redirect_with(string $url, array $params = []): void {
  // Se existirem parâmetros, adiciona-os à URL usando query string (?chave=valor)
  if ($params) {
    $qs  = http_build_query($params);
    // Verifica se a URL já contém '?', para decidir entre usar '?' ou '&'
    $url .= (strpos($url, '?') === false ? '?' : '&') . $qs;
  }
  // Envia o cabeçalho HTTP de redirecionamento
  header("Location: $url");
  // Encerra a execução do script imediatamente
  exit;
}

// Função que lê uma imagem enviada por formulário e a transforma em BLOB (binário)
function read_image_to_blob(?array $file): ?string {
  // Verifica se o arquivo foi realmente enviado e sem erros
  if (!$file || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) return null;
  // Lê o conteúdo binário do arquivo
  $bin = file_get_contents($file['tmp_name']);
  // Retorna o conteúdo binário ou null se falhar
  return $bin === false ? null : $bin;
}


// ========================= LISTAGEM DE MARCAS ========================= //
if ($_SERVER["REQUEST_METHOD"] === "GET" && isset($_GET["listar"])){
  // Define o tipo de resposta como JSON (para uso via JavaScript)
  header('Content-Type: application/json; charset=utf-8');

  try {
    // Consulta SQL que retorna todas as marcas com id, nome e imagem (BLOB)
    $stmt = $pdo->query("SELECT idMarcas, nome, imagem FROM Marcas ORDER BY idMarcas DESC");

    // Extrai os resultados como array associativo
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Mapeia o resultado para ajustar tipos e converter imagem para base64
    $marcas = array_map(function ($r) {
      return [
        'idMarcas' => (int)$r['idMarcas'],                      // força id para inteiro
        'nome'     => $r['nome'],                               // mantém nome como string
        'imagem'   => !empty($r['imagem']) ? base64_encode($r['imagem']) : null // converte imagem para base64
      ];
    }, $rows);

    // Retorna JSON com status OK, número de registros e os dados formatados
    echo json_encode(
      ['ok'=>true,'count'=>count($marcas),'marcas'=>$marcas],
      JSON_UNESCAPED_UNICODE // mantém acentos corretamente no JSON
    );

  } catch (Throwable $e) {
    // Se ocorrer erro (banco, conexão etc.), retorna erro 500 com JSON
    http_response_code(500);
    echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
  }

  // Interrompe o script após o bloco de listagem
  exit;
}



// ========================= CADASTRO DE MARCAS ========================= //
try {
  /* CADASTRAR */
  // Verifica se o método de envio é POST (necessário para envio de formulários)
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_with('../PAGINAS_LOGISTA/cadastro_produtos_logista.html', [
      'erro_marca' => 'Método inválido'
    ]);
  }

  // Captura o nome e a imagem enviados pelo formulário
  $nome = trim($_POST['nomemarca'] ?? '');
  $imgBlob = read_image_to_blob($_FILES['imagemmarca'] ?? null);

  // Validação: nome obrigatório
  if ($nome === '') {
    redirect_with('../PAGINAS_LOGISTA/cadastro_produtos_logista.html', [
      'erro_marca' => 'Preencha o nome da marca.'
    ]);
  }

  // Monta a query de inserção com parâmetros nomeados
  $sql = "INSERT INTO Marcas (nome, imagem) VALUES (:n, :i)";
  $st  = $pdo->prepare($sql);

  // Associa os valores aos parâmetros da query
  $st->bindValue(':n', $nome, PDO::PARAM_STR);
  if ($imgBlob === null) 
    $st->bindValue(':i', null, PDO::PARAM_NULL);  // se não houver imagem, grava NULL
  else 
    $st->bindValue(':i', $imgBlob, PDO::PARAM_LOB); // grava a imagem em formato binário (BLOB)

  // Executa a inserção no banco de dados
  $st->execute();

  // Redireciona com mensagem de sucesso
  redirect_with('../PAGINAS_LOGISTA/cadastro_produtos_logista.html', [
    'cadastro_marca' => 'ok'
  ]);

} catch (Throwable $e) {
  // Caso ocorra qualquer erro no processo de inserção, redireciona com mensagem de erro
  redirect_with('../PAGINAS_LOGISTA/cadastro_produtos_logista.html', [
    'erro_marca' => 'Erro no banco de dados: ' . $e->getMessage()
  ]);
}
