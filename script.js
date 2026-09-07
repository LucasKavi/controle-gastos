const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbByTK7gyDwnwYx2PvVfEYWQp9eD7MWP0S6EX1Tq9v7uI2EZnBHn8mVYrskpWnV8XaPg/exec';

let usuarioAtual = null;
let senhaAtual = null;

let dadosApp = {
    saldoInicial: 0,
    gastos: [],
    fechamentos: []
};

// REGEX SENHA FORTE: 8 a 16 caracteres, 1 número, 1 caractere especial
const regexSenhaForte = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,16}$/;

// ELEMENTOS DOM
const telaInicio = document.getElementById('tela-inicio');
const painelPrincipal = document.getElementById('painel-principal');
const formAuth = document.getElementById('form-auth');
const authStatusMsg = document.getElementById('auth-status-msg');
const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');

const saudacaoUsuario = document.getElementById('saudacao-usuario');
const inputSaldoInicial = document.getElementById('saldo-inicial');
const displayTotalGasto = document.getElementById('display-total-gasto');
const displaySaldoRestante = document.getElementById('display-saldo-restante');

const formGasto = document.getElementById('form-gasto');
const inputDescricao = document.getElementById('descricao');
const inputValor = document.getElementById('valor');
const tabelaBody = document.getElementById('tabela-body');
const resumoTotalGastos = document.getElementById('resumo-total-gastos');
const containerFechamentos = document.getElementById('container-fechamentos');

const btnFecharMes = document.getElementById('btn-fechar-mes');
const btnSair = document.getElementById('btn-sair');
const btnSalvarSessao = document.getElementById('btn-salvar-sessao');

const modalBloqueio = document.getElementById('modal-bloqueio');
const btnFecharModal = document.getElementById('btn-fechar-modal');

// FORMATADORES
function formatarBRL(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseBRL(texto) {
    if (typeof texto === 'number') return texto;
    const limpo = String(texto).replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(limpo) || 0;
}

// RESTRIÇÃO: REMOVER NÚMEROS DO CAMPO DESCRIÇÃO
if (inputDescricao) {
    inputDescricao.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[0-9]/g, '');
    });
}

// FORMATAÇÃO DE MÁSCARA MONETÁRIA NOS INPUTS
[inputSaldoInicial, inputValor].forEach(input => {
    if (input) {
        input.addEventListener('blur', (e) => {
            const val = parseBRL(e.target.value);
            e.target.value = val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });
    }
});

// LOGIN E CADASTRO
formAuth.addEventListener('submit', async(e) => {
    e.preventDefault();
    const u = document.getElementById('auth-usuario').value.trim();
    const email = document.getElementById('auth-email').value.trim();
    const s = document.getElementById('auth-senha').value.trim();

    authStatusMsg.style.color = 'var(--danger)';

    if (u.length < 3) {
        authStatusMsg.textContent = 'O usuário deve ter pelo menos 3 caracteres.';
        return;
    }

    if (!regexSenhaForte.test(s)) {
        authStatusMsg.textContent = 'A senha deve ter entre 8 e 16 caracteres, contendo pelo menos 1 número e 1 caractere especial (!@#$...).';
        return;
    }

    authStatusMsg.style.color = 'var(--primary)';
    authStatusMsg.textContent = 'Verificando credenciais...';

    try {
        const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'autenticarOuCadastrar', usuario: u, email, senha: s })
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
            authStatusMsg.style.color = 'var(--danger)';
            authStatusMsg.textContent = res.mensagem;
        }
    } catch (err) {
        authStatusMsg.style.color = 'var(--danger)';
        authStatusMsg.textContent = 'Erro de conexão com o servidor.';
    }
});

// RECUPERAÇÃO DE SENHA POR EMAIL
btnEsqueciSenha.addEventListener('click', async() => {
    const u = document.getElementById('auth-usuario').value.trim();
    const email = document.getElementById('auth-email').value.trim();

    if (!u || !email) {
        authStatusMsg.style.color = 'var(--danger)';
        authStatusMsg.textContent = 'Preencha Usuário e E-mail para redefinir a senha.';
        return;
    }

    authStatusMsg.style.color = 'var(--primary)';
    authStatusMsg.textContent = 'Solicitando redefinição...';

    try {
        const resp = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'recuperarSenha', usuario: u, email })
        });
        const res = await resp.json();

        if (res.status === 'sucesso') {
            authStatusMsg.style.color = 'var(--success)';
        } else {
            authStatusMsg.style.color = 'var(--danger)';
        }
        authStatusMsg.textContent = res.mensagem;
    } catch (e) {
        authStatusMsg.style.color = 'var(--danger)';
        authStatusMsg.textContent = 'Erro ao conectar com o servidor.';
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
            if (!dadosApp.fechamentos) dadosApp.fechamentos = [];
            if (!dadosApp.gastos) dadosApp.gastos = [];

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

if (btnSalvarSessao) {
    btnSalvarSessao.addEventListener('click', async() => {
        await salvarNuvem();
        alert('Dados salvos na nuvem com sucesso!');
    });
}

// REGRA: SE O MÊS VIRAR, NÃO PODE LANÇAR SEM FECHAR O ANTERIOR
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

// NOVO LANÇAMENTO
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

// EXTRAI APENAS O MÊS E ANO (MM/AAAA)
function obterMesAno(gastos, dataFechamentoIso) {
    if (gastos && gastos.length > 0) {
        const [ano, mes] = gastos[0].data.split('-');
        return `${mes}/${ano}`;
    }
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${m}/${d.getFullYear()}`;
}

// RENDERIZAÇÃO DA INTERFACE E HISTÓRICO
function atualizarInterface() {
    dadosApp.saldoInicial = parseBRL(inputSaldoInicial.value);

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const saldoRestante = dadosApp.saldoInicial - totalGasto;

    displayTotalGasto.textContent = formatarBRL(totalGasto);
    displaySaldoRestante.textContent = formatarBRL(saldoRestante);
    resumoTotalGastos.textContent = formatarBRL(totalGasto);

    // 1. Tabela de Gastos do Mês Atual
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

    // 2. Renderização da Aba Fechamentos (Estilo Extrato)
    containerFechamentos.innerHTML = '';

    if (!dadosApp.fechamentos || dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p style="font-size: 0.9rem; color: #64748b; text-align: center;">Nenhum fechamento realizado ainda.</p>';
        return;
    }

    // Exibe os fechamentos do mais recente para o mais antigo
    [...dadosApp.fechamentos].reverse().forEach((fechamento) => {
        const mesAnoRef = fechamento.mesReferencia || obterMesAno(fechamento.itens);

        let itensHtml = '';
        if (fechamento.itens && fechamento.itens.length > 0) {
            fechamento.itens.forEach(item => {
                const [a, m, d] = item.data.split('-');
                itensHtml += `
                    <tr>
                        <td>${d}/${m}/${a}</td>
                        <td>${item.descricao}</td>
                        <td style="text-align: right;">${formatarBRL(item.valor)}</td>
                    </tr>
                `;
            });
        }

        const extratoCard = document.createElement('div');
        extratoCard.className = 'card-extrato';
        extratoCard.innerHTML = `
            <div class="extrato-header">
                <h4><span>💳 Extrato de Fechamento</span> <strong>Mês: ${mesAnoRef}</strong></h4>
            </div>
            <div class="extrato-resumo-info">
                <p><span>Saldo Inicial:</span> <strong>${formatarBRL(fechamento.saldoInicial)}</strong></p>
                <p><span>Total de Gastos:</span> <strong style="color: var(--danger);">${formatarBRL(fechamento.totalGasto)}</strong></p>
                <p><span>Saldo Restante:</span> <strong style="color: var(--primary);">${formatarBRL(fechamento.saldoRestante)}</strong></p>
            </div>
            <table class="extrato-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th style="text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${itensHtml}
                </tbody>
            </table>
        `;
        containerFechamentos.appendChild(extratoCard);
    });
}

window.removerGasto = function(idx) {
    dadosApp.gastos.splice(idx, 1);
    atualizarInterface();
    salvarNuvem();
};

// AÇÃO DE FECHAR O MÊS ATUAL
btnFecharMes.addEventListener('click', () => {
    if (dadosApp.gastos.length === 0) return alert('Sem gastos para fechar no mês atual.');

    const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
    const mesAnoRef = obterMesAno(dadosApp.gastos);

    dadosApp.fechamentos.push({
        mesReferencia: mesAnoRef,
        dataFechamento: new Date().toLocaleDateString('pt-BR'),
        saldoInicial: dadosApp.saldoInicial,
        totalGasto: totalGasto,
        saldoRestante: dadosApp.saldoInicial - totalGasto,
        itens: [...dadosApp.gastos]
    });

    dadosApp.gastos = [];
    atualizarInterface();
    salvarNuvem();
    alert(`Mês ${mesAnoRef} fechado com sucesso! Os lançamentos foram movidos para o histórico.`);
});

btnSair.addEventListener('click', () => {
    usuarioAtual = null;
    senhaAtual = null;
    painelPrincipal.classList.add('hidden');
    telaInicio.classList.remove('hidden');
    formAuth.reset();
});

// TROCA DE ABAS
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