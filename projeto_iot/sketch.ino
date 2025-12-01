#include <WiFi.h>
#include <PubSubClient.h>

// ===============================
// CONFIGURAÇÕES DE REDE
// ===============================
const char* ssid = "Wokwi-GUEST";
const char* password = "";

const char* mqttServer = "test.mosquitto.org";
int mqttPort = 1883;

// ===============================
// CONFIGURAÇÃO DAS 3 VAGAS INDEPENDENTES
// ===============================
struct VagaESP {
  String nome;
  String topico;
  int trigPin;
  int echoPin; 
  int ledVerde;
  int ledVermelho;
  bool ocupada;
  unsigned long ultimoEnvio;
  unsigned long proximaLeitura;
};

// Configura como se fossem 3 ESPs separados
VagaESP esp32[3] = {
  {
    "ESP32-VAGA01",
    "unesc/estacionamento/vaga01", 
    4, 3, 38, 39, false, 0, 0
  },
  {
    "ESP32-VAGA02", 
    "unesc/estacionamento/vaga02",
    5, 6, 40, 41, false, 0, 500
  },
  {
    "ESP32-VAGA03",
    "unesc/estacionamento/vaga03", 
    7, 8, 45, 42, false, 0, 1000
  }
};

WiFiClient espClient;
PubSubClient client(espClient);

// ===============================
// CONEXÃO WI-FI
// ===============================
void conectarWifi() {
  WiFi.begin(ssid, password);
  Serial.print("Conectando ao WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi conectado!");
  Serial.println(WiFi.localIP());
}

// ===============================
// ENVIO DE ESTADO VIA MQTT 
// ===============================
void enviarEstadoMQTT(int espIndex) {
  String payload = esp32[espIndex].ocupada ? "ocupado" : "livre";
  
  if (client.publish(esp32[espIndex].topico.c_str(), payload.c_str(), true)) {
    Serial.print("[");
    Serial.print(esp32[espIndex].nome);
    Serial.print("] MQTT enviado: ");
    Serial.println(payload);
    esp32[espIndex].ultimoEnvio = millis();
  } else {
    Serial.print("[");
    Serial.print(esp32[espIndex].nome);
    Serial.println("] ERRO ao enviar MQTT");
  }
}

// ===============================
// CONEXÃO MQTT
// ===============================
void conectarMQTT() {
  while (!client.connected()) {
    Serial.println("Conectando ao broker MQTT...");

    if (client.connect("ESP32-MULTIVAGAS")) {
      Serial.println("Conectado ao MQTT!");
      
      // Envia estado inicial de todas as "vags ESPs"
      for (int i = 0; i < 3; i++) {
        enviarEstadoMQTT(i);
        delay(100);
      }
      
    } else {
      Serial.print("Falha MQTT, estado: ");
      Serial.println(client.state());
      delay(2000);
    }
  }
}

// ===============================
// FUNÇÃO PARA MEDIR DISTÂNCIA
// ===============================
long medirDistancia(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);

  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duracao = pulseIn(echoPin, HIGH);
  long distanciaCm = duracao * 0.034 / 2;

  return distanciaCm;
}

// ===============================
// SETUP
// ===============================
void setup() {
  Serial.begin(115200);
  Serial.println("=== INICIANDO 3 ESP32 SIMULADOS ===");

  // Configura pins de todas as "ESPs"
  for (int i = 0; i < 3; i++) {
    pinMode(esp32[i].trigPin, OUTPUT);
    pinMode(esp32[i].echoPin, INPUT);
    pinMode(esp32[i].ledVerde, OUTPUT);
    pinMode(esp32[i].ledVermelho, OUTPUT);
    
    // Estado inicial dos LEDs
    digitalWrite(esp32[i].ledVerde, HIGH);
    digitalWrite(esp32[i].ledVermelho, LOW);
    
    Serial.print("Configurado: ");
    Serial.println(esp32[i].nome);
  }

  conectarWifi();
  client.setServer(mqttServer, mqttPort);
  conectarMQTT();
}

// ===============================
// LOOP PRINCIPAL - Simula 3 ESPs independentes
// ===============================
void loop() {
  if (!client.connected()) {
    conectarMQTT();
  }

  client.loop();

  // Processa cada "ESP" independentemente
  for (int i = 0; i < 3; i++) {
    // Cada ESP tem seu próprio timing de leitura
    if (millis() >= esp32[i].proximaLeitura) {
      
      // Faz a leitura do sensor
      long distancia = medirDistancia(esp32[i].trigPin, esp32[i].echoPin);
      bool novoEstado = (distancia < 15); // Menos de 15cm = ocupado

      // Só envia se o estado mudou
      if (novoEstado != esp32[i].ocupada) {
        esp32[i].ocupada = novoEstado;
        enviarEstadoMQTT(i);
        
        // Atualiza LEDs
        digitalWrite(esp32[i].ledVerde, !esp32[i].ocupada);
        digitalWrite(esp32[i].ledVermelho, esp32[i].ocupada);
        
        Serial.print("[");
        Serial.print(esp32[i].nome);
        Serial.print("] Distancia: ");
        Serial.print(distancia);
        Serial.print(" cm - ");
        Serial.println(esp32[i].ocupada ? "OCUPADA" : "LIVRE");
      }
      
      // Próxima leitura para este "ESP" (cada um tem intervalo diferente)
      esp32[i].proximaLeitura = millis() + random(800, 1200);
    }
  }

  delay(50); // Pequeno delay geral
}