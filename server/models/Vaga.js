import pool from '../database.js';

export class Vaga {
    // Buscar todas as vagas
    static async findAll() {
        const result = await pool.query('SELECT * FROM vagas ORDER BY numero');
        return result.rows;
    }

    // Buscar vaga por ID
    static async findById(id) {
        const result = await pool.query('SELECT * FROM vagas WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Buscar vaga por número
    static async findByNumero(numero) {
        const result = await pool.query('SELECT * FROM vagas WHERE numero = $1', [numero]);
        return result.rows[0];
    }

    // Atualizar status da vaga
    static async atualizarStatus(vagaId, novoStatus) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Buscar estado atual
            const vagaAtual = await client.query('SELECT status FROM vagas WHERE id = $1', [vagaId]);
            const estadoAnterior = vagaAtual.rows[0]?.status;

            // Atualizar status na tabela vagas
            await client.query(
                'UPDATE vagas SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [novoStatus, vagaId]
            );

            // Registrar no histórico
            await client.query(
                'INSERT INTO historico_estados_vagas (vaga_id, estado_anterior, estado_novo) VALUES ($1, $2, $3)',
                [vagaId, estadoAnterior, novoStatus]
            );

            // Gerenciar ocupações ativas
            if (estadoAnterior === 'livre' && novoStatus === 'ocupado') {
                // Iniciar nova ocupação
                await client.query(
                    'INSERT INTO ocupacoes_ativas (vaga_id) VALUES ($1)',
                    [vagaId]
                );
            } else if (estadoAnterior === 'ocupado' && novoStatus === 'livre') {
                // Finalizar ocupação e calcular tempo
                const ocupacao = await client.query(
                    'SELECT id, inicio_ocupacao FROM ocupacoes_ativas WHERE vaga_id = $1 AND fim_ocupacao IS NULL ORDER BY inicio_ocupacao DESC LIMIT 1',
                    [vagaId]
                );

                if (ocupacao.rows[0]) {
                    const tempoOcupacao = Math.floor(
                        (new Date() - new Date(ocupacao.rows[0].inicio_ocupacao)) / (1000 * 60)
                    );

                    await client.query(
                        'UPDATE ocupacoes_ativas SET fim_ocupacao = CURRENT_TIMESTAMP, tempo_total = $1 WHERE id = $2',
                        [tempoOcupacao, ocupacao.rows[0].id]
                    );

                    // CORREÇÃO: Atualizar tempo no histórico usando subquery
                    await client.query(
                        `UPDATE historico_estados_vagas 
                         SET tempo_ocupacao = $1 
                         WHERE id = (
                             SELECT id FROM historico_estados_vagas 
                             WHERE vaga_id = $2 AND estado_novo = $3 
                             ORDER BY created_at DESC 
                             LIMIT 1
                         )`,
                        [tempoOcupacao, vagaId, novoStatus]
                    );
                }
            }

            await client.query('COMMIT');
            console.log(`Vaga ${vagaId} atualizada para: ${novoStatus}`);

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Erro ao atualizar vaga:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    // Buscar estatísticas gerais
    static async getEstatisticasGerais() {
        const result = await pool.query(`
      SELECT 
        COUNT(*) as total_vagas,
        COUNT(CASE WHEN status = 'ocupado' THEN 1 END) as vagas_ocupadas,
        COUNT(CASE WHEN status = 'livre' THEN 1 END) as vagas_livres,
        ROUND((COUNT(CASE WHEN status = 'ocupado' THEN 1 END) * 100.0 / COUNT(*)), 2) as percentual_ocupacao
      FROM vagas
      WHERE status IN ('livre', 'ocupado')
    `);
        return result.rows[0];
    }

    // Registrar snapshot de ocupação
    static async registrarSnapshot() {
        const estatisticas = await this.getEstatisticasGerais();

        await pool.query(
            'INSERT INTO snapshots_ocupacao (total_vagas, vagas_ocupadas, vagas_livres, percentual_ocupacao) VALUES ($1, $2, $3, $4)',
            [estatisticas.total_vagas, estatisticas.vagas_ocupadas, estatisticas.vagas_livres, estatisticas.percentual_ocupacao]
        );
    }
}