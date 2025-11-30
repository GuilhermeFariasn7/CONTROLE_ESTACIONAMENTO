import pkg from 'pg';
const { Pool } = pkg;

// Configuração da conexão com PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'estacionamento_unesc',
    password: 'admin',
    port: 5432,
});

// Testar conexão
pool.on('connect', () => {
    console.log(' Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
    console.error('Erro na conexão PostgreSQL:', err);
});

export default pool;