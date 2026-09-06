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

// FORMATAR VALOR PARA MOEDA REAL (R$ 1.000,00)
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor || 0);
}

// FORMATAR INPUT DIGITADO PARA MÁSCARA BRL (EX: 1.000,00)
function aplicarMascaraBRL(valorTexto) {
    let apenasNumeros = valorTexto.replace(/\D/g, '');
    if (!apenasNumeros) return '0,00';
    let valorFloat = (parseFloat(apenasNumeros) / 100).toFixed(2);
    return valorFloat.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// CONVERTER TEXTO BRL PARA NÚMERO FLOAT
function obterValorNumericoBRL(textoBrl) {
    if (!textoBrl) return 0;
    let limpo = textoBrl.replace(/\./g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

// FORMATAR DATA: AAAA-MM-DD -> DD/MM/AAAA
function formatarDataBR(dataIso) {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// CARREGAR DADOS DO ARMAZENAMENTO LOCAL
function carregarDadosSalvos() {
    const dadosLocais = localStorage.getItem('controle_gastos_dados');
    if (dadosLocais) {
        dadosApp = JSON.parse(dadosLocais);
    }

    let valorEmCentavos = Math.round((dadosApp.saldoInicial || 0) * 100).toString();
    inputSaldoInicial.value = aplicarMascaraBRL(valorEmCentavos);
    atualizarInterface();
}

function salvarDadosNoAparelho() {
    localStorage.setItem('controle_gastos_dados', JSON.stringify(dadosApp));
}

// MÁSCARA EM TEMPO REAL NO CAMPO DE SALDO INICIAL
inputSaldoInicial.addEventListener('input', (e) => {
    e.target.value = aplicarMascaraBRL(e.target.value);
    atualizarInterface();
});

// ATUALIZAR CÁLCULOS E A INTERFACE DO USUÁRIO
function atualizarInterface() {
    dadosApp.saldoInicial = obterValorNumericoBRL(inputSaldoInicial.value);

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    displayTotalGasto.textContent = formatarMoeda(totalGasto);
    displaySaldoRestante.textContent = formatarMoeda(saldoRestante);
    resumoTotalGastos.textContent = formatarMoeda(totalGasto);

    // Renderizar Tabela de Resumo
    tabelaBody.innerHTML = '';
    dadosApp.gastos.forEach((gasto, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${formatarDataBR(gasto.data)}</td>
      <td>${gasto.descricao}</td>
      <td>${formatarMoeda(gasto.valor)}</td>
      <td><button class="btn-delete" onclick="removerGasto(${index})" title="Excluir item">🗑️</button></td>
    `;
        tabelaBody.appendChild(tr);
    });

    // Renderizar Fechamentos com Ícone "x" de exclusão no canto direito
    containerFechamentos.innerHTML = '';
    if (dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p class="empty-msg">Nenhum fechamento realizado ainda.</p>';
    } else {
        dadosApp.fechamentos.forEach((f, idx) => {
            const card = document.createElement('div');
            card.className = 'fechamento-card';

            card.innerHTML = `
        <button class="btn-fechar-card" onclick="removerFechamento(${idx})" title="Excluir este fechamento">✖</button>
        <h4>Fechamento #${idx + 1} - ${f.dataFechamento}</h4>
        <p><strong>Saldo Inicial:</strong> ${formatarMoeda(f.saldoInicial)}</p>
        <p><strong>Total Gasto:</strong> ${formatarMoeda(f.totalGasto)}</p>
        <p><strong>Saldo Final:</strong> ${formatarMoeda(f.saldoRestante)}</p>
      `;
            containerFechamentos.appendChild(card);
        });
    }

    salvarDadosNoAparelho();
}

// ADICIONAR UM NOVO GASTO
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

// REMOVER GASTO INDIVIDUAL
window.removerGasto = function(index) {
    dadosApp.gastos.splice(index, 1);
    atualizarInterface();
};

// REMOVER FECHAMENTO COMPLETO
window.removerFechamento = function(index) {
    if (confirm(`Deseja realmente excluir o Fechamento #${index + 1}?`)) {
        dadosApp.fechamentos.splice(index, 1);
        atualizarInterface();
    }
};

// FECHAR O MÊS
btnFecharMes.addEventListener('click', () => {
    if (dadosApp.gastos.length === 0) {
        alert('Não há lançamentos para fechar o mês.');
        return;
    }

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');

    dadosApp.fechamentos.push({
        dataFechamento: dataFormatada,
        saldoInicial: dadosApp.saldoInicial,
        totalGasto: totalGasto,
        saldoRestante: dadosApp.saldoInicial - totalGasto,
        itens: [...dadosApp.gastos]
    });

    dadosApp.gastos = [];
    atualizarInterface();
    alert('Mês fechado com sucesso!');
});

// EVENTOS DE TELA E NAVEGAÇÃO
window.addEventListener('DOMContentLoaded', () => {
    telaInicio.classList.remove('hidden');
    painelPrincipal.classList.add('hidden');
});

btnIniciar.addEventListener('click', () => {
    telaInicio.classList.add('hidden');
    painelPrincipal.classList.remove('hidden');
    carregarDadosSalvos();
});

btnSalvarSessao.addEventListener('click', () => {
    salvarDadosNoAparelho();
    alert('Dados salvos com sucesso!');
});

btnSair.addEventListener('click', () => {
    salvarDadosNoAparelho();
    painelPrincipal.classList.add('hidden');
    telaInicio.classList.remove('hidden');
});

// TROCA DE ABAS
function trocarAba(abaAtiva, btnAtivo) {
    [telaLancamento, telaResumo, telaRelatorio].forEach(t => t.classList.add('hidden'));
    [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => b.classList.remove('active'));

    abaAtiva.classList.remove('hidden');
    btnAtivo.classList.add('active');
}

btnNavLancamento.addEventListener('click', () => trocarAba(telaLancamento, btnNavLancamento));
btnNavResumo.addEventListener('click', () => trocarAba(telaResumo, btnNavResumo));
btnNavRelatorio.addEventListener('click', () => trocarAba(telaRelatorio, btnNavRelatorio));