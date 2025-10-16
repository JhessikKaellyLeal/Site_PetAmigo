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
    // Comando de listagem: busca fretes com campos renomeados/ordenados
    $sqllistar = "SELECT idFretes AS id, bairro, valor, transportadora
                  FROM Fretes
                  ORDER BY bairro, valor";

    // Executa a query diretamente (sem parâmetros) e obtém um PDOStatement
    $stmtlistar = $pdo->query($sqllistar);
    // Converte o resultado em array associativo
    $listar = $stmtlistar->fetchAll(PDO::FETCH_ASSOC);

    // Define o formato de saída: "json" ou padrão "option" (HTML)
    $formato = isset($_GET["format"]) ? strtolower($_GET["format"]) : "option";

    if ($formato === "json") {
      // (Opcional) normaliza tipos: id => int, valor => float
      $saida = array_map(function ($item) {
        return [
          "id"            => (int)$item["id"],
          "bairro"        => $item["bairro"],
          "valor"         => (float)$item["valor"],
          "transportadora"=> $item["transportadora"],
        ];
      }, $listar);

      // Retorna JSON com status OK
      header("Content-Type: application/json; charset=utf-8");
      echo json_encode(["ok" => true, "fretes" => $saida], JSON_UNESCAPED_UNICODE);
      exit;
    }

    // RETORNO PADRÃO (options): ideal para preencher <select>
    header("Content-Type: text/html; charset=utf-8");
    foreach ($listar as $lista) {
      // Converte id para inteiro
      $id     = (int)$lista["id"];
      // Escapa bairro (evita XSS)
      $bairro = htmlspecialchars($lista["bairro"], ENT_QUOTES, "UTF-8");
      // Se houver transportadora, exibe entre parênteses; também escapada
      $transp = $lista["transportadora"] !== null && $lista["transportadora"] !== ""
                  ? " (" . htmlspecialchars($lista["transportadora"], ENT_QUOTES, "UTF-8") . ")"
                  : "";
      // Formata valor no padrão pt-BR (duas casas, vírgula decimal)
      $valorFmt = number_format((float)$lista["valor"], 2, ",", ".");
      // Monta o rótulo da option: "Bairro (Transportadora) - R$ 0,00"
      $label = "{$bairro}{$transp} - R$ {$valorFmt}";
      // Imprime a option com value = id
      echo "<option value=\"{$id}\">{$label}</option>\n";
    }
    exit;

  } catch (Throwable $e) {
    // Erro na listagem: retorna JSON (se solicitado) ou HTML simples com status 500
    if (isset($_GET["format"]) && strtolower($_GET["format"]) === "json") {
      header("Content-Type: application/json; charset=utf-8", true, 500);
      echo json_encode(
        ["ok" => false, "error" => "Erro ao listar fretes", "detail" => $e->getMessage()],
        JSON_UNESCAPED_UNICODE
      );
    } else {
      header("Content-Type: text/html; charset=utf-8", true, 500);
      echo "<option disabled>Erro ao carregar fretes</option>";
    }
    exit;
  }
}








try{
    // SE O METODO DE ENVIO FOR DIFERENTE DO POST, redireciona com erro
    if($_SERVER["REQUEST_METHOD"] !== "POST"){
        //VOLTAR À TELA DE CADASTRO E EXIBIR ERRO
        redirecWith("../paginas_logista/frete_pagamento_logista.html",
           ["erro"=> "Metodo inválido"]);
    }
    // variaveis: lê dados do formulário
    $bairro = $_POST["bairro"];
    $valor = (double)$_POST["valor"];
    $transportadora = $_POST["transportadora"];

    // validação simples: array para acumular erros
    $erros_validacao=[];
    // se qualquer campo essencial vier vazio
    if($bairro === "" || $valor ==="" ){
        $erros_validacao[]="Preencha todos os campos";
    }

/* Inserir o frete no banco de dados */
    $sql ="INSERT INTO 
    Fretes (bairro,valor,transportadora)
     Values (:bairro,:valor,:transportadora)";
     // executando o comando no banco de dados com parâmetros nomeados
     $inserir = $pdo->prepare($sql)->execute([
        ":bairro" => $bairro,
        ":valor"=> $valor,
        ":transportadora"=> $transportadora,     
     ]);

     /* Verificando se foi cadastrado no banco de dados */
     if($inserir){
        // sucesso: redireciona com flag "cadastro=ok"
        redirecWith("../paginas_logista/frete_pagamento_logista.html",
        ["cadastro" => "ok"]) ;
     }else{
        // falha genérica na inserção
        redirecWith("../paginas_logista/frete_pagamento_logista.html"
        ,["erro" =>"Erro ao cadastrar no banco
         de dados"]);
     }
}catch(\Exception $e){
// exceção no processo de inserção: redireciona com detalhe do erro
redirecWith("../paginas_logista/frete_pagamento_logista.html",
      ["erro" => "Erro no banco de dados: "
      .$e->getMessage()]);
}


?>
