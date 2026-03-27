// api/teste.js
// API de Diagnóstico - Para testar a conexão

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const resultados = {
    status: 'iniciando',
    timestamp: new Date().toISOString(),
    ambiente: {
      node_version: process.version,
      platform: process.platform,
      env_vars: {
        DATABASE_URL: process.env.DATABASE_URL ? '✅ configurada' : '❌ não configurada',
        NODE_ENV: process.env.NODE_ENV || 'não definido'
      }
    }
  };

  // Teste 1: Verificar se DATABASE_URL existe
  if (!process.env.DATABASE_URL) {
    resultados.erro = 'DATABASE_URL não configurada';
    resultados.solucao = 'Adicione DATABASE_URL nas variáveis de ambiente do Vercel';
    return res.status(200).json(resultados);
  }

  resultados.database_url = process.env.DATABASE_URL.substring(0, 50) + '...';

  // Teste 2: Tentar conectar com o banco
  try {
    const { Pool } = require('pg');
    
    resultados.pg_importado = '✅ pg importado com sucesso';
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    resultados.conexao_tentando = 'Tentando conectar...';
    
    const client = await pool.connect();
    resultados.conexao = '✅ Conectado com sucesso!';
    
    const result = await client.query('SELECT NOW() as agora, version() as versao');
    resultados.consulta = '✅ Query executada';
    resultados.agora = result.rows[0].agora;
    resultados.versao_postgres = result.rows[0].versao;
    
    // Teste 3: Listar tabelas
    const tabelas = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    resultados.tabelas = tabelas.rows.map(t => t.table_name);
    
    client.release();
    resultados.status = '✅ Tudo funcionando!';
    
  } catch (error) {
    resultados.erro = error.message;
    resultados.stack = error.stack;
    resultados.status = '❌ Falha na conexão';
    
    // Análise do erro
    if (error.message.includes('password')) {
      resultados.diagnostico = 'Erro de senha - verifique se a senha está correta';
    } else if (error.message.includes('timeout')) {
      resultados.diagnostico = 'Timeout de conexão - verifique se o banco está acessível';
    } else if (error.message.includes('ECONNREFUSED')) {
      resultados.diagnostico = 'Conexão recusada - verifique o host e porta';
    } else if (error.message.includes('does not exist')) {
      resultados.diagnostico = 'Banco de dados não existe';
    } else {
      resultados.diagnostico = 'Erro desconhecido - verifique a string de conexão';
    }
  }

  return res.status(200).json(resultados);
};
