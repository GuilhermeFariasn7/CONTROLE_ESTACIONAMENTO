import express from 'express';
const router = express.Router();

// GET /api/usuarios - Listar usuários (futuro)
router.get('/', (req, res) => {
    res.json({ message: 'API de usuários - Em desenvolvimento' });
});

export default router;