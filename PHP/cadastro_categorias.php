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

// códigos de cadastro
try{
// SE O METODO DE ENVIO FOR DIFERENTE DO POST
    if($_SERVER["REQUEST_METHOD"] !== "POST"){
        //VOLTAR À TELA DE CADASTRO E EXIBIR ERRO
        redirecWith("../paginas_logista/cadastro_produtos_logista.html",
           ["erro"=> "Metodo inválido"]);
    }
    // jogando os dados da dentro de váriaveis
    $nome = $_POST["nomecategoria"];
    $desconto = (double)$_POST["desconto"];

     // VALIDANDO OS CAMPOS
// criar uma váriavel para receber os erros de validação
    $erros_validacao=[];
    //se qualquer campo for vazio
    if($nome === "" ){
        $erros_validacao[]="Preencha todos os campos";
    }

    /* Inserir a categoria no banco de dados */
    $sql ="INSERT INTO categorias_produtos (nome,desconto)
     Values (:nome,:desconto)";
     // executando o comando no banco de dados
     $inserir = $pdo->prepare($sql)->execute([
        ":nome" => $nome,
        ":desconto"=> $desconto, 
     ]);
     /* Verificando se foi cadastrado no banco de dados */
     if($inserir){
        redirecWith("../paginas_logista/cadastro_produtos_logista.html",
        ["cadastro" => "ok"]) ;
     }else{
        redirecWith("../paginas_logista/cadastro_produtos_logista.html",["erro" 
        =>"Erro ao cadastrar no banco de dados"]);
     }


}catch(Exception $e){
 redirecWith("../paginas_logista/cadastro_produtos_logista.html",
      ["erro" => "Erro no banco de dados: "
      .$e->getMessage()]);
}


try {
  $sql = "SELECT idCategoriaProduto, nome FROM categorias_produtos ORDER BY nome";
  foreach ($pdo->query($sql) as $row) {
    $id = (int)$row['idCategoriaProduto'];
    $nome = htmlspecialchars($row['nome'], ENT_QUOTES, 'UTF-8');
    echo "<option value=\"{$id}\">{$nome}</option>\n";
  }
} catch (Throwable $e) {
  http_response_code(500);
  // Pode retornar nada ou uma opção de erro (opcional):
  // echo "<option disabled>Erro ao carregar</option>";
}





?>