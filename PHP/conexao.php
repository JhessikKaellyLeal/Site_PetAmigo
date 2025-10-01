<?php
// conexao.php

$host = "localhost";   // servidor do banco
$db   = "petAmigo";   // nome do banco de dados
$user = "root";        // usuário do MySQL
$pass = "";            // senha do MySQL (ajuste se houver)

try {
    // estabelecendo conexao
    $pdo = new PDO("mysql:host=$host;dbname=$db;
    charset=utf8mb4", $user, $pass);
    // verificando se deu certo ou não
    $pdo->setAttribute(PDO::ATTR_ERRMODE, 
    PDO::ERRMODE_EXCEPTION);
    // imprimindo mensagem caso tenha dado certo
     echo "Conexão bem-sucedida!"; // (opcional para teste)
} catch (PDOException $e) {
    // caso dê erro, ele executa o catch e imprime a mensagem
    die("Erro ao conectar ao banco de dados: " 
    . $e->getMessage());
}

?>