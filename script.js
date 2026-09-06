const API_URL = "https://script.google.com/macros/s/AKfycby88vN8kNSd4hD7QzNLUZ0p3CNJe0l6sNPUxS3Hw8yqkB5cypub7tmRD_qQ9n7QpL4Pww/exec";

let totalGastosAcumulado = 0;
let alerta50Exibido = false;

// Define a data atual
document.getElementById('data').valueAsDate = new Date();

// Bloqueia a digitação de números na descrição
document.getElementById('descricao').addEventListener('input', function(e) {
    this.value = this.value.replace(/[0-9]/g, '');
});

// Controle de Navegação (3 Telas)
const btnNavLancamento = document.getElementById('btn-nav-lancamento');
const btnNavResumo = document.getElementById('btn-nav-resumo');
const btnNavRelatorio = document.getElementById('btn-nav-relatorio');

const telaLancamento = document.getElementById('tela-lancamento');
const telaResumo = document.getElementById('tela-resumo');
const telaRelatorio = document.getElementById('tela-relatorio');

function resetNav() {
    btnNavLancamento.classList.remove('active');
    btnNavResumo.classList.remove('active');
    btnNavRelatorio.classList.remove('active');
    telaLancamento.classList.add('hidden');
    telaResumo.classList.add('hidden');
    telaRelatorio.classList.add('hidden');
}

btnNavLancamento.addEventListener('click', () => {
    resetNav();
    btnNavLancamento.classList.add('active');
    telaLancamento.classList.remove('hidden');
});

btnNavResumo.addEventListener('click', () => {
    resetNav();
    btnNavResumo.classList.add('active');
    telaResumo.classList.remove('hidden');
    carregarDadosNuvem();
});

btnNavRelatorio.addEventListener('click', () => {
    resetNav();
    btnNavRelatorio.classList.add('active');
    telaRelatorio.classList.remove('hidden');
    carregarRelatoriosFechamentos();
});

// Saldo Inicial
document.getElementById('saldo-inicial').addEventListener('input', calcularSaldo);

function calcularSaldo() {
    const saldoInicial = parseFloat(document.getElementById('saldo-inicial').value) || 0;
    const saldoRestante = saldoInicial - totalGastosAcumulado;

    document.getElementById('display-total-gasto').innerText = totalGastosAcumulado.toFixed(2);
    document.getElementById('display-saldo-restante').innerText = saldoRestante.toFixed(2);

    const resumoTotalElem = document.getElementById('resumo-total-gastos');
    if (resumoTotalElem) resumoTotalElem.innerText = totalGastosAcumulado.toFixed(2);

    if (saldoInicial > 0 && totalGastosAcumulado >= (saldoInicial / 2)) {
        if (!alerta50Exibido) {
            alert("⚠️ Atenção: Você já gastou metade (ou mais) do seu saldo!");
            alerta50Exibido = true;
        }
    } else {
        alerta50Exibido = false;
    }
}

// Carregar Resumo de Gastos (com botão X de exclusão)
async function carregarDadosNuvem() {
    try {
        const res = await fetch(`${API_URL}?action=getDados`);
        const data = await res.json();

        totalGastosAcumulado = data.totalGastos || 0;

        const tbody = document.getElementById('tabela-body');
        if (tbody) {
            tbody.innerHTML = "";

            if (data.lancamentos && data.lancamentos.length > 0) {
                data.lancamentos.forEach(item => {
                    const tr = document.createElement('tr');
                    let dataExibicao = item.data;
                    if (typeof dataExibicao === 'string' && dataExibicao.includes('T')) {
                        dataExibicao = dataExibicao.split('T')[0];
                    }

                    tr.innerHTML = `
            <td>${dataExibicao}</td>
            <td>${item.descricao}</td>
            <td>R$ ${Number(item.valor).toFixed(2)}</td>
            <td><button class="btn-excluir-linha" onclick="excluirLinha(${item.linhaIndex})">X</button></td>
          `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Nenhum gasto encontrado.</td></tr>`;
            }
        }

        calcularSaldo();
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
    }
}

// Excluir Linha Individual
async function excluirLinha(linhaIndex) {
    if (confirm("Deseja realmente excluir este lançamento?")) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "excluirLancamento", linhaIndex: linhaIndex })
            });
            carregarDadosNuvem();
        } catch (err) {
            alert("Erro ao excluir lançamento.");
        }
    }
}

// Fechar Mês
document.getElementById('btn-fechar-mes').addEventListener('click', async function() {
    const mesAno = prompt("Confirme o mês/ano do fechamento (ex: 09/2026):", new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }));

    if (mesAno) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "fecharMes", mesAno: mesAno })
            });
            alert("🔒 Mês fechado com sucesso! Os lançamentos foram movidos para o Relatório dos Fechamentos.");
            carregarDadosNuvem();
        } catch (err) {
            alert("Erro ao fechar mês.");
        }
    }
});

// Carregar Histórico de Fechamentos (Estilo Máquina de Cartão)
async function carregarRelatoriosFechamentos() {
    const container = document.getElementById('container-fechamentos');
    container.innerHTML = "<p>Carregando relatórios...</p>";

    try {
        const res = await fetch(`${API_URL}?action=getFechamentos`);
        const data = await res.json();

        container.innerHTML = "";

        if (data.fechamentos && data.fechamentos.length > 0) {
            data.fechamentos.forEach(f => {
                const extrato = document.createElement('div');
                extrato.className = 'extrato-card';

                let itensHtml = "";
                f.itens.forEach(it => {
                    itensHtml += `
            <div class="extrato-item">
              <span>${it.data} - ${it.descricao}</span>
              <div class="extrato-item-acoes">
                <span>R$ ${Number(it.valor).toFixed(2)}</span>
                <button class="btn-edit-item" onclick="editarItemFechamento(${it.linhaReal}, '${it.data}', '${it.descricao}', ${it.valor})">✏️</button>
              </div>
            </div>
          `;
                });

                extrato.innerHTML = `
          <div class="extrato-header">
            <h4>*** COMPROVANTE DE FECHAMENTO ***</h4>
            <p>MÊS/ANO: ${f.mesAno}</p>
            <p>Data Fechamento: ${f.dataFechamento}</p>
          </div>
          ${itensHtml}
          <div class="extrato-total">
            TOTAL DO FECHAMENTO: R$ ${Number(f.total).toFixed(2)}
          </div>
          <button class="btn-del-fechamento" onclick="confirmarExcluirFechamento('${f.id}')">🗑️ Excluir Relatório</button>
        `;

                container.appendChild(extrato);
            });
        } else {
            container.innerHTML = "<p>Nenhum fechamento realizado ainda.</p>";
        }
    } catch (err) {
        container.innerHTML = "<p>Erro ao carregar relatórios.</p>";
    }
}

// Pop-up de Confirmação para Excluir o Relatório de Fechamento Completo
async function confirmarExcluirFechamento(idFechamento) {
    const confirmacao = confirm("Tem certeza que deseja excluir este relatório de fechamento?");
    if (confirmacao) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: "excluirFechamento", idFechamento: idFechamento })
            });
            alert("Relatório excluído com sucesso!");
            carregarRelatoriosFechamentos();
        } catch (err) {
            alert("Erro ao excluir relatório.");
        }
    }
}

// Editar item do fechamento
async function editarItemFechamento(linhaReal, dataAtual, descAtual, valorAtual) {
    const novaData = prompt("Nova data:", dataAtual);
    if (novaData === null) return;

    const novaDescricao = prompt("Nova descrição:", descAtual);
    if (novaDescricao === null) return;

    const novoValor = prompt("Novo valor (R$):", valorAtual);
    if (novoValor === null) return;

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: "editarItemFechamento",
                linhaReal: linhaReal,
                novaData: novaData,
                novaDescricao: novaDescricao,
                novoValor: parseFloat(novoValor) || 0
            })
        });
        alert("Item do fechamento atualizado!");
        carregarRelatoriosFechamentos();
    } catch (err) {
        alert("Erro ao editar item.");
    }
}

// Enviar Lançamento Simples
document.getElementById('form-gasto').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-salvar');
    const statusMsg = document.getElementById('status-msg');
    const valorDigitado = parseFloat(document.getElementById('valor').value) || 0;

    const payload = {
        action: "novoLancamento",
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

// Inicia com os dados do mês
carregarDadosNuvem();