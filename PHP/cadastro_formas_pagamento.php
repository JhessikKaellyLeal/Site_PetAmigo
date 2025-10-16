<?php
// Conectando este arquivo ao banco de dados
require_once __DIR__ ."/conexao.php";

// função para capturar os dados passados de uma página a outra
function redirecWith($url,$params=[]){
// verifica se os os paramentros não vieram vazios
 if(!empty($params)){
// separar os parametros em espaços diferentes
$qs= http_build_query($params);
$sep = (strpos($url,'?') === false) ? '?': '&';
$url .= $sep . $qs;
}
// joga a url para o cabeçalho no navegador
header("Location:  $url");
// fecha o script
exit;
}

if ($_SERVER["REQUEST_METHOD"] === "GET" && isset($_GET["listar"])) {
  try {
    // Comando de listagem
    $sqllistar = "SELECT idformas_pagamento AS id, nome 
                  FROM Formas_pagamento 
                  ORDER BY nome";

    // Executa
    $stmtlistar = $pdo->query($sqllistar);
    $listar = $stmtlistar->fetchAll(PDO::FETCH_ASSOC);

    // Formato do retorno
    $formato = isset($_GET["format"]) ? strtolower($_GET["format"]) : "option";

    if ($formato === "json") {
      header("Content-Type: application/json; charset=utf-8");
      echo json_encode(["ok" => true, "formas_pagamento" => $listar], JSON_UNESCAPED_UNICODE);
      exit;
    }

    // RETORNO PADRÃO (options)
    header("Content-Type: text/html; charset=utf-8");
    foreach ($listar as $lista) {
      $id   = (int)$lista["id"];
      $nome = htmlspecialchars($lista["nome"], ENT_QUOTES, "UTF-8");
      echo "<option value=\"{$id}\">{$nome}</option>\n";
    }
    exit;

  } catch (Throwable $e) {
    // Erro na listagem
    if (isset($_GET["format"]) && strtolower($_GET["format"]) === "json") {
      header("Content-Type: application/json; charset=utf-8", true, 500);
      echo json_encode(
        ["ok" => false, "error" => "Erro ao listar formas de pagamento", "detail" => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
      );
    } else {
      header("Content-Type: text/html; charset=utf-8", true, 500);
      echo "<option disabled>Erro ao carregar formas de pagamento</option>";
    }
    exit;
  }
}







try{
// SE O METODO DE ENVIO FOR DIFERENTE DO POST
    if($_SERVER["REQUEST_METHOD"] !== "POST"){
        //VOLTAR À TELA DE CADASTRO E EXIBIR ERRO
        redirecWith("../paginas/frete_pagamento_logista.html",
           ["erro"=> "Metodo inválido"]);
    }
// variaveis para receber os dados da tela
    $nomepagamento = $_POST["nomepagamento"];

// validação
    $erros_validacao=[];
    //se qualquer campo for vazio
    if($nomepagamento === ""){
        $erros_validacao[]="Preencha o campo";
    }    

/* Inserir o frete no banco de dados */
    $sql ="INSERT INTO Formas_pagamento (nome)
     Values (:nomepagamento)";
     // executando o comando no banco de dados
     $inserir = $pdo->prepare($sql)->execute([
        ":nomepagamento" => $nomepagamento,
            
     ]);

     /* Verificando se foi cadastrado no banco de dados */
     if($inserir){
        redirecWith("../paginas/frete_pagamento_logista.html",
        ["cadastro" => "ok"]) ;
     }else{
        redirecWith("../paginas/frete_pagamento_logista.html"
        ,["erro" =>"Erro ao cadastrar no banco
         de dados"]);
     }





}catch(Exception $e){
redirecWith("../paginas/frete_pagamento_logista.html",
      ["erro" => "Erro no banco de dados: "
      .$e->getMessage()]);
}





?>