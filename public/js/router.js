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
        this.init();
    }

    init() {
        // Configurar event listeners para os botões da sidebar
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                this.navigate(route);
            });
        });

        // Renderizar rota inicial
        this.navigate('vagas');
    }

    navigate(route) {
        if (this.routes[route]) {
            this.currentRoute = route;
            this.updateSidebar(route);
            this.routes[route].call(this);
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
                <!-- CABEÇALHO DO MAPA COM LEGENDA -->
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
                        <!-- IMAGEM DO MAPA -->
                        <img src="./img/MAPAUNESC.png" id="mapa" class="mapa-image" alt="Mapa do Campus UNESC">

                        <!-- VAGAS DINÂMICAS SERÃO INSERIDAS AQUI PELO JAVASCRIPT -->
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;

        // AGORA: Forçar a recriação completa das vagas quando voltar para esta aba
        this.recriarVagasNoMapa();
    }

    // Função para recriar as vagas no mapa
    async recriarVagasNoMapa() {
        try {
            // Primeiro, buscar os dados atualizados do servidor
            const response = await fetch("/api/status");
            if (!response.ok) throw new Error('Erro ao buscar dados');

            const data = await response.json();
            console.log("Dados recebidos para recriação do mapa:", data);

            // Salvar estados globalmente
            window.currentStates = data;

            // Usar a função inicializarVagas para criar as vagas
            if (window.inicializarVagas) {
                window.inicializarVagas(data);
            } else {
                console.error("Função inicializarVagas não encontrada!");
            }

            // Atualizar contadores
            if (window.atualizarContadores) {
                window.atualizarContadores(data);
            }

            // Atualizar horário
            const elementoAtualizacao = document.getElementById("ultimaAtualizacao");
            if (elementoAtualizacao) {
                elementoAtualizacao.textContent = new Date().toLocaleTimeString('pt-BR');
            }

            console.log("Vagas recriadas com sucesso no mapa");

        } catch (error) {
            console.error('Erro ao recriar vagas no mapa:', error);
            const statusBox = document.getElementById('statusBox');
            if (statusBox) {
                statusBox.textContent = 'Erro de conexão';
                statusBox.className = 'status-box status-desconhecido';
            }
        }
    }

    // ROTA: Gráficos e Estatísticas
    renderGraficos() {
        document.getElementById('pageTitle').textContent = 'Gráficos e Estatísticas - Estacionamento UNESC';

        const content = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Gráfico de Ocupação por Horário -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Ocupação por Horário</h3>
                    <div class="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <p class="text-gray-500">Gráfico de ocupação será implementado aqui</p>
                    </div>
                </div>

                <!-- Vagas Mais Utilizadas -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Vagas Mais Utilizadas</h3>
                    <div class="h-64 flex items-center justify-center bg-gray-50 rounded">
                        <p class="text-gray-500">Ranking de vagas será implementado aqui</p>
                    </div>
                </div>

                <!-- Estatísticas de Uso -->
                <div class="bg-white rounded-lg shadow p-6 col-span-1 lg:col-span-2">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">Estatísticas de Uso</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="text-center p-4 bg-blue-50 rounded-lg">
                            <div class="text-2xl font-bold text-blue-600" id="mediaOcupacao">--%</div>
                            <div class="text-sm text-gray-600">Média de Ocupação</div>
                        </div>
                        <div class="text-center p-4 bg-green-50 rounded-lg">
                            <div class="text-2xl font-bold text-green-600" id="vagaMaisPopular">--</div>
                            <div class="text-sm text-gray-600">Vaga Mais Popular</div>
                        </div>
                        <div class="text-center p-4 bg-purple-50 rounded-lg">
                            <div class="text-2xl font-bold text-purple-600" id="picoUtilizacao">--:--</div>
                            <div class="text-sm text-gray-600">Horário de Pico</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('app-content').innerHTML = content;
        this.carregarDadosGraficos();
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

                <!-- Filtros -->
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

                <!-- Tabela de Mensalistas -->
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

    // Métodos para carregar dados
    async carregarDadosGraficos() {
        try {
            const response = await fetch('/api/estatisticas');
            const data = await response.json();

            document.getElementById('mediaOcupacao').textContent = data.mediaOcupacao + '%';
            document.getElementById('vagaMaisPopular').textContent = data.vagaMaisPopular;
            document.getElementById('picoUtilizacao').textContent = data.picoUtilizacao;

        } catch (error) {
            console.error('Erro ao carregar dados dos gráficos:', error);
        }
    }

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