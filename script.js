// ==========================================
// CONFIGURAÇÃO DA API DO GOOGLE APPS SCRIPT
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbz1ByHSj8YUKCTDLloEdLHNGyv2IOlME0ZSyjMr1HS0aV_kwOH73ZizkvPwgzPzojCppg/exec";

// ==========================================
// SELETORES DO DOM
// ==========================================
const telaInicio = document.getElementById('tela-inicio');
const telaRecuperarSenha = document.getElementById('tela-recuperar-senha');
const painelPrincipal = document.getElementById('painel-principal');

const formAuth = document.getElementById('form-auth');
const inputUsuario = document.getElementById('auth-usuario');
const inputEmail = document.getElementById('auth-email');
const inputSenha = document.getElementById('auth-senha');
const groupEmail = document.getElementById('group-auth-email');
const btnToggleCadastro = document.getElementById('btn-toggle-cadastro');
const authStatusMsg = document.getElementById('auth-status-msg');

const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');
const btnVoltarLogin = document.getElementById('btn-voltar-login');
const formRecuperarSenha = document.getElementById('form-recuperar-senha');
const recUsuario = document.getElementById('rec-usuario');
const recEmail = document.getElementById('rec-email');
const recStatusMsg = document.getElementById('rec-status-msg');

const saudacaoUsuario = document.getElementById('saudacao-usuario');
const btnSair = document.getElementById('btn-sair');
const btnSalvarSessao = document.getElementById('btn-salvar-sessao');

// Navegação de Abas
const btnNavLancamento = document.getElementById('btn-nav-lancamento');
const btnNavResumo = document.getElementById('btn-nav-resumo');
const btnNavRelatorio = document.getElementById('btn-nav-relatorio');

const telaLancamento = document.getElementById('tela-lancamento');
const telaResumo = document.getElementById('tela-resumo');
const telaRelatorio = document.getElementById('tela-relatorio');

// Elementos Financeiros
const inputSaldoInicial = document.getElementById('saldo-inicial');
const displayTotalGasto = document.getElementById('display-total-gasto');
const displaySaldoRestante = document.getElementById('display-saldo-restante');
const formGasto = document.getElementById('form-gasto');
const inputDataGasto = document.getElementById('data');
const inputDescricaoGasto = document.getElementById('descricao');
const inputValorGasto = document.getElementById('valor');
const statusMsgGasto = document.getElementById('status-msg');
const tabelaBody = document.getElementById('tabela-body');
const resumoTotalGastos = document.getElementById('resumo-total-gastos');
const btnFecharMes = document.getElementById('btn-fechar-mes');
const containerFechamentos = document.getElementById('container-fechamentos');

// Modais
const modalBloqueio = document.getElementById('modal-bloqueio');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnLoginBiometria = document.getElementById('btn-login-biometria');
const modalBiometria = document.getElementById('modal-biometria');
const btnAtivarBiometria = document.getElementById('btn-ativar-biometria');
const btnRecusarBiometria = document.getElementById('btn-recusar-biometria');

// Variáveis de Estado Global
let modoCadastro = false;
let usuarioAtual = '';
let senhaAtual = '';
let dadosFinanceiros = { saldoInicial: 0, gastos: [], fechamentos: [] };

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ==========================================
// FUNÇÕES AUXILIARES DE BUFFER/BASE64 (WEBAUTHN)
// ==========================================
function bufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    const bioId = localStorage.getItem('bio_cred_id');
    if (bioId && btnLoginBiometria) {
        btnLoginBiometria.classList.remove('hidden');
    }
});

// ==========================================
// COMPORTAMENTO DAS ABAS DE NAVEGAÇÃO
// ==========================================
function alternarAba(abaAtiva, btnAtivo) {
    [telaLancamento, telaResumo, telaRelatorio].forEach(t => {
        if (t) t.classList.add('hidden');
    });
    [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => {
        if (b) b.classList.remove('active');
    });

    if (abaAtiva) abaAtiva.classList.remove('hidden');
    if (btnAtivo) btnAtivo.classList.add('active');
}

if (btnNavLancamento) btnNavLancamento.addEventListener('click', () => alternarAba(telaLancamento, btnNavLancamento));
if (btnNavResumo) btnNavResumo.addEventListener('click', () => alternarAba(telaResumo, btnNavResumo));
if (btnNavRelatorio) btnNavRelatorio.addEventListener('click', () => alternarAba(telaRelatorio, btnNavRelatorio));

// Alternar Login/Cadastro
if (btnToggleCadastro) {
    btnToggleCadastro.addEventListener('click', () => {
        modoCadastro = !modoCadastro;
        if (modoCadastro) {
            groupEmail.classList.remove('hidden');
            inputEmail.setAttribute('required', 'true');
            btnToggleCadastro.textContent = 'Já tem uma conta? Faça login aqui';
        } else {
            groupEmail.classList.add('hidden');
            inputEmail.removeAttribute('required');
            btnToggleCadastro.textContent = 'Primeiro acesso? Cadastre-se aqui';
        }
    });
}

// Navegação para Recuperação de Senha
if (btnEsqueciSenha) {
    btnEsqueciSenha.addEventListener('click', () => {
        telaInicio.classList.add('hidden');
        telaRecuperarSenha.classList.remove('hidden');
    });
}

if (btnVoltarLogin) {
    btnVoltarLogin.addEventListener('click', () => {
        telaRecuperarSenha.classList.add('hidden');
        telaInicio.classList.remove('hidden');
    });
}

if (btnFecharModal) {
    btnFecharModal.addEventListener('click', () => {
        if (modalBloqueio) modalBloqueio.classList.add('hidden');
    });
}

// ==========================================
// LOGIN E CADASTRO TRADICIONAL
// ==========================================
if (formAuth) {
    formAuth.addEventListener('submit', async(e) => {
        e.preventDefault();

        const u = inputUsuario.value.trim();
        const email = inputEmail.value.trim();
        const s = inputSenha.value.trim();

        authStatusMsg.style.color = '#1b365d';
        authStatusMsg.textContent = 'Conectando ao servidor...';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'autenticarOuCadastrar',
                    usuario: u,
                    email: email,
                    senha: s
                })
            });

            const result = await response.json();

            if (result.status === 'sucesso') {
                authStatusMsg.textContent = '';
                await efetuarLoginSucesso(u, s);
            } else {
                authStatusMsg.style.color = '#e53e3e';
                authStatusMsg.textContent = result.mensagem || 'Erro ao autenticar.';
            }
        } catch (err) {
            authStatusMsg.style.color = '#e53e3e';
            authStatusMsg.textContent = 'Erro de conexão com o servidor.';
        }
    });
}

// RECUPERAR SENHA
if (formRecuperarSenha) {
    formRecuperarSenha.addEventListener('submit', async(e) => {
        e.preventDefault();

        const u = recUsuario.value.trim();
        const email = recEmail.value.trim();

        recStatusMsg.style.color = '#1b365d';
        recStatusMsg.textContent = 'Enviando link de redefinição...';

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'recuperarSenha',
                    usuario: u,
                    email: email
                })
            });

            const result = await response.json();
            recStatusMsg.style.color = result.status === 'sucesso' ? '#38a169' : '#e53e3e';
            recStatusMsg.textContent = result.mensagem;
        } catch (err) {
            recStatusMsg.style.color = '#e53e3e';
            recStatusMsg.textContent = 'Erro de conexão ao solicitar redefinição.';
        }
    });
}

// ==========================================
// REGISTRO DE BIOMETRIA (WEBAUTHN)
// ==========================================
if (btnAtivarBiometria) {
    btnAtivarBiometria.addEventListener('click', async() => {
        if (!window.PublicKeyCredential) {
            alert('Seu navegador ou dispositivo não suporta autenticação biométrica.');
            modalBiometria.classList.add('hidden');
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const userId = new TextEncoder().encode(usuarioAtual);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: challenge,
                    rp: { name: "Painel Financeiro" },
                    user: {
                        id: userId,
                        name: usuarioAtual,
                        displayName: usuarioAtual
                    },
                    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                    authenticatorSelection: {
                        authenticatorAttachment: "platform", // Força o leitor nativo (Digital / Face ID / PIN)
                        userVerification: "required"
                    },
                    timeout: 60000
                }
            });

            if (credential) {
                const credIdBase64 = bufferToBase64(credential.rawId);
                localStorage.setItem('bio_cred_id', credIdBase64);
                localStorage.setItem('bio_u', usuarioAtual);
                localStorage.setItem('bio_s', senhaAtual);

                if (btnLoginBiometria) btnLoginBiometria.classList.remove('hidden');
                modalBiometria.classList.add('hidden');
                alert('Biometria ativada com sucesso! Nas próximas vezes você poderá entrar com a sua digital.');
            }
        } catch (err) {
            console.error("Erro ao registrar biometria:", err);
            alert('Não foi possível registrar a biometria.');
        }
    });
}

if (btnRecusarBiometria) {
    btnRecusarBiometria.addEventListener('click', () => {
        modalBiometria.classList.add('hidden');
    });
}

// ==========================================
// LOGIN COM BIOMETRIA
// ==========================================
if (btnLoginBiometria) {
    btnLoginBiometria.addEventListener('click', async() => {
        const credIdBase64 = localStorage.getItem('bio_cred_id');
        const u = localStorage.getItem('bio_u');
        const s = localStorage.getItem('bio_s');

        if (!credIdBase64 || !u || !s) {
            alert('Nenhuma biometria cadastrada neste dispositivo. Faça login manual.');
            return;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const rawId = base64ToBuffer(credIdBase64);

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: challenge,
                    allowCredentials: [{
                        id: rawId,
                        type: 'public-key'
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            if (assertion) {
                authStatusMsg.style.color = '#1b365d';
                authStatusMsg.textContent = 'Autenticando via Biometria...';

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'autenticarOuCadastrar', usuario: u, senha: s })
                });

                const data = await response.json();
                if (data.status === 'sucesso') {
                    authStatusMsg.textContent = '';
                    await efetuarLoginSucesso(u, s);
                } else {
                    alert('Falha ao autenticar. Faça login com usuário e senha.');
                }
            }
        } catch (err) {
            console.error("Erro ao validar biometria:", err);
            alert('Autenticação biométrica cancelada ou não reconhecida.');
        }
    });
}

// ==========================================
// LOGIN BEM-SUCEDIDO E CARREGAMENTO DE DADOS
// ==========================================
async function efetuarLoginSucesso(u, s) {
    usuarioAtual = u;
    senhaAtual = s;
    if (saudacaoUsuario) {
        saudacaoUsuario.textContent = `Olá, ${u.charAt(0).toUpperCase() + u.slice(1)}`;
    }

    telaInicio.classList.add('hidden');
    telaRecuperarSenha.classList.add('hidden');
    painelPrincipal.classList.remove('hidden');

    await carregarDadosNuvem();

    const bioId = localStorage.getItem('bio_cred_id');
    if (window.PublicKeyCredential && !bioId) {
        modalBiometria.classList.remove('hidden');
    }
}

async function carregarDadosNuvem() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'carregarDados', usuario: usuarioAtual })
        });

        const res = await response.json();
        if (res.status === 'sucesso' && res.dados) {
            dadosFinanceiros = {
                saldoInicial: Number(res.dados.saldoInicial) || 0,
                gastos: Array.isArray(res.dados.gastos) ? res.dados.gastos : [],
                fechamentos: Array.isArray(res.dados.fechamentos) ? res.dados.fechamentos : []
            };
            atualizarInterface();
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
    }
}

// ==========================================
// LÓGICA FINANCEIRA E INTERFACE
// ==========================================

// Atualização de Saldo Inicial
if (inputSaldoInicial) {
    inputSaldoInicial.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^\d,. ]/g, '').replace(',', '.');
        dadosFinanceiros.saldoInicial = parseFloat(val) || 0;
        atualizarCalculos();
    });
}

// Adicionar Novo Gasto
if (formGasto) {
    formGasto.addEventListener('submit', (e) => {
        e.preventDefault();

        const dataStr = inputDataGasto.value;
        const descStr = inputDescricaoGasto.value.trim();
        let valStr = inputValorGasto.value.replace('.', '').replace(',', '.');
        const valorNum = parseFloat(valStr) || 0;

        if (!dataStr || !descStr || valorNum <= 0) {
            if (statusMsgGasto) {
                statusMsgGasto.style.color = '#e53e3e';
                statusMsgGasto.textContent = 'Preencha todos os campos corretamente.';
            }
            return;
        }

        dadosFinanceiros.gastos.push({
            data: dataStr,
            descricao: descStr,
            valor: valorNum
        });

        formGasto.reset();
        if (statusMsgGasto) {
            statusMsgGasto.style.color = '#38a169';
            statusMsgGasto.textContent = 'Gasto adicionado com sucesso!';
            setTimeout(() => { statusMsgGasto.textContent = ''; }, 3000);
        }

        atualizarInterface();
    });
}

// Função de Remoção de Gasto
window.removerGasto = function(index) {
    dadosFinanceiros.gastos.splice(index, 1);
    atualizarInterface();
};

// Fechar Mês Atual
if (btnFecharMes) {
    btnFecharMes.addEventListener('click', () => {
        if (dadosFinanceiros.gastos.length === 0) {
            alert('Não há lançamentos para fechar o mês.');
            return;
        }

        const totalMes = dadosFinanceiros.gastos.reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
        const dataHoje = new Date().toLocaleDateString('pt-BR');

        dadosFinanceiros.fechamentos.push({
            dataFechamento: dataHoje,
            totalGasto: totalMes,
            itens: [...dadosFinanceiros.gastos]
        });

        dadosFinanceiros.gastos = [];
        atualizarInterface();
        alert('Mês fechado com sucesso! Os lançamentos foram movidos para o histórico de fechamentos.');
    });
}

// Cálculos do Painel
function atualizarCalculos() {
    const totalGasto = dadosFinanceiros.gastos.reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    const saldoRestante = dadosFinanceiros.saldoInicial - totalGasto;

    const fmt = (v) => `R$ ${v.toFixed(2).replace('.', ',')}`;

    if (displayTotalGasto) displayTotalGasto.textContent = fmt(totalGasto);
    if (displaySaldoRestante) displaySaldoRestante.textContent = fmt(saldoRestante);
    if (resumoTotalGastos) resumoTotalGastos.textContent = fmt(totalGasto);
}

// Renderização Geral
function atualizarInterface() {
    if (inputSaldoInicial && !inputSaldoInicial.matches(':focus')) {
        inputSaldoInicial.value = dadosFinanceiros.saldoInicial ? dadosFinanceiros.saldoInicial.toFixed(2).replace('.', ',') : '';
    }

    atualizarCalculos();

    // Tabela de Gastos do Mês
    if (tabelaBody) {
        tabelaBody.innerHTML = '';
        if (dadosFinanceiros.gastos.length === 0) {
            tabelaBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#718096;">Nenhum gasto lançado este mês.</td></tr>';
        } else {
            dadosFinanceiros.gastos.forEach((gasto, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${gasto.data}</td>
                    <td>${gasto.descricao}</td>
                    <td>R$ ${Number(gasto.valor).toFixed(2).replace('.', ',')}</td>
                    <td><button onclick="removerGasto(${idx})" class="btn-danger btn-sm" style="padding: 2px 8px;">✕</button></td>
                `;
                tabelaBody.appendChild(tr);
            });
        }
    }

    // Histórico de Fechamentos
    if (containerFechamentos) {
        containerFechamentos.innerHTML = '';
        if (dadosFinanceiros.fechamentos.length === 0) {
            containerFechamentos.innerHTML = '<div class="card"><p style="color:#718096; text-align:center;">Nenhum fechamento realizado.</p></div>';
        } else {
            dadosFinanceiros.fechamentos.forEach((fechamento, idx) => {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.marginBottom = '12px';
                card.innerHTML = `
                    <h4>Fechamento #${idx + 1} - ${fechamento.dataFechamento}</h4>
                    <p style="margin: 8px 0; font-weight: bold; color: #1b365d;">Total Fechado: R$ ${Number(fechamento.totalGasto).toFixed(2).replace('.', ',')}</p>
                    <p style="font-size: 0.85rem; color: #4a5568;">Total de itens: ${fechamento.itens ? fechamento.itens.length : 0}</p>
                `;
                containerFechamentos.appendChild(card);
            });
        }
    }
}

// SALVAR NA NUVEM
if (btnSalvarSessao) {
    btnSalvarSessao.addEventListener('click', async() => {
        btnSalvarSessao.textContent = 'Salvando...';
        try {
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'salvarTudo',
                    usuario: usuarioAtual,
                    dadosApp: dadosFinanceiros
                })
            });
            const res = await resp.json();
            btnSalvarSessao.textContent = 'Salvar';
            if (res.status === 'sucesso') {
                alert('Dados salvos na nuvem com sucesso!');
            } else {
                alert('Erro ao salvar: ' + res.mensagem);
            }
        } catch (e) {
            btnSalvarSessao.textContent = 'Salvar';
            alert('Erro de conexão ao salvar os dados.');
        }
    });
}

// LOGOUT
if (btnSair) {
    btnSair.addEventListener('click', () => {
        usuarioAtual = '';
        senhaAtual = '';
        dadosFinanceiros = { saldoInicial: 0, gastos: [], fechamentos: [] };
        painelPrincipal.classList.add('hidden');
        telaInicio.classList.remove('hidden');
    });
}