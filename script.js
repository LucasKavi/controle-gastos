// CONFIGURAÇÕES E API
const APPS_SCRIPT_URL = 'SUA_URL_DO_APPS_SCRIPT_AQUI';

// ESTADO DO APLICATIVO
let dadosApp = {
    saldoInicial: 0,
    gastos: [],
    fechamentos: []
};

// ELEM. DOM
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

// FORMATAR DATA: AAAA-MM-DD -> DD/MM/AAAA
function formatarDataBR(dataIso) {
    if (!dataIso) return '';
    if (dataIso.includes('/')) return dataIso; // Já está formatado
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// INICIALIZAR E CARREGAR DADOS DO DISPOSITIVO
function carregarDadosSalvos() {
    const dadosLocais = localStorage.getItem('controle_gastos_dados');
    if (dadosLocais) {
        dadosApp = JSON.parse(dadosLocais);
    }
    inputSaldoInicial.value = dadosApp.saldoInicial.toFixed(2);
    atualizarInterface();
}

function salvarDadosNoAparelho() {
    localStorage.setItem('controle_gastos_dados', JSON.stringify(dadosApp));
}

// ATUALIZAR CÁLCULOS E TELAS
function atualizarInterface() {
    dadosApp.saldoInicial = parseFloat(inputSaldoInicial.value) || 0;

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    displayTotalGasto.textContent = totalGasto.toFixed(2);
    displaySaldoRestante.textContent = saldoRestante.toFixed(2);
    resumoTotalGastos.textContent = totalGasto.toFixed(2);

    // Renderizar Tabela de Gastos Atuais
    tabelaBody.innerHTML = '';
    dadosApp.gastos.forEach((gasto, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatarDataBR(gasto.data)}</td>
            <td>${gasto.descricao}</td>
            <td>R$ ${gasto.valor.toFixed(2)}</td>
            <td><button class="btn-delete" onclick="removerGasto(${index})">🗑️</button></td>
        `;
        tabelaBody.appendChild(tr);
    });

    // Renderizar Fechamentos
    containerFechamentos.innerHTML = '';
    if (dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p style="color: #718096; font-size: 0.9rem;">Nenhum fechamento realizado ainda.</p>';
    } else {
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
                                            <input type="number" step="0.01" class="input-edit-fechamento val-input" value="${item.valor.toFixed(2)}" onchange="editarItemFechamento(${idx}, ${itemIdx}, 'valor', this.value)">
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
                <div class="fechamento-resumo">
                    <p><span>Saldo Inicial:</span> <strong>R$ ${f.saldoInicial.toFixed(2)}</strong></p>
                    <p><span>Total Gasto:</span> <strong>R$ ${f.totalGasto.toFixed(2)}</strong></p>
                    <p><span>Saldo Final:</span> <strong>R$ ${f.saldoRestante.toFixed(2)}</strong></p>
                </div>
                ${tabelaItensHTML}
            `;
            containerFechamentos.appendChild(card);
        });
    }

    salvarDadosNoAparelho();
}

// REMOVER FECHAMENTO
window.removerFechamento = function(index) {
    if (confirm(`Deseja realmente excluir o Fechamento #${index + 1}?`)) {
        dadosApp.fechamentos.splice(index, 1);
        atualizarInterface();
    }
};

// EDITAR ITEM DE UM FECHAMENTO
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
            
            // Recalcula os totais do fechamento ao alterar o valor do item
            fechamento.totalGasto = fechamento.itens.reduce((acc, curr) => acc + curr.valor, 0);
            fechamento.saldoRestante = fechamento.saldoInicial - fechamento.totalGasto;
        }
    }

    atualizarInterface();
};

// ADICIONAR GASTO
formGasto.addEventListener('submit', (e) => {
    e.preventDefault();

    const data = document.getElementById('data').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);

    if (!data || !descricao || isNaN(valor)) return;

    dadosApp.gastos.push({ data, descricao, valor });
    atualizarInterface();

    formGasto.reset();
    statusMsg.textContent = 'Gasto lançado com sucesso!';
    setTimeout(() => statusMsg.textContent = '', 3000);
});

// REMOVER GASTO
window.removerGasto = function(index) {
    dadosApp.gastos.splice(index, 1);
    atualizarInterface();
};

// FECHAR MÊS
btnFecharMes.addEventListener('click', () => {
    if (dadosApp.gastos.length === 0) {
        alert('Não há lançamentos para fechar o mês.');
        return;
    }

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    dadosApp.fechamentos.push({
        dataFechamento: dataHoje,
        saldoInicial: dadosApp.saldoInicial,
        totalGasto: totalGasto,
        saldoRestante: dadosApp.saldoInicial - totalGasto,
        itens: [...dadosApp.gastos]
    });

    // Limpa gastos atuais
    dadosApp.gastos = [];
    atualizarInterface();
    alert('Mês fechado e salvo no histórico!');
});

// EVENTOS DE NAVEGAÇÃO E SESSÃO
btnIniciar.addEventListener('click', () => {
    telaInicio.classList.add('hidden');
    painelPrincipal.classList.remove('hidden');
    carregarDadosSalvos();
});

btnSalvarSessao.addEventListener('click', () => {
    salvarDadosNoAparelho();
    alert('Dados salvos com sucesso neste celular!');
});

btnSair.addEventListener('click', () => {
    if (confirm('Deseja salvar suas alterações antes de sair?')) {
        salvarDadosNoAparelho();
    }
    painelPrincipal.classList.add('hidden');
    telaInicio.classList.remove('hidden');
});

inputSaldoInicial.addEventListener('change', atualizarInterface);

// ALTERNAR ABAS
function trocarAba(abaAtiva, btnAtivo) {
    [telaLancamento, telaResumo, telaRelatorio].forEach(t => t.classList.add('hidden'));
    [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => b.classList.remove('active'));

    abaAtiva.classList.remove('hidden');
    btnAtivo.classList.add('active');
}

btnNavLancamento.addEventListener('click', () => trocarAba(telaLancamento, btnNavLancamento));
btnNavResumo.addEventListener('click', () => trocarAba(telaResumo, btnNavResumo));
btnNavRelatorio.addEventListener('click', () => trocarAba(telaRelatorio, btnNavRelatorio));