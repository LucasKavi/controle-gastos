// ==========================================
// CONFIGURAÇÕES E API
// ==========================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbByTK7gyDwnwYx2PvVfEYWQp9eD7MWP0S6EX1Tq9v7uI2EZnBHn8mVYrskpWnV8XaPg/exec';

// ESTADO DO APLICATIVO
let dadosApp = {
    saldoInicial: 0,
    gastos: [],
    fechamentos: []
};

// ==========================================
// ELEMENTOS DO DOM
// ==========================================
const telaInicio = document.getElementById('tela-inicio');
const painelPrincipal = document.getElementById('painel-principal');
const btnIniciar = document.getElementById('btn-iniciar');

const btnNavLancamento = document.getElementById('btn-nav-lancamento');
const btnNavResumo = document.getElementById('btn-nav-resumo');
const btnNavRelatorio = document.getElementById('btn-nav-relatorio');

const telaLancamento = document.getElementById('tela-lancamento');
const telaResumo = document.getElementById('tela-resumo');
const telaRelatorio = document.getElementById('tela-relatorio');

const inputSaldoInicial = document.getElementById('saldo-inicial');
const displayTotalGasto = document.getElementById('display-total-gasto');
const displaySaldoRestante = document.getElementById('display-saldo-restante');

const formGasto = document.getElementById('form-gasto');
const tabelaBody = document.getElementById('tabela-body');
const resumoTotalGastos = document.getElementById('resumo-total-gastos');
const containerFechamentos = document.getElementById('container-fechamentos');

const btnSalvarSessao = document.getElementById('btn-salvar-sessao');
const btnSair = document.getElementById('btn-sair');
const btnFecharMes = document.getElementById('btn-fechar-mes');
const statusMsg = document.getElementById('status-msg');

// ==========================================
// FUNÇÕES UTILITÁRIAS E DE FORMATAÇÃO
// ==========================================
function formatarDataBR(dataIso) {
    if (!dataIso) return '';
    if (dataIso.includes('/')) return dataIso;
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

function exibirStatus(mensagem, duracao = 3000) {
    if (!statusMsg) return;
    statusMsg.textContent = mensagem;
    if (duracao > 0) {
        setTimeout(() => {
            if (statusMsg.textContent === mensagem) {
                statusMsg.textContent = '';
            }
        }, duracao);
    }
}

// ==========================================
// PERSISTÊNCIA (LOCALSTORAGE & NUVEM)
// ==========================================
function salvarDadosNoAparelho() {
    localStorage.setItem('controle_gastos_dados', JSON.stringify(dadosApp));
}

async function sincronizarComNuvem(acao, dadosExtras = {}) {
    exibirStatus('Sincronizando com a nuvem...', 0);
    try {
        const payload = {
            action: acao,
            saldoInicial: dadosApp.saldoInicial,
            ...dadosExtras
        };

        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Evita erro de CORS ao salvar no Apps Script
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        exibirStatus('Dados salvos na nuvem!');
    } catch (erro) {
        console.error('Erro na sincronização:', erro);
        exibirStatus('Erro ao salvar na nuvem. Salvo localmente.');
    }
}

async function carregarDadosSalvos() {
    // 1. Carrega o backup local de forma imediata para preencher o app
    const dadosLocais = localStorage.getItem('controle_gastos_dados');
    if (dadosLocais) {
        try {
            dadosApp = JSON.parse(dadosLocais);
            if (inputSaldoInicial) {
                inputSaldoInicial.value = Number(dadosApp.saldoInicial || 0).toFixed(2);
            }
            atualizarInterface(false);
        } catch (e) {
            console.error('Erro ao carregar dados do LocalStorage:', e);
        }
    }

    // 2. Tenta buscar dados da nuvem em segundo plano
    try {
        exibirStatus('Buscando dados da nuvem...', 0);
        const resposta = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'carregarDados' })
        });

        if (resposta.ok) {
            const dadosNuvem = await resposta.json();
            if (dadosNuvem && dadosNuvem.status === 'sucesso') {
                dadosApp.saldoInicial = parseFloat(dadosNuvem.saldoInicial) || 0;
                dadosApp.gastos = Array.isArray(dadosNuvem.gastos) ? dadosNuvem.gastos : [];
                dadosApp.fechamentos = Array.isArray(dadosNuvem.fechamentos) ? dadosNuvem.fechamentos : [];

                if (inputSaldoInicial) {
                    inputSaldoInicial.value = dadosApp.saldoInicial.toFixed(2);
                }
                atualizarInterface(true);
                exibirStatus('Dados sincronizados!');
                return;
            }
        }
        exibirStatus('');
    } catch (erro) {
        console.warn('Servidor indisponível ou resposta em no-cors. Usando banco local:', erro);
        exibirStatus('Modo Offline: dados carregados localmente.');
    }
}

// ==========================================
// RENDERIZAÇÃO E INTERFACE
// ==========================================
function atualizarInterface(salvarLocal = true) {
    if (inputSaldoInicial) {
        dadosApp.saldoInicial = parseFloat(inputSaldoInicial.value) || 0;
    }

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    if (displayTotalGasto) displayTotalGasto.textContent = totalGasto.toFixed(2);
    if (displaySaldoRestante) displaySaldoRestante.textContent = saldoRestante.toFixed(2);
    if (resumoTotalGastos) resumoTotalGastos.textContent = totalGasto.toFixed(2);

    // Renderizar Tabela de Gastos Atuais
    if (tabelaBody) {
        tabelaBody.innerHTML = '';
        dadosApp.gastos.forEach((gasto, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarDataBR(gasto.data)}</td>
                <td>${gasto.descricao}</td>
                <td>R$ ${Number(gasto.valor).toFixed(2)}</td>
                <td><button class="btn-delete" onclick="removerGasto(${index})">🗑️</button></td>
            `;
            tabelaBody.appendChild(tr);
        });
    }

    // Renderizar Fechamentos
    renderizarFechamentos();

    if (salvarLocal) {
        salvarDadosNoAparelho();
    }
}

function renderizarFechamentos() {
    if (!containerFechamentos) return;

    containerFechamentos.innerHTML = '';
    if (!dadosApp.fechamentos || dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p style="color: #718096; font-size: 0.9rem;">Nenhum fechamento realizado ainda.</p>';
        return;
    }

    dadosApp.fechamentos.forEach((f, idx) => {
                const card = document.createElement('div');
                card.className = 'card card-fechamento';

                let tabelaItensHTML = '';
                if (f.itens && f.itens.length > 0) {
                    tabelaItensHTML = `
                <div class="fechamento-extrato-detalhes">
                    <table class="fechamento-tabela">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${f.itens.map((item, itemIdx) => `
                                <tr>
                                    <td>
                                        <input type="text" class="input-edit-fechamento" value="${formatarDataBR(item.data)}" onchange="editarItemFechamento(${idx}, ${itemIdx}, 'data', this.value)">
                                    </td>
                                    <td>
                                        <input type="text" class="input-edit-fechamento" value="${item.descricao}" onchange="editarItemFechamento(${idx}, ${itemIdx}, 'descricao', this.value)">
                                    </td>
                                    <td>
                                        <input type="number" step="0.01" class="input-edit-fechamento val-input" value="${Number(item.valor).toFixed(2)}" onchange="editarItemFechamento(${idx}, ${itemIdx}, 'valor', this.value)">
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="fechamento-header">
                <h4>Fechamento #${idx + 1}</h4>
                <div class="fechamento-header-acoes">
                    <span>Data: ${f.dataFechamento}</span>
                    <button class="btn-delete-fechamento" onclick="removerFechamento(${idx})" title="Excluir Fechamento">🗑️</button>
                </div>
            </div>
            <div class="fechamento-resumo" id="resumo-fechamento-${idx}">
                <p><span>Saldo Inicial:</span> <strong>R$ ${Number(f.saldoInicial).toFixed(2)}</strong></p>
                <p><span>Total Gasto:</span> <strong id="total-gasto-f-${idx}">R$ ${Number(f.totalGasto).toFixed(2)}</strong></p>
                <p><span>Saldo Final:</span> <strong id="saldo-restante-f-${idx}">R$ ${Number(f.saldoRestante).toFixed(2)}</strong></p>
            </div>
            ${tabelaItensHTML}
        `;
        containerFechamentos.appendChild(card);
    });
}

// ==========================================
// AÇÕES E MANIPULAÇÃO DE DADOS
// ==========================================

// EDITAR ITEM DE FECHAMENTO (SEM PERDER O FOCO DO TECLADO)
window.editarItemFechamento = function(fechamentoIdx, itemIdx, campo, novoValor) {
    const fechamento = dadosApp.fechamentos[fechamentoIdx];
    if (!fechamento || !fechamento.itens[itemIdx]) return;

    if (campo === 'data') {
        if (novoValor.includes('/')) {
            const [dia, mes, ano] = novoValor.split('/');
            fechamento.itens[itemIdx].data = `${ano}-${mes}-${dia}`;
        } else {
            fechamento.itens[itemIdx].data = novoValor;
        }
    } else if (campo === 'descricao') {
        fechamento.itens[itemIdx].descricao = novoValor.trim();
    } else if (campo === 'valor') {
        const val = parseFloat(novoValor);
        if (!isNaN(val)) {
            fechamento.itens[itemIdx].valor = val;
            
            // Recalcular totais internamente
            fechamento.totalGasto = fechamento.itens.reduce((acc, curr) => acc + curr.valor, 0);
            fechamento.saldoRestante = fechamento.saldoInicial - fechamento.totalGasto;

            // Atualiza os valores do card sem re-renderizar o HTML
            const elTotal = document.getElementById(`total-gasto-f-${fechamentoIdx}`);
            const elSaldo = document.getElementById(`saldo-restante-f-${fechamentoIdx}`);
            if (elTotal) elTotal.textContent = `R$ ${fechamento.totalGasto.toFixed(2)}`;
            if (elSaldo) elSaldo.textContent = `R$ ${fechamento.saldoRestante.toFixed(2)}`;
        }
    }

    salvarDadosNoAparelho();
    sincronizarComNuvem('editarFechamento', { fechamentos: dadosApp.fechamentos });
};

// REMOVER FECHAMENTO
window.removerFechamento = function(index) {
    if (confirm(`Deseja realmente excluir o Fechamento #${index + 1}?`)) {
        dadosApp.fechamentos.splice(index, 1);
        atualizarInterface();
        sincronizarComNuvem('removerFechamento', { index });
    }
};

// ADICIONAR GASTO
if (formGasto) {
    formGasto.addEventListener('submit', (e) => {
        e.preventDefault();

        const data = document.getElementById('data').value;
        const descricao = document.getElementById('descricao').value.trim();
        const valor = parseFloat(document.getElementById('valor').value);

        if (!data || !descricao || isNaN(valor)) return;

        const novoGasto = { data, descricao, valor };
        dadosApp.gastos.push(novoGasto);
        
        atualizarInterface();
        sincronizarComNuvem('adicionarGasto', { gasto: novoGasto });

        formGasto.reset();
        exibirStatus('Gasto lançado com sucesso!');
    });
}

// REMOVER GASTO
window.removerGasto = function(index) {
    dadosApp.gastos.splice(index, 1);
    atualizarInterface();
    sincronizarComNuvem('removerGasto', { index });
};

// FECHAR MÊS
if (btnFecharMes) {
    btnFecharMes.addEventListener('click', () => {
        if (dadosApp.gastos.length === 0) {
            alert('Não há lançamentos para fechar o mês.');
            return;
        }

        const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        const novoFechamento = {
            dataFechamento: dataHoje,
            saldoInicial: dadosApp.saldoInicial,
            totalGasto: totalGasto,
            saldoRestante: dadosApp.saldoInicial - totalGasto,
            itens: [...dadosApp.gastos]
        };

        dadosApp.fechamentos.push(novoFechamento);

        // Limpa os gastos correntes após o fechamento
        dadosApp.gastos = [];
        atualizarInterface();
        sincronizarComNuvem('fecharMes', { fechamento: novoFechamento });
        
        alert('Mês fechado e sincronizado com sucesso!');
    });
}

// EVENTO SALDO INICIAL
if (inputSaldoInicial) {
    inputSaldoInicial.addEventListener('change', () => {
        atualizarInterface();
        sincronizarComNuvem('salvarSaldo', { saldoInicial: dadosApp.saldoInicial });
    });
}

// ==========================================
// CONTROLE DE SESSÃO E NAVEGAÇÃO
// ==========================================

// INICIAR PAINEL (ABRE A TELA NA HORA SEM BLOQUEIO)
if (btnIniciar) {
    btnIniciar.addEventListener('click', () => {
        telaInicio.classList.add('hidden');
        painelPrincipal.classList.remove('hidden');
        carregarDadosSalvos();
    });
}

if (btnSalvarSessao) {
    btnSalvarSessao.addEventListener('click', () => {
        salvarDadosNoAparelho();
        sincronizarComNuvem('salvarTudo', { dadosApp });
    });
}

if (btnSair) {
    btnSair.addEventListener('click', () => {
        if (confirm('Deseja salvar suas alterações antes de sair?')) {
            salvarDadosNoAparelho();
            sincronizarComNuvem('salvarTudo', { dadosApp });
        }
        painelPrincipal.classList.add('hidden');
        telaInicio.classList.remove('hidden');
    });
}

// ALTERNAR ABAS
function trocarAba(abaAtiva, btnAtivo) {
    [telaLancamento, telaResumo, telaRelatorio].forEach(t => {
        if (t) t.classList.add('hidden');
    });
    [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => {
        if (b) b.classList.remove('active');
    });

    if (abaAtiva) abaAtiva.classList.remove('hidden');
    if (btnAtivo) btnAtivo.classList.add('active');
}

if (btnNavLancamento) btnNavLancamento.addEventListener('click', () => trocarAba(telaLancamento, btnNavLancamento));
if (btnNavResumo) btnNavResumo.addEventListener('click', () => trocarAba(telaResumo, btnNavResumo));
if (btnNavRelatorio) btnNavRelatorio.addEventListener('click', () => trocarAba(telaRelatorio, btnNavRelatorio));