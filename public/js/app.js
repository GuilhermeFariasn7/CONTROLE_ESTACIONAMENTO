// Array dinâmico de vagas - será preenchido automaticamente
let vagasConfig = [];

// Configurações de estilo das vagas
const configVagas = {
    formato: 'quadrado', // 'circulo' ou 'quadrado'
    tamanho: '15px',     // Tamanho base
    fontSize: '7px',    // Tamanho do texto
    borderRadius: '4px'  // Cantos arredondados (0px para quadrado perfeito)
};

// Configurações do layout do mapa
const configMapa = {
    curvatura: 30, // px de curvatura que você mencionou
    startLeft: 140,
    startTop: 25,
    espacamentoHorizontal: 17,
    espacamentoVertical: 20 // Espaço entre linhas
};

// Inicializar vagas no mapa baseado nos dados do servidor
function inicializarVagas(estados) {
    const mapaContainer = document.getElementById('mapaContainer');

    // Limpa vagas existentes
    const vagasExistentes = mapaContainer.querySelectorAll('.vaga');
    vagasExistentes.forEach(vaga => vaga.remove());

    // Ordena as vagas pelo número para ficar organizado
    const vagasOrdenadas = Object.keys(estados).sort((a, b) => {
        const numA = parseInt(a.replace('vaga', ''));
        const numB = parseInt(b.replace('vaga', ''));
        return numA - numB;
    });

    // Calcula posições dinamicamente baseado no número de vagas
    vagasConfig = vagasOrdenadas.map((vagaId, index) => {
        const totalVagas = vagasOrdenadas.length;
        
        let posicao;
        const colunas = 3; // Número de colunas fixo

        // Calcula linha e coluna
        const linha = Math.floor(index / colunas);
        const coluna = index % colunas;

        // Aplica curvatura progressiva baseada na linha
        // Quanto mais para baixo, mais ajuste na horizontal para acompanhar a curvatura
        const ajusteCurvatura = (linha * configMapa.curvatura) / 10; // Ajuste progressivo
        
        // Para linhas pares, ajusta para a direita, para ímpares para a esquerda
        // Isso cria um efeito de "curva" natural
        const ajusteHorizontal = linha % 2 === 0 ? ajusteCurvatura : -ajusteCurvatura;

        posicao = {
            top: `${configMapa.startTop + (linha * configMapa.espacamentoVertical)}px`,
            left: `${configMapa.startLeft + (coluna * configMapa.espacamentoHorizontal) + ajusteHorizontal}px`
        };

        return {
            id: vagaId,
            top: posicao.top,
            left: posicao.left,
            numero: vagaId.replace('vaga', '')
        };
    });

    // Cria os elementos das vagas no mapa
    vagasConfig.forEach(vaga => {
        const vagaElement = document.createElement('div');
        vagaElement.id = vaga.id;
        vagaElement.className = `vaga ${estados[vaga.id] || 'desconhecido'}`;
        
        // Aplica as posições
        vagaElement.style.top = vaga.top;
        vagaElement.style.left = vaga.left;
        
        // Aplica o estilo customizado
        vagaElement.style.width = configVagas.tamanho;
        vagaElement.style.height = configVagas.tamanho;
        vagaElement.style.fontSize = configVagas.fontSize;
        vagaElement.style.borderRadius = configVagas.borderRadius;
        
        vagaElement.innerHTML = `
            ${vaga.numero}
            <div class="vaga-tooltip">Vaga ${vaga.numero}</div>
        `;

        // Adicionar evento de clique
        vagaElement.addEventListener('click', () => {
            const status = vagaElement.classList.contains('livre') ? 'LIVRE' :
                vagaElement.classList.contains('ocupado') ? 'OCUPADA' : 'INDISPONÍVEL';
            alert(`Vaga ${vaga.numero} - Status: ${status}`);
        });

        mapaContainer.appendChild(vagaElement);
    });

    console.log(`Vagas posicionadas: ${vagasConfig.length} vagas com curvatura ajustada`);
}

// Atualizar status de todas as vagas
async function atualizarStatus() {
    try {
        const response = await fetch("/api/status");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dados recebidos do servidor:", data);

        // Se for a primeira vez ou se novas vagas foram adicionadas, inicializa
        if (Object.keys(data).length !== vagasConfig.length) {
            inicializarVagas(data);
        }

        // Atualizar cada vaga individualmente
        Object.keys(data).forEach(vagaId => {
            const estado = data[vagaId];
            const vagaElement = document.getElementById(vagaId);

            if (vagaElement) {
                console.log(`Atualizando ${vagaId} para: ${estado}`);

                // Remove classes antigas
                vagaElement.classList.remove("livre", "ocupado", "desconhecido");
                // Adiciona nova classe
                vagaElement.classList.add(estado);
            }
        });

        // Atualizar contadores
        atualizarContadores(data);

        // Atualizar horário
        document.getElementById("ultimaAtualizacao").textContent =
            new Date().toLocaleTimeString('pt-BR');

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        document.getElementById('statusBox').textContent = 'Erro de conexão';
        document.getElementById('statusBox').className = 'status-box status-desconhecido';
    }
}

// Atualizar contadores de vagas livres e ocupadas
function atualizarContadores(data) {
    let ocupadas = 0;
    let livres = 0;
    const totalVagas = Object.keys(data).length;

    Object.values(data).forEach(estado => {
        if (estado === 'ocupado') {
            ocupadas++;
        } else if (estado === 'livre') {
            livres++;
        }
    });

    document.getElementById('ocupadas').textContent = ocupadas;
    document.getElementById('livres').textContent = livres;
    document.getElementById('totalVagas').textContent = totalVagas;

    // Atualizar status geral
    const statusBox = document.getElementById('statusBox');
    statusBox.classList.remove('status-livre', 'status-ocupado', 'status-desconhecido');

    if (ocupadas === 0 && livres > 0) {
        statusBox.textContent = 'Todas Livres';
        statusBox.classList.add('status-livre');
    } else if (livres === 0 && ocupadas > 0) {
        statusBox.textContent = 'Todas Ocupadas';
        statusBox.classList.add('status-ocupado');
    } else if (livres > 0 && ocupadas > 0) {
        statusBox.textContent = 'Parcialmente Ocupado';
        statusBox.classList.add('status-ocupado');
    } else {
        statusBox.textContent = 'Indisponível';
        statusBox.classList.add('status-desconhecido');
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard inicializado");
    atualizarStatus();

    // Atualizar a cada 2 segundos
    setInterval(atualizarStatus, 2000);
});