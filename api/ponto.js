// api/ponto.js
// Este arquivo atua como backend do sistema de ponto eletrônico

// Dados simulados (em produção, use um banco de dados como Vercel Postgres)
let colaboradores = [
  { id: 1, nome: "João Silva", matricula: "1001", cargo: "Professor", departamento: "Ensino", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 2, nome: "Maria Santos", matricula: "1002", cargo: "Coordenadora", departamento: "Pedagógico", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" },
  { id: 3, nome: "Pedro Souza", matricula: "1003", cargo: "Diretor", departamento: "Administração", escola: "Escola Municipal", cargaHoraria: 160, status: "Ativo" }
];

let registrosPonto = [
  { id: 1, matricula: "1001", nome: "João Silva", data: "25/03/2024", entrada: "08:00", saida: "", tipo: "Facial", observacao: "" },
  { id: 2, matricula: "1002", nome: "Maria Santos", data: "25/03/2024", entrada: "07:30", saida: "", tipo: "Manual", observacao: "" }
];

let trocasTurno = [
  { id: 1, saidaNome: "João Silva", saidaMat: "1001", entradaNome: "Maria Santos", entradaMat: "1002", data: "25/03/2024", motivo: "Afastamento", observacao: "" }
];

let usuariosTI = [
  { usuario: "admin", senha: "ti@2024", tipo: "Master" }
];

let biometria = [
  { id: 1, matricula: "1001", nome: "João Silva", hash: "abc123", dataCadastro: "25/03/2024" }
];

// Função auxiliar para CORS
function setCorsHeaders(res) {
  const allowedOrigins = [
    'https://sistema-ponto-seven.vercel.app',
    'http://localhost:3000',
    'https://sistema-ponto-seven.vercel.app'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCorsHeaders(res);

  // Responde preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { acao } = req.query;

  try {
    // ================= ROTAS DE COLABORADORES =================
    if (acao === 'listarColaboradores') {
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const novo = req.body;
      const id = Date.now();
      const novoColab = { id, ...novo, status: 'Ativo' };
      colaboradores.push(novoColab);
      return res.status(200).json({ sucesso: true, mensagem: 'Colaborador adicionado!', dados: novoColab });
    }

    if (acao === 'editarColaborador') {
      const { id, dados } = req.body;
      const index = colaboradores.findIndex(c => c.id == id);
      if (index !== -1) {
        colaboradores[index] = { ...colaboradores[index], ...dados };
        return res.status(200).json({ sucesso: true, mensagem: 'Colaborador editado!' });
      }
      return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = req.body;
      colaboradores = colaboradores.filter(c => c.id != id);
      return res.status(200).json({ sucesso: true, mensagem: 'Colaborador excluído!' });
    }

    // ================= ROTAS DE REGISTROS =================
    if (acao === 'listarRegistros') {
      return res.status(200).json({ sucesso: true, dados: registrosPonto });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = req.body;
      
      const colaborador = colaboradores.find(c => c.matricula === matricula);
      if (!colaborador) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }

      const hoje = data || new Date().toLocaleDateString('pt-BR');
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      // Verificar se já tem registro aberto
      const registroExistente = registrosPonto.find(r => 
        r.matricula === matricula && r.data === hoje && !r.saida
      );

      if (tipo === 'saida' && registroExistente) {
        // Atualizar saída
        registroExistente.saida = horaAtual;
        registroExistente.observacao = observacao || '';
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && !registroExistente) {
        // Nova entrada
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

    // ================= ROTAS DE BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = req.body;
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
      const { matricula, nome, hash } = req.body;
      const existente = biometria.find(b => b.matricula === matricula);
      if (existente) {
        existente.hash = hash;
        existente.dataCadastro = new Date().toLocaleDateString('pt-BR');
        return res.status(200).json({ sucesso: true, mensagem: 'Biometria atualizada!' });
      }
      biometria.push({
        id: Date.now(),
        matricula,
        nome,
        hash,
        dataCadastro: new Date().toLocaleDateString('pt-BR')
      });
      return res.status(200).json({ sucesso: true, mensagem: 'Biometria cadastrada!' });
    }

    // ================= ROTAS DE TROCA DE TURNOS =================
    if (acao === 'listarTrocas') {
      return res.status(200).json({ sucesso: true, dados: trocasTurno });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = req.body;
      const novaTroca = {
        id: Date.now(),
        saidaNome,
        saidaMat,
        entradaNome,
        entradaMat,
        data,
        motivo,
        observacao: observacao || ''
      };
      trocasTurno.push(novaTroca);
      return res.status(200).json({ sucesso: true, mensagem: 'Troca registrada!' });
    }

    // ================= ROTAS DE USUÁRIOS TI =================
    if (acao === 'loginTI') {
      const { usuario, senha } = req.body;
      const user = usuariosTI.find(u => u.usuario === usuario && u.senha === senha);
      if (user) {
        return res.status(200).json({ sucesso: true, tipo: user.tipo, mensagem: 'Login realizado!' });
      }
      return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const usuariosSemSenha = usuariosTI.map(({ usuario, tipo }) => ({ usuario, tipo }));
      return res.status(200).json({ sucesso: true, dados: usuariosSemSenha });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = req.body;
      if (usuariosTI.some(u => u.usuario === usuario)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      }
      usuariosTI.push({ usuario, senha, tipo });
      return res.status(200).json({ sucesso: true, mensagem: 'Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = req.body;
      if (usuario === 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: 'Não pode excluir o admin!' });
      }
      usuariosTI = usuariosTI.filter(u => u.usuario !== usuario);
      return res.status(200).json({ sucesso: true, mensagem: 'Usuário excluído!' });
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

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = req.body;
      const registrosFiltrados = registrosPonto.filter(r => {
        const partes = r.data.split('/');
        if (partes.length === 3) {
          return partes[1] == mes && partes[2] == ano;
        }
        return false;
      });
      
      const folhas = colaboradores.map(c => {
        const registrosColab = registrosFiltrados.filter(r => r.matricula === c.matricula);
        return {
          colaborador: c.nome,
          matricula: c.matricula,
          escola: c.escola,
          cargaHoraria: c.cargaHoraria,
          registros: registrosColab
        };
      });
      
      return res.status(200).json({ sucesso: true, dados: folhas, mes, ano });
    }

    // Rota padrão
    return res.status(404).json({ sucesso: false, mensagem: 'Ação não encontrada' });

  } catch (error) {
    console.error('Erro na API:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro interno no servidor', erro: error.message });
  }
}
