const API_URL = "https://script.google.com/macros/s/AKfycby88vN8kNSd4hD7QzNLUZ0p3CNJe0l6sNPUxS3Hw8yqkB5cypub7tmRD_qQ9n7QpL4Pww/exec";

let totalGastosAcumulado = 0;
let alerta50Exibido = false;

// Define a data atual por padrão
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
    carregarDadosNuvem(); // Atualiza a tabela ao abrir a tela de resumo
});

// Atualiza os cálculos do saldo sempre que o Saldo Inicial mudar
document.getElementById('saldo-inicial').addEventListener('input', calcularSaldo);

function calcularSaldo() {
    const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value) || 0;
    const saldoRestante = saldoInicial - totalGastosAcumulado;

    document.getElementById('display-total-gasto').innerText = totalGastosAcumulado.toFixed(2);
    document.getElementById('display-saldo-restante').innerText = saldoRestante.toFixed(2);

    const resumoTotalElem = document.getElementById('resumo-total-gastos');
    if (resumoTotalElem) {
        resumoTotalElem.innerText = totalGastosAcumulado.toFixed(2);
    }

    // Alerta de 50% do saldo ultrapassado
    if (saldoInicial > 0 && totalGastosAcumulado >= (saldoInicial / 2)) {
        if (!alerta50Exibido) {
            alert("⚠️ Atenção: Você já gastou metade (ou mais) do seu saldo!");
            alerta50Exibido = true;
        }
    } else {
        alerta50Exibido = false;
    }
}

// Buscar Lançamentos salvos no Apps Script e montar a Tabela
async function carregarDadosNuvem() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();

        totalGastosAcumulado = data.totalGastos || 0;

        const tbody = document.getElementById('tabela-body');
        if (tbody) {
            tbody.innerHTML = "";

            if (data.lancamentos && data.lancamentos.length > 0) {
                data.lancamentos.forEach(item => {
                    const tr = document.createElement('tr');

                    // Tratamento seguro para a exibição da data
                    let dataExibicao = item.data;
                    if (typeof dataExibicao === 'string' && dataExibicao.includes('T')) {
                        dataExibicao = dataExibicao.split('T')[0];
                    }

                    tr.innerHTML = `
            <td>${dataExibicao}</td>
            <td>${item.descricao}</td>
            <td>R$ ${Number(item.valor).toFixed(2)}</td>
          `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhum gasto encontrado.</td></tr>`;
            }
        }

        calcularSaldo();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

// Enviar Lançamento para a Planilha
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

// Carrega os dados assim que o app abre
carregarDadosNuvem();