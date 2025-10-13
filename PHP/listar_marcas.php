<?php
// ../PHP/listar_marcas.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/conexao.php'; // precisa expor $pdo (PDO)

try {
  $stmt = $pdo->query("SELECT idMarcas, nome, imagem FROM Marcas ORDER BY idMarcas DESC");
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

  $marcas = array_map(function ($r) {
    return [
      'idMarcas' => (int)$r['idMarcas'],
      'nome'     => $r['nome'],
      'imagem'   => !empty($r['imagem']) ? base64_encode($r['imagem']) : null
    ];
  }, $rows);

  echo json_encode(['ok'=>true,'count'=>count($marcas),'marcas'=>$marcas], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>$e->getMessage()]);
}
