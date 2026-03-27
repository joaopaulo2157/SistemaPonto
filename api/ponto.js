// api/ponto.js
// Sistema de Ponto Eletrônico - Backend com Vercel Postgres SDK
// Versão Oficial - Usando @vercel/postgres

import { sql } from '@vercel/postgres';

// ================= FUNÇÕES AUXILIARES =================
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ================= INICIALIZAR TABELAS =================
async function inicializarTabelas() {
  console.log('📊 Criando tabelas no Vercel Postgres...');
  
  try {
    // Tabela de Escolas
    await sql`
      CREATE TABLE IF NOT EXISTS escolas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        telefone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Tabela de Colaboradores
    await sql`
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
    `;
    
    // Tabela de Registros de Ponto
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Tabela de Trocas de Turno
    await sql`
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
    `;
    
    // Tabela de Usuários TI
    await sql`
      CREATE TABLE IF NOT EXISTS usuarios_ti (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'Comum',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Tabelas criadas/verificadas!');
    
    // Inserir escolas padrão
    const escolasCount = await sql`SELECT COUNT(*) FROM escolas`;
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
        await sql`INSERT INTO escolas (nome) VALUES (${nome})`;
      }
      console.log('✅ Escolas padrão inseridas');
    }
    
    // Inserir usuário admin
    const adminExistente = await sql`SELECT * FROM usuarios_ti WHERE usuario = 'admin'`;
    if (adminExistente.rows.length === 0) {
      await sql`INSERT INTO usuarios_ti (usuario, senha, tipo) VALUES ('admin', 'ti@2024', 'Master')`;
      console.log('✅ Usuário admin criado');
    }
    
    // Inserir colaborador padrão
    const colaboradorExistente = await sql`SELECT * FROM colaboradores WHERE matricula = '1001'`;
    if (colaboradorExistente.rows.length === 0) {
      const escolaResult = await sql`SELECT id FROM escolas LIMIT 1`;
      const escolaId = escolaResult.rows[0]?.id || 1;
      await sql`
        INSERT INTO colaboradores (nome, email, senha, matricula, cargo, escola_id)
        VALUES ('João Paulo', 'joaopaulo2009@gmail.com', '2026', '1001', 'Professor', ${escolaId})
      `;
      console.log('✅ Colaborador padrão criado');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error.message);
    return false;
  }
}

// ================= HANDLER PRINCIPAL =================
export default async function handler(req, res) {
  // Configurar CORS
  setCorsHeaders(res);

  // Responder preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Inicializar tabelas
  try {
    await inicializarTabelas();
  } catch (error) {
    console.error('Erro ao inicializar banco:', error.message);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro ao conectar com banco de dados',
      detalhes: error.message
    });
  }

  // GET para teste
  if (req.method === 'GET') {
    try {
      const totalColab = await sql`SELECT COUNT(*) FROM colaboradores`;
      const hoje = new Date().toISOString().split('T')[0];
      const registrosHoje = await sql`SELECT COUNT(*) FROM registros_ponto WHERE data = ${hoje}`;
      
      return res.status(200).json({ 
        sucesso: true, 
        mensagem: '✅ API do Ponto Eletrônico está funcionando!',
        versao: '3.0.0',
        banco: 'Vercel Postgres',
        estatisticas: {
          totalColaboradores: parseInt(totalColab.rows[0].count),
          registrosHoje: parseInt(registrosHoje.rows[0].count)
        }
      });
    } catch (error) {
      return res.status(500).json({ 
        sucesso: false, 
        mensagem: 'Erro ao consultar banco de dados',
        erro: error.message 
      });
    }
  }

  // Apenas POST para ações
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, mensagem: 'Método não permitido. Use POST ou GET.' });
  }

  const { acao } = req.query;
  const body = req.body;

  console.log(`📱 API chamada: ${acao}`);

  try {
    // ================= ESCOLAS =================
    if (acao === 'listarEscolas') {
      const result = await sql`SELECT * FROM escolas ORDER BY nome`;
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'adicionarEscola') {
      const { nome, endereco, telefone } = body;
      if (!nome) return res.status(400).json({ sucesso: false, mensagem: 'Nome é obrigatório!' });
      const result = await sql`
        INSERT INTO escolas (nome, endereco, telefone) 
        VALUES (${nome}, ${endereco || ''}, ${telefone || ''}) 
        RETURNING *
      `;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola adicionada!', dados: result.rows[0] });
    }

    if (acao === 'editarEscola') {
      const { id, nome, endereco, telefone } = body;
      const result = await sql`
        UPDATE escolas 
        SET nome = ${nome}, endereco = ${endereco || ''}, telefone = ${telefone || ''}
        WHERE id = ${id} 
        RETURNING *
      `;
      if (result.rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola editada!' });
    }

    if (acao === 'excluirEscola') {
      const { id } = body;
      await sql`DELETE FROM escolas WHERE id = ${id}`;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola excluída!' });
    }

    // ================= COLABORADORES =================
    if (acao === 'listarColaboradores') {
      const result = await sql`
        SELECT c.*, e.nome as escola_nome 
        FROM colaboradores c 
        LEFT JOIN escolas e ON c.escola_id = e.id 
        ORDER BY c.nome
      `;
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
        hashFacial: c.hash_facial,
        status: c.status
      }));
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = body;
      
      if (!nome || !email || !senha || !matricula || !escola) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
      }
      
      const escolaResult = await sql`SELECT id FROM escolas WHERE nome = ${escola}`;
      if (escolaResult.rows.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      }
      const escolaId = escolaResult.rows[0].id;
      
      const matriculaExistente = await sql`SELECT * FROM colaboradores WHERE matricula = ${matricula}`;
      if (matriculaExistente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Matrícula já existe!' });
      }
      
      const emailExistente = await sql`SELECT * FROM colaboradores WHERE email = ${email}`;
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Email já existe!' });
      }
      
      const result = await sql`
        INSERT INTO colaboradores (nome, email, senha, matricula, cargo, departamento, escola_id, carga_horaria)
        VALUES (${nome}, ${email}, ${senha}, ${matricula}, ${cargo || ''}, ${departamento || ''}, ${escolaId}, ${cargaHoraria || 160})
        RETURNING *
      `;
      
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!', dados: result.rows[0] });
    }

    if (acao === 'editarColaborador') {
      const { id, dadosColab } = body;
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dadosColab;
      
      const escolaResult = await sql`SELECT id FROM escolas WHERE nome = ${escola}`;
      let escolaId = null;
      if (escolaResult.rows.length > 0) escolaId = escolaResult.rows[0].id;
      
      const matriculaExistente = await sql`
        SELECT * FROM colaboradores WHERE matricula = ${matricula} AND id != ${id}
      `;
      if (matriculaExistente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Matrícula já existe para outro colaborador!' });
      }
      
      const emailExistente = await sql`
        SELECT * FROM colaboradores WHERE email = ${email} AND id != ${id}
      `;
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Email já existe para outro colaborador!' });
      }
      
      const result = await sql`
        UPDATE colaboradores 
        SET nome = ${nome}, email = ${email}, senha = ${senha}, matricula = ${matricula}, 
            cargo = ${cargo || ''}, departamento = ${departamento || ''}, 
            escola_id = ${escolaId}, carga_horaria = ${cargaHoraria || 160}
        WHERE id = ${id}
        RETURNING *
      `;
      
      if (result.rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador editado!' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = body;
      await sql`DELETE FROM colaboradores WHERE id = ${id}`;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    if (acao === 'loginColaborador') {
      const { email, senha } = body;
      const result = await sql`
        SELECT c.*, e.nome as escola_nome 
        FROM colaboradores c 
        LEFT JOIN escolas e ON c.escola_id = e.id 
        WHERE c.email = ${email} AND c.senha = ${senha} AND c.status = 'Ativo'
      `;
      
      if (result.rows.length === 0) {
        return res.status(401).json({ sucesso: false, mensagem: '❌ Email ou senha incorretos!' });
      }
      
      return res.status(200).json({ sucesso: true, dados: result.rows[0] });
    }

    // ================= REGISTROS =================
    if (acao === 'listarRegistros') {
      const result = await sql`
        SELECT * FROM registros_ponto 
        ORDER BY data DESC, entrada DESC 
        LIMIT 100
      `;
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = body;
      
      const colabResult = await sql`SELECT * FROM colaboradores WHERE matricula = ${matricula}`;
      if (colabResult.rows.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      const colaborador = colabResult.rows[0];
      
      let escolaNome = '';
      if (colaborador.escola_id) {
        const escolaResult = await sql`SELECT nome FROM escolas WHERE id = ${colaborador.escola_id}`;
        if (escolaResult.rows.length > 0) escolaNome = escolaResult.rows[0].nome;
      }
      
      const hoje = data || new Date().toISOString().split('T')[0];
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      const registroExistente = await sql`
        SELECT * FROM registros_ponto 
        WHERE matricula = ${matricula} AND data = ${hoje} AND saida IS NULL
      `;
      
      if (tipo === 'saida' && registroExistente.rows.length > 0) {
        await sql`
          UPDATE registros_ponto 
          SET saida = ${horaAtual}, observacao = ${observacao || ''}
          WHERE id = ${registroExistente.rows[0].id}
        `;
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && registroExistente.rows.length === 0) {
        await sql`
          INSERT INTO registros_ponto (colaborador_id, matricula, nome, escola, data, entrada, tipo, observacao)
          VALUES (${colaborador.id}, ${matricula}, ${colaborador.nome}, ${escolaNome}, ${hoje}, ${horaAtual}, ${origem || 'Facial'}, ${observacao || ''})
        `;
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // ================= BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = body;
      const result = await sql`SELECT * FROM colaboradores WHERE hash_facial = ${hash}`;
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
      const { matricula, hash } = body;
      await sql`UPDATE colaboradores SET hash_facial = ${hash} WHERE matricula = ${matricula}`;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // ================= TROCAS =================
    if (acao === 'listarTrocas') {
      const result = await sql`
        SELECT * FROM trocas_turno 
        ORDER BY data DESC 
        LIMIT 50
      `;
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = body;
      
      const saidaResult = await sql`SELECT id FROM colaboradores WHERE matricula = ${saidaMat}`;
      const entradaResult = await sql`SELECT id FROM colaboradores WHERE matricula = ${entradaMat}`;
      
      await sql`
        INSERT INTO trocas_turno (colaborador_saida_id, colaborador_saida_nome, colaborador_entrada_id, colaborador_entrada_nome, data, motivo, observacao)
        VALUES (${saidaResult.rows[0]?.id}, ${saidaNome}, ${entradaResult.rows[0]?.id}, ${entradaNome}, ${data}, ${motivo}, ${observacao || ''})
      `;
      
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // ================= USUÁRIOS TI =================
    if (acao === 'loginTI') {
      const { usuario, senha } = body;
      const result = await sql`
        SELECT * FROM usuarios_ti 
        WHERE usuario = ${usuario} AND senha = ${senha}
      `;
      if (result.rows.length > 0) {
        return res.status(200).json({ 
          sucesso: true, 
          tipo: result.rows[0].tipo, 
          mensagem: '✅ Login realizado!' 
        });
      }
      return res.status(401).json({ sucesso: false, mensagem: '❌ Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const result = await sql`SELECT id, usuario, tipo FROM usuarios_ti`;
      return res.status(200).json({ sucesso: true, dados: result.rows });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = body;
      const existente = await sql`SELECT * FROM usuarios_ti WHERE usuario = ${usuario}`;
      if (existente.rows.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      }
      await sql`
        INSERT INTO usuarios_ti (usuario, senha, tipo) 
        VALUES (${usuario}, ${senha}, ${tipo || 'Comum'})
      `;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = body;
      if (usuario === 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir o admin!' });
      }
      await sql`DELETE FROM usuarios_ti WHERE usuario = ${usuario}`;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // ================= ESTATÍSTICAS =================
    if (acao === 'estatisticas') {
      const totalColab = await sql`SELECT COUNT(*) FROM colaboradores`;
      const hoje = new Date().toISOString().split('T')[0];
      const registrosHoje = await sql`SELECT COUNT(*) FROM registros_ponto WHERE data = ${hoje}`;
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: parseInt(totalColab.rows[0].count),
        registrosHoje: parseInt(registrosHoje.rows[0].count)
      });
    }

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = body;
      const result = await sql`
        SELECT * FROM registros_ponto 
        WHERE EXTRACT(MONTH FROM data) = ${mes} AND EXTRACT(YEAR FROM data) = ${ano}
        ORDER BY nome, data
      `;
      
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
