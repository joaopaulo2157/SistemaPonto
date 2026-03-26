// api/ponto.js
// Sistema de Ponto Eletrônico - Backend com PostgreSQL

const { Pool } = require('pg');

// ================= CONEXÃO COM BANCO DE DADOS =================
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ================= FUNÇÃO PARA EXECUTAR QUERIES =================
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

// ================= INICIALIZAR TABELAS =================
async function inicializarTabelas() {
  // Tabela de Escolas
  await query(`
    CREATE TABLE IF NOT EXISTS escolas (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      endereco TEXT,
      telefone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Colaboradores
  await query(`
    CREATE TABLE IF NOT EXISTS colaboradores (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      senha VARCHAR(255) NOT NULL,
      matricula VARCHAR(50) UNIQUE NOT NULL,
      cargo VARCHAR(100),
      departamento VARCHAR(100),
      escola_id INTEGER REFERENCES escolas(id),
      carga_horaria INTEGER DEFAULT 160,
      hash_facial TEXT,
      status VARCHAR(20) DEFAULT 'Ativo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Registros de Ponto
  await query(`
    CREATE TABLE IF NOT EXISTS registros_ponto (
      id SERIAL PRIMARY KEY,
      colaborador_id INTEGER REFERENCES colaboradores(id),
      matricula VARCHAR(50),
      nome VARCHAR(255),
      escola VARCHAR(255),
      data DATE NOT NULL,
      entrada TIME,
      saida TIME,
      tipo VARCHAR(50),
      observacao TEXT,
      latitude VARCHAR(50),
      longitude VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Trocas de Turno
  await query(`
    CREATE TABLE IF NOT EXISTS trocas_turno (
      id SERIAL PRIMARY KEY,
      colaborador_saida_id INTEGER REFERENCES colaboradores(id),
      colaborador_saida_nome VARCHAR(255),
      colaborador_entrada_id INTEGER REFERENCES colaboradores(id),
      colaborador_entrada_nome VARCHAR(255),
      data DATE NOT NULL,
      motivo TEXT,
      observacao TEXT,
      status VARCHAR(20) DEFAULT 'Pendente',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Usuários TI
  await query(`
    CREATE TABLE IF NOT EXISTS usuarios_ti (
      id SERIAL PRIMARY KEY,
      usuario VARCHAR(100) UNIQUE NOT NULL,
      senha VARCHAR(255) NOT NULL,
      tipo VARCHAR(50) DEFAULT 'Comum',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Inserir usuário admin padrão se não existir
  const adminExistente = await query('SELECT * FROM usuarios_ti WHERE usuario = $1', ['admin']);
  if (adminExistente.rows.length === 0) {
    await query(`
      INSERT INTO usuarios_ti (usuario, senha, tipo) 
      VALUES ($1, $2, $3)
    `, ['admin', 'ti@2024', 'Master']);
  }

  // Inserir escolas padrão se não existirem
  const escolasCount = await query('SELECT COUNT(*) FROM escolas');
  if (parseInt(escolasCount.rows[0].count) === 0) {
    const escolasPadrao = [
      'CENTRO INFANTIL VEREADOR EVANDRO CARI',
      'EMEIF AUDALIO MACIANO DA SILVA',
      'EMEIF FREI DAMIAO',
      'EMEIF SANTA ANA',
      'EMEIF JOAO VIEIRA GOMES',
      'EMEIF PEDRO FRANCISCO DAS CHAGAS',
      'EMEIF MANOEL VIEIRA GADI'
    ];
    for (const nome of escolasPadrao) {
      await query('INSERT INTO escolas (nome) VALUES ($1)', [nome]);
    }
  }
}

// ================= FUNÇÕES CORS =================
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'https://sistema-ponto-seven.vercel.app',
    'http://localhost:3000'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ================= HANDLER PRINCIPAL =================
module.exports = async function handler(req, res) {
  // Configurar CORS
  setCorsHeaders(res, req.headers.origin);

  // Responder preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Inicializar tabelas
  await inicializarTabelas();

  // Apenas POST é permitido para este endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, mensagem: 'Método não permitido. Use POST.' });
  }

  const { acao } = req.query;
  const dados = req.body;

  console.log(`📱 API chamada: ${acao}`);

  try {
    // ================= CRUD ESCOLAS =================
    if (acao === 'listarEscolas') {
      const result = await query('SELECT * FROM escolas ORDER BY nome');
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'adicionarEscola') {
      const { nome, endereco, telefone } = dados;
      if (!nome) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome é obrigatório!' });
      }
      const result = await query(
        'INSERT INTO escolas (nome, endereco, telefone) VALUES ($1, $2, $3) RETURNING *',
        [nome, endereco || '', telefone || '']
      );
      return res.status(200).json({ sucesso: true, mensagem: 'Escola adicionada!', dados: result.rows[0] });
    }

    if (acao === 'editarEscola') {
      const { id, nome, endereco, telefone } = dados;
      const result = await query(
        'UPDATE escolas SET nome = $1, endereco = $2, telefone = $3 WHERE id = $4 RETURNING *',
        [nome, endereco || '', telefone || '', id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      }
      return res.status(200).json({ sucesso: true, mensagem: 'Escola editada!', dados: result.rows[0] });
    }

    if (acao === 'excluirEscola') {
      const { id } = dados;
      await query('DELETE FROM escolas WHERE id = $1', [id]);
      return res.status(200).json({ sucesso: true, mensagem: 'Escola excluída!' });
    }

    // ================= CRUD COLABORADORES =================
    if (acao === 'listarColaboradores') {
      const result = await query(`
        SELECT c.*, e.nome as escola_nome 
        FROM colaboradores c 
        LEFT JOIN escolas e ON c.escola_id = e.id 
        ORDER BY c.nome
      `);
      const colaboradores = result.rows.map(c => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        senha: c.senha,
        matricula: c.matricula,
        cargo: c.cargo,
        departamento: c.departamento,
        escola: c.escola_nome,
        escolaId: c.escola_id,
        cargaHoraria: c.carga_horaria,
        hash: c.hash_facial,
        status: c.status
      }));
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dados;
      
      if (!nome || !email || !senha || !matricula || !escola) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos!' });
      }
      
      // Buscar ID da escola pelo nome
      const escolaResult = await query('SELECT id FROM escolas WHERE nome = $1', [escola]);
      if (escolaResult.rows.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      }
      const escolaId = escolaResult.rows[0].id;
      
      const result = await query(`
        INSERT INTO colaboradores (nome, email, senha, matricula, cargo, departamento, escola_id, carga_horaria)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [nome, email, senha, matricula, cargo || '', departamento || '', escolaId, cargaHoraria || 160]);
      
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!', dados: result.rows[0] });
    }

    if (acao === 'editarColaborador') {
      const { id, dadosColab } = dados;
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dadosColab;
      
      // Buscar ID da escola pelo nome
      const escolaResult = await query('SELECT id FROM escolas WHERE nome = $1', [escola]);
      let escolaId = null;
      if (escolaResult.rows.length > 0) {
        escolaId = escolaResult.rows[0].id;
      }
      
      const result = await query(`
        UPDATE colaboradores 
        SET nome = $1, email = $2, senha = $3, matricula = $4, cargo = $5, departamento = $6, escola_id = $7, carga_horaria = $8
        WHERE id = $9 RETURNING *
      `, [nome, email, senha, matricula, cargo || '', departamento || '', escolaId, cargaHoraria || 160, id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador editado!' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = dados;
      await query('DELETE FROM colaboradores WHERE id = $1', [id]);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    if (acao === 'loginColaborador') {
      const { email, senha } = dados;
      const result = await query(`
        SELECT c.*, e.nome as escola_nome 
        FROM colaboradores c 
        LEFT JOIN escolas e ON c.escola_id = e.id 
        WHERE c.email = $1 AND c.senha = $2 AND c.status = 'Ativo'
      `, [email, senha]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha incorretos!' });
      }
      
      const colaborador = {
        id: result.rows[0].id,
        nome: result.rows[0].nome,
        email: result.rows[0].email,
        matricula: result.rows[0].matricula,
        escola: result.rows[0].escola_nome,
        escolaId: result.rows[0].escola_id,
        cargo: result.rows[0].cargo,
        departamento: result.rows[0].departamento,
        cargaHoraria: result.rows[0].carga_horaria,
        hash: result.rows[0].hash_facial
      };
      
      return res.status(200).json({ sucesso: true, dados: colaborador });
    }

    // ================= REGISTROS DE PONTO =================
    if (acao === 'listarRegistros') {
      const result = await query('SELECT * FROM registros_ponto ORDER BY data DESC, entrada DESC LIMIT 100');
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = dados;
      
      // Buscar colaborador pela matrícula
      const colabResult = await query('SELECT * FROM colaboradores WHERE matricula = $1', [matricula]);
      if (colabResult.rows.length === 0) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }
      const colaborador = colabResult.rows[0];
      
      const hoje = data || new Date().toLocaleDateString('pt-BR').split('/').reverse().join('-');
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      // Verificar se já tem registro aberto
      const registroExistente = await query(`
        SELECT * FROM registros_ponto 
        WHERE matricula = $1 AND data = $2 AND saida IS NULL
      `, [matricula, hoje]);
      
      if (tipo === 'saida' && registroExistente.rows.length > 0) {
        // Atualizar saída
        await query(`
          UPDATE registros_ponto 
          SET saida = $1, observacao = $2, tipo = $3
          WHERE id = $4
        `, [horaAtual, observacao || '', origem || 'Facial', registroExistente.rows[0].id]);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && registroExistente.rows.length === 0) {
        // Nova entrada
        await query(`
          INSERT INTO registros_ponto (colaborador_id, matricula, nome, escola, data, entrada, tipo, observacao)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [colaborador.id, matricula, colaborador.nome, colaborador.escola_nome || '', hoje, horaAtual, origem || 'Facial', observacao || '']);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // ================= BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = dados;
      const result = await query('SELECT * FROM colaboradores WHERE hash_facial = $1', [hash]);
      if (result.rows.length > 0) {
        return res.status(200).json({ 
          sucesso: true, 
          colaborador: { 
            matricula: result.rows[0].matricula, 
            nome: result.rows[0].nome,
            id: result.rows[0].id
          }
        });
      }
      return res.status(200).json({ sucesso: false });
    }

    if (acao === 'cadastrarBiometria') {
      const { matricula, nome, hash } = dados;
      await query('UPDATE colaboradores SET hash_facial = $1 WHERE matricula = $2', [hash, matricula]);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // ================= TROCAS =================
    if (acao === 'listarTrocas') {
      const result = await query('SELECT * FROM trocas_turno ORDER BY data DESC LIMIT 50');
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = dados;
      
      // Buscar IDs dos colaboradores
      const saidaResult = await query('SELECT id FROM colaboradores WHERE matricula = $1', [saidaMat]);
      const entradaResult = await query('SELECT id FROM colaboradores WHERE matricula = $1', [entradaMat]);
      
      const result = await query(`
        INSERT INTO trocas_turno (colaborador_saida_id, colaborador_saida_nome, colaborador_entrada_id, colaborador_entrada_nome, data, motivo, observacao)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [saidaResult.rows[0]?.id, saidaNome, entradaResult.rows[0]?.id, entradaNome, data, motivo, observacao || '']);
      
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // ================= USUÁRIOS TI =================
    if (acao === 'loginTI') {
      const { usuario, senha } = dados;
      const result = await query('SELECT * FROM usuarios_ti WHERE usuario = $1 AND senha = $2', [usuario, senha]);
      if (result.rows.length > 0) {
        return res.status(200).json({ sucesso: true, tipo: result.rows[0].tipo, mensagem: '✅ Login realizado!' });
      }
      return res.status(401).json({ sucesso: false, mensagem: '❌ Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const result = await query('SELECT id, usuario, tipo FROM usuarios_ti');
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = dados;
      const existente = await query('SELECT * FROM usuarios_ti WHERE usuario = $1', [usuario]);
      if (existente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      }
      await query('INSERT INTO usuarios_ti (usuario, senha, tipo) VALUES ($1, $2, $3)', [usuario, senha, tipo || 'Comum']);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = dados;
      if (usuario === 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir o admin!' });
      }
      await query('DELETE FROM usuarios_ti WHERE usuario = $1', [usuario]);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // ================= ESTATÍSTICAS =================
    if (acao === 'estatisticas') {
      const totalColab = await query('SELECT COUNT(*) FROM colaboradores');
      const hoje = new Date().toISOString().split('T')[0];
      const registrosHoje = await query('SELECT COUNT(*) FROM registros_ponto WHERE data = $1', [hoje]);
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: parseInt(totalColab.rows[0].count),
        registrosHoje: parseInt(registrosHoje.rows[0].count)
      });
    }

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = dados;
      const result = await query(`
        SELECT * FROM registros_ponto 
        WHERE EXTRACT(MONTH FROM data) = $1 AND EXTRACT(YEAR FROM data) = $2
        ORDER BY nome, data
      `, [mes, ano]);
      
      // Agrupar por colaborador
      const folhas = {};
      result.rows.forEach(r => {
        if (!folhas[r.matricula]) {
          folhas[r.matricula] = {
            colaborador: r.nome,
            matricula: r.matricula,
            escola: r.escola,
            cargaHoraria: 160,
            registros: []
          };
        }
        folhas[r.matricula].registros.push(r);
      });
      
      return res.status(200).json({ sucesso: true, dados: Object.values(folhas), mes, ano });
    }

    return res.status(404).json({ 
      sucesso: false, 
      mensagem: `Ação '${acao}' não encontrada` 
    });

  } catch (error) {
    console.error('❌ Erro na API:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno no servidor', 
      erro: error.message 
    });
  }
};
