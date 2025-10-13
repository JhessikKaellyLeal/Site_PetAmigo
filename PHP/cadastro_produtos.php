<?php

// Conectando este arquivo ao banco de dados
require_once __DIR__ . "/conexao.php";

// função para redirecionar com parâmetros
function redirecWith($url, $params = []) {
  if (!empty($params)) {
    $qs  = http_build_query($params);
    $sep = (strpos($url, '?') === false) ? '?' : '&';
    $url .= $sep . $qs;
  }
  header("Location: $url");
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
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Método inválido"]);
  }

  // Variáveis do produto
  $nome   = $_POST["nomeproduto"] ;
  $descricao = $_POST["descricao"] ;
  $quantidade =  (int)$_POST["quantidade"] ;
  $preco  =  (double)$_POST["preco"];
  $tamanho = $_POST["tamanho"] ;
  $cor     = $_POST["cor"] ;
  $codigo  =  (int)$_POST["codigo"] ;
  $preco_promocional = (double)$_POST["precopromocional"] ;
  $marcas_idMarcas = 1; 

  // VÁRIAVEIS DAS Imagens
  $img1 = readImageToBlob($_FILES["imgproduto1"] ?? null);
  $img2 = readImageToBlob($_FILES["imgproduto2"] ?? null);
  $img3 = readImageToBlob($_FILES["imgproduto3"] ?? null);




  // Validação
  $erros_validacao = [];
  if ($nome === "" || $descricao === "" || 
  $quantidade <= 0 || $preco <= 0 || $marcas_idMarcas <= 0) {
    $erros_validacao[] = "Preencha os campos obrigatórios.";
  }


  if (!empty($erros_validacao)) {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => implode(" ", $erros_validacao)]);
  }

  // Transação
  $pdo->beginTransaction();

  // INSERT Produtos
  $sqlProdutos = "INSERT INTO Produtos
    (nome, descricao, quantidade, preco, tamanho,
     cor, codigo, preco_promocional, Marcas_idMarcas)
    VALUES
    (:nome, :descricao, :quantidade, :preco, 
    :tamanho, :cor, :codigo, :preco_promocional, :Marcas_idMarcas)";

  $stmProdutos = $pdo->prepare($sqlProdutos);

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

  if (!$inserirProdutos) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao cadastrar produto."]);
  }

  $idproduto = (int)$pdo->lastInsertId();

  // INSERIR IMAGENS
  $sqlImagens = "INSERT INTO Imagem_produtos (foto)
   VALUES (:imagem1), (:imagem2), (:imagem3)";
  
  // PREPARA O COMANDO SQL PARA SER EXECUTADO
  $stmImagens = $pdo->prepare($sqlImagens);

  /* Bind como LOB quando houver conteúdo; se null, 
  o PDO envia NULL corretamente*/ 

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

  $inserirImagens = $stmImagens->execute();

  if (!$inserirImagens) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao cadastrar imagens."]);
  }

  $idImg = (int)$pdo->lastInsertId();


// vincular imagem com produto

  $sqlVincularProdImg = "INSERT INTO Produtos_has_Imagem_produtos
    (Produtos_idProdutos, Imagem_produtos_idImagem_produtos)
    VALUES
    (:idpro, :idimg)";

  $stmVincularProdImg = $pdo->prepare($sqlVincularProdImg);

  $inserirVincularProdImg = $stmVincularProdImg->execute([
    ":idpro" => $idproduto,
    ":idimg" => $idImg,
  ]);

 if (!$inserirVincularProdImg) {
  $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["erro" => "Falha ao vincular produto com imagem."]);
  }else{
    redirecWith("../paginas_logista/cadastro_produtos_logista.html",
     ["Cadastro" => "ok"]);
  }
 

} catch (Exception $e) {
  redirecWith("../paginas_logista/cadastro_produtos_logista.html",
    ["erro" => "Erro no banco de dados: " . $e->getMessage()]);
}