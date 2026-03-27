// api/ponto.js
// Sistema de Ponto Eletrônico - Backend com NeonDB REST API
// Versão Oficial

// ================= CONFIGURAÇÃO =================
const NEON_API_URL = 'https://ep-proud-haze-acre4aei.apirest.sa-east-1.aws.neon.tech';
const NEON_SCHEMA = 'neondb';
const NEON_API_KEY = process.env.NEON_API_KEY; // Adicionar no Vercel

// ================= FUNÇÕES AUXILIARES =================
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ================= FUNÇÃO PARA CHAMAR API REST =================
async function neonQuery(endpoint, method = 'GET', body = null) {
  const url = `${NEON_API_URL}/rest/v1/${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': NEON_API_KEY,
    'Authorization': `Bearer ${NEON_API_KEY}`
  };
  
  const options = {
    method,
    headers
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ${response.status}: ${error}`);
  }
  
  return await response.json();
}

// ================= INICIALIZAR TABELAS =================
async function inicializarTabelas() {
  console.log('📊 Verificando/Criando tabelas via Neon REST API...');
  
  // Como a API REST já tem as tabelas, apenas verificamos se existem
  // Se não existirem, precisamos criar via SQL (será feito no Neon Dashboard)
  
  try {
    // Verificar se tabela escolas existe
    const escolas = await neonQuery('escolas?limit=1');
    console.log('✅ Tabela escolas acessível');
    
    // Verificar se tabela colaboradores existe
    const colaboradores = await neonQuery('colaboradores?limit=1');
    console.log('✅ Tabela colaboradores acessível');
    
    // Verificar se tabela registros_ponto existe
    const registros = await neonQuery('registros_ponto?limit=1');
    console.log('✅ Tabela registros_ponto acessível');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao acessar tabelas:', error.message);
    console.log('⚠️ Se as tabelas não existirem, crie-as no Neon Dashboard:');
    console.log(`
      CREATE TABLE escolas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        telefone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE colaboradores (
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
      );
      
      CREATE TABLE registros_ponto (
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
      );
      
      CREATE TABLE trocas_turno (
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
      );
      
      CREATE TABLE usuarios_ti (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) DEFAULT 'Comum',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
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

  // Verificar se API Key está configurada
  if (!NEON_API_KEY) {
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'NEON_API_KEY não configurada. Adicione nas variáveis de ambiente do Vercel.',
      solucao: 'No Vercel Dashboard, adicione NEON_API_KEY com o valor da sua chave API do Neon'
    });
  }

  // Inicializar tabelas
  await inicializarTabelas();

  // GET para teste
  if (req.method === 'GET') {
    try {
      const colaboradores = await neonQuery('colaboradores');
      const hoje = new Date().toISOString().split('T')[0];
      const registrosHoje = await neonQuery(`registros_ponto?data=eq.${hoje}`);
      
      return res.status(200).json({ 
        sucesso: true, 
        mensagem: '✅ API do Ponto Eletrônico está funcionando!',
        versao: '4.0.0',
        banco: 'NeonDB REST API',
        estatisticas: {
          totalColaboradores: colaboradores.length,
          registrosHoje: registrosHoje.length
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
      const escolas = await neonQuery('escolas?order=nome.asc');
      return res.status(200).json({ sucesso: true, dados: escolas });
    }

    if (acao === 'adicionarEscola') {
      const { nome, endereco, telefone } = body;
      if (!nome) return res.status(400).json({ sucesso: false, mensagem: 'Nome é obrigatório!' });
      const novaEscola = await neonQuery('escolas', 'POST', { nome, endereco: endereco || '', telefone: telefone || '' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola adicionada!', dados: novaEscola[0] });
    }

    if (acao === 'editarEscola') {
      const { id, nome, endereco, telefone } = body;
      const escolaAtualizada = await neonQuery(`escolas?id=eq.${id}`, 'PATCH', { nome, endereco, telefone });
      if (escolaAtualizada.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola editada!' });
    }

    if (acao === 'excluirEscola') {
      const { id } = body;
      await neonQuery(`escolas?id=eq.${id}`, 'DELETE');
      return res.status(200).json({ sucesso: true, mensagem: '✅ Escola excluída!' });
    }

    // ================= COLABORADORES =================
    if (acao === 'listarColaboradores') {
      const colaboradores = await neonQuery(`
        colaboradores?select=*,escolas(nome)&order=nome.asc
      `);
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = body;
      
      if (!nome || !email || !senha || !matricula || !escola) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
      }
      
      // Buscar ID da escola
      const escolas = await neonQuery(`escolas?nome=eq.${encodeURIComponent(escola)}`);
      if (escolas.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      }
      const escolaId = escolas[0].id;
      
      // Verificar duplicados
      const matriculaExistente = await neonQuery(`colaboradores?matricula=eq.${matricula}`);
      if (matriculaExistente.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Matrícula já existe!' });
      }
      
      const emailExistente = await neonQuery(`colaboradores?email=eq.${email}`);
      if (emailExistente.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Email já existe!' });
      }
      
      const novoColaborador = await neonQuery('colaboradores', 'POST', {
        nome, email, senha, matricula,
        cargo: cargo || '',
        departamento: departamento || '',
        escola_id: escolaId,
        carga_horaria: cargaHoraria || 160
      });
      
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!', dados: novoColaborador[0] });
    }

    if (acao === 'editarColaborador') {
      const { id, dadosColab } = body;
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dadosColab;
      
      // Buscar ID da escola
      let escolaId = null;
      if (escola) {
        const escolas = await neonQuery(`escolas?nome=eq.${encodeURIComponent(escola)}`);
        if (escolas.length > 0) escolaId = escolas[0].id;
      }
      
      // Verificar duplicados
      const matriculaExistente = await neonQuery(`colaboradores?matricula=eq.${matricula}&id=neq.${id}`);
      if (matriculaExistente.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Matrícula já existe para outro colaborador!' });
      }
      
      const emailExistente = await neonQuery(`colaboradores?email=eq.${email}&id=neq.${id}`);
      if (emailExistente.length > 0) {
        return res.status(400).json({ sucesso: false, mensagem: '❌ Email já existe para outro colaborador!' });
      }
      
      await neonQuery(`colaboradores?id=eq.${id}`, 'PATCH', {
        nome, email, senha, matricula,
        cargo: cargo || '',
        departamento: departamento || '',
        escola_id: escolaId,
        carga_horaria: cargaHoraria || 160
      });
      
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador editado!' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = body;
      await neonQuery(`colaboradores?id=eq.${id}`, 'DELETE');
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    if (acao === 'loginColaborador') {
      const { email, senha } = body;
      const colaboradores = await neonQuery(`
        colaboradores?email=eq.${email}&senha=eq.${senha}&status=eq.Ativo&select=*,escolas(nome)
      `);
      
      if (colaboradores.length === 0) {
        return res.status(401).json({ sucesso: false, mensagem: '❌ Email ou senha incorretos!' });
      }
      
      return res.status(200).json({ sucesso: true, dados: colaboradores[0] });
    }

    // ================= REGISTROS =================
    if (acao === 'listarRegistros') {
      const registros = await neonQuery('registros_ponto?order=data.desc,entrada.desc&limit=100');
      return res.status(200).json({ sucesso: true, dados: registros });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = body;
      
      const colaboradores = await neonQuery(`colaboradores?matricula=eq.${matricula}`);
      if (colaboradores.length === 0) return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      const colaborador = colaboradores[0];
      
      let escolaNome = '';
      if (colaborador.escola_id) {
        const escolas = await neonQuery(`escolas?id=eq.${colaborador.escola_id}`);
        if (escolas.length > 0) escolaNome = escolas[0].nome;
      }
      
      const hoje = data || new Date().toISOString().split('T')[0];
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      const registrosAbertos = await neonQuery(`
        registros_ponto?matricula=eq.${matricula}&data=eq.${hoje}&saida=is.null
      `);
      
      if (tipo === 'saida' && registrosAbertos.length > 0) {
        await neonQuery(`registros_ponto?id=eq.${registrosAbertos[0].id}`, 'PATCH', {
          saida: horaAtual,
          observacao: observacao || ''
        });
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && registrosAbertos.length === 0) {
        await neonQuery('registros_ponto', 'POST', {
          colaborador_id: colaborador.id,
          matricula,
          nome: colaborador.nome,
          escola: escolaNome,
          data: hoje,
          entrada: horaAtual,
          tipo: origem || 'Facial',
          observacao: observacao || ''
        });
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // ================= BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = body;
      const colaboradores = await neonQuery(`colaboradores?hash_facial=eq.${hash}`);
      if (colaboradores.length > 0) {
        return res.status(200).json({ 
          sucesso: true, 
          colaborador: { 
            matricula: colaboradores[0].matricula, 
            nome: colaboradores[0].nome, 
            id: colaboradores[0].id 
          }
        });
      }
      return res.status(200).json({ sucesso: false });
    }

    if (acao === 'cadastrarBiometria') {
      const { matricula, hash } = body;
      await neonQuery(`colaboradores?matricula=eq.${matricula}`, 'PATCH', { hash_facial: hash });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // ================= TROCAS =================
    if (acao === 'listarTrocas') {
      const trocas = await neonQuery('trocas_turno?order=data.desc&limit=50');
      return res.status(200).json({ sucesso: true, dados: trocas });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = body;
      
      const saidaResult = await neonQuery(`colaboradores?matricula=eq.${saidaMat}`);
      const entradaResult = await neonQuery(`colaboradores?matricula=eq.${entradaMat}`);
      
      await neonQuery('trocas_turno', 'POST', {
        colaborador_saida_id: saidaResult[0]?.id,
        colaborador_saida_nome: saidaNome,
        colaborador_entrada_id: entradaResult[0]?.id,
        colaborador_entrada_nome: entradaNome,
        data,
        motivo,
        observacao: observacao || ''
      });
      
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // ================= USUÁRIOS TI =================
    if (acao === 'loginTI') {
      const { usuario, senha } = body;
      const usuarios = await neonQuery(`usuarios_ti?usuario=eq.${usuario}&senha=eq.${senha}`);
      if (usuarios.length > 0) {
        return res.status(200).json({ sucesso: true, tipo: usuarios[0].tipo, mensagem: '✅ Login realizado!' });
      }
      return res.status(401).json({ sucesso: false, mensagem: '❌ Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const usuarios = await neonQuery('usuarios_ti?select=id,usuario,tipo');
      return res.status(200).json({ sucesso: true, dados: usuarios });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = body;
      const existente = await neonQuery(`usuarios_ti?usuario=eq.${usuario}`);
      if (existente.length > 0) return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      await neonQuery('usuarios_ti', 'POST', { usuario, senha, tipo: tipo || 'Comum' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = body;
      if (usuario === 'admin') return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir o admin!' });
      await neonQuery(`usuarios_ti?usuario=eq.${usuario}`, 'DELETE');
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // ================= ESTATÍSTICAS =================
    if (acao === 'estatisticas') {
      const colaboradores = await neonQuery('colaboradores');
      const hoje = new Date().toISOString().split('T')[0];
      const registrosHoje = await neonQuery(`registros_ponto?data=eq.${hoje}`);
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: colaboradores.length,
        registrosHoje: registrosHoje.length
      });
    }

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = body;
      const registros = await neonQuery(`
        registros_ponto?data=gte.${ano}-${mes}-01&data=lt.${ano}-${parseInt(mes)+1}-01&order=nome.asc,data.asc
      `);
      
      const folhas = {};
      registros.forEach(r => {
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