<?php
// PHP/login.php
session_start();
header('Content-Type: application/json; charset=utf-8');
// Conectando este arquivo ao banco de dados
require_once __DIR__ ."/conexao.php";

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) $data = $_POST;

$cpfOrUser = isset($data['cpf']) ? trim($data['cpf']) : '';
$senha     = isset($data['senha']) ? (string)$data['senha'] : '';

if ($cpfOrUser === '' || $senha === '') {
  echo json_encode(['ok' => false, 'msg' => 'Informe CPF e senha.']);
  exit;
}

$cpfDigits = preg_replace('/\D+/', '', $cpfOrUser);

// === 1. Tenta autenticar como Cliente ===
try {
  $sql = "SELECT idCliente, nome FROM Cliente WHERE cpf = :cpf AND senha = :senha LIMIT 1";
  $st  = $pdo->prepare($sql);
  $st->bindValue(':cpf', $cpfDigits);
  $st->bindValue(':senha', $senha);
  $st->execute();
// se ele encontrar o cliente
  if ($cli = $st->fetch()) {
    $_SESSION['auth']      = true;
    $_SESSION['user_type'] = 'cliente';
    $_SESSION['user_id']   = (int)$cli['idCliente'];
    $_SESSION['nome']      = $cli['nome'];
    echo json_encode(['ok' => true, 'redirect' => '../index.html']);
    exit;
  }
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar cliente.']);
  exit;
}

// === 2. Tenta autenticar como Empresa ===
try {
  $sql = "SELECT idEmpresa, nome_fantasia FROM Empresa
          WHERE (usuario = :u OR cnpj = :u) AND senha = :s LIMIT 1";
          
  $st  = $pdo->prepare($sql);
  $st->bindValue(':u', $cpfOrUser);
  $st->bindValue(':s', $senha);
  $st->execute();

  if ($emp = $st->fetch()) {
    $_SESSION['auth']      = true;
    $_SESSION['user_type'] = 'empresa';
    $_SESSION['user_id']   = (int)$emp['idEmpresa'];
    $_SESSION['nome']      = $emp['nome_fantasia'];
    echo json_encode(['ok' => true, 'redirect' => '../paginas_logista/home_logista.html']);
    exit;
  }
} catch (Throwable $e) {
  echo json_encode(['ok' => false, 'msg' => 'Erro ao verificar empresa.']);
  exit;
}

// === 3. Falha geral ===
echo json_encode(['ok' => false, 'msg' => 'Credenciais inválidas.']);
