// Array dinâmico de vagas - será preenchido automaticamente
let vagasConfig = [];
let intervaloAtualizacao = null;

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
    startLeft: 138,
    startTop: 25,
    espacamentoHorizontal: 17,
    espacamentoVertical: 20 // Espaço entre linhas
};

// Inicializar vagas no mapa baseado nos dados do servidor
function inicializarVagas(estados) {
    const mapaContainer = document.getElementById('mapaContainer');
    if (!mapaContainer) {
        console.log('Mapa container não encontrado, aguardando...');
        return;
    }

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
        const colunas = 5; // Número de colunas fixo

        // Calcula linha e coluna
        const linha = Math.floor(index / colunas);
        const coluna = index % colunas;

        // Aplica curvatura progressiva baseada na linha
        // Quanto mais para baixo, mais ajuste na horizontal para acompanhar a curvatura
        const ajusteCurvatura = (linha * configMapa.curvatura) / 10; // Ajuste progressivo

        // Para linhas pares, ajusta para a direita, para ímpares para a esquerda
      
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

        // Salvar estados globalmente para o router acessar
        window.currentStates = data;

        // Verificar se estamos na página de vagas
        const mapaContainer = document.getElementById('mapaContainer');
        if (mapaContainer) {
            // Se for a primeira vez ou se novas vagas foram adicionadas, inicializa
            if (Object.keys(data).length !== vagasConfig.length) {
                inicializarVagas(data);
            }

            // Atualizar cada vaga individualmente
            Object.keys(data).forEach(vagaId => {
                const estado = data[vagaId];
                const vagaElement = document.getElementById(vagaId);

                if (vagaElement) {
                    // Remove classes antigas
                    vagaElement.classList.remove("livre", "ocupado", "desconhecido");
                    // Adiciona nova classe
                    vagaElement.classList.add(estado);
                }
            });

            // Atualizar contadores
            atualizarContadores(data);
        }

        // Atualizar horário (sempre que houver uma atualização)
        const elementoAtualizacao = document.getElementById("ultimaAtualizacao");
        if (elementoAtualizacao) {
            elementoAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
        }

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        const statusBox = document.getElementById('statusBox');
        if (statusBox) {
            statusBox.textContent = 'Erro de conexão';
            statusBox.className = 'status-box status-desconhecido';
        }
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

    const elementoOcupadas = document.getElementById('ocupadas');
    const elementoLivres = document.getElementById('livres');
    const elementoTotal = document.getElementById('totalVagas');
    const statusBox = document.getElementById('statusBox');

    if (elementoOcupadas) elementoOcupadas.textContent = ocupadas;
    if (elementoLivres) elementoLivres.textContent = livres;
    if (elementoTotal) elementoTotal.textContent = totalVagas;

    // Atualizar status geral
    if (statusBox) {
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
}

// Função para obter estados atuais (usada pelo router)
function getCurrentStates() {
    return window.currentStates || {};
}

// Iniciar atualização automática
function iniciarAtualizacaoAutomatica() {
    // Para qualquer intervalo existente
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }

    // Inicia novo intervalo
    intervaloAtualizacao = setInterval(atualizarStatus, 2000);
    console.log("Atualização automática iniciada (2 segundos)");
}

// Parar atualização automática (útil para quando sair da página)
function pararAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = null;
        console.log("Atualização automática parada");
    }
}

// Função para forçar atualização imediata (útil quando volta para a página de vagas)
function forcarAtualizacao() {
    atualizarStatus();
}

// Exportar funções para acesso global
window.inicializarVagas = inicializarVagas;
window.atualizarStatus = atualizarStatus;
window.getCurrentStates = getCurrentStates;
window.iniciarAtualizacaoAutomatica = iniciarAtualizacaoAutomatica;
window.pararAtualizacaoAutomatica = pararAtualizacaoAutomatica;
window.forcarAtualizacao = forcarAtualizacao;
window.vagasConfig = vagasConfig;

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard inicializado");

    // Iniciar atualização automática
    iniciarAtualizacaoAutomatica();

    // Fazer primeira atualização imediatamente
    atualizarStatus();
});