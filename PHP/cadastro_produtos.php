<?php

// Conectando este arquivo ao banco de dados
require_once __DIR__ . "/conexao.php";

// função para redirecionar com parâmetros (anexa query string e envia Location)
function redirecWith($url, $params = []) {
  // Se houver parâmetros, monta a query (?a=1&b=2) e acrescenta à URL
  if (!empty($params)) {
    $qs  = http_build_query($params);
    // Usa '?' se não houver query ainda; senão usa '&'
    $sep = (strpos($url, '?') === false) ? '?' : '&';
    $url .= $sep . $qs;
  }
  // Envia cabeçalho de redirecionamento e encerra
  header("Location: $url");
  exit;
}

/* Lê arquivo de upload como blob (ou null)
   - Retorna string binária (conteúdo do arquivo) ou null se não houve upload
   - Útil para salvar imagens no banco (BLOB) */
function readImageToBlob(?array $file): ?string {
  // Validações mínimas de upload: array presente, tmp_name e sem erro
  if (!$file || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) return null;
  // Lê o conteúdo do arquivo temporário
  $content = file_get_contents($file['tmp_name']);
  // Se falhar, retorna null; caso contrário, retorna o binário
  return $content === false ? null : $content;
}



try {
   // SE O METODO DE ENVIO FOR DIFERENTE DO POST → redireciona com erro
  if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Método inválido"]);
  }

  // Variáveis do produto (capturadas do formulário)
  $nome   = $_POST["nomeproduto"] ;
  $descricao = $_POST["descricao"] ;
  $quantidade =  (int)$_POST["quantidade"] ;
  $preco  =  (double)$_POST["preco"];
  $tamanho = $_POST["tamanho"] ;
  $cor     = $_POST["cor"] ;
  $codigo  =  (int)$_POST["codigo"] ;
  $preco_promocional = (double)$_POST["precopromocional"] ;
  $marcas_idMarcas = 1; // ID da marca (fixo aqui; poderia vir do formulário)

  // VÁRIAVEIS DAS Imagens (cada input de arquivo vira um BLOB ou null)
  $img1 = readImageToBlob($_FILES["imgproduto1"] ?? null);
  $img2 = readImageToBlob($_FILES["imgproduto2"] ?? null);
  $img3 = readImageToBlob($_FILES["imgproduto3"] ?? null);


  // Validação básica dos campos obrigatórios
  $erros_validacao = [];
  if ($nome === "" || $descricao === "" || 
  $quantidade <= 0 || $preco <= 0 || $marcas_idMarcas <= 0) {
    $erros_validacao[] = "Preencha os campos obrigatórios.";
  }

  // Se houver erros, redireciona informando a mensagem
  if (!empty($erros_validacao)) {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => implode(" ", $erros_validacao)]);
  }

  // Inicia transação (garante consistência entre inserts)
  $pdo->beginTransaction();

  // INSERT na tabela Produtos (com parâmetros nomeados)
  $sqlProdutos = "INSERT INTO Produtos
    (nome, descricao, quantidade, preco, tamanho,
     cor, codigo, preco_promocional, Marcas_idMarcas)
    VALUES
    (:nome, :descricao, :quantidade, :preco, 
    :tamanho, :cor, :codigo, :preco_promocional, :Marcas_idMarcas)";

  // Prepara o statement
  $stmProdutos = $pdo->prepare($sqlProdutos);

  // Executa o INSERT com os valores vindos do formulário
  $inserirProdutos = $stmProdutos->execute([
    ":nome" => $nome,
    ":descricao"  => $descricao,
    ":quantidade"  => $quantidade,
    ":preco"  => $preco,
    ":tamanho" => $tamanho,
    ":cor" => $cor,
    ":codigo"  => $codigo,
    ":preco_promocional"=> $preco_promocional,
    ":Marcas_idMarcas" => $marcas_idMarcas,
  ]);

  // Se falhou ao inserir o produto, desfaz transação e redireciona com erro
  if (!$inserirProdutos) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao cadastrar produto."]);
  }

  // Recupera o ID do produto recém inserido (auto_increment)
  $idproduto = (int)$pdo->lastInsertId();

  // INSERT das imagens (uma linha por imagem)
  $sqlImagens = "INSERT INTO Imagem_produtos (foto)
   VALUES (:imagem1), (:imagem2), (:imagem3)";
  
  // PREPARA O COMANDO SQL PARA SER EXECUTADO
  $stmImagens = $pdo->prepare($sqlImagens);

  /* Faz o bind de cada placeholder:
     - Se houver conteúdo, usa PARAM_LOB para enviar binário
     - Se não houver, envia NULL com PARAM_NULL */
  if ($img1 !== null) {
    $stmImagens->bindParam(':imagem1', $img1, PDO::PARAM_LOB);
  }else{ 
    $stmImagens->bindValue(':imagem1', null, PDO::PARAM_NULL);
  }

  if ($img2 !== null){
     $stmImagens->bindParam(':imagem2', $img2, PDO::PARAM_LOB);
  }else{
     $stmImagens->bindValue(':imagem2', null, PDO::PARAM_NULL);
  }

  if ($img3 !== null){
     $stmImagens->bindParam(':imagem3', $img3, PDO::PARAM_LOB);
  }else{
     $stmImagens->bindValue(':imagem3', null, PDO::PARAM_NULL);
  }

  // Executa o insert das imagens
  $inserirImagens = $stmImagens->execute();

  // Se falhou, desfaz transação e sinaliza erro
  if (!$inserirImagens) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao cadastrar imagens."]);
  }

  // Recupera o último ID inserido em Imagem_produtos
  $idImg = (int)$pdo->lastInsertId();


  // Vincula a(s) imagem(ns) ao produto na tabela de relacionamento
  $sqlVincularProdImg = "INSERT INTO Produtos_has_Imagem_produtos
    (Produtos_idProdutos, Imagem_produtos_idImagem_produtos)
    VALUES
    (:idpro, :idimg)";

  // Prepara o statement do vínculo
  $stmVincularProdImg = $pdo->prepare($sqlVincularProdImg);

  // Executa o vínculo produto ↔ imagem
  $inserirVincularProdImg = $stmVincularProdImg->execute([
    ":idpro" => $idproduto,
    ":idimg" => $idImg,
  ]);

  // Se falhou o vínculo, desfaz; senão, confirma sucesso via redirecionamento
  if (!$inserirVincularProdImg) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao vincular produto com imagem."]);
  }else{
    // (Observação: aqui não há commit explícito; o redirecionamento é feito diretamente)
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["Cadastro" => "ok"]);
  }
 

} catch (Exception $e) {
  // Em qualquer exceção, redireciona informando a mensagem de erro
  redirecWith("../paginas_logista/cadastro_produtos_logista.html",
    ["erro" => "Erro no banco de dados: " . $e->getMessage()]);
}
