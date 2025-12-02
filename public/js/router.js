// Sistema de Rotas
class Router {
    constructor() {
        this.routes = {
            'vagas': this.renderVagas,
            'graficos': this.renderGraficos,
            'mensais': this.renderMensais,
            'configuracoes': this.renderConfiguracoes
        };

        this.currentRoute = 'vagas';
        this.intervaloGraficos = null;
        this.init();
    }

    init() {
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                this.navigate(route);
            });
        });

        this.navigate('vagas');
    }

    navigate(route) {
        if (this.routes[route]) {
            this.pararAtualizacoes();
            this.currentRoute = route;
            this.updateSidebar(route);
            this.routes[route].call(this);
        }
    }

    pararAtualizacoes() {
        if (window.pararAtualizacaoAutomatica) {
            window.pararAtualizacaoAutomatica();
        }

        if (this.intervaloGraficos) {
            clearInterval(this.intervaloGraficos);
            this.intervaloGraficos = null;
        }
    }

    updateSidebar(activeRoute) {
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-route') === activeRoute) {
                btn.classList.add('active');
            }
        });
    }

    // ROTA: Vagas (Dashboard Principal)
    renderVagas() {
        document.getElementById('pageTitle').textContent = 'Dashboard - Estacionamento UNESC';

        const content = `
            <!-- CARDS -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div class="card">
                    <div class="card-title">Total de vagas</div>
                    <div id="totalVagas" class="card-value">10</div>
                </div>

                <div class="card">
                    <div class="card-title">Ocupadas</div>
                    <div id="ocupadas" class="card-value text-red-600">0</div>
                </div>

                <div class="card">
                    <div class="card-title">Livres</div>
                    <div id="livres" class="card-value text-green-600">0</div>
                </div>

                <div class="card">
                    <div class="card-title">Status Geral</div>
                    <div id="statusBox" class="status-box status-desconhecido">Carregando...</div>
                </div>
            </div>

            <!-- MAPA -->
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">Mapa do Campus UNESC</h3>

                    <!-- LEGENDA -->
                    <div class="legenda">
                        <div class="legenda-item">
                            <div class="legenda-cor livre"></div>
                            <span class="text-sm">Vaga Livre</span>
                        </div>
                        <div class="legenda-item">
                            <div class="legenda-cor ocupado"></div>
                            <span class="text-sm">Vaga Ocupada</span>
                        </div>
                        <div class="legenda-item">
                            <div class="legenda-cor desconhecido"></div>
                            <span class="text-sm">Status Desconhecido</span>
                        </div>
                    </div>
                </div>

                <div class="flex justify-center">
                    <div id="mapaContainer" class="mapa-wrapper">
                        <img src="./img/MAPAUNESC.png" id="mapa" class="mapa-image" alt="Mapa do Campus UNESC">
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;

        if (window.iniciarAtualizacaoAutomatica) {
            window.iniciarAtualizacaoAutomatica();
        }

        this.recriarVagasNoMapa();
    }

    async recriarVagasNoMapa() {
        try {
            const response = await fetch("/api/status");
            if (!response.ok) throw new Error('Erro ao buscar dados');

            const data = await response.json();
            console.log("Dados recebidos para recriação do mapa:", data);

            window.currentStates = data;

            if (window.inicializarVagas) {
                window.inicializarVagas(data);
            } else {
                console.error("Função inicializarVagas não encontrada!");
            }

            if (window.atualizarContadores) {
                window.atualizarContadores(data);
            }

            const elementoAtualizacao = document.getElementById("ultimaAtualizacao");
            if (elementoAtualizacao) {
                elementoAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
            }

        } catch (error) {
            console.error('Erro ao recriar vagas no mapa:', error);
            const statusBox = document.getElementById('statusBox');
            if (statusBox) {
                statusBox.textContent = 'Erro de conexão';
                statusBox.className = 'status-box status-desconhecido';
            }
        }
    }

    // ROTA: Gráficos e Estatísticas - AGORA APENAS 2 COLUNAS
    renderGraficos() {
        document.getElementById('pageTitle').textContent = 'Gráficos e Estatísticas - Estacionamento UNESC';

        const content = `           
            <!-- GRÁFICOS LADO A LADO -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- COLUNA 1: Gráfico de Distribuição -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold text-gray-800">Distribuição de Vagas</h3>
                        <span class="text-sm text-gray-500" id="atualizadoEm"></span>
                    </div>
                    <div class="h-80">
                        <canvas id="graficoPizza"></canvas>
                    </div>
                </div>

                <!-- COLUNA 2: Tabela de Histórico -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-semibold text-gray-800">Histórico de Ocupação</h3>
                        <div class="flex gap-2">
                            <select id="filtroVaga" class="p-2 border rounded text-sm">
                                <option value="todas">Todas as Vagas</option>
                            </select>
                            <select id="filtroData" class="p-2 border rounded text-sm">
                                <option value="hoje">Hoje</option>
                                <option value="ontem">Ontem</option>
                                <option value="7dias">Últimos 7 dias</option>
                                <option value="30dias">Últimos 30 dias</option>
                            </select>
                            <button onclick="router.carregarHistoricoTabela()" 
                                    class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                                Filtrar
                            </button>
                        </div>
                    </div>

                    <div class="overflow-x-auto max-h-96">
                        <table class="min-w-full bg-white">
                            <thead class="sticky top-0 bg-gray-50">
                                <tr>
                                    <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Vaga</th>
                                    <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Ocupada em</th>
                                    <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Livre em</th>
                                    <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo</th>
                                    <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody id="tabelaHistorico" class="divide-y divide-gray-200">
                                <tr>
                                    <td colspan="5" class="py-8 text-center text-gray-500">
                                        <div class="animate-pulse">Carregando histórico...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="mt-4 flex justify-between items-center text-sm text-gray-500">
                        <p>Mostrando <span id="totalRegistros" class="font-medium">0</span> registros</p>
                        <button onclick="router.carregarHistoricoTabela()" 
                                class="text-blue-600 hover:text-blue-800 text-sm">
                            ↻ Atualizar
                        </button>
                    </div>
                </div>
            </div>

            <!-- BOTÃO DE ATUALIZAÇÃO GERAL -->
            <div class="mt-8 flex justify-center">
                <button onclick="router.atualizarPaginaGraficos()" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Atualizar Todos os Dados
                </button>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;

        this.carregarChartJS().then(() => {
            this.carregarGraficoDistribuicao();
            this.carregarFiltrosVagas();
            this.carregarHistoricoTabela();
            this.iniciarAtualizacaoGraficos();
        });
    }

    // Função para atualizar toda a página de gráficos
    atualizarPaginaGraficos() {
        if (document.getElementById('graficoPizza')) {
            this.carregarGraficoDistribuicao();
        }
        this.carregarHistoricoTabela();

        // Atualizar timestamp
        const atualizadoEm = document.getElementById('atualizadoEm');
        if (atualizadoEm) {
            atualizadoEm.textContent = `Atualizado: ${new Date().toLocaleTimeString('pt-BR')}`;
        }
    }

    async carregarChartJS() {
        return new Promise((resolve, reject) => {
            if (window.Chart) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Carregar apenas o gráfico de distribuição
    async carregarGraficoDistribuicao() {
        try {
            const estatisticas = await window.carregarEstatisticas();
            if (estatisticas && window.inicializarGraficos) {
                // Passar apenas os dados necessários para o gráfico de pizza
                window.inicializarGraficos(estatisticas, null, null);
            }
        } catch (error) {
            console.error('Erro ao carregar gráfico:', error);
        }
    }

    iniciarAtualizacaoGraficos() {
        if (this.intervaloGraficos) {
            clearInterval(this.intervaloGraficos);
        }

        this.intervaloGraficos = setInterval(() => {
            if (document.getElementById('graficoPizza')) {
                this.carregarGraficoDistribuicao();
            }
        }, 30000); // Atualiza a cada 30 segundos
    }

    // ROTA: Controle Mensal
    renderMensais() {
        document.getElementById('pageTitle').textContent = 'Controle Mensal - Estacionamento UNESC';

        const content = `
            <div class="bg-white rounded-lg shadow p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-bold text-gray-800">Controle de Mensalistas</h3>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        + Novo Mensalista
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <input type="text" placeholder="Buscar por nome..." class="p-2 border rounded">
                    <select class="p-2 border rounded">
                        <option>Todos os status</option>
                        <option>Ativo</option>
                        <option>Inativo</option>
                    </select>
                    <input type="month" class="p-2 border rounded">
                    <button class="bg-gray-600 text-white p-2 rounded">Filtrar</button>
                </div>

                <div class="overflow-x-auto">
                    <table class="min-w-full bg-white">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="py-3 px-4 text-left">Nome</th>
                                <th class="py-3 px-4 text-left">Vaga</th>
                                <th class="py-3 px-4 text-left">Placa</th>
                                <th class="py-3 px-4 text-left">Status</th>
                                <th class="py-3 px-4 text-left">Vencimento</th>
                                <th class="py-3 px-4 text-left">Ações</th>
                            </tr>
                        </thead>
                        <tbody id="tabelaMensalistas">
                            <tr>
                                <td colspan="6" class="py-4 text-center text-gray-500">
                                    Carregando dados dos mensalistas...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
        this.carregarMensalistas();
    }

    // ROTA: Configurações
    renderConfiguracoes() {
        document.getElementById('pageTitle').textContent = 'Configurações - Estacionamento UNESC';

        const content = `
            <div class="bg-white rounded-lg shadow p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">Configurações do Sistema</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Intervalo de Atualização (segundos)</label>
                        <input type="number" id="intervaloAtualizacao" value="2" min="1" max="60" class="w-full p-2 border rounded">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">URL do Broker MQTT</label>
                        <input type="text" id="mqttUrl" value="mqtt://test.mosquitto.org" class="w-full p-2 border rounded">
                    </div>
                    
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" onclick="router.salvarConfiguracoes()">
                        Salvar Configurações
                    </button>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
    }

    // ========== MÉTODOS PARA CARREGAR DADOS ==========

    async carregarMensalistas() {
        try {
            const response = await fetch('/api/mensalistas');
            const mensalistas = await response.json();

            const tbody = document.getElementById('tabelaMensalistas');
            tbody.innerHTML = mensalistas.map(mensalista => `
                <tr class="border-t">
                    <td class="py-3 px-4">${mensalista.nome}</td>
                    <td class="py-3 px-4">${mensalista.vaga}</td>
                    <td class="py-3 px-4">${mensalista.placa}</td>
                    <td class="py-3 px-4">
                        <span class="px-2 py-1 rounded text-xs ${mensalista.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${mensalista.status}
                        </span>
                    </td>
                    <td class="py-3 px-4">${mensalista.vencimento}</td>
                    <td class="py-3 px-4">
                        <button class="text-blue-600 hover:text-blue-800 mr-2">Editar</button>
                        <button class="text-red-600 hover:text-red-800">Excluir</button>
                    </td>
                </tr>
            `).join('');

        } catch (error) {
            console.error('Erro ao carregar mensalistas:', error);
            document.getElementById('tabelaMensalistas').innerHTML = `
                <tr>
                    <td colspan="6" class="py-4 text-center text-red-500">
                        Erro ao carregar dados
                    </td>
                </tr>
            `;
        }
    }

    // ========== MÉTODOS PARA TABELA DE HISTÓRICO ==========

    async carregarFiltrosVagas() {
        try {
            const response = await fetch('/api/vagas');
            const vagas = await response.json();

            const select = document.getElementById('filtroVaga');
            if (!select) return;

            // Limpar e adicionar opções
            select.innerHTML = '<option value="todas">Todas as Vagas</option>';

            vagas.forEach(vaga => {
                const option = document.createElement('option');
                option.value = vaga.id;
                option.textContent = `Vaga ${vaga.numero}`;
                select.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar vagas para filtro:', error);
        }
    }

    async carregarHistoricoTabela() {
        try {
            const vagaId = document.getElementById('filtroVaga')?.value || 'todas';
            const periodo = document.getElementById('filtroData')?.value || 'hoje';

            console.log(`Carregando histórico - Vaga: ${vagaId}, Período: ${periodo}`);

            // Montar URL com filtros
            let url = '/api/estatisticas/historico-tabela';
            const params = new URLSearchParams();

            if (vagaId !== 'todas') params.append('vaga_id', vagaId);
            if (periodo !== 'hoje') params.append('periodo', periodo);

            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Erro ao buscar histórico');

            const historico = await response.json();

            // Atualizar tabela
            this.atualizarTabelaHistorico(historico);

        } catch (error) {
            console.error('Erro ao carregar histórico tabela:', error);
            this.mostrarErroTabela('Erro ao carregar histórico: ' + error.message);
        }
    }

    atualizarTabelaHistorico(historico) {
        const tbody = document.getElementById('tabelaHistorico');
        const totalRegistros = document.getElementById('totalRegistros');

        if (!tbody) return;

        if (!historico || historico.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-gray-500">
                        Nenhum registro histórico encontrado.
                    </td>
                </tr>
            `;
            if (totalRegistros) totalRegistros.textContent = '0';
            return;
        }

        // Formatar cada linha
        const linhasHTML = historico.map(item => {
            // Formatar datas de forma mais curta
            const formatarData = (dataString) => {
                if (!dataString) return '--';
                const data = new Date(dataString);
                return data.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit'
                });
            };

            const ocupadaEm = formatarData(item.ocupada_em);
            const livreEm = formatarData(item.livre_em);

            // Formatar tempo ocupado
            let tempoFormatado = '--';
            if (item.tempo_ocupacao_minutos) {
                const horas = Math.floor(item.tempo_ocupacao_minutos / 60);
                const minutos = item.tempo_ocupacao_minutos % 60;

                if (horas > 0) {
                    tempoFormatado = `${horas}h ${minutos}min`;
                } else if (item.tempo_ocupacao_minutos < 1) {
                    tempoFormatado = '<1min';
                } else {
                    tempoFormatado = `${minutos}min`;
                }
            }

            // Determinar status atual
            const statusAtual = item.livre_em ? 'LIVRE' : 'OCUPADA';
            const statusClass = statusAtual === 'LIVRE' ?
                'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

            return `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-3 font-medium text-sm">Vaga ${item.numero_vaga}</td>
                    <td class="py-3 px-3 text-sm">${ocupadaEm}</td>
                    <td class="py-3 px-3 text-sm">${livreEm}</td>
                    <td class="py-3 px-3 text-sm font-medium">${tempoFormatado}</td>
                    <td class="py-3 px-3">
                        <span class="px-2 py-1 rounded text-xs ${statusClass}">
                            ${statusAtual}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = linhasHTML;
        if (totalRegistros) totalRegistros.textContent = historico.length.toString();
    }

    mostrarErroTabela(mensagem) {
        const tbody = document.getElementById('tabelaHistorico');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center text-red-500">
                        ${mensagem}
                    </td>
                </tr>
            `;
        }
    }

    salvarConfiguracoes() {
        const intervalo = document.getElementById('intervaloAtualizacao').value;
        const mqttUrl = document.getElementById('mqttUrl').value;
        console.log('Salvando configurações:', { intervalo, mqttUrl });
        alert('Configurações salvas com sucesso!');
    }
}

// Inicializar o router quando a página carregar
document.addEventListener('DOMContentLoaded', function () {
    window.router = new Router();
});