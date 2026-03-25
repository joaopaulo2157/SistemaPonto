// api/ponto.js
// Sistema de Ponto Eletrônico - Backend API com Integração Vercel

// ================= CONFIGURAÇÕES =================
const VERCEL_API_KEY = 'prj_c70DBh9jjLO7Cq4B85Vy1c72xJ88'; // Sua chave API da Vercel
const TEAM_ID = ''; // Se estiver em uma equipe, coloque o ID aqui (ex: 'team_xxxxxxxxx')
const PROJECT_ID = 'sistema-ponto'; // ID do seu projeto na Vercel

// URLs da API Vercel
const VERCEL_API_URL = 'https://api.vercel.com';

// Headers padrão para autenticação
const authHeaders = {
  'Authorization': `Bearer ${VERCEL_API_KEY}`,
  'Content-Type': 'application/json'
};

// ================= DADOS DO SISTEMA =================
let colaboradores = [
  { id: 1, nome: "João Silva", matricula: "1001", cargo: "Professor", departamento: "Ensino", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 2, nome: "Maria Santos", matricula: "1002", cargo: "Coordenadora", departamento: "Pedagógico", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 3, nome: "Pedro Souza", matricula: "1003", cargo: "Diretor", departamento: "Administração", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" }
];

let registrosPonto = [
  { id: 1, matricula: "1001", nome: "João Silva", data: new Date().toLocaleDateString('pt-BR'), entrada: "08:00", saida: "", tipo: "Facial", observacao: "" },
  { id: 2, matricula: "1002", nome: "Maria Santos", data: new Date().toLocaleDateString('pt-BR'), entrada: "07:30", saida: "", tipo: "Manual", observacao: "" }
];

let trocasTurno = [];
let usuariosTI = [
  { usuario: "admin", senha: "ti@2024", tipo: "Master" }
];
let biometria = [];

// ================= FUNÇÕES DA API VERCEl =================

/**
 * Faz uma requisição para a API da Vercel
 */
async function chamarVercelAPI(endpoint, method = 'GET', body = null) {
  try {
    let url = `${VERCEL_API_URL}${endpoint}`;
    
    // Adicionar teamId se existir
    if (TEAM_ID && !url.includes('teamId=')) {
      url += (url.includes('?') ? '&' : '?') + `teamId=${TEAM_ID}`;
    }
    
    const options = {
      method,
      headers: authHeaders
    };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Erro na API Vercel:', data);
      throw new Error(data.error?.message || 'Erro na requisição');
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro ao chamar API Vercel:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lista todos os projetos
 */
async function listarProjetos() {
  return await chamarVercelAPI('/v1/projects');
}

/**
 * Lista deployments de um projeto
 */
async function listarDeployments(projectId = PROJECT_ID, limit = 10) {
  const endpoint = `/v6/deployments${projectId ? `?projectId=${projectId}&limit=${limit}` : `?limit=${limit}`}`;
  return await chamarVercelAPI(endpoint);
}

/**
 * Cria um novo deployment
 */
async function criarDeployment(projectId, files) {
  const body = {
    name: projectId,
    files: files,
    projectSettings: {
      framework: 'nextjs'
    }
  };
  return await chamarVercelAPI('/v6/deployments', 'POST', body);
}

/**
 * Obtém informações de um deployment específico
 */
async function getDeployment(deploymentId) {
  return await chamarVercelAPI(`/v6/deployments/${deploymentId}`);
}

/**
 * Cancela um deployment
 */
async function cancelDeployment(deploymentId) {
  return await chamarVercelAPI(`/v12/deployments/${deploymentId}/cancel`, 'PATCH');
}

// ================= FUNÇÕES DO SISTEMA DE PONTO =================

// Função CORS
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'https://ponto-app.vercel.app',
    'https://sistema-ponto-seven.vercel.app',
    'http://localhost:3000',
    'https://ponto-app-git-main.vercel.app'
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

export default async function handler(req, res) {
  // Configurar CORS
  setCorsHeaders(res, req.headers.origin);

  // Responder preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apenas POST é permitido para este endpoint
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, mensagem: 'Método não permitido. Use POST.' });
  }

  const { acao } = req.query;
  const dados = req.body;

  console.log(`📱 API chamada: ${acao}`);

  try {
    // ================= FUNÇÕES DA API VERCEl =================
    
    // Listar projetos
    if (acao === 'listarProjetos') {
      const resultado = await listarProjetos();
      if (resultado.success) {
        return res.status(200).json({ sucesso: true, dados: resultado.data.projects });
      }
      return res.status(500).json({ sucesso: false, mensagem: resultado.error });
    }
    
    // Listar deployments
    if (acao === 'listarDeployments') {
      const { projectId, limit } = dados;
      const resultado = await listarDeployments(projectId, limit);
      if (resultado.success) {
        return res.status(200).json({ sucesso: true, dados: resultado.data.deployments });
      }
      return res.status(500).json({ sucesso: false, mensagem: resultado.error });
    }
    
    // Criar deployment
    if (acao === 'criarDeployment') {
      const { projectId, files } = dados;
      if (!projectId || !files) {
        return res.status(400).json({ sucesso: false, mensagem: 'projectId e files são obrigatórios' });
      }
      const resultado = await criarDeployment(projectId, files);
      if (resultado.success) {
        return res.status(200).json({ sucesso: true, dados: resultado.data, mensagem: 'Deployment criado!' });
      }
      return res.status(500).json({ sucesso: false, mensagem: resultado.error });
    }
    
    // Obter deployment
    if (acao === 'getDeployment') {
      const { deploymentId } = dados;
      if (!deploymentId) {
        return res.status(400).json({ sucesso: false, mensagem: 'deploymentId é obrigatório' });
      }
      const resultado = await getDeployment(deploymentId);
      if (resultado.success) {
        return res.status(200).json({ sucesso: true, dados: resultado.data });
      }
      return res.status(500).json({ sucesso: false, mensagem: resultado.error });
    }
    
    // Cancelar deployment
    if (acao === 'cancelDeployment') {
      const { deploymentId } = dados;
      if (!deploymentId) {
        return res.status(400).json({ sucesso: false, mensagem: 'deploymentId é obrigatório' });
      }
      const resultado = await cancelDeployment(deploymentId);
      if (resultado.success) {
        return res.status(200).json({ sucesso: true, mensagem: 'Deployment cancelado!' });
      }
      return res.status(500).json({ sucesso: false, mensagem: resultado.error });
    }

    // ================= FUNÇÕES DO SISTEMA DE PONTO =================
    
    // Colaboradores
    if (acao === 'listarColaboradores') {
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, matricula, cargo, departamento, escola, cargaHoraria } = dados;
      
      if (!nome || !matricula) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e matrícula são obrigatórios!' });
      }
      
      const id = Date.now();
      const novoColab = { 
        id, 
        nome, 
        matricula, 
        cargo: cargo || '', 
        departamento: departamento || '', 
        escola: escola || '', 
        cargaHoraria: cargaHoraria || 160, 
        status: 'Ativo' 
      };
      colaboradores.push(novoColab);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!', dados: novoColab });
    }

    if (acao === 'editarColaborador') {
      const { id, dadosColab } = dados;
      const index = colaboradores.findIndex(c => c.id == id);
      if (index !== -1) {
        colaboradores[index] = { ...colaboradores[index], ...dadosColab };
        return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador editado!' });
      }
      return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = dados;
      const novoColaboradores = colaboradores.filter(c => c.id != id);
      if (novoColaboradores.length === colaboradores.length) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado' });
      }
      colaboradores = novoColaboradores;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    // Registros
    if (acao === 'listarRegistros') {
      return res.status(200).json({ sucesso: true, dados: registrosPonto });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = dados;
      
      const colaborador = colaboradores.find(c => c.matricula === matricula);
      if (!colaborador) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }

      const hoje = data || new Date().toLocaleDateString('pt-BR');
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      const registroExistente = registrosPonto.find(r => 
        r.matricula === matricula && r.data === hoje && !r.saida
      );

      if (tipo === 'saida' && registroExistente) {
        registroExistente.saida = horaAtual;
        registroExistente.observacao = observacao || '';
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && !registroExistente) {
        const novoRegistro = {
          id: Date.now(),
          matricula,
          nome: colaborador.nome,
          data: hoje,
          entrada: horaAtual,
          saida: '',
          tipo: origem || 'Manual',
          observacao: observacao || ''
        };
        registrosPonto.push(novoRegistro);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // Biometria
    if (acao === 'verificarBiometria') {
      const { hash } = dados;
      const encontrado = biometria.find(b => b.hash === hash);
      if (encontrado) {
        return res.status(200).json({ 
          sucesso: true, 
          colaborador: { matricula: encontrado.matricula, nome: encontrado.nome }
        });
      }
      return res.status(200).json({ sucesso: false });
    }

    if (acao === 'cadastrarBiometria') {
      const { matricula, nome, hash } = dados;
      const existente = biometria.find(b => b.matricula === matricula);
      if (existente) {
        existente.hash = hash;
        existente.dataCadastro = new Date().toLocaleDateString('pt-BR');
        return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria atualizada!' });
      }
      biometria.push({
        id: Date.now(),
        matricula,
        nome,
        hash,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
      });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // Trocas
    if (acao === 'listarTrocas') {
      return res.status(200).json({ sucesso: true, dados: trocasTurno });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = dados;
      
      if (!saidaMat || !entradaMat || !motivo) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos obrigatórios!' });
      }
      
      const novaTroca = {
        id: Date.now(),
        saidaNome,
        saidaMat,
        entradaNome,
        entradaMat,
        data: data || new Date().toLocaleDateString('pt-BR'),
        motivo,
        observacao: observacao || ''
      };
      trocasTurno.push(novaTroca);
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // Usuários TI
    if (acao === 'loginTI') {
      const { usuario, senha } = dados;
      const user = usuariosTI.find(u => u.usuario === usuario && u.senha === senha);
      if (user) {
        return res.status(200).json({ sucesso: true, tipo: user.tipo, mensagem: '✅ Login realizado!' });
      }
      return res.status(401).json({ sucesso: false, mensagem: '❌ Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const usuariosSemSenha = usuariosTI.map(({ usuario, tipo }) => ({ usuario, tipo }));
      return res.status(200).json({ sucesso: true, dados: usuariosSemSenha });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = dados;
      if (!usuario || !senha) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário e senha são obrigatórios!' });
      }
      if (usuariosTI.some(u => u.usuario === usuario)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      }
      usuariosTI.push({ usuario, senha, tipo: tipo || 'Comum' });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = dados;
      if (usuario === 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir o usuário admin!' });
      }
      const novoUsuarios = usuariosTI.filter(u => u.usuario !== usuario);
      if (novoUsuarios.length === usuariosTI.length) {
        return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
      }
      usuariosTI = novoUsuarios;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // Estatísticas
    if (acao === 'estatisticas') {
      const hoje = new Date().toLocaleDateString('pt-BR');
      const registrosHoje = registrosPonto.filter(r => r.data === hoje).length;
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: colaboradores.length,
        registrosHoje: registrosHoje
      });
    }

    // Folha de ponto
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = dados;
      
      const registrosFiltrados = registrosPonto.filter(r => {
        const partes = r.data.split('/');
        if (partes.length === 3) {
          const mesReg = parseInt(partes[1]);
          const anoReg = parseInt(partes[2]);
          return mesReg == mes && anoReg == ano;
        }
        return false;
      });
      
      const folhas = colaboradores.map(c => {
        const registrosColab = registrosFiltrados.filter(r => r.matricula === c.matricula);
        let totalHoras = 0;
        
        registrosColab.forEach(r => {
          if (r.entrada && r.saida) {
            const entradaHora = parseInt(r.entrada.split(':')[0]);
            const entradaMin = parseInt(r.entrada.split(':')[1]);
            const saidaHora = parseInt(r.saida.split(':')[0]);
            const saidaMin = parseInt(r.saida.split(':')[1]);
            const horas = (saidaHora - entradaHora) + (saidaMin - entradaMin) / 60;
            totalHoras += horas;
          }
        });
        
        return {
          colaborador: c.nome,
          matricula: c.matricula,
          escola: c.escola,
          cargo: c.cargo,
          cargaHoraria: c.cargaHoraria,
          totalHoras: totalHoras.toFixed(2),
          registros: registrosColab
        };
      });
      
      return res.status(200).json({ sucesso: true, dados: folhas, mes, ano });
    }

    // Ação não encontrada
    return res.status(404).json({ 
      sucesso: false, 
      mensagem: `Ação '${acao}' não encontrada. Ações disponíveis: 
      Vercel API: listarProjetos, listarDeployments, criarDeployment, getDeployment, cancelDeployment
      Sistema: listarColaboradores, adicionarColaborador, editarColaborador, excluirColaborador, listarRegistros, registrarPonto, verificarBiometria, cadastrarBiometria, listarTrocas, registrarTroca, loginTI, listarUsuariosTI, adicionarUsuarioTI, excluirUsuarioTI, estatisticas, gerarFolhaPonto` 
    });

  } catch (error) {
    console.error('❌ Erro na API:', error);
    return res.status(500).json({ 
      sucesso: false, 
      mensagem: 'Erro interno no servidor', 
      erro: error.message 
    });
  }
}
