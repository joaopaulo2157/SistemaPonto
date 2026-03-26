// teste-simples.js
const { Client } = require('pg');

const client = new Client({
  host: 'ep-wandering-silence-acv1rh33-pooler.sa-east-1.aws.neon.tech',
  port: 5432,
  database: 'neondb',
  user: 'neondb_owner',
  password: 'npg_6ws5SJjZlPUH',
  ssl: { rejectUnauthorized: false }
});

async function testar() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Conectado!', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

testar();
