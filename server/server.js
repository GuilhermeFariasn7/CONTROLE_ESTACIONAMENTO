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