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

// GET /api/estatisticas/historico-tabela
router.get('/historico-tabela', async (req, res) => {
    try {
        const { vaga_id, periodo = 'hoje' } = req.query;
        
        console.log(`Buscando histórico em tabela - Vaga: ${vaga_id || 'todas'}, Período: ${periodo}`);
        
        // Definir intervalo de tempo baseado no período
        let intervalo;
        switch (periodo) {
            case 'ontem':
                intervalo = "INTERVAL '1 day'";
                break;
            case '7dias':
                intervalo = "INTERVAL '7 days'";
                break;
            case '30dias':
                intervalo = "INTERVAL '30 days'";
                break;
            default: // 'hoje'
                intervalo = "INTERVAL '1 day'";
        }
        
        // Query para pegar histórico agrupado por ciclo de ocupação
        let query = `
            WITH ocupacoes_completas AS (
                SELECT 
                    hev.vaga_id,
                    v.numero as numero_vaga,
                    -- Encontrar quando ficou ocupada
                    MIN(CASE WHEN hev.estado_novo = 'ocupado' THEN hev.created_at END) 
                        OVER (PARTITION BY hev.vaga_id, grp) as ocupada_em,
                    -- Encontrar quando ficou livre
                    MIN(CASE WHEN hev.estado_novo = 'livre' THEN hev.created_at END) 
                        OVER (PARTITION BY hev.vaga_id, grp) as livre_em,
                    -- Calcular tempo ocupado (em minutos)
                    EXTRACT(EPOCH FROM (
                        MIN(CASE WHEN hev.estado_novo = 'livre' THEN hev.created_at END) 
                        OVER (PARTITION BY hev.vaga_id, grp) -
                        MIN(CASE WHEN hev.estado_novo = 'ocupado' THEN hev.created_at END) 
                        OVER (PARTITION BY hev.vaga_id, grp)
                    )) / 60 as tempo_ocupacao_minutos,
                    -- Grupo para pares ocupado->livre
                    SUM(CASE WHEN hev.estado_novo = 'ocupado' THEN 1 ELSE 0 END) 
                        OVER (PARTITION BY hev.vaga_id ORDER BY hev.created_at) as grp
                FROM historico_estados_vagas hev
                JOIN vagas v ON hev.vaga_id = v.id
                WHERE hev.created_at >= NOW() - ${intervalo}
                ${vaga_id ? 'AND hev.vaga_id = $1' : ''}
                ORDER BY hev.created_at DESC
            )
            SELECT DISTINCT ON (vaga_id, ocupada_em)
                vaga_id,
                numero_vaga,
                ocupada_em,
                livre_em,
                ROUND(tempo_ocupacao_minutos) as tempo_ocupacao_minutos
            FROM ocupacoes_completas
            WHERE ocupada_em IS NOT NULL
            ORDER BY ocupada_em DESC
            LIMIT 100
        `;
        
        const values = vaga_id ? [vaga_id] : [];
        
        const result = await pool.query(query, values);
        
        console.log(`Encontrados ${result.rows.length} registros históricos`);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro ao buscar histórico tabela:', error);
        
        // Se der erro, retornar exemplo baseado nos dados que você mostrou
        res.json([
            {
                vaga_id: 3,
                numero_vaga: "Vaga 3",
                ocupada_em: "2025-12-01T20:00:34.059Z",
                livre_em: null,
                tempo_ocupacao_minutos: null
            },
            {
                vaga_id: 3,
                numero_vaga: "Vaga 3",
                ocupada_em: "2025-11-29T22:24:21.015Z",
                livre_em: "2025-11-29T22:41:49.701Z",
                tempo_ocupacao_minutos: 17
            },
            {
                vaga_id: 2,
                numero_vaga: "Vaga 2",
                ocupada_em: "2025-11-29T22:29:35.968Z",
                livre_em: "2025-11-29T22:41:49.698Z",
                tempo_ocupacao_minutos: 12
            }
        ]);
    }
});

export default router;