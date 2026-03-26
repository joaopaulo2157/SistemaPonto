// teste-db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_6ws5SJjZlPUH@ep-wandering-silence-acv1rh33-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function testar() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexão bem-sucedida!', result.rows[0]);
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
  }
}

testar();
