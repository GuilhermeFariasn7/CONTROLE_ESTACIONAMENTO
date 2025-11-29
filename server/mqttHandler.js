import mqtt from "mqtt";

// Objeto dinâmico para armazenar estado de múltiplas vagas
let estadosVagas = {};

export function iniciarMQTT() {
  const MQTT_SERVER = "mqtt://test.mosquitto.org";
  
  // Tópico dinâmico - escuta todas as vagas que começam com "unesc/estacionamento/"
  const TOPIC_PATTERN = "unesc/estacionamento/+";

  const client = mqtt.connect(MQTT_SERVER);

  client.on("connect", () => {
    console.log("Conectado ao broker MQTT");
    client.subscribe(TOPIC_PATTERN);
    console.log(`Inscrito no padrão: ${TOPIC_PATTERN}`);
  });

  client.on("message", (topic, message) => {
    const estado = message.toString().toLowerCase().trim();
    const vagaId = topic.split('/').pop(); // Extrai o nome da vaga do tópico
    
    console.log(`Mensagem recebida - Tópico: ${topic}, Vaga: ${vagaId}, Estado: ${estado}`);
    
    // Valida se o estado é válido
    if (estado === "livre" || estado === "ocupado") {
      estadosVagas[vagaId] = estado;
      console.log(`Vaga ${vagaId} atualizada para: ${estado}`);
    } else {
      console.log(`Estado inválido recebido para ${vagaId}: ${estado}`);
    }
  });

  client.on("error", (error) => {
    console.error("Erro MQTT:", error);
  });
}

// Retorna todos os estados das vagas
export function getEstado() {
  return estadosVagas;
}

// Retorna estado de uma vaga específica
export function getEstadoVaga(vagaId) {
  return estadosVagas[vagaId] || "desconhecido";
}