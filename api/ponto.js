// api/ponto.js
// Sistema de Ponto Eletrônico - Backend com Vercel Blob Storage

const { put, list, del } = require('@vercel/blob');

// ================= NOMES DOS ARQUIVOS NO BLOB =================
const ARQUIVOS = {
  ESCOLAS: 'escolas.json',
  COLABORADORES: 'colaboradores.json',
  REGISTROS: 'registros_ponto.json',
  TROCAS: 'trocas_turno.json',
  USUARIOS_TI: 'usuarios_ti.json'
};

// ================= FUNÇÕES PARA LER/ESCREVER DADOS =================
async function lerDados(nomeArquivo) {
  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === nomeArquivo);
    
    if (!blob) {
      return [];
    }
    
    const response = await fetch(blob.url);
    const dados = await response.json();
    return dados;
  } catch (error) {
    console.error(`Erro ao ler ${nomeArquivo}:`, error);
    return [];
  }
}

async function escreverDados(nomeArquivo, dados) {
  try {
    const blob = await put(nomeArquivo, JSON.stringify(dados, null, 2), {
      access: 'public',
      contentType: 'application/json'
    });
    return blob;
  } catch (error) {
    console.error(`Erro ao escrever ${nomeArquivo}:`, error);
    throw error;
  }
}

async function inicializarDados() {
  // Inicializar Escolas
  let escolas = await lerDados(ARQUIVOS.ESCOLAS);
  if (escolas.length === 0) {
    const escolasPadrao = [
      { id: 1, nome: "CENTRO INFANTIL VEREADOR EVANDRO CARI", endereco: "", telefone: "" },
      { id: 2, nome: "EMEIF AUDALIO MACIANO DA SILVA", endereco: "", telefone: "" },
      { id: 3, nome: "EMEIF FREI DAMIAO", endereco: "", telefone: "" },
      { id: 4, nome: "EMEIF SANTA ANA", endereco: "", telefone: "" },
      { id: 5, nome: "EMEIF JOAO VIEIRA GOMES", endereco: "", telefone: "" },
      { id: 6, nome: "EMEIF PEDRO FRANCISCO DAS CHAGAS", endereco: "", telefone: "" },
      { id: 7, nome: "EMEIF MANOEL VIEIRA GADI", endereco: "", telefone: "" }
    ];
    await escreverDados(ARQUIVOS.ESCOLAS, escolasPadrao);
    escolas = escolasPadrao;
  }
  
  // Inicializar Colaboradores
  let colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
  if (colaboradores.length === 0) {
    const colaboradoresPadrao = [
      { 
        id: 1, 
        nome: "João Paulo", 
        email: "joaopaulo2009@gmail.com", 
        senha: "2026", 
        matricula: "1001", 
        cargo: "Professor", 
        departamento: "Ensino", 
        escolaId: 1, 
        escola: "CENTRO INFANTIL VEREADOR EVANDRO CARI",
        cargaHoraria: 160, 
        hashFacial: null, 
        status: "Ativo" 
      }
    ];
    await escreverDados(ARQUIVOS.COLABORADORES, colaboradoresPadrao);
    colaboradores = colaboradoresPadrao;
  }
  
  // Inicializar Registros
  let registros = await lerDados(ARQUIVOS.REGISTROS);
  if (registros.length === 0) {
    await escreverDados(ARQUIVOS.REGISTROS, []);
  }
  
  // Inicializar Trocas
  let trocas = await lerDados(ARQUIVOS.TROCAS);
  if (trocas.length === 0) {
    await escreverDados(ARQUIVOS.TROCAS, []);
  }
  
  // Inicializar Usuários TI
  let usuariosTI = await lerDados(ARQUIVOS.USUARIOS_TI);
  if (usuariosTI.length === 0) {
    const usuariosPadrao = [
      { id: 1, usuario: "admin", senha: "ti@2024", tipo: "Master" }
    ];
    await escreverDados(ARQUIVOS.USUARIOS_TI, usuariosPadrao);
  }
  
  console.log('✅ Dados inicializados com sucesso!');
}

// ================= FUNÇÕES CORS =================
function setCorsHeaders(res, origin) {
  const allowedOrigins = [
    'https://sistema-ponto-seven.vercel.app',
    'http://localhost:3000',
    'https://ponto-app.vercel.app'
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

  // Inicializar dados
  await inicializarDados();

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
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      return res.status(200).json({ sucesso: true, dados: escolas });
    }

    if (acao === 'adicionarEscola') {
      const { nome, endereco, telefone } = dados;
      if (!nome) {
        return res.status(400).json({ sucesso: false, mensagem: 'Nome é obrigatório!' });
      }
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      const novoId = Date.now();
      const novaEscola = { id: novoId, nome, endereco: endereco || '', telefone: telefone || '' };
      escolas.push(novaEscola);
      await escreverDados(ARQUIVOS.ESCOLAS, escolas);
      return res.status(200).json({ sucesso: true, mensagem: 'Escola adicionada!', dados: novaEscola });
    }

    if (acao === 'editarEscola') {
      const { id, nome, endereco, telefone } = dados;
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      const index = escolas.findIndex(e => e.id == id);
      if (index === -1) {
        return res.status(404).json({ sucesso: false, mensagem: 'Escola não encontrada!' });
      }
      escolas[index] = { ...escolas[index], nome, endereco, telefone };
      await escreverDados(ARQUIVOS.ESCOLAS, escolas);
      return res.status(200).json({ sucesso: true, mensagem: 'Escola editada!' });
    }

    if (acao === 'excluirEscola') {
      const { id } = dados;
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      const novasEscolas = escolas.filter(e => e.id != id);
      await escreverDados(ARQUIVOS.ESCOLAS, novasEscolas);
      return res.status(200).json({ sucesso: true, mensagem: 'Escola excluída!' });
    }

    // ================= CRUD COLABORADORES =================
    if (acao === 'listarColaboradores') {
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      return res.status(200).json({ sucesso: true, dados: colaboradores });
    }

    if (acao === 'adicionarColaborador') {
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dados;
      
      if (!nome || !email || !senha || !matricula || !escola) {
        return res.status(400).json({ sucesso: false, mensagem: 'Preencha todos os campos!' });
      }
      
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      
      // Verificar matrícula duplicada
      if (colaboradores.some(c => c.matricula === matricula)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Matrícula já existe!' });
      }
      
      // Verificar email duplicado
      if (colaboradores.some(c => c.email === email)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Email já existe!' });
      }
      
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      const escolaObj = escolas.find(e => e.nome === escola);
      const escolaId = escolaObj ? escolaObj.id : null;
      
      const novoId = Date.now();
      const novoColaborador = {
        id: novoId,
        nome,
        email,
        senha,
        matricula,
        cargo: cargo || '',
        departamento: departamento || '',
        escolaId,
        escola,
        cargaHoraria: cargaHoraria || 160,
        hashFacial: null,
        status: 'Ativo'
      };
      
      colaboradores.push(novoColaborador);
      await escreverDados(ARQUIVOS.COLABORADORES, colaboradores);
      
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador adicionado!', dados: novoColaborador });
    }

    if (acao === 'editarColaborador') {
      const { id, dadosColab } = dados;
      const { nome, email, senha, matricula, cargo, departamento, escola, cargaHoraria } = dadosColab;
      
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const index = colaboradores.findIndex(c => c.id == id);
      if (index === -1) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }
      
      // Verificar matrícula duplicada (exceto o próprio)
      if (colaboradores.some(c => c.matricula === matricula && c.id != id)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Matrícula já existe para outro colaborador!' });
      }
      
      // Verificar email duplicado (exceto o próprio)
      if (colaboradores.some(c => c.email === email && c.id != id)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Email já existe para outro colaborador!' });
      }
      
      const escolas = await lerDados(ARQUIVOS.ESCOLAS);
      const escolaObj = escolas.find(e => e.nome === escola);
      const escolaId = escolaObj ? escolaObj.id : null;
      
      colaboradores[index] = {
        ...colaboradores[index],
        nome,
        email,
        senha,
        matricula,
        cargo: cargo || '',
        departamento: departamento || '',
        escolaId,
        escola,
        cargaHoraria: cargaHoraria || 160
      };
      
      await escreverDados(ARQUIVOS.COLABORADORES, colaboradores);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador editado!' });
    }

    if (acao === 'excluirColaborador') {
      const { id } = dados;
      let colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      colaboradores = colaboradores.filter(c => c.id != id);
      await escreverDados(ARQUIVOS.COLABORADORES, colaboradores);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Colaborador excluído!' });
    }

    if (acao === 'loginColaborador') {
      const { email, senha } = dados;
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const colaborador = colaboradores.find(c => c.email === email && c.senha === senha && c.status === 'Ativo');
      
      if (!colaborador) {
        return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha incorretos!' });
      }
      
      return res.status(200).json({ sucesso: true, dados: colaborador });
    }

    // ================= REGISTROS DE PONTO =================
    if (acao === 'listarRegistros') {
      const registros = await lerDados(ARQUIVOS.REGISTROS);
      const registrosOrdenados = [...registros].reverse().slice(0, 100);
      return res.status(200).json({ sucesso: true, dados: registrosOrdenados });
    }

    if (acao === 'registrarPonto') {
      const { matricula, tipo, observacao, data, hora, origem } = dados;
      
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const colaborador = colaboradores.find(c => c.matricula === matricula);
      
      if (!colaborador) {
        return res.status(404).json({ sucesso: false, mensagem: 'Colaborador não encontrado!' });
      }
      
      const hoje = data || new Date().toISOString().split('T')[0];
      const hojeFormatado = hoje.split('-').reverse().join('/');
      const horaAtual = hora || new Date().toLocaleTimeString('pt-BR');
      
      let registros = await lerDados(ARQUIVOS.REGISTROS);
      
      // Verificar se já tem registro aberto
      const registroExistente = registros.find(r => 
        r.matricula === matricula && r.data === hojeFormatado && !r.saida
      );
      
      if (tipo === 'saida' && registroExistente) {
        // Atualizar saída
        registroExistente.saida = horaAtual;
        registroExistente.observacao = observacao || '';
        await escreverDados(ARQUIVOS.REGISTROS, registros);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Saída registrada!', tipo: 'saida' });
      } 
      else if (tipo === 'entrada' && !registroExistente) {
        // Nova entrada
        const novoRegistro = {
          id: Date.now(),
          colaboradorId: colaborador.id,
          matricula: colaborador.matricula,
          nome: colaborador.nome,
          escola: colaborador.escola,
          data: hojeFormatado,
          entrada: horaAtual,
          saida: null,
          tipo: origem || 'Facial',
          observacao: observacao || ''
        };
        registros.push(novoRegistro);
        await escreverDados(ARQUIVOS.REGISTROS, registros);
        return res.status(200).json({ sucesso: true, mensagem: '✅ Entrada registrada!', tipo: 'entrada' });
      }
      
      return res.status(400).json({ sucesso: false, mensagem: 'Operação inválida!' });
    }

    // ================= BIOMETRIA =================
    if (acao === 'verificarBiometria') {
      const { hash } = dados;
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const encontrado = colaboradores.find(c => c.hashFacial === hash);
      if (encontrado) {
        return res.status(200).json({ 
          sucesso: true, 
          colaborador: { 
            matricula: encontrado.matricula, 
            nome: encontrado.nome,
            id: encontrado.id
          }
        });
      }
      return res.status(200).json({ sucesso: false });
    }

    if (acao === 'cadastrarBiometria') {
      const { matricula, nome, hash } = dados;
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const index = colaboradores.findIndex(c => c.matricula === matricula);
      if (index !== -1) {
        colaboradores[index].hashFacial = hash;
        await escreverDados(ARQUIVOS.COLABORADORES, colaboradores);
      }
      return res.status(200).json({ sucesso: true, mensagem: '✅ Biometria cadastrada!' });
    }

    // ================= TROCAS =================
    if (acao === 'listarTrocas') {
      const trocas = await lerDados(ARQUIVOS.TROCAS);
      const trocasOrdenadas = [...trocas].reverse().slice(0, 50);
      return res.status(200).json({ sucesso: true, dados: trocasOrdenadas });
    }

    if (acao === 'registrarTroca') {
      const { saidaMat, saidaNome, entradaMat, entradaNome, data, motivo, observacao } = dados;
      
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const saida = colaboradores.find(c => c.matricula === saidaMat);
      const entrada = colaboradores.find(c => c.matricula === entradaMat);
      
      const trocas = await lerDados(ARQUIVOS.TROCAS);
      const novaTroca = {
        id: Date.now(),
        colaboradorSaidaId: saida?.id,
        colaboradorSaidaNome: saidaNome,
        colaboradorEntradaId: entrada?.id,
        colaboradorEntradaNome: entradaNome,
        data,
        motivo,
        observacao: observacao || '',
        status: 'Pendente'
      };
      trocas.push(novaTroca);
      await escreverDados(ARQUIVOS.TROCAS, trocas);
      
      return res.status(200).json({ sucesso: true, mensagem: '🔄 Troca registrada!' });
    }

    // ================= USUÁRIOS TI =================
    if (acao === 'loginTI') {
      const { usuario, senha } = dados;
      const usuariosTI = await lerDados(ARQUIVOS.USUARIOS_TI);
      const user = usuariosTI.find(u => u.usuario === usuario && u.senha === senha);
      if (user) {
        return res.status(200).json({ sucesso: true, tipo: user.tipo, mensagem: '✅ Login realizado!' });
      }
      return res.status(401).json({ sucesso: false, mensagem: '❌ Usuário ou senha incorretos!' });
    }

    if (acao === 'listarUsuariosTI') {
      const usuariosTI = await lerDados(ARQUIVOS.USUARIOS_TI);
      const usuariosSemSenha = usuariosTI.map(({ id, usuario, tipo }) => ({ id, usuario, tipo }));
      return res.status(200).json({ sucesso: true, dados: usuariosSemSenha });
    }

    if (acao === 'adicionarUsuarioTI') {
      const { usuario, senha, tipo } = dados;
      const usuariosTI = await lerDados(ARQUIVOS.USUARIOS_TI);
      if (usuariosTI.some(u => u.usuario === usuario)) {
        return res.status(400).json({ sucesso: false, mensagem: 'Usuário já existe!' });
      }
      const novoId = Date.now();
      usuariosTI.push({ id: novoId, usuario, senha, tipo: tipo || 'Comum' });
      await escreverDados(ARQUIVOS.USUARIOS_TI, usuariosTI);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário adicionado!' });
    }

    if (acao === 'excluirUsuarioTI') {
      const { usuario } = dados;
      if (usuario === 'admin') {
        return res.status(400).json({ sucesso: false, mensagem: '⚠️ Não pode excluir o admin!' });
      }
      let usuariosTI = await lerDados(ARQUIVOS.USUARIOS_TI);
      usuariosTI = usuariosTI.filter(u => u.usuario !== usuario);
      await escreverDados(ARQUIVOS.USUARIOS_TI, usuariosTI);
      return res.status(200).json({ sucesso: true, mensagem: '✅ Usuário excluído!' });
    }

    // ================= ESTATÍSTICAS =================
    if (acao === 'estatisticas') {
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const registros = await lerDados(ARQUIVOS.REGISTROS);
      const hoje = new Date().toLocaleDateString('pt-BR');
      const registrosHoje = registros.filter(r => r.data === hoje).length;
      return res.status(200).json({
        sucesso: true,
        totalColaboradores: colaboradores.length,
        registrosHoje: registrosHoje
      });
    }

    // ================= FOLHA DE PONTO =================
    if (acao === 'gerarFolhaPonto') {
      const { mes, ano } = dados;
      const registros = await lerDados(ARQUIVOS.REGISTROS);
      
      const registrosFiltrados = registros.filter(r => {
        const partes = r.data.split('/');
        if (partes.length === 3) {
          const mesReg = parseInt(partes[1]);
          const anoReg = parseInt(partes[2]);
          return mesReg == mes && anoReg == ano;
        }
        return false;
      });
      
      const colaboradores = await lerDados(ARQUIVOS.COLABORADORES);
      const folhas = colaboradores.map(c => {
        const registrosColab = registrosFiltrados.filter(r => r.matricula === c.matricula);
        return {
          colaborador: c.nome,
          matricula: c.matricula,
          escola: c.escola,
          cargo: c.cargo,
          cargaHoraria: c.cargaHoraria,
          registros: registrosColab
        };
      }).filter(f => f.registros.length > 0);
      
      return res.status(200).json({ sucesso: true, dados: folhas, mes, ano });
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
