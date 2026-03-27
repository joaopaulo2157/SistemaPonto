// api/ponto-simples.js
// Versão simplificada - funciona sem banco de dados

// Dados em memória (persistem apenas durante a requisição)
let dadosMemoria = {
  escolas: [
    { id: 1, nome: "CENTRO INFANTIL VEREADOR EVANDRO CARI" },
    { id: 2, nome: "EMEIF AUDALIO MACIANO DA SILVA" },
    { id: 3, nome: "EMEIF FREI DAMIAO" },
    { id: 4, nome: "EMEIF SANTA ANA" },
    { id: 5, nome: "EMEIF JOAO VIEIRA GOMES" },
    { id: 6, nome: "EMEIF PEDRO FRANCISCO DAS CHAGAS" },
    { id: 7, nome: "EMEIF MANOEL VIEIRA GADI" }
  ],
  colaboradores: [
    { id: 1, nome: "João Paulo", email: "joaopaulo2009@gmail.com", senha: "2026", matricula: "1001", escola: "CENTRO INFANTIL VEREADOR EVANDRO CARI" }
  ],
  usuariosTI: [
    { id: 1, usuario: "admin", senha: "ti@2024", tipo: "Master" }
  ]
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      sucesso: true,
      mensagem: 'API Simplificada - Modo de Emergência',
      versao: 'emergencia-1.0',
      endpoints: [
        'POST ?acao=listarEscolas',
        'POST ?acao=listarColaboradores',
        'POST ?acao=loginColaborador',
        'POST ?acao=loginTI'
      ]
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ sucesso: false, mensagem: 'Use POST' });
  }

  const { acao } = req.query;
  const body = req.body;

  try {
    if (acao === 'listarEscolas') {
      return res.status(200).json({ sucesso: true, dados: dadosMemoria.escolas });
    }

    if (acao === 'listarColaboradores') {
      return res.status(200).json({ sucesso: true, dados: dadosMemoria.colaboradores });
    }

    if (acao === 'loginColaborador') {
      const { email, senha } = body;
      const colaborador = dadosMemoria.colaboradores.find(c => c.email === email && c.senha === senha);
      if (!colaborador) {
        return res.status(401).json({ sucesso: false, mensagem: 'Email ou senha incorretos!' });
      }
      return res.status(200).json({ sucesso: true, dados: colaborador });
    }

    if (acao === 'loginTI') {
      const { usuario, senha } = body;
      const user = dadosMemoria.usuariosTI.find(u => u.usuario === usuario && u.senha === senha);
      if (!user) {
        return res.status(401).json({ sucesso: false, mensagem: 'Usuário ou senha incorretos!' });
      }
      return res.status(200).json({ sucesso: true, tipo: user.tipo });
    }

    return res.status(404).json({ sucesso: false, mensagem: `Ação '${acao}' não encontrada` });

  } catch (error) {
    return res.status(500).json({ sucesso: false, mensagem: error.message });
  }
};
