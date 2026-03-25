// api/ponto.js
// Sistema de Ponto Eletrônico - Backend API

// ================= DADOS DO SISTEMA =================
let colaboradores = [
  { id: 1, nome: "João Silva", matricula: "1001", cargo: "Professor", departamento: "Ensino", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 2, nome: "Maria Santos", matricula: "1002", cargo: "Coordenadora", departamento: "Pedagógico", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 3, nome: "Pedro Souza", matricula: "1003", cargo: "Diretor", departamento: "Administração", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" }
];

let registrosPonto = [];
let trocasTurno = [];
let usuariosTI = [
  { usuario: "admin", senha: "ti@2024", tipo: "Master" }
];
let biometria = [];

// ================= HANDLER PRINCIPAL =================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Teste rápido
  if (req.method === 'GET') {
    return res.status(200).json({
      sucesso: true,
      mensagem: 'API do Ponto Eletrônico funcionando!',
      endpoints: [
        'POST ?acao=estatisticas',
        'POST ?acao=listarColaboradores',
        'POST ?acao=adicionarColaborador',
        'POST ?acao=editarColaborador',
        'POST ?acao=excluirColaborador',
        'POST ?acao=listarRegistros',
        'POST ?acao=registrarPonto',
        'POST ?acao=loginTI',
        'POST ?acao=listarUsuariosTI',
        'POST ?acao=listarProjetos',
        'POST ?acao=listarDeployments'
      ]
    });
  }

  // Apenas POST para ações
  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use POST' });
  }

  const { acao } = req.query;
  const dados = req.body;

  try {
    // ================= COLABORADORES =================
    if (acao === 'listarColaboradores') {
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, matricula, cargo, departamento, escola, cargaHoraria } = dados;
      
      if (!nome || !matricula) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome e matrícula obrigatórios!' });
      }
      
      const id = Date.now();
      const novo = { id, nome, matricula, cargo: cargo || '', departamento: departamento || '', escola: escola || '', cargaHoraria: cargaHoraria || 160, status: 'Ativo' };
      colaboradores.push(novo);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!' });
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
      const novos = colaboradores.filter(c => c.id != id);
      if (novos.length === colaboradores.length) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado' });
      }
      colaboradores = novos;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    // ================= REGISTROS =================
    if (acao === 'listarRegistros') {
      return res.status(200).json({ sucesso: true, dados: registrosPonto });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, origem } = dados;
      
      const colaborador = colaboradores.find(c => c.matricula === matricula);
      if (!colaborador) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }

      const hoje = new Date().toLocaleDateString('pt-BR');
      const horaAtual = new Date().toLocaleTimeString('pt-BR');
      
      const existente = registrosPonto.find(r => r.matricula === matricula && r.data === hoje && !r.saida);

      if (tipo === 'saida' && existente) {
        existente.saida = horaAtual;
        existente.observacao = observacao || '';
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && !existente) {
        const novo = { id: Date.now(), matricula, nome: colaborador.nome, data: hoje, entrada: horaAtual, saida: '', tipo: origem || 'Manual', observacao: observacao || '' };
        registrosPonto.push(novo);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // ================= USUÁRIOS TI =================
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
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário e senha obrigatórios!' });
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
        return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir admin!' });
      }
      const novos = usuariosTI.filter(u => u.usuario !== usuario);
      if (novos.length === usuariosTI.length) {
        return res.status(404).json({ sucesso: false, mensagem: 'Usuário não encontrado' });
      }
      usuariosTI = novos;
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // ================= TROCAS =================
    if (acao === 'listarTrocas') {
      return res.status(200).json({ sucesso: true, dados: trocasTurno });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, motivo, observacao } = dados;
      
      if (!saidaMat || !entradaMat || !motivo) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos!' });
      }
      
      const nova = {
        id: Date.now(),
        saidaNome,
        saidaMat,
        entradaNome,
        entradaMat,
        data: new Date().toLocaleDateString('pt-BR'),
        motivo,
        observacao: observacao || ''
      };
      trocasTurno.push(nova);
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // ================= BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = dados;
      const encontrado = biometria.find(b => b.hash === hash);
      if (encontrado) {
        return res.status(200).json({ sucesso: true, colaborador: { matricula: encontrado.matricula, nome: encontrado.nome } });
      }
      return res.status(200).json({ sucesso: false });
    }

    if (acao === 'cadastrarBiometria') {
      const { matricula, nome, hash } = dados;
      const existente = biometria.find(b => b.matricula === matricula);
      if (existente) {
        existente.hash = hash;
        return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria atualizada!' });
      }
      biometria.push({ id: Date.now(), matricula, nome, hash });
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // ================= ESTATÍSTICAS =================
    if (acao === 'estatisticas') {
      const hoje = new Date().toLocaleDateString('pt-BR');
      const registrosHoje = registrosPonto.filter(r => r.data === hoje).length;
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: colaboradores.length,
        registrosHoje: registrosHoje
      });
    }

    // ================= API VERCEl (SIMULADA) =================
    if (acao === 'listarProjetos') {
      return res.status(200).json({
        sucesso: true,
        dados: [
          { id: "prj_1", name: "ponto-app", framework: "nextjs", createdAt: Date.now() },
          { id: "prj_2", name: "sistema-ponto", framework: "react", createdAt: Date.now() }
        ]
      });
    }

    if (acao === 'listarDeployments') {
      return res.status(200).json({
        sucesso: true,
        dados: [
          { uid: "dep_1", url: "ponto-app.vercel.app", readyState: "READY", createdAt: Date.now() },
          { uid: "dep_2", url: "sistema-ponto-seven.vercel.app", readyState: "READY", createdAt: Date.now() }
        ]
      });
    }

    if (acao === 'cancelDeployment') {
      return res.status(200).json({ sucesso: true, mensagem: '✅ Deployment cancelado!' });
    }

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = dados;
      const folhas = colaboradores.map(c => ({
        colaborador: c.nome,
        matricula: c.matricula,
        escola: c.escola,
        cargaHoraria: c.cargaHoraria,
        totalHoras: "0.00",
        registros: []
      }));
      return res.status(200).json({ sucesso: true, dados: folhas, mes, ano });
    }

    return res.status(404).json({ sucesso: false, mensagem: `Ação '${acao}' não encontrada` });

  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno', erro: error.message });
  }
}
