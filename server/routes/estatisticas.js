import express from 'express';
import pool from '../database.js';

const router = express.Router();

// GET /api/estatisticas/horarias - Estatísticas por hora
router.get('/horarias', async (req, res) => {
    try {
        const { data } = req.query;
        const query = data
            ? 'SELECT * FROM estatisticas_horarias WHERE data = $1 ORDER BY hora'
            : 'SELECT * FROM estatisticas_horarias WHERE data = CURRENT_DATE ORDER BY hora';

        const values = data ? [data] : [];

        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas horárias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/estatisticas/diarias - Estatísticas diárias
router.get('/diarias', async (req, res) => {
    try {
        const { dias = 7 } = req.query;

        const result = await pool.query(`
      SELECT 
        data,
        AVG(percentual_ocupacao) as ocupacao_media,
        MAX(percentual_ocupacao) as ocupacao_maxima,
        MIN(percentual_ocupacao) as ocupacao_minima
      FROM estatisticas_horarias 
      WHERE data >= CURRENT_DATE - INTERVAL '${dias} days'
      GROUP BY data 
      ORDER BY data DESC
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar estatísticas diárias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/estatisticas/vagas-populares - Vagas mais ocupadas
router.get('/vagas-populares', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        v.numero,
        v.localizacao,
        COUNT(hev.id) as total_mudancas,
        ROUND(AVG(hev.tempo_ocupacao), 2) as tempo_medio_ocupacao
      FROM vagas v
      LEFT JOIN historico_estados_vagas hev ON v.id = hev.vaga_id
      WHERE hev.estado_novo = 'livre' AND hev.tempo_ocupacao IS NOT NULL
      GROUP BY v.id, v.numero, v.localizacao
      ORDER BY total_mudancas DESC
      LIMIT 10
    `);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar vagas populares:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});



export default router;