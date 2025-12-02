import express from 'express';
import pool from '../database.js';

const router = express.Router();

// ========== ENDPOINTS ESSENCIAIS ==========

// GET /api/estatisticas/historico-tabela - HISTÓRICO COMPLETO SIMPLIFICADO
router.get('/historico-tabela', async (req, res) => {
    try {
        const { vaga_id, periodo = 'hoje' } = req.query;
        
        console.log(`Histórico tabela - Vaga: ${vaga_id || 'todas'}, Período: ${periodo}`);
        
        // Definir intervalo SIMPLES
        let whereClause = '';
        switch (periodo) {
            case 'ontem':
                whereClause = "WHERE hev.created_at >= CURRENT_DATE - INTERVAL '1 day'";
                break;
            case '7dias':
                whereClause = "WHERE hev.created_at >= CURRENT_DATE - INTERVAL '7 days'";
                break;
            case '30dias':
                whereClause = "WHERE hev.created_at >= CURRENT_DATE - INTERVAL '30 days'";
                break;
            default: // 'hoje'
                whereClause = "WHERE hev.created_at >= CURRENT_DATE";
        }
        
        // Adicionar filtro de vaga se necessário
        if (vaga_id && vaga_id !== 'todas') {
            whereClause += ` AND hev.vaga_id = ${parseInt(vaga_id)}`;
        }
        
        // QUERY SIMPLES E EFICIENTE
        const query = `
            WITH eventos_ordenados AS (
                SELECT 
                    hev.id,
                    hev.vaga_id,
                    v.numero as numero_vaga,
                    hev.estado_anterior,
                    hev.estado_novo,
                    hev.created_at,
                    hev.tempo_ocupacao,
                    -- Agrupar eventos consecutivos da mesma vaga
                    ROW_NUMBER() OVER (PARTITION BY hev.vaga_id ORDER BY hev.created_at) as seq_num
                FROM historico_estados_vagas hev
                JOIN vagas v ON hev.vaga_id = v.id
                ${whereClause}
            ),
            -- Encontrar início das ocupações (mudança para 'ocupado')
            ocupacoes_inicio AS (
                SELECT * FROM eventos_ordenados 
                WHERE estado_novo = 'ocupado'
            ),
            -- Encontrar fim das ocupações (mudança para 'livre' após 'ocupado')
            ocupacoes_fim AS (
                SELECT 
                    eo.*,
                    oi.created_at as inicio_ocupacao
                FROM eventos_ordenados eo
                JOIN ocupacoes_inicio oi ON eo.vaga_id = oi.vaga_id 
                    AND eo.seq_num = oi.seq_num + 1
                    AND eo.estado_novo = 'livre'
            )
            -- Combinar início e fim das ocupações
            SELECT 
                oi.vaga_id,
                oi.numero_vaga,
                oi.created_at as ocupada_em,
                of.created_at as livre_em,
                COALESCE(
                    of.tempo_ocupacao,
                    EXTRACT(EPOCH FROM (of.created_at - oi.created_at)) / 60
                ) as tempo_ocupacao_minutos
            FROM ocupacoes_inicio oi
            LEFT JOIN ocupacoes_fim of ON oi.vaga_id = of.vaga_id 
                AND oi.seq_num = of.seq_num - 1
            UNION ALL
            -- Incluir ocupações ainda ativas (sem fim)
            SELECT 
                oi.vaga_id,
                oi.numero_vaga,
                oi.created_at as ocupada_em,
                NULL as livre_em,
                NULL as tempo_ocupacao_minutos
            FROM ocupacoes_inicio oi
            WHERE NOT EXISTS (
                SELECT 1 FROM ocupacoes_fim of 
                WHERE of.vaga_id = oi.vaga_id 
                AND of.seq_num = oi.seq_num + 1
            )
            ORDER BY ocupada_em DESC
            LIMIT 200
        `;
        
        const result = await pool.query(query);
        
        console.log(`Encontrados ${result.rows.length} registros históricos`);
        
        res.json(result.rows);
        
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        
        // FALLBACK: Query alternativa mais simples
        try {
            const fallbackQuery = `
                SELECT 
                    hev.vaga_id,
                    v.numero as numero_vaga,
                    hev.created_at,
                    hev.estado_novo,
                    hev.tempo_ocupacao
                FROM historico_estados_vagas hev
                JOIN vagas v ON hev.vaga_id = v.id
                ORDER BY hev.created_at DESC
                LIMIT 100
            `;
            
            const fallbackResult = await pool.query(fallbackQuery);
            
            // Formatar os dados manualmente
            const historicoFormatado = [];
            const ocupacoesAtivas = {};
            
            for (const row of fallbackResult.rows) {
                if (row.estado_novo === 'ocupado') {
                    ocupacoesAtivas[row.vaga_id] = {
                        vaga_id: row.vaga_id,
                        numero_vaga: row.numero_vaga,
                        ocupada_em: row.created_at,
                        livre_em: null,
                        tempo_ocupacao_minutos: null
                    };
                } 
                else if (row.estado_novo === 'livre' && ocupacoesAtivas[row.vaga_id]) {
                    const ocupacao = ocupacoesAtivas[row.vaga_id];
                    ocupacao.livre_em = row.created_at;
                    ocupacao.tempo_ocupacao_minutos = row.tempo_ocupacao;
                    
                    historicoFormatado.push(ocupacao);
                    delete ocupacoesAtivas[row.vaga_id];
                }
            }
            
            // Adicionar ocupações ainda ativas
            Object.values(ocupacoesAtivas).forEach(ocupacao => {
                historicoFormatado.push(ocupacao);
            });
            
            // Ordenar por data
            historicoFormatado.sort((a, b) => 
                new Date(b.ocupada_em || 0) - new Date(a.ocupada_em || 0)
            );
            
            res.json(historicoFormatado);
            
        } catch (fallbackError) {
            console.error('Erro no fallback:', fallbackError);
            res.status(500).json({ 
                error: 'Erro ao processar histórico',
                message: error.message 
            });
        }
    }
});

// ========== ENDPOINTS OPÇÕES (mantenho só o essencial) ==========

// GET /api/estatisticas/horarias - Estatísticas por hora
router.get('/horarias', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT hora, percentual_ocupacao 
            FROM estatisticas_horarias 
            WHERE data = CURRENT_DATE 
            ORDER BY hora
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro estatísticas horárias:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// GET /api/estatisticas/diarias - Estatísticas diárias (simplificado)
router.get('/diarias', async (req, res) => {
    try {
        const { dias = 7 } = req.query;
        
        const result = await pool.query(`
            SELECT 
                data,
                AVG(percentual_ocupacao) as ocupacao_media
            FROM estatisticas_horarias 
            WHERE data >= CURRENT_DATE - INTERVAL '${dias} days'
            GROUP BY data 
            ORDER BY data DESC
        `);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro estatísticas diárias:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// ========== NOVO ENDPOINT PARA TESTE RÁPIDO ==========

// GET /api/estatisticas/teste-historico - Teste simples
router.get('/teste-historico', async (req, res) => {
    try {
        console.log("Teste rápido do histórico");
        
        // 1. Primeiro, vejamos como estão os dados
        const ultimosEventos = await pool.query(`
            SELECT 
                vaga_id,
                estado_novo,
                created_at,
                tempo_ocupacao
            FROM historico_estados_vagas 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        // 2. Buscar todas as vagas
        const vagas = await pool.query('SELECT id, numero FROM vagas ORDER BY id');
        
        // 3. Buscar histórico formatado de forma MUITO simples
        const historicoSimples = await pool.query(`
            SELECT 
                hev.vaga_id,
                v.numero,
                hev.estado_novo,
                TO_CHAR(hev.created_at, 'DD/MM HH24:MI') as horario,
                hev.tempo_ocupacao
            FROM historico_estados_vagas hev
            JOIN vagas v ON hev.vaga_id = v.id
            ORDER BY hev.created_at DESC
            LIMIT 20
        `);
        
        res.json({
            debug: {
                ultimos_10_eventos: ultimosEventos.rows,
                total_vagas: vagas.rows.length,
                vagas: vagas.rows
            },
            historico_simples: historicoSimples.rows,
            sugestao: "Use os dados de 'historico_simples' para testar a tabela"
        });
        
    } catch (error) {
        console.error('Erro no teste:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;