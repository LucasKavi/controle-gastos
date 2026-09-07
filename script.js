const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbByTK7gyDwnwYx2PvVfEYWQp9eD7MWP0S6EX1Tq9v7uI2EZnBHn8mVYrskpWnV8XaPg/exec';

let usuarioAtual = null;
let senhaAtual = null;

let dadosApp = {
    saldoInicial: 0,
    gastos: [],
    fechamentos: []
};

// ELEMENTOS DOM
const telaInicio = document.getElementById('tela-inicio');
const painelPrincipal = document.getElementById('painel-principal');
const formAuth = document.getElementById('form-auth');
const authStatusMsg = document.getElementById('auth-status-msg');

const saudacaoUsuario = document.getElementById('saudacao-usuario');
const inputSaldoInicial = document.getElementById('saldo-inicial');
const displayTotalGasto = document.getElementById('display-total-gasto');
const displaySaldoRestante = document.getElementById('display-saldo-restante');

const formGasto = document.getElementById('form-gasto');
const inputDescricao = document.getElementById('descricao');
const inputValor = document.getElementById('valor');
const tabelaBody = document.getElementById('tabela-body');
const resumoTotalGastos = document.getElementById('resumo-total-gastos');

const btnFecharMes = document.getElementById('btn-fechar-mes');
const btnSair = document.getElementById('btn-sair');
const btnSalvarSessao = document.getElementById('btn-salvar-sessao');

const modalBloqueio = document.getElementById('modal-bloqueio');
const btnFecharModal = document.getElementById('btn-fechar-modal');

// FORMATADORES BRL
function formatarBRL(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(texto) {
    if (typeof texto === 'number') return texto;
    const limpo = String(texto).replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

// RESTRIÇÃO: NÃO PERMITIR NÚMEROS NO CAMPO DESCRIÇÃO
if (inputDescricao) {
    inputDescricao.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[0-9]/g, '');
    });
}

// FORMATAR MÁSCARA MONETÁRIA NOS INPUTS
[inputSaldoInicial, inputValor].forEach(input => {
    if (input) {
        input.addEventListener('blur', (e) => {
            const val = parseBRL(e.target.value);
            e.target.value = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });
    }
});

// LOGIN / CADASTRO
formAuth.addEventListener('submit', async(e) => {
    e.preventDefault();
    const u = document.getElementById('auth-usuario').value.trim();
    const s = document.getElementById('auth-senha').value.trim();

    authStatusMsg.textContent = 'Autenticando...';

    try {
        const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'autenticarOuCadastrar', usuario: u, senha: s })
        });
        const res = await resp.json();

        if (res.status === 'sucesso') {
            usuarioAtual = u;
            senhaAtual = s;
            saudacaoUsuario.textContent = `Olá, ${u.charAt(0).toUpperCase() + u.slice(1)}`;

            telaInicio.classList.add('hidden');
            painelPrincipal.classList.remove('hidden');

            await carregarDadosNuvem();
        } else {
            authStatusMsg.textContent = res.mensagem;
        }
    } catch (err) {
        authStatusMsg.textContent = 'Erro de conexão com o servidor.';
    }
});

// CARREGAR DADOS
async function carregarDadosNuvem() {
    try {
        const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'carregarDados', usuario: usuarioAtual, senha: senhaAtual })
        });
        const res = await resp.json();

        if (res.status === 'sucesso' && res.dados) {
            dadosApp = res.dados;
            inputSaldoInicial.value = parseBRL(dadosApp.saldoInicial).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            atualizarInterface();
        }
    } catch (e) {
        console.error("Erro ao carregar dados", e);
    }
}

// SALVAR NA NUVEM
async function salvarNuvem() {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ action: 'salvarTudo', usuario: usuarioAtual, senha: senhaAtual, dadosApp })
        });
    } catch (e) {
        console.error("Erro ao salvar", e);
    }
}

// VALIDAÇÃO DE MÊS BLOQUEADO
function precisaFecharMes(dataNovoGastoIso) {
    if (!dadosApp.gastos || dadosApp.gastos.length === 0) return false;

    const [anoNovo, mesNovo] = dataNovoGastoIso.split('-').map(Number);

    for (let g of dadosApp.gastos) {
        const [anoG, mesG] = g.data.split('-').map(Number);
        if (anoNovo > anoG || (anoNovo === anoG && mesNovo > mesG)) {
            return true;
        }
    }
    return false;
}

// ADICIONAR GASTO
formGasto.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = document.getElementById('data').value;
    const descricao = inputDescricao.value.trim();
    const valor = parseBRL(inputValor.value);

    if (!data || !descricao || valor <= 0) return;

    if (precisaFecharMes(data)) {
        modalBloqueio.classList.remove('hidden');
        return;
    }

    dadosApp.gastos.push({ data, descricao, valor });
    atualizarInterface();
    salvarNuvem();

    formGasto.reset();
});

btnFecharModal.addEventListener('click', () => {
    modalBloqueio.classList.add('hidden');
});

// RENDERIZAÇÃO INTERFACE
function atualizarInterface() {
    dadosApp.saldoInicial = parseBRL(inputSaldoInicial.value);

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    displayTotalGasto.textContent = formatarBRL(totalGasto);
    displaySaldoRestante.textContent = formatarBRL(saldoRestante);
    resumoTotalGastos.textContent = formatarBRL(totalGasto);

    tabelaBody.innerHTML = '';
    dadosApp.gastos.forEach((gasto, index) => {
        const tr = document.createElement('tr');
        const [a, m, d] = gasto.data.split('-');
        tr.innerHTML = `
            <td>${d}/${m}/${a}</td>
            <td>${gasto.descricao}</td>
            <td>${formatarBRL(gasto.valor)}</td>
            <td><button class="btn-danger btn-3d btn-sm" onclick="removerGasto(${index})">🗑️</button></td>
        `;
        tabelaBody.appendChild(tr);
    });
}

window.removerGasto = function(idx) {
    dadosApp.gastos.splice(idx, 1);
    atualizarInterface();
    salvarNuvem();
};

btnFecharMes.addEventListener('click', () => {
    if (dadosApp.gastos.length === 0) return alert('Sem gastos para fechar.');

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    dadosApp.fechamentos.push({
        dataFechamento: new Date().toLocaleDateString('pt-BR'),
        saldoInicial: dadosApp.saldoInicial,
        totalGasto,
        saldoRestante: dadosApp.saldoInicial - totalGasto,
        itens: [...dadosApp.gastos]
    });

    dadosApp.gastos = [];
    atualizarInterface();
    salvarNuvem();
    alert('Mês fechado com sucesso!');
});

btnSair.addEventListener('click', () => {
    usuarioAtual = null;
    senhaAtual = null;
    painelPrincipal.classList.add('hidden');
    telaInicio.classList.remove('hidden');
    formAuth.reset();
});

// NAVEGAÇÃO DE ABAS
const abas = {
    'btn-nav-lancamento': document.getElementById('tela-lancamento'),
    'btn-nav-resumo': document.getElementById('tela-resumo'),
    'btn-nav-relatorio': document.getElementById('tela-relatorio')
};

Object.keys(abas).forEach(btnId => {
    document.getElementById(btnId).addEventListener('click', (e) => {
        Object.values(abas).forEach(t => t.classList.add('hidden'));
        Object.keys(abas).forEach(b => document.getElementById(b).classList.remove('active'));

        abas[btnId].classList.remove('hidden');
        e.target.classList.add('active');
    });
});