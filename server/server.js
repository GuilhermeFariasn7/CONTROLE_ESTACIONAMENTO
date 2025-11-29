import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { iniciarMQTT, getEstado } from "./mqttHandler.js";
import fs from "fs";

// Ajustes para __dirname no ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho para a pasta public (que está na raiz do projeto, um nível acima)
const publicPath = path.join(__dirname, "..", "public");

// Verifica se a pasta public existe
if (!fs.existsSync(publicPath)) {
  console.error("ERRO: Pasta 'public' não encontrada em:", publicPath);
  console.log("Estrutura esperada:");
  console.log("CONTROLE_ESTACIONAMENTO/");
  console.log("├── public/");
  console.log("│   ├── index.html");
  console.log("│   ├── css/style.css");
  console.log("│   └── js/app.js");
  console.log("└── server/");
  console.log("    ├── server.js");
  console.log("    └── mqttHandler.js");
  process.exit(1);
}

console.log("Pasta public encontrada em:", publicPath);

// Iniciar MQTT
iniciarMQTT();

const app = express();

// Servir arquivos estáticos da pasta public (na raiz)
app.use(express.static(publicPath));

// Rota para a página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Endpoint para o front consultar o status de todas as vagas
app.get("/api/status", (req, res) => {
  try {
    const estados = getEstado();
    console.log("Enviando estados para o frontend:", estados);
    res.json(estados);
  } catch (error) {
    console.error("Erro no endpoint /api/status:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.listen(3000, () => {
  console.log("====================================");
  console.log("Dashboard disponível em http://localhost:3000");
  console.log("MQTT Server: test.mosquitto.org");
  console.log("Servindo arquivos de:", publicPath);
  console.log("====================================");
});