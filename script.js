const API_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI";

let totalGastosAcumulado = 0;
let alerta50Exibido = false;

// Define a data atual
document.getElementById('data').valueAsDate = new Date();

// Bloqueia a digitação de números no campo de descrição em tempo real
document.getElementById('descricao').addEventListener('input', function(e) {
    this.value = this.value.replace(/[0-9]/g, '');
});

// Navegação entre Telas
const btnNavLancamento = document.getElementById('btn-nav-lancamento');
const btnNavResumo = document.getElementById('btn-nav-resumo');
const telaLancamento = document.getElementById('tela-lancamento');
const telaResumo = document.getElementById('tela-resumo');

btnNavLancamento.addEventListener('click', () => {
    btnNavLancamento.classList.add('active');
    btnNavResumo.classList.remove('active');
    telaLancamento.classList.remove('hidden');
    telaResumo.classList.add('hidden');
});

btnNavResumo.addEventListener('click', () => {
    btnNavResumo.classList.add('active');
    btnNavLancamento.classList.remove('active');
    telaResumo.classList.remove('hidden');
    telaLancamento.classList.add('hidden');
    carregarDadosNuvem();
});

// Atualiza os cálculos do saldo
document.getElementById('saldo-inicial').addEventListener('input', calcularSaldo);

function calcularSaldo() {
    const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value) || 0;
    const saldoRestante = saldoInicial - totalGastosAcumulado;

    document.getElementById('display-total-gasto').innerText = totalGastosAcumulado.toFixed(2);
    document.getElementById('display-saldo-restante').innerText = saldoRestante.toFixed(2);
    document.getElementById('resumo-total-gastos').innerText = totalGastosAcumulado.toFixed(2);

    // Alerta de 50% ultrapassado
    if (saldoInicial > 0 && totalGastosAcumulado >= (saldoInicial / 2)) {
        if (!alerta50Exibido) {
            alert("⚠️ Atenção: Você já gastou metade (ou mais) do seu saldo!");
            alerta50Exibido = true;
        }
    } else {
        alerta50Exibido = false;
    }
}

// Buscar Lançamentos salvos no Apps Script
async function carregarDadosNuvem() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        totalGastosAcumulado = data.totalGastos || 0;

        const tbody = document.getElementById('tabela-body');
        tbody.innerHTML = "";

        if (data.lancamentos) {
            data.lancamentos.forEach(item => {
                const tr = document.createElement('tr');
                const dataFmt = new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
                tr.innerHTML = `
          <td>${dataFmt}</td>
          <td>${item.descricao}</td>
          <td>${Number(item.valor).toFixed(2)}</td>
        `;
                tbody.appendChild(tr);
            });
        }

        calcularSaldo();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

// Enviar Lançamento
document.getElementById('form-gasto').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-salvar');
    const statusMsg = document.getElementById('status-msg');

    const valorDigitado = parseFloat(document.getElementById('valor').value) || 0;

    const payload = {
        data: document.getElementById('data').value,
        descricao: document.getElementById('descricao').value,
        valor: valorDigitado
    };

    btn.disabled = true;
    btn.innerText = "Salvando...";
    statusMsg.innerText = "";

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        statusMsg.style.color = "green";
        statusMsg.innerText = "✅ Gasto registrado com sucesso!";

        totalGastosAcumulado += valorDigitado;
        calcularSaldo();

        document.getElementById('descricao').value = "";
        document.getElementById('valor').value = "";

    } catch (error) {
        statusMsg.style.color = "red";
        statusMsg.innerText = "❌ Erro ao salvar o gasto.";
    } finally {
        btn.disabled = false;
        btn.innerText = "➕ Lançar Gasto";
    }
});

// Carrega os dados logo ao abrir
carregarDadosNuvem();