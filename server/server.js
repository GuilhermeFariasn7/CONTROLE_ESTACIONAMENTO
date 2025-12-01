import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { iniciarMQTT } from "./mqttHandler.js";
import fs from "fs";

// Importar rotas
import vagasRoutes from "./routes/vagas.js";
import usuariosRoutes from "./routes/usuarios.js";
import estatisticasRoutes from "./routes/estatisticas.js";

// Ajustes para __dirname no ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para a pasta public
const publicPath = path.join(__dirname, "..", "public");

// Verifica se a pasta public existe
if (!fs.existsSync(publicPath)) {
    console.error("ERRO: Pasta 'public' não encontrada em:", publicPath);
    process.exit(1);
}

console.log("Pasta public encontrada em:", publicPath);

const app = express();

// Middleware para parsing JSON
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static(publicPath));

// Rotas da API
app.use("/api/vagas", vagasRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/estatisticas", estatisticasRoutes);

// Rota para a página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
});

// Endpoint para o front consultar o status de todas as vagas (mantido para compatibilidade)
app.get("/api/status", async (req, res) => {
    try {
        const { Vaga } = await import('./models/Vaga.js');
        const vagas = await Vaga.findAll();

        const estados = {};
        vagas.forEach(vaga => {
            estados[vaga.numero] = vaga.status;
        });

        console.log("Enviando estados para o frontend:", estados);
        res.json(estados);
    } catch (error) {
        console.error("Erro no endpoint /api/status:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Iniciar MQTT após garantir que o servidor está rodando
app.listen(3000, async () => {
    console.log("====================================");
    console.log(" Dashboard disponível em http://localhost:3000");
    console.log(" API REST rodando na porta 3000");
    console.log(" PostgreSQL conectado");
    console.log(" Iniciando MQTT...");
    console.log("====================================");

    // Iniciar MQTT
    iniciarMQTT();
});

// ========== ROTAS PARA ESTATÍSTICAS ==========

// Rota para estatísticas gerais
app.get('/api/estatisticas', async (req, res) => {
    try {
        const { Vaga } = await import('./models/Vaga.js');
        const estatisticas = await Vaga.getEstatisticasGerais();
        
        console.log("Estatísticas enviadas:", estatisticas);
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar estatísticas',
            details: error.message 
        });
    }
});

/* // Rota para histórico de ocupação
app.get('/api/historico-ocupacao', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM snapshots_ocupacao 
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            ORDER BY timestamp ASC
            LIMIT 50
        `);
        
        console.log(`Histórico enviado: ${result.rows.length} registros`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar histórico:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar histórico',
            details: error.message 
        });
    }
}); */

// Rota para tempo médio de ocupação por vaga
app.get('/api/tempo-medio-ocupacao', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                v.numero,
                ROUND(AVG(o.tempo_total), 2) as tempo_medio_minutos,
                COUNT(o.id) as total_ocupacoes
            FROM ocupacoes_ativas o
            JOIN vagas v ON o.vaga_id = v.id
            WHERE o.tempo_total IS NOT NULL 
            AND o.tempo_total > 0
            GROUP BY v.numero
            ORDER BY v.numero
        `);
        
        console.log(`Tempo médio enviado: ${result.rows.length} vagas`);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar tempo médio:', error);
        res.status(500).json({ 
            error: 'Erro ao carregar tempo médio',
            details: error.message 
        });
    }
});

// Rota alternativa caso a tabela snapshots_ocupacao não exista
app.get('/api/historico-simples', async (req, res) => {
    try {
        // Histórico simulado baseado nas vagas atuais
        const { Vaga } = await import('./models/Vaga.js');
        const estatisticas = await Vaga.getEstatisticasGerais();
        
        const historico = [
            {
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                percentual_ocupacao: Math.max(0, (estatisticas.percentual_ocupacao || 0) - 10)
            },
            {
                timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                percentual_ocupacao: estatisticas.percentual_ocupacao || 0
            },
            {
                timestamp: new Date().toISOString(),
                percentual_ocupacao: estatisticas.percentual_ocupacao || 0
            }
        ];
        
        res.json(historico);
    } catch (error) {
        console.error('Erro ao criar histórico simples:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para debug das vagas
app.get("/api/debug-vagas", async (req, res) => {
  try {
    const { Vaga } = await import('./models/Vaga.js');
    const vagas = await Vaga.findAll();
    
    console.log("=== DEBUG VAGAS NO BANCO ===");
    vagas.forEach(vaga => {
      console.log(`Vaga: ${vaga.numero} | ID: ${vaga.id} | Status: ${vaga.status}`);
    });
    console.log("=============================");
    
    res.json({
      total: vagas.length,
      vagas: vagas
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});