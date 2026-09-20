// ==========================================
// CONFIGURAÇÃO DA API DO GOOGLE APPS SCRIPT
// ==========================================
// (Substitua pela sua URL de implantação web do Apps Script)
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

// Elementos de Biometria
const btnLoginBiometria = document.getElementById('btn-login-biometria');
const modalBiometria = document.getElementById('modal-biometria');
const btnAtivarBiometria = document.getElementById('btn-ativar-biometria');
const btnRecusarBiometria = document.getElementById('btn-recusar-biometria');

// Variáveis de Estado
let modoCadastro = false;
let usuarioAtual = '';
let senhaAtual = '';
let dadosFinanceiros = { saldoInicial: 0, gastos: [], fechamentos: [] };

// Verifica se está em um dispositivo móvel
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ==========================================
// INICIALIZAÇÃO E BIOMETRIA
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    // Exibe botão de biometria na tela de login se ativado no mobile
    if (isMobile) {
        const bioAtiva = localStorage.getItem('biometria_configurada');
        if (bioAtiva === 'true' && btnLoginBiometria) {
            btnLoginBiometria.classList.remove('hidden');
        }
    }
});

// Botão de alternar entre "Login" e "Cadastro"
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

// ==========================================
// SUBMIT: LOGIN / CADASTRO
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

// ==========================================
// SUBMIT: RECUPERAR SENHA (ENVIA LINK NO E-MAIL)
// ==========================================
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

            if (result.status === 'sucesso') {
                recStatusMsg.style.color = '#38a169';
                recStatusMsg.textContent = result.mensagem;
            } else {
                recStatusMsg.style.color = '#e53e3e';
                recStatusMsg.textContent = result.mensagem;
            }
        } catch (err) {
            recStatusMsg.style.color = '#e53e3e';
            recStatusMsg.textContent = 'Erro de conexão ao solicitar redefinição.';
        }
    });
}

// ==========================================
// ENTRAR COM BIOMETRIA
// ==========================================
if (btnLoginBiometria) {
    btnLoginBiometria.addEventListener('click', async() => {
        const u = localStorage.getItem('bio_u');
        const s = localStorage.getItem('bio_s');

        if (u && s && window.PublicKeyCredential) {
            try {
                const challenge = new Uint8Array(32);
                window.crypto.getRandomValues(challenge);

                await navigator.credentials.get({
                    publicKey: { challenge: challenge, timeout: 60000, userVerification: "required" }
                });

                // Valida na nuvem após a confirmação biométrica
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({ action: 'autenticarOuCadastrar', usuario: u, senha: s })
                });

                const data = await response.json();
                if (data.status === 'sucesso') {
                    await efetuarLoginSucesso(u, s);
                } else {
                    alert('Credenciais biométricas expiradas. Faça o login manual.');
                }
            } catch (err) {
                alert('Autenticação biométrica não concluída.');
            }
        }
    });
}

// AÇÕES DO MODAL DE BIOMETRIA
if (btnAtivarBiometria) {
    btnAtivarBiometria.addEventListener('click', () => {
        if (!isMobile) {
            alert('A biometria é exclusiva para uso em dispositivos móveis.');
            modalBiometria.classList.add('hidden');
            return;
        }

        if (window.PublicKeyCredential) {
            localStorage.setItem('biometria_configurada', 'true');
            localStorage.setItem('bio_u', usuarioAtual);
            localStorage.setItem('bio_s', senhaAtual);

            if (btnLoginBiometria) btnLoginBiometria.classList.remove('hidden');
            modalBiometria.classList.add('hidden');
            alert('Biometria ativada com sucesso!');
        }
    });
}

if (btnRecusarBiometria) {
    btnRecusarBiometria.addEventListener('click', () => {
        modalBiometria.classList.add('hidden');
    });
}

// ==========================================
// SUCESSO NO LOGIN & CARREGAMENTO DOS DADOS
// ==========================================
async function efetuarLoginSucesso(u, s) {
    usuarioAtual = u;
    senhaAtual = s;
    saudacaoUsuario.textContent = `Olá, ${u.charAt(0).toUpperCase() + u.slice(1)}`;

    telaInicio.classList.add('hidden');
    telaRecuperarSenha.classList.add('hidden');
    painelPrincipal.classList.remove('hidden');

    // PUXA O BANCO DE DADOS DE GASTOS DO MÊS IMEDIATAMENTE
    await carregarDadosNuvem();

    // Solicita biometria no mobile se ainda não ativada
    const bioConfig = localStorage.getItem('biometria_configurada');
    if (isMobile && !bioConfig && window.PublicKeyCredential) {
        modalBiometria.classList.remove('hidden');
    }
}

// BUSCA DADOS NA PLANILHA GOOGLE
async function carregarDadosNuvem() {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'carregarDados', usuario: usuarioAtual })
        });

        const res = await response.json();
        if (res.status === 'sucesso' && res.dados) {
            dadosFinanceiros = res.dados;
            atualizarInterface();
        }
    } catch (e) {
        console.error("Erro ao puxar lançamentos do mês:", e);
    }
}

// SALVA ALTERAÇÕES NA NUVEM
if (btnSalvarSessao) {
    btnSalvarSessao.addEventListener('click', async() => {
        try {
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'salvarTudo', usuario: usuarioAtual, dadosApp: dadosFinanceiros })
            });
            alert('Dados salvos com sucesso!');
        } catch (e) {
            alert('Erro ao salvar os dados.');
        }
    });
}

// LOGOUT
if (btnSair) {
    btnSair.addEventListener('click', () => {
        usuarioAtual = '';
        senhaAtual = '';
        painelPrincipal.classList.add('hidden');
        telaInicio.classList.remove('hidden');
    });
}

function atualizarInterface() {
    // Atualiza elementos da tabela e saldo no painel principal
}