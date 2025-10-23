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




// ========================= LISTAGEM DE PRODUTOS ========================= //
if ($_SERVER["REQUEST_METHOD"] === "GET" && isset($_GET["listar"])) {
  header('Content-Type: application/json; charset=utf-8');

  try {
    // Consulta SQL com joins para trazer marca, categoria e imagem principal
    $sql = "
      SELECT
        p.idProdutos,
        p.nome,
        p.descricao,
        p.quantidade,
        p.preco,
        p.preco_promocional,
        m.nome AS marca,
        c.nome AS categoria,
        i.foto AS imagem,
        i.texto_alternativo
      FROM Produtos p
      LEFT JOIN Marcas m ON m.idMarcas = p.Marcas_idMarcas
      LEFT JOIN Produtos_e_Categorias_produtos pc ON pc.Produtos_idProdutos = p.idProdutos
      LEFT JOIN categorias_produtos c ON c.idCategoriaProduto = pc.Categorias_produtos_id
      LEFT JOIN Produtos_has_Imagem_produtos pi ON pi.Produtos_idProdutos = p.idProdutos
      LEFT JOIN Imagem_produtos i ON i.idImagem_produtos = pi.Imagem_produtos_idImagem_produtos
      GROUP BY p.idProdutos
      ORDER BY p.idProdutos DESC
    ";

    $stmt = $pdo->query($sql);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Mapeia os resultados para converter imagem e ajustar tipos
    $produtos = array_map(function ($r) {
      return [
        'idProdutos'        => (int)$r['idProdutos'],
        'nome'              => $r['nome'],
        'descricao'         => $r['descricao'],
        'quantidade'        => (int)$r['quantidade'],
        'preco'             => (float)$r['preco'],
        'preco_promocional' => isset($r['preco_promocional']) ? (float)$r['preco_promocional'] : null,
        'marca'             => $r['marca'] ?? null,
        'categoria'         => $r['categoria'] ?? null,
        'imagem'            => !empty($r['imagem']) ? base64_encode($r['imagem']) : null,
        'texto_alternativo' => $r['texto_alternativo'] ?? null
      ];
    }, $rows);

    echo json_encode(
      ['ok' => true, 'count' => count($produtos), 'produtos' => $produtos],
      JSON_UNESCAPED_UNICODE
    );

  } catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
  }

  exit;
}


/* ============================ ATUALIZAÇÃO ============================ */
if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["acao"] ?? '') === "atualizar") {
  try {
    // --- Normalizações auxiliares ---
    $normMoney = fn($v) => ($v === '' || $v === null)
      ? null
      : (float) str_replace(',', '.', preg_replace('/\.(?=.*,)/', '', trim($v)));

    // --- Campos vindos do form ---
    $idProduto   = (int)($_POST["id"] ?? 0);
    $nome        = trim($_POST["nomeproduto"] ?? '');
    $descricao   = trim($_POST["descricao"] ?? '');
    $quantidade  = (int)($_POST["quantidade"] ?? 0);
    $preco       = $normMoney($_POST["preco"] ?? '');
    $tamanho     = trim($_POST["tamanho"] ?? '');
    $cor         = trim($_POST["cor"] ?? '');
    $codigo      = trim($_POST["codigo"] ?? '');
    $precoPromo  = $normMoney($_POST["precopromocional"] ?? '');
    $marcas_id   = (int)($_POST["marcas_idMarcas"] ?? 0);
    $cat_ids     = $_POST["categorias_ids"] ?? [];
    $subImgs     = isset($_POST["substituir_imagens"]) && $_POST["substituir_imagens"] == '1';

    if ($idProduto <= 0) {
      redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "ID do produto inválido para edição."]);
    }

    // Validação de básicos
    $erros = [];
    if ($nome === '' || $descricao === '' || $quantidade <= 0 || !$preco) {
      $erros[] = "Preencha os campos obrigatórios.";
    }
    if ($marcas_id <= 0) {
      $erros[] = "Selecione uma marca válida.";
    }
    if ($erros) {
      redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => implode(' ', $erros)]);
    }

    // Normaliza categorias
    $cat_ids = array_values(array_unique(array_filter(array_map('intval', (array)$cat_ids), fn($v)=>$v>0)));

    // Lê possíveis novas imagens
    $img1 = readImageToBlob($_FILES["imgproduto1"] ?? null);
    $img2 = readImageToBlob($_FILES["imgproduto2"] ?? null);
    $img3 = readImageToBlob($_FILES["imgproduto3"] ?? null);
    $novasImagens = array_values(array_filter([$img1, $img2, $img3], fn($b) => $b !== null));

    // --- Transação ---
    $pdo->beginTransaction();

    // 1) UPDATE em Produtos
    $sqlU = "UPDATE Produtos
                SET nome=:nome, descricao=:descricao, quantidade=:qtd, preco=:preco,
                    tamanho=:tamanho, cor=:cor, codigo=:codigo, preco_promocional=:promo,
                    Marcas_idMarcas=:marca
              WHERE idProdutos=:id";
    $stU = $pdo->prepare($sqlU);
    $okU = $stU->execute([
      ':nome'   => $nome,
      ':descricao' => $descricao,
      ':qtd'    => $quantidade,
      ':preco'  => $preco,
      ':tamanho'=> $tamanho !== '' ? $tamanho : null,
      ':cor'    => $cor !== '' ? $cor : null,
      ':codigo' => $codigo !== '' ? $codigo : null,
      ':promo'  => $precoPromo,
      ':marca'  => $marcas_id,
      ':id'     => $idProduto,
    ]);
    if (!$okU) {
      $pdo->rollBack();
      redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao atualizar produto."]);
    }

    // 2) Atualiza categorias (remove tudo e insere as novas)
    $pdo->prepare("DELETE FROM Produtos_e_Categorias_produtos WHERE Produtos_idProdutos = :id")
        ->execute([':id' => $idProduto]);

    if (!empty($cat_ids)) {
      $sqlPC = "INSERT INTO Produtos_e_Categorias_produtos
                  (Produtos_idProdutos, Categorias_produtos_id)
                VALUES (:pid, :cid)";
      $stPC = $pdo->prepare($sqlPC);
      foreach ($cat_ids as $cid) {
        if (!$stPC->execute([':pid' => $idProduto, ':cid' => (int)$cid])) {
          $pdo->rollBack();
          redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao atualizar categorias."]);
        }
      }
    }

    // 3) Imagens
    if ($subImgs) {
      // 3.1) Se optou por substituir, apaga vínculos antigos e as imagens órfãs
      // Captura IDs de imagens vinculadas ao produto
      $idsAntigas = $pdo->prepare("
        SELECT i.idImagem_produtos
          FROM Produtos_has_Imagem_produtos pi
          JOIN Imagem_produtos i ON i.idImagem_produtos = pi.Imagem_produtos_idImagem_produtos
         WHERE pi.Produtos_idProdutos = :pid
      ");
      $idsAntigas->execute([':pid' => $idProduto]);
      $antigas = $idsAntigas->fetchAll(PDO::FETCH_COLUMN, 0);

      // Remove vínculos
      $pdo->prepare("DELETE FROM Produtos_has_Imagem_produtos WHERE Produtos_idProdutos = :pid")
          ->execute([':pid' => $idProduto]);

      // Remove imagens (para não deixar órfãs)
      if (!empty($antigas)) {
        $in = implode(',', array_fill(0, count($antigas), '?'));
        $pdo->prepare("DELETE FROM Imagem_produtos WHERE idImagem_produtos IN ($in)")
            ->execute(array_map('intval', $antigas));
      }
    }

    // 3.2) Insere novas imagens (se enviadas) e vincula
    if (!empty($novasImagens)) {
      $sqlImg  = "INSERT INTO Imagem_produtos (foto) VALUES (:foto)";
      $stImg   = $pdo->prepare($sqlImg);
      $sqlLink = "INSERT INTO Produtos_has_Imagem_produtos
                    (Produtos_idProdutos, Imagem_produtos_idImagem_produtos)
                  VALUES (:pid, :iid)";
      $stLink  = $pdo->prepare($sqlLink);

      foreach ($novasImagens as $blob) {
        $stImg->bindParam(':foto', $blob, PDO::PARAM_LOB);
        if (!$stImg->execute()) {
          $pdo->rollBack();
          redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao salvar novas imagens."]);
        }
        $idImg = (int)$pdo->lastInsertId();

        if (!$stLink->execute([':pid' => $idProduto, ':iid' => $idImg])) {
          $pdo->rollBack();
          redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao vincular novas imagens."]);
        }
      }
    }

    // 4) OK
    $pdo->commit();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["editar" => "ok"]);
    exit;

  } catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Erro ao atualizar: " . $e->getMessage()]);
  }
}
/* ============================== EXCLUSÃO ============================== */
if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["acao"] ?? '') === "excluir") {
  try {
    $idProduto = (int)($_POST["id"] ?? 0);
    if ($idProduto <= 0) {
      redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "ID do produto inválido para exclusão."]);
    }

    $pdo->beginTransaction();

    // 1) Coleta imagens vinculadas para remoção posterior
    $idsStmt = $pdo->prepare("
      SELECT i.idImagem_produtos
        FROM Produtos_has_Imagem_produtos pi
        JOIN Imagem_produtos i ON i.idImagem_produtos = pi.Imagem_produtos_idImagem_produtos
       WHERE pi.Produtos_idProdutos = :pid
    ");
    $idsStmt->execute([':pid' => $idProduto]);
    $imgIds = $idsStmt->fetchAll(PDO::FETCH_COLUMN, 0);

    // 2) Remove vínculos de imagens e categorias
    $pdo->prepare("DELETE FROM Produtos_has_Imagem_produtos WHERE Produtos_idProdutos = :pid")
        ->execute([':pid' => $idProduto]);
    $pdo->prepare("DELETE FROM Produtos_e_Categorias_produtos WHERE Produtos_idProdutos = :pid")
        ->execute([':pid' => $idProduto]);

    // 3) Remove o produto
    $pdo->prepare("DELETE FROM Produtos WHERE idProdutos = :pid")
        ->execute([':pid' => $idProduto]);

    // 4) Remove as imagens que estavam vinculadas ao produto
    if (!empty($imgIds)) {
      $in = implode(',', array_fill(0, count($imgIds), '?'));
      $pdo->prepare("DELETE FROM Imagem_produtos WHERE idImagem_produtos IN ($in)")
          ->execute(array_map('intval', $imgIds));
    }

    $pdo->commit();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["excluir" => "ok"]);
    exit;

  } catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Erro ao excluir: " . $e->getMessage()]);
  }
}
















try {
  // 1) Aceita apenas POST
  if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Método inválido"]);
  }

  // 2) Normalização de valores monetários (pt-BR e en-US)
  $normMoney = fn($v) => ($v === '' || $v === null)
    ? null
    : (float) str_replace(',', '.', preg_replace('/\.(?=.*,)/', '', trim($v)));

  // 3) Coleta campos do formulário
  $nome        = trim($_POST["nomeproduto"] ?? '');
  $descricao   = trim($_POST["descricao"] ?? '');
  $quantidade  = (int)($_POST["quantidade"] ?? 0);
  $preco       = $normMoney($_POST["preco"] ?? '');
  $tamanho     = trim($_POST["tamanho"] ?? '');
  $cor         = trim($_POST["cor"] ?? '');
  $codigo      = trim($_POST["codigo"] ?? '');          // se no BD for INT, pode (int)$codigo
  $preco_promo = $normMoney($_POST["precopromocional"] ?? '');
  $marcas_id   = (int)($_POST["marcas_idMarcas"] ?? 0); // **marca vinda do form**
  $cat_ids     = $_POST["categorias_ids"] ?? [];        // **categorias vindas do form (array)**

  // 4) Imagens (usa sua helper readImageToBlob)
  $img1 = readImageToBlob($_FILES["imgproduto1"] ?? null);
  $img2 = readImageToBlob($_FILES["imgproduto2"] ?? null);
  $img3 = readImageToBlob($_FILES["imgproduto3"] ?? null);
  $imagens = array_values(array_filter([$img1, $img2, $img3], fn($b) => $b !== null));

  // 5) Validação
  $erros = [];
  if ($nome === '' || $descricao === '' || $quantidade <= 0 || !$preco) {
    $erros[] = "Preencha os campos obrigatórios.";
  }
  if ($marcas_id <= 0) {
    $erros[] = "Selecione uma marca válida.";
  }
  // filtra categorias para inteiros positivos (opcional)
  $cat_ids = array_values(array_unique(array_filter(array_map('intval', (array)$cat_ids), fn($v)=>$v>0)));

  if (!empty($erros)) {
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => implode(' ', $erros)]);
  }

  // 6) Transação
  $pdo->beginTransaction();

  // 7) Insere produto (marca vinculada pela FK)
  $sqlProd = "INSERT INTO Produtos
      (nome, descricao, quantidade, preco, tamanho, cor, codigo, preco_promocional, Marcas_idMarcas)
    VALUES
      (:nome, :descricao, :quantidade, :preco, :tamanho, :cor, :codigo, :preco_promocional, :marca)";
  $stProd = $pdo->prepare($sqlProd);
  $okProd = $stProd->execute([
    ':nome'              => $nome,
    ':descricao'         => $descricao,
    ':quantidade'        => $quantidade,
    ':preco'             => $preco,
    ':tamanho'           => $tamanho !== '' ? $tamanho : null,
    ':cor'               => $cor !== '' ? $cor : null,
    ':codigo'            => $codigo !== '' ? $codigo : null,
    ':preco_promocional' => $preco_promo, // pode ser null
    ':marca'             => $marcas_id,
  ]);
  if (!$okProd) {
    $pdo->rollBack();
    redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao cadastrar produto."]);
  }
  $idProduto = (int)$pdo->lastInsertId();

  // 8) (Opcional, mas recomendado) Validar existência da marca/categorias
  //    Se tiver constraints e índices corretos, o BD já garante; senão, poderia checar aqui.

  // 9) Vincula categorias (se houver)
  if (!empty($cat_ids)) {
    $sqlPC = "INSERT INTO Produtos_e_Categorias_produtos
                (Produtos_idProdutos, Categorias_produtos_id)
              VALUES (:pid, :cid)";
    $stPC = $pdo->prepare($sqlPC);

    foreach ($cat_ids as $cid) {
      $okPC = $stPC->execute([':pid' => $idProduto, ':cid' => (int)$cid]);
      if (!$okPC) {
        $pdo->rollBack();
        redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao vincular categorias."]);
      }
    }
  }

  // 10) Insere imagens e vincula
  if (!empty($imagens)) {
    $sqlImg  = "INSERT INTO Imagem_produtos (foto) VALUES (:foto)";
    $stImg   = $pdo->prepare($sqlImg);
    $sqlLink = "INSERT INTO Produtos_has_Imagem_produtos
                  (Produtos_idProdutos, Imagem_produtos_idImagem_produtos)
                VALUES (:pid, :iid)";
    $stLink  = $pdo->prepare($sqlLink);

    foreach ($imagens as $blob) {
      $stImg->bindParam(':foto', $blob, PDO::PARAM_LOB);
      if (!$stImg->execute()) {
        $pdo->rollBack();
        redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao cadastrar imagens."]);
      }
      $idImg = (int)$pdo->lastInsertId();

      $okLink = $stLink->execute([':pid' => $idProduto, ':iid' => $idImg]);
      if (!$okLink) {
        $pdo->rollBack();
        redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Falha ao vincular produto com imagem."]);
      }
    }
  }

  // 11) Tudo certo
  $pdo->commit();
  redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["Cadastro" => "ok"]);
  exit;

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) {
    $pdo->rollBack();
  }
  redirecWith("../paginas_logista/cadastro_produtos_logista.html", ["erro" => "Erro no banco de dados: " . $e->getMessage()]);
}
