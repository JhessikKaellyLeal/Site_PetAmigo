<?php
// PHP/cadastro_produtos.php
require_once __DIR__ . '/conexao.php';

header('Content-Type: application/json; charset=utf-8');

// Helpers
function readImageToBlob(?array $file): ?string {
  if (!$file || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) return null;
  $bin = file_get_contents($file['tmp_name']);
  return $bin === false ? null : $bin;
}
function json_err($msg, $code=400){ http_response_code($code); echo json_encode(['ok'=>false,'error'=>$msg], JSON_UNESCAPED_UNICODE); exit; }
function json_ok($data=[]){ echo json_encode(['ok'=>true]+$data, JSON_UNESCAPED_UNICODE); exit; }

// ===================== LISTAR (para tabela) ===================== //
if ($_SERVER['REQUEST_METHOD']==='GET' && isset($_GET['listar'])) {
  try {
    $sql = "SELECT
              p.idProdutos, p.nome, p.descricao, p.quantidade, p.preco, p.preco_promocional,
              m.nome AS marca,
              c.nome AS categoria,
              MIN(i.idImagem_produtos) AS id_img, -- pega a 1ª imagem
              (SELECT i2.foto FROM Imagem_produtos i2
                 JOIN Produtos_has_Imagem_produtos pi2 ON pi2.Imagem_produtos_idImagem_produtos=i2.idImagem_produtos
                WHERE pi2.Produtos_idProdutos=p.idProdutos
                ORDER BY i2.idImagem_produtos ASC LIMIT 1) AS imagem,
              (SELECT i2.texto_alternativo FROM Imagem_produtos i2
                 JOIN Produtos_has_Imagem_produtos pi2 ON pi2.Imagem_produtos_idImagem_produtos=i2.idImagem_produtos
                WHERE pi2.Produtos_idProdutos=p.idProdutos
                ORDER BY i2.idImagem_produtos ASC LIMIT 1) AS texto_alternativo
            FROM Produtos p
            LEFT JOIN Marcas m ON m.idMarcas = p.Marcas_idMarcas
            LEFT JOIN Produtos_e_Categorias_produtos pc ON pc.Produtos_idProdutos = p.idProdutos
            LEFT JOIN categorias_produtos c ON c.idCategoriaProduto = pc.Categorias_produtos_id
            LEFT JOIN Produtos_has_Imagem_produtos pi ON pi.Produtos_idProdutos = p.idProdutos
            LEFT JOIN Imagem_produtos i ON i.idImagem_produtos = pi.Imagem_produtos_idImagem_produtos
            GROUP BY p.idProdutos
            ORDER BY p.idProdutos DESC";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    $produtos = array_map(function($r){
      return [
        'idProdutos'        => (int)$r['idProdutos'],
        'nome'              => $r['nome'],
        'descricao'         => $r['descricao'],
        'quantidade'        => (int)$r['quantidade'],
        'preco'             => (float)$r['preco'],
        'preco_promocional' => isset($r['preco_promocional']) ? (float)$r['preco_promocional'] : null,
        'marca'             => $r['marca'] ?? null,
        'categoria'         => $r['categoria'] ?? null,
        'imagem'            => $r['imagem'] ? base64_encode($r['imagem']) : null,
        'texto_alternativo' => $r['texto_alternativo'] ?? null
      ];
    }, $rows);

    json_ok(['count'=>count($produtos), 'produtos'=>$produtos]);
  } catch(Throwable $e){ json_err('Falha ao listar produtos',500); }
}

// ===================== VER DETALHES (para preencher form) ===================== //
if ($_SERVER['REQUEST_METHOD']==='GET' && isset($_GET['ver'])) {
  $id = (int)($_GET['id'] ?? 0);
  if ($id<=0) json_err('ID inválido');

  try {
    // produto
    $p = $pdo->prepare("SELECT * FROM Produtos WHERE idProdutos=?");
    $p->execute([$id]);
    $prod = $p->fetch(PDO::FETCH_ASSOC);
    if (!$prod) json_err('Produto não encontrado',404);

    // categoria (pega a 1ª, já que sua UI usa 1 select)
    $c = $pdo->prepare("SELECT Categorias_produtos_id FROM Produtos_e_Categorias_produtos WHERE Produtos_idProdutos=? LIMIT 1");
    $c->execute([$id]);
    $catId = $c->fetchColumn();
    $catId = $catId ? (int)$catId : null;

    // até 3 imagens (em ordem)
    $i = $pdo->prepare("SELECT i.idImagem_produtos AS id, i.foto, i.texto_alternativo
                          FROM Imagem_produtos i
                          JOIN Produtos_has_Imagem_produtos pi ON pi.Imagem_produtos_idImagem_produtos=i.idImagem_produtos
                         WHERE pi.Produtos_idProdutos=?
                         ORDER BY i.idImagem_produtos ASC
                         LIMIT 3");
    $i->execute([$id]);
    $imgs = [];
    $idx  = 1;
    foreach ($i->fetchAll(PDO::FETCH_ASSOC) as $row) {
      $imgs[] = [
        'slot' => $idx++, 'id' => (int)$row['id'],
        'base64' => $row['foto'] ? base64_encode($row['foto']) : null,
        'alt' => $row['texto_alternativo'] ?? null
      ];
    }

    json_ok([
      'produto'=>[
        'id'         => (int)$prod['idProdutos'],
        'nome'       => $prod['nome'],
        'descricao'  => $prod['descricao'],
        'quantidade' => (int)$prod['quantidade'],
        'preco'      => (float)$prod['preco'],
        'tamanho'    => $prod['tamanho'],
        'cor'        => $prod['cor'],
        'codigo'     => $prod['codigo'] !== null ? (int)$prod['codigo'] : null,
        'preco_promocional' => $prod['preco_promocional'] !== null ? (float)$prod['preco_promocional'] : null,
        'marca_id'   => $prod['Marcas_idMarcas'] !== null ? (int)$prod['Marcas_idMarcas'] : null,
        'categoria_id'=> $catId,
        'imagens'    => $imgs
      ]
    ]);
  } catch(Throwable $e){ json_err('Falha ao carregar detalhes',500); }
}

// ===================== CADASTRAR ===================== //
if ($_SERVER['REQUEST_METHOD']==='POST' && ($_POST['acao'] ?? '')==='cadastrar') {
  $nome = trim($_POST['nomeproduto'] ?? '');
  $descricao = trim($_POST['descricao'] ?? '');
  $quantidade = (int)($_POST['quantidade'] ?? 0);
  $preco = isset($_POST['preco']) ? (float)str_replace(',', '.', $_POST['preco']) : 0.0;
  $tamanho = trim($_POST['tamanho'] ?? '');
  $cor = trim($_POST['cor'] ?? '');
  $codigo = ($_POST['codigo'] ?? '')!=='' ? (int)$_POST['codigo'] : null;
  $precoPromo = ($_POST['precopromocional'] ?? '')!=='' ? (float)str_replace(',', '.', $_POST['precopromocional']) : null;
  $marcaId = (int)($_POST['marcaproduto'] ?? 0);
  $categoriaId = (int)($_POST['categoriaproduto'] ?? 0);

  if ($nome==='' || $descricao==='' || $quantidade<=0 || $preco<=0) json_err('Preencha nome, descrição, quantidade (>0) e preço.');
  if ($marcaId<=0) json_err('Selecione uma marca válida.');
  if ($categoriaId<=0) json_err('Selecione uma categoria válida.');

  try{
    $pdo->beginTransaction();

    // produto
    $st = $pdo->prepare("INSERT INTO Produtos
      (nome, descricao, quantidade, preco, tamanho, cor, codigo, preco_promocional, Marcas_idMarcas)
      VALUES (?,?,?,?,?,?,?,?,?)");
    $st->execute([
      $nome, $descricao, $quantidade, $preco,
      $tamanho!==''?$tamanho:null,
      $cor!==''?$cor:null,
      $codigo, $precoPromo, $marcaId
    ]);
    $pid = (int)$pdo->lastInsertId();

    // categoria (1)
    $pdo->prepare("INSERT INTO Produtos_e_Categorias_produtos (Produtos_idProdutos, Categorias_produtos_id) VALUES (?,?)")
        ->execute([$pid, $categoriaId]);

    // imagens (até 3)
    $files = ['imgproduto1','imgproduto2','imgproduto3'];
    foreach ($files as $k=>$fname) {
      $blob = readImageToBlob($_FILES[$fname] ?? null);
      if ($blob!==null) {
        $alt = "Imagem ".($k+1)." do produto ".$nome;
        $si  = $pdo->prepare("INSERT INTO Imagem_produtos (foto, texto_alternativo) VALUES (?,?)");
        $si->bindValue(1,$blob,PDO::PARAM_LOB);
        $si->bindValue(2,$alt);
        $si->execute();
        $iid = (int)$pdo->lastInsertId();
        $pdo->prepare("INSERT INTO Produtos_has_Imagem_produtos (Produtos_idProdutos, Imagem_produtos_idImagem_produtos) VALUES (?,?)")
            ->execute([$pid,$iid]);
      }
    }

    $pdo->commit();
    json_ok(['id'=>$pid, 'msg'=>'Produto cadastrado com sucesso']);
  } catch(Throwable $e){
    if($pdo->inTransaction()) $pdo->rollBack();
    json_err('Erro ao cadastrar produto',500);
  }
}

// ===================== ATUALIZAR ===================== //
if ($_SERVER['REQUEST_METHOD']==='POST' && ($_POST['acao'] ?? '')==='atualizar') {
  $pid = (int)($_POST['id'] ?? 0);
  if ($pid<=0) json_err('ID inválido');

  $nome = trim($_POST['nomeproduto'] ?? '');
  $descricao = trim($_POST['descricao'] ?? '');
  $quantidade = (int)($_POST['quantidade'] ?? 0);
  $preco = isset($_POST['preco']) ? (float)str_replace(',', '.', $_POST['preco']) : 0.0;
  $tamanho = trim($_POST['tamanho'] ?? '');
  $cor = trim($_POST['cor'] ?? '');
  $codigo = ($_POST['codigo'] ?? '')!=='' ? (int)$_POST['codigo'] : null;
  $precoPromo = ($_POST['precopromocional'] ?? '')!=='' ? (float)str_replace(',', '.', $_POST['precopromocional']) : null;
  $marcaId = (int)($_POST['marcaproduto'] ?? 0);
  $categoriaId = (int)($_POST['categoriaproduto'] ?? 0);
  $subImgs = (isset($_POST['substituir_imagens']) && $_POST['substituir_imagens']=='1');

  if ($nome==='' || $descricao==='' || $quantidade<=0 || $preco<=0) json_err('Preencha nome, descrição, quantidade (>0) e preço.');
  if ($marcaId<=0) json_err('Selecione uma marca válida.');
  if ($categoriaId<=0) json_err('Selecione uma categoria válida.');

  try{
    $pdo->beginTransaction();

    // update produto
    $su = $pdo->prepare("UPDATE Produtos SET
        nome=?, descricao=?, quantidade=?, preco=?, tamanho=?, cor=?, codigo=?, preco_promocional=?, Marcas_idMarcas=?
      WHERE idProdutos=?");
    $su->execute([
      $nome, $descricao, $quantidade, $preco,
      $tamanho!==''?$tamanho:null,
      $cor!==''?$cor:null,
      $codigo, $precoPromo, $marcaId, $pid
    ]);

    // categoria (limpa e insere 1)
    $pdo->prepare("DELETE FROM Produtos_e_Categorias_produtos WHERE Produtos_idProdutos=?")->execute([$pid]);
    $pdo->prepare("INSERT INTO Produtos_e_Categorias_produtos (Produtos_idProdutos, Categorias_produtos_id) VALUES (?,?)")
        ->execute([$pid,$categoriaId]);

    // imagens
    if ($subImgs) {
      // apaga vínculos + imagens antigas
      $ids = $pdo->prepare("SELECT i.idImagem_produtos
                              FROM Imagem_produtos i
                              JOIN Produtos_has_Imagem_produtos pi ON pi.Imagem_produtos_idImagem_produtos=i.idImagem_produtos
                             WHERE pi.Produtos_idProdutos=?");
      $ids->execute([$pid]);
      $toDel = $ids->fetchAll(PDO::FETCH_COLUMN, 0);

      $pdo->prepare("DELETE FROM Produtos_has_Imagem_produtos WHERE Produtos_idProdutos=?")->execute([$pid]);
      if ($toDel) {
        $in = implode(',', array_fill(0, count($toDel), '?'));
        $pdo->prepare("DELETE FROM Imagem_produtos WHERE idImagem_produtos IN ($in)")
            ->execute(array_map('intval',$toDel));
      }

      // insere novas (se enviadas)
      $files = ['imgproduto1','imgproduto2','imgproduto3'];
      foreach ($files as $k=>$fname) {
        $blob = readImageToBlob($_FILES[$fname] ?? null);
        if ($blob!==null) {
          $alt = "Imagem ".($k+1)." do produto ".$nome;
          $si  = $pdo->prepare("INSERT INTO Imagem_produtos (foto, texto_alternativo) VALUES (?,?)");
          $si->bindValue(1,$blob,PDO::PARAM_LOB);
          $si->bindValue(2,$alt);
          $si->execute();
          $iid = (int)$pdo->lastInsertId();
          $pdo->prepare("INSERT INTO Produtos_has_Imagem_produtos (Produtos_idProdutos, Imagem_produtos_idImagem_produtos) VALUES (?,?)")
              ->execute([$pid,$iid]);
        }
      }
    }

    $pdo->commit();
    json_ok(['id'=>$pid,'msg'=>'Produto atualizado com sucesso']);
  } catch(Throwable $e){
    if($pdo->inTransaction()) $pdo->rollBack();
    json_err('Erro ao atualizar produto',500);
  }
}

// ===================== EXCLUIR ===================== //
if ($_SERVER['REQUEST_METHOD']==='POST' && ($_POST['acao'] ?? '')==='excluir') {
  $pid = (int)($_POST['id'] ?? 0);
  if ($pid<=0) json_err('ID inválido');

  try{
    $pdo->beginTransaction();

    // pega imagens
    $ids = $pdo->prepare("SELECT i.idImagem_produtos
                            FROM Imagem_produtos i
                            JOIN Produtos_has_Imagem_produtos pi ON pi.Imagem_produtos_idImagem_produtos=i.idImagem_produtos
                           WHERE pi.Produtos_idProdutos=?");
    $ids->execute([$pid]);
    $toDel = $ids->fetchAll(PDO::FETCH_COLUMN, 0);

    // limpa vínculos
    $pdo->prepare("DELETE FROM Produtos_has_Imagem_produtos WHERE Produtos_idProdutos=?")->execute([$pid]);
    $pdo->prepare("DELETE FROM Produtos_e_Categorias_produtos WHERE Produtos_idProdutos=?")->execute([$pid]);

    // apaga produto
    $pdo->prepare("DELETE FROM Produtos WHERE idProdutos=?")->execute([$pid]);

    // apaga imagens
    if ($toDel) {
      $in = implode(',', array_fill(0, count($toDel), '?'));
      $pdo->prepare("DELETE FROM Imagem_produtos WHERE idImagem_produtos IN ($in)")
          ->execute(array_map('intval',$toDel));
    }

    $pdo->commit();
    json_ok(['msg'=>'Produto excluído']);
  } catch(Throwable $e){
    if($pdo->inTransaction()) $pdo->rollBack();
    json_err('Erro ao excluir produto',500);
  }
}

// ===================== LISTAR POR CATEGORIA ===================== //
if ($_SERVER['REQUEST_METHOD']==='GET' && isset($_GET['listar_por_categoria'])) {
  // aceita idCategoria, idcategoria ou categoria_id
  $catId = (int)($_GET['idCategoria'] ?? $_GET['idcategoria'] ?? $_GET['categoria_id'] ?? 0);
  if ($catId <= 0) json_err('idCategoria inválido');

  try {
    // Mesma base da sua listagem geral, mas filtrando pela categoria
    $sql = "SELECT
              p.idProdutos, p.nome, p.descricao, p.quantidade, p.preco, p.preco_promocional,
              m.nome AS marca,
              c.nome AS categoria,
              MIN(i.idImagem_produtos) AS id_img,
              (SELECT i2.foto FROM Imagem_produtos i2
                 JOIN Produtos_has_Imagem_produtos pi2 ON pi2.Imagem_produtos_idImagem_produtos=i2.idImagem_produtos
                WHERE pi2.Produtos_idProdutos=p.idProdutos
                ORDER BY i2.idImagem_produtos ASC LIMIT 1) AS imagem,
              (SELECT i2.texto_alternativo FROM Imagem_produtos i2
                 JOIN Produtos_has_Imagem_produtos pi2 ON pi2.Imagem_produtos_idImagem_produtos=i2.idImagem_produtos
                WHERE pi2.Produtos_idProdutos=p.idProdutos
                ORDER BY i2.idImagem_produtos ASC LIMIT 1) AS texto_alternativo
            FROM Produtos p
            LEFT JOIN Marcas m ON m.idMarcas = p.Marcas_idMarcas
            -- Aqui precisa ser INNER JOIN para filtrar pela categoria
            INNER JOIN Produtos_e_Categorias_produtos pc ON pc.Produtos_idProdutos = p.idProdutos
            INNER JOIN categorias_produtos c ON c.idCategoriaProduto = pc.Categorias_produtos_id
            LEFT JOIN Produtos_has_Imagem_produtos pi ON pi.Produtos_idProdutos = p.idProdutos
            LEFT JOIN Imagem_produtos i ON i.idImagem_produtos = pi.Imagem_produtos_idImagem_produtos
            WHERE pc.Categorias_produtos_id = :catId
            GROUP BY p.idProdutos
            ORDER BY p.idProdutos DESC";

    $st = $pdo->prepare($sql);
    $st->bindValue(':catId', $catId, PDO::PARAM_INT);
    $st->execute();
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);

    $produtos = array_map(function($r){
      return [
        'idProdutos'        => (int)$r['idProdutos'],
        'nome'              => $r['nome'],
        'descricao'         => $r['descricao'],
        'quantidade'        => (int)$r['quantidade'],
        'preco'             => (float)$r['preco'],
        'preco_promocional' => isset($r['preco_promocional']) ? (float)$r['preco_promocional'] : null,
        'marca'             => $r['marca'] ?? null,
        'categoria'         => $r['categoria'] ?? null,
        // IMPORTANTE: transforme BLOB em base64 cru (o JS já monta dataURL)
        'imagem'            => $r['imagem'] ? base64_encode($r['imagem']) : null,
        'texto_alternativo' => $r['texto_alternativo'] ?? null
      ];
    }, $rows);

    json_ok(['count'=>count($produtos), 'produtos'=>$produtos]);
  } catch (Throwable $e) {
    json_err('Falha ao listar produtos por categoria', 500);
  }
}


// fallback
json_err('Requisição inválida',405);
