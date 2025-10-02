<?php
// Conectando este arquivo ao banco de dados
require_once __DIR__ . "/conexao.php";

// função para capturar os dados passados de uma página a outra
function redirecWith($url, $params = []) {
  // verifica se os os paramentros não vieram vazios
  if (!empty($params)) {
    // separar os parametros em espaços diferentes
    $qs  = http_build_query($params);
    $sep = (strpos($url, '?') === false) ? '?' : '&';
    $url .= $sep . $qs;
  }
  // joga a url para o cabeçalho no navegador
  header("Location: $url");
  // fecha o script
  exit;
}

/* Lê arquivo de upload como blob (ou null) */
function readImageToBlob(?array $file): ?string {
  if (!$file || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) return null;
  $content = file_get_contents($file['tmp_name']);
  return $content === false ? null : $content;
}

try {
  // SE O METODO DE ENVIO FOR DIFERENTE DO POST
  if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
      ["erro_marca" => "Método inválido"]);
  }

  // jogando os dados dentro de váriaveis (conforme seu HTML)
  $nomemarca = $_POST["nomemarca"];
  $imgBlob   = readImageToBlob($_FILES["imagemmarca"] ?? null);

  // VALIDANDO OS CAMPOS
  $erros_validacao = [];
  if ($nomemarca === "") {
    $erros_validacao[] = "Preencha o nome da marca.";
  }

  // se houver erros, volta para a tela com a mensagem
  if (!empty($erros_validacao)) {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
      ["erro_marca" => implode(" ", $erros_validacao)]);
  }

  // INSERT
  $sql  = "INSERT INTO Marcas (nome, imagem) VALUES (:nome, :img)";
  $stmt = $pdo->prepare($sql);
  $stmt->bindValue(":nome", $nomemarca, PDO::PARAM_STR);

  if ($imgBlob === null) {
    $stmt->bindValue(":img", null, PDO::PARAM_NULL);
  } else {
    $stmt->bindValue(":img", $imgBlob, PDO::PARAM_LOB);
  }

  $ok = $stmt->execute();

  if ($ok) {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
      ["cadastro_marca" => "ok"]);
  } else {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
      ["erro_marca" => "Falha ao cadastrar marca."]);
  }

} catch (Exception $e) {
  redirecWith("../paginas_logista/cadastro_produtos_logista.html",
    ["erro_marca" => "Erro no banco de dados: " . $e->getMessage()]);
}
