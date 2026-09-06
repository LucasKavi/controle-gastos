const API_URL = "https://script.google.com/macros/s/AKfycby88vN8kNSd4hD7QzNLUZ0p3CNJe0l6sNPUxS3Hw8yqkB5cypub7tmRD_qQ9n7QpL4Pww/exec";

let dadosApp = {
    saldoInicial: 0,
    gastos: [],
    fechamentos: []
};

// ELEM. DOM
const loader = document.getElementById('loader');
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

const btnSair = document.getElementById('btn-sair');
const btnFecharMes = document.getElementById('btn-fechar-mes');
const statusMsg = document.getElementById('status-msg');

// SANITIZAÇÃO DE ENTRADAS (PROTEÇÃO CONTRA XSS/MALWARE)
function sanitizarEntrada(texto) {
    const div = document.createElement('div');
    div.innerText = texto;
    return div.innerHTML;
}

function exibirLoader(exibir) {
    if (exibir) loader.classList.remove('hidden');
    else loader.classList.add('hidden');
}

// REQUISIÇÃO SEGURA PARA O BACKEND
async function requisitarAPI(dados) {
    exibirLoader(true);
    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(dados)
        });
        const resultado = await resposta.json();
        exibirLoader(false);
        return resultado;
    } catch (erro) {
        exibirLoader(false);
        alert('Erro de conexão com o servidor.');
        return null;
    }
}

// FORMATADORES
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
}

function aplicarMascaraBRL(valorTexto) {
    let apenasNumeros = valorTexto.replace(/\D/g, '');
    if (!apenasNumeros) return '0,00';
    let valorFloat = (parseFloat(apenasNumeros) / 100).toFixed(2);
    return valorFloat.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function obterValorNumericoBRL(textoBrl) {
    if (!textoBrl) return 0;
    let limpo = textoBrl.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

// CARREGAR DADOS AO ABRIR/ATUALIZAR
async function carregarDadosServidor() {
    const res = await requisitarAPI({ action: 'carregarDados' });
    if (res && res.status === 'sucesso') {
        dadosApp.saldoInicial = res.saldoInicial;
        dadosApp.gastos = res.gastos || [];
        dadosApp.fechamentos = res.fechamentos || [];

        let centavos = Math.round((dadosApp.saldoInicial || 0) * 100).toString();
        inputSaldoInicial.value = aplicarMascaraBRL(centavos);

        renderizarInterface();
    }
}

// ATUALIZAR MÁSCARA E SALVAR SALDO AO DIGITAR
let timeoutSaldo;
document.getElementById('saldo-inicial').addEventListener('input', (e) => {
    e.target.value = aplicarMascaraBRL(e.target.value);
    dadosApp.saldoInicial = obterValorNumericoBRL(e.target.value);

    renderizarInterfaceLocally();

    clearTimeout(timeoutSaldo);
    timeoutSaldo = setTimeout(async() => {
        await requisitarAPI({ action: 'salvarSaldo', saldoInicial: dadosApp.saldoInicial });
    }, 800);
});

function renderizarInterfaceLocally() {
    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    displayTotalGasto.textContent = formatarMoeda(totalGasto);
    displaySaldoRestante.textContent = formatarMoeda(saldoRestante);
    resumoTotalGastos.textContent = formatarMoeda(totalGasto);
}

function renderizarInterface() {
    renderizarInterfaceLocally();

    tabelaBody.innerHTML = '';
    dadosApp.gastos.forEach((gasto) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${sanitizarEntrada(gasto.data)}</td>
      <td>${sanitizarEntrada(gasto.descricao)}</td>
      <td>${formatarMoeda(gasto.valor)}</td>
      <td><button class="btn-delete" onclick="removerGasto('${gasto.id}')">🗑️</button></td>
    `;
        tabelaBody.appendChild(tr);
    });

    containerFechamentos.innerHTML = '';
    if (dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p style="text-align:center; color:#94a3b8;">Nenhum fechamento registrado.</p>';
    } else {
        dadosApp.fechamentos.forEach((f) => {
            const card = document.createElement('div');
            card.className = 'fechamento-card';
            card.innerHTML = `
        <button class="btn-fechar-card" onclick="removerFechamento('${f.id}')">✖</button>
        <h4>Fechamento em ${sanitizarEntrada(f.dataFechamento)}</h4>
        <p><strong>Saldo Inicial:</strong> ${formatarMoeda(f.saldoInicial)}</p>
        <p><strong>Total Gasto:</strong> ${formatarMoeda(f.totalGasto)}</p>
        <p><strong>Saldo Final:</strong> ${formatarMoeda(f.saldoRestante)}</p>
      `;
            containerFechamentos.appendChild(card);
        });
    }
}

// ADICIONAR GASTO
formGasto.addEventListener('submit', async(e) => {
    e.preventDefault();

    const data = document.getElementById('data').value;
    const descricao = document.getElementById('descricao').value.trim();
    const valor = parseFloat(document.getElementById('valor').value);

    if (!data || !descricao || isNaN(valor)) return;

    const res = await requisitarAPI({ action: 'adicionarGasto', data, descricao, valor });
    if (res && res.status === 'sucesso') {
        formGasto.reset();
        statusMsg.textContent = 'Lançamento salvo!';
        setTimeout(() => statusMsg.textContent = '', 3000);
        carregarDadosServidor();
    }
});

// REMOVER GASTO INDIVIDUAL
window.removerGasto = async function(id) {
    const res = await requisitarAPI({ action: 'removerGasto', id });
    if (res && res.status === 'sucesso') {
        carregarDadosServidor();
    }
};

// REMOVER FECHAMENTO COMPLETO
window.removerFechamento = async function(id) {
    if (confirm('Deseja excluir este relatório de fechamento?')) {
        const res = await requisitarAPI({ action: 'removerFechamento', id });
        if (res && res.status === 'sucesso') {
            carregarDadosServidor();
        }
    }
};

// FECHAR MÊS
btnFecharMes.addEventListener('click', async() => {
    if (dadosApp.gastos.length === 0) {
        alert('Não há gastos registrados para realizar o fechamento.');
        return;
    }

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    const res = await requisitarAPI({
        action: 'fecharMes',
        saldoInicial: dadosApp.saldoInicial,
        totalGasto: totalGasto,
        saldoRestante: saldoRestante
    });

    if (res && res.status === 'sucesso') {
        alert('Mês fechado com sucesso!');
        carregarDadosServidor();
    }
});

// NAVEGAÇÃO E INICIALIZAÇÃO
btnIniciar.addEventListener('click', () => {
    telaInicio.classList.add('hidden');
    painelPrincipal.classList.remove('hidden');
    carregarDadosServidor();
});

btnSair.addEventListener('click', () => {
    painelPrincipal.classList.add('hidden');
    telaInicio.classList.remove('hidden');
});

function trocarAba(abaAtiva, btnAtivo) {
    [telaLancamento, telaResumo, telaRelatorio].forEach(t => t.classList.add('hidden'));
    [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => b.classList.remove('active'));

    abaAtiva.classList.remove('hidden');
    btnAtivo.classList.add('active');
}

btnNavLancamento.addEventListener('click', () => trocarAba(telaLancamento, btnNavLancamento));
btnNavResumo.addEventListener('click', () => trocarAba(telaResumo, btnNavResumo));
btnNavRelatorio.addEventListener('click', () => trocarAba(telaRelatorio, btnNavRelatorio));