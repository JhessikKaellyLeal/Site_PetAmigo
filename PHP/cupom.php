<?php
// cadastro_cupom.php
require_once __DIR__ . '/conexao.php';

/* ---------------------- FUNÇÕES ---------------------- */
function redirect_with(string $url, array $params = []): void {
  if ($params) {
    $qs  = http_build_query($params);
    $url .= (strpos($url, '?') === false ? '?' : '&') . $qs;
  }
  header("Location: $url");
  exit;
}

/* Converte datas comuns (DD/MM/YYYY, YYYY-MM-DD) para 'Y-m-d' */
function normalize_date_to_ymd(?string $s): ?string {
  if (!$s) return null;
  $s = trim($s);

  // formato ISO
  if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)) {
    $dt = DateTime::createFromFormat('Y-m-d', $s);
    return ($dt && $dt->format('Y-m-d') === $s) ? $s : null;
  }

  // formato BR com /
  if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $s)) {
    [$d,$m,$y] = explode('/', $s);
    if (checkdate((int)$m, (int)$d, (int)$y))
      return sprintf('%04d-%02d-%02d', $y, $m, $d);
  }

  // formato BR com -
  if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $s)) {
    [$d,$m,$y] = explode('-', $s);
    if (checkdate((int)$m, (int)$d, (int)$y))
      return sprintf('%04d-%02d-%02d', $y, $m, $d);
  }

  return null;
}

/* ===================== LISTAGEM ===================== */
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['listar'])) {
  header('Content-Type: application/json; charset=utf-8');
  try {
    $sql  = "SELECT idCupom, nome, valor, data_validade, quantidade
             FROM Cupom ORDER BY idCupom DESC";
    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $cupons = array_map(fn($r) => [
      'id'            => (int)$r['idCupom'],
      'nome'          => $r['nome'],
      'valor'         => (float)$r['valor'],
      'data_validade' => $r['data_validade'],
      'quantidade'    => (int)$r['quantidade']
    ], $rows);

    echo json_encode(['ok' => true, 'count' => count($cupons), 'cupons' => $cupons], JSON_UNESCAPED_UNICODE);
    exit;

  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Erro ao listar cupons', 'detail' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
  }
}

/* ===================== CADASTRO ===================== */
try {
  if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect_with('../PAGINAS_LOGISTA/promocoes_logista.html', ['erro_cupom' => 'Método inválido']);
  }

  // coleta dos dados do formulário
  $nome       = trim($_POST['nome'] ?? '');
  $valorRaw   = $_POST['valor'] ?? '';
  $dataRaw    = $_POST['validade'] ?? '';
  $quantRaw   = $_POST['quantidade'] ?? '';

  $valor = (float)str_replace(',', '.', $valorRaw);
  $data  = normalize_date_to_ymd($dataRaw);
  $quant = (int)$quantRaw;

  // validações
  $erros = [];
  if ($nome === '') $erros[] = 'Informe o nome do cupom.';
  elseif (mb_strlen($nome) > 45) $erros[] = 'Nome deve ter no máximo 45 caracteres.';
  if ($valor <= 0) $erros[] = 'Valor deve ser maior que zero.';
  if (!$data) $erros[] = 'Data de validade inválida (aceito: YYYY-MM-DD ou DD/MM/YYYY).';
  if ($quant <= 0) $erros[] = 'Quantidade deve ser maior que zero.';

  if ($erros) {
    redirect_with('../PAGINAS_LOGISTA/promocoes_logista.html', ['erro_cupom' => implode(' ', $erros)]);
  }

  // inserção no banco
  $sql = "INSERT INTO Cupom (nome, valor, data_validade, quantidade)
          VALUES (:n, :v, :d, :q)";
  $st = $pdo->prepare($sql);
  $st->bindValue(':n', $nome, PDO::PARAM_STR);
  $st->bindValue(':v', $valor, PDO::PARAM_STR);
  $st->bindValue(':d', $data, PDO::PARAM_STR);
  $st->bindValue(':q', $quant, PDO::PARAM_INT);
  $st->execute();

  redirect_with('../PAGINAS_LOGISTA/promocoes_logista.html', ['cadastro_cupom' => 'ok']);

} catch (Throwable $e) {
  redirect_with('../PAGINAS_LOGISTA/promocoes_logista.html', ['erro_cupom' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
