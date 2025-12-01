// Array dinâmico de vagas - será preenchido automaticamente
let vagasConfig = [];
let intervaloAtualizacao = null;

// Configurações de estilo das vagas
const configVagas = {
    formato: 'quadrado',
    tamanho: '15px',
    fontSize: '7px',
    borderRadius: '4px'
};

// Configurações do layout do mapa - SEM CURVATURA
const configMapa = {
    startLeft: 138,
    startTop: 25,
    espacamentoHorizontal: 17,
    espacamentoVertical: 20
};

// ========== SISTEMA DE VAGAS ==========

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
        const colunas = 5;
        const linha = Math.floor(index / colunas);
        const coluna = index % colunas;

        const posicao = {
            top: `${configMapa.startTop + (linha * configMapa.espacamentoVertical)}px`,
            left: `${configMapa.startLeft + (coluna * configMapa.espacamentoHorizontal)}px`
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

    console.log(`Vagas posicionadas: ${vagasConfig.length} vagas em linhas retas`);
}

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
            if (Object.keys(data).length !== vagasConfig.length) {
                inicializarVagas(data);
            }

            // Atualizar cada vaga individualmente
            Object.keys(data).forEach(vagaId => {
                const estado = data[vagaId];
                const vagaElement = document.getElementById(vagaId);
                if (vagaElement) {
                    vagaElement.classList.remove("livre", "ocupado", "desconhecido");
                    vagaElement.classList.add(estado);
                }
            });

            atualizarContadores(data);
        }

        // Atualizar horário
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

function atualizarContadores(data) {
    let ocupadas = 0;
    let livres = 0;
    const totalVagas = Object.keys(data).length;

    Object.values(data).forEach(estado => {
        if (estado === 'ocupado') ocupadas++;
        else if (estado === 'livre') livres++;
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

function getCurrentStates() {
    return window.currentStates || {};
}

function iniciarAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }
    intervaloAtualizacao = setInterval(atualizarStatus, 2000);
    console.log("Atualização automática iniciada (2 segundos)");
}

function pararAtualizacaoAutomatica() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
        intervaloAtualizacao = null;
        console.log("Atualização automática parada");
    }
}

function forcarAtualizacao() {
    atualizarStatus();
}

// ========== FUNÇÕES DE ESTATÍSTICAS E GRÁFICOS ==========

async function carregarEstatisticas() {
    try {
        const response = await fetch("/api/vagas/estatisticas");
        if (!response.ok) throw new Error('Erro ao carregar estatísticas');
        const data = await response.json();
        console.log("Estatísticas recebidas:", data);
        return data;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return null;
    }
}

async function carregarHistoricoOcupacao() {
    try {
        const response = await fetch("/api/vagas/historico-ocupacao");
        if (!response.ok) throw new Error('Erro ao carregar histórico');
        const data = await response.json();
        console.log("Histórico recebido:", data);
        return data;
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        return [];
    }
}

async function carregarTempoMedioOcupacao() {
    try {
        const response = await fetch("/api/vagas/tempo-medio-ocupacao");
        if (!response.ok) throw new Error('Erro ao carregar tempo médio');
        const data = await response.json();
        console.log("Tempo médio recebido:", data);
        return data;
    } catch (error) {
        console.error('Erro ao carregar tempo médio:', error);
        return [];
    }
}

function inicializarGraficos(estatisticas, historico, tempoMedio) {
    console.log("Inicializando gráficos com:", { estatisticas, historico, tempoMedio });

    // Gráfico de Pizza - Distribuição atual
    const ctxPizza = document.getElementById('graficoPizza');
    if (ctxPizza && estatisticas) {
        try {
            if (ctxPizza.chart) {
                ctxPizza.chart.destroy();
            }

            const vagasIndisponiveis = (estatisticas.total_vagas || 0) -
                ((estatisticas.vagas_ocupadas || 0) + (estatisticas.vagas_livres || 0));

            ctxPizza.chart = new Chart(ctxPizza, {
                type: 'doughnut',
                data: {
                    labels: ['Ocupadas', 'Livres', 'Indisponíveis'],
                    datasets: [{
                        data: [
                            estatisticas.vagas_ocupadas || 0,
                            estatisticas.vagas_livres || 0,
                            vagasIndisponiveis > 0 ? vagasIndisponiveis : 0
                        ],
                        backgroundColor: ['#ef4444', '#22c55e', '#eab308'],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de pizza:', error);
        }
    }

    // Gráfico de Linha - Histórico de ocupação
    const ctxLinha = document.getElementById('graficoLinha');
    if (ctxLinha && historico.length > 0) {
        try {
            if (ctxLinha.chart) {
                ctxLinha.chart.destroy();
            }

            const historicoRecente = historico.slice(-10);
            const labels = historicoRecente.map(item => {
                const date = new Date(item.timestamp);
                return date.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            });

            const dados = historicoRecente.map(item =>
                parseFloat(item.percentual_ocupacao || 0)
            );

            ctxLinha.chart = new Chart(ctxLinha, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '% de Ocupação',
                        data: dados,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function (value) {
                                    return value + '%';
                                }
                            },
                            title: {
                                display: true,
                                text: 'Percentual de Ocupação'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Horário'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de linha:', error);
        }
    }

    // Gráfico de Barras - Tempo médio de ocupação por vaga
    const ctxBarras = document.getElementById('graficoBarras');
    if (ctxBarras && tempoMedio.length > 0) {
        try {
            if (ctxBarras.chart) {
                ctxBarras.chart.destroy();
            }

            const labels = tempoMedio.map(item => `Vaga ${item.numero}`);
            const dados = tempoMedio.map(item => parseFloat(item.tempo_medio_minutos || 0));

            ctxBarras.chart = new Chart(ctxBarras, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tempo Médio (minutos)',
                        data: dados,
                        backgroundColor: '#8b5cf6',
                        borderColor: '#7c3aed',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Minutos'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Número da Vaga'
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Erro ao criar gráfico de barras:', error);
        }
    }
}

async function carregarTodasEstatisticas() {
    if (!document.getElementById('graficoPizza')) {
        console.log('Elementos de gráficos não encontrados');
        return;
    }

    try {
        console.log('Carregando todas as estatísticas...');

        const [estatisticas, historico, tempoMedio] = await Promise.all([
            carregarEstatisticas(),
            carregarHistoricoOcupacao(),
            carregarTempoMedioOcupacao()
        ]);

        console.log('Dados carregados:', { estatisticas, historico, tempoMedio });

        if (estatisticas) {
            document.getElementById('totalVagasStats').textContent = estatisticas.total_vagas || 0;
            document.getElementById('vagasOcupadasStats').textContent = estatisticas.vagas_ocupadas || 0;
            document.getElementById('vagasLivresStats').textContent = estatisticas.vagas_livres || 0;
            document.getElementById('percentualOcupacao').textContent =
                (estatisticas.percentual_ocupacao || 0).toFixed(1) + '%';

            inicializarGraficos(estatisticas, historico, tempoMedio);
        } else {
            console.error('Não foi possível carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro ao carregar todas as estatísticas:', error);
    }
}

// ========== EXPORTAÇÃO PARA USO GLOBAL ==========

window.inicializarVagas = inicializarVagas;
window.atualizarStatus = atualizarStatus;
window.getCurrentStates = getCurrentStates;
window.iniciarAtualizacaoAutomatica = iniciarAtualizacaoAutomatica;
window.pararAtualizacaoAutomatica = pararAtualizacaoAutomatica;
window.forcarAtualizacao = forcarAtualizacao;
window.vagasConfig = vagasConfig;

window.carregarTodasEstatisticas = carregarTodasEstatisticas;
window.carregarEstatisticas = carregarEstatisticas;
window.carregarHistoricoOcupacao = carregarHistoricoOcupacao;
window.carregarTempoMedioOcupacao = carregarTempoMedioOcupacao;
window.inicializarGraficos = inicializarGraficos;

// ========== INICIALIZAÇÃO ==========

document.addEventListener('DOMContentLoaded', function () {
    console.log("Dashboard inicializado");
    iniciarAtualizacaoAutomatica();
    atualizarStatus();
});