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

    // Renderizar Tabela
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
            card.className = 'card';
            card.style.background = '#f8fafc';
            card.innerHTML = `
        <h4 style="color: #1b365d; margin-bottom: 6px;">Fechamento #${idx + 1} - ${f.dataFechamento}</h4>
        <p><strong>Saldo Inicial:</strong> R$ ${f.saldoInicial.toFixed(2)}</p>
        <p><strong>Total Gasto:</strong> R$ ${f.totalGasto.toFixed(2)}</p>
        <p><strong>Saldo Final:</strong> R$ ${f.saldoRestante.toFixed(2)}</p>
      `;
            containerFechamentos.appendChild(card);
        });
    }

    salvarDadosNoAparelho();
}

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