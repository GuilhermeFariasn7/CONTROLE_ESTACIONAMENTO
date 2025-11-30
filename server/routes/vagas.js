import express from 'express';
import { Vaga } from '../models/Vaga.js';

const router = express.Router();

// GET /api/vagas - Listar todas as vagas
router.get('/', async (req, res) => {
    try {
        const vagas = await Vaga.findAll();
        res.json(vagas);
    } catch (error) {
        console.error('Erro ao buscar vagas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/vagas/estatisticas - Estatísticas gerais
router.get('/estatisticas', async (req, res) => {
    try {
        const estatisticas = await Vaga.getEstatisticasGerais();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/vagas/:id/status - Atualizar status de uma vaga
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['livre', 'ocupado'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido. Use "livre" ou "ocupado"' });
        }

        await Vaga.atualizarStatus(parseInt(id), status);
        res.json({ message: `Status da vaga ${id} atualizado para ${status}` });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

export default router;