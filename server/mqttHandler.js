import mqtt from "mqtt";
import { Vaga } from "./models/Vaga.js";

// Objeto dinâmico para armazenar estado de múltiplas vagas (mantido para compatibilidade)
let estadosVagas = {};

export function iniciarMQTT() {
    const MQTT_SERVER = "mqtt://test.mosquitto.org";
    const TOPIC_PATTERN = "unesc/estacionamento/+";

    const client = mqtt.connect(MQTT_SERVER);

    client.on("connect", () => {
        console.log(" Conectado ao broker MQTT");
        client.subscribe(TOPIC_PATTERN);
        console.log(` Inscrito no padrão: ${TOPIC_PATTERN}`);
    });

    client.on("message", async (topic, message) => {
        try {
            const estado = message.toString().toLowerCase().trim();
            const vagaNumero = topic.split('/').pop();

            console.log("NOVA MENSAGEM MQTT:");
            console.log("Topico: " + topic);
            console.log("Vaga Numero: " + vagaNumero);
            console.log("Estado: " + estado);

            // Validar estado
            if (estado !== "livre" && estado !== "ocupado") {
                console.log("Estado invalido: " + estado);
                return;
            }

            // Buscar vaga no banco
            console.log("Buscando vaga no banco: " + vagaNumero);
            const vaga = await Vaga.findByNumero(vagaNumero);

            if (!vaga) {
                console.log("VAGA NAO ENCONTRADA NO BANCO: " + vagaNumero);
                console.log("Dica: Verifique se o numero da vaga no MQTT e igual ao do banco");
                return;
            }

            console.log("VAGA ENCONTRADA:");
            console.log("ID: " + vaga.id);
            console.log("Numero: " + vaga.numero);
            console.log("Status Atual: " + vaga.status);
            console.log("Novo Status: " + estado);

            // So atualizar se o status for diferente
            if (vaga.status !== estado) {
                console.log("STATUS DIFERENTE - Atualizando...");
                await Vaga.atualizarStatus(vaga.id, estado);

                // Atualizar tambem no objeto em memoria
                estadosVagas[vagaNumero] = estado;

                console.log("SUCESSO: " + vagaNumero + " -> " + estado);
            } else {
                console.log("Status igual, ignorando: " + vagaNumero + " ja esta " + estado);
            }

        } catch (error) {
            console.error('ERRO CRITICO: ' + error.message);
        }
    });

    client.on("error", (error) => {
        console.error(" Erro MQTT:", error);
    });
}

// Retorna todos os estados das vagas (para compatibilidade)
export function getEstado() {
    return estadosVagas;
}

// Retorna estado de uma vaga específica (para compatibilidade)
export function getEstadoVaga(vagaId) {
    return estadosVagas[vagaId] || "desconhecido";
}