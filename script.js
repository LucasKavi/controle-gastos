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

// FORMATAR DATA: AAAA-MM-DD -> DD/MM/AAAA
function formatarDataBR(dataIso) {
    if (!dataIso) return '';
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// CARREGAR DADOS DO DISPOSITIVO
function carregarDadosSalvos() {
    const dadosLocais = localStorage.getItem('controle_gastos_dados');
    if (dadosLocais) {
        dadosApp = JSON.parse(dadosLocais);
    }
    inputSaldoInicial.value = dadosApp.saldoInicial;
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

    // Renderizar Fechamentos estilo Extrato de Maquininha
    containerFechamentos.innerHTML = '';
    if (dadosApp.fechamentos.length === 0) {
        containerFechamentos.innerHTML = '<p class="empty-msg">Nenhum fechamento realizado ainda.</p>';
    } else {
        dadosApp.fechamentos.forEach((f, idx) => {
                    const extrato = document.createElement('div');
                    extrato.className = 'extrato-maquininha';

                    let itensHtml = '';
                    if (f.itens && f.itens.length > 0) {
                        itensHtml = f.itens.map(item => `
          <div class="extrato-item">
            <span>${formatarDataBR(item.data)} - ${item.descricao}</span>
            <span>${formatarMoeda(item.valor)}</span>
          </div>
        `).join('');
                    }

                    extrato.innerHTML = `
        <div class="extrato-header">
          <h4>*** COMPROVANTE DE FECHAMENTO ***</h4>
          <p>Fechamento #${idx + 1}</p>
          <p>Data/Hora: ${f.dataFechamento}</p>
        </div>
        <div class="extrato-divisor">----------------------------------</div>
        <div class="extrato-linha">
          <span>SALDO INICIAL:</span>
          <strong>${formatarMoeda(f.saldoInicial)}</strong>
        </div>
        <div class="extrato-linha">
          <span>TOTAL GASTO:</span>
          <strong>${formatarMoeda(f.totalGasto)}</strong>
        </div>
        <div class="extrato-linha destaque">
          <span>SALDO FINAL:</span>
          <strong>${formatarMoeda(f.saldoRestante)}</strong>
        </div>
        ${itensHtml ? `<div class="extrato-divisor">--- LANÇAMENTOS DO PERÍODO ---</div>${itensHtml}` : ''}
        <div class="extrato-footer">
          <p>DOCUMENTO DE USO PESSOAL</p>
          <button class="btn-excluir-extrato" onclick="removerFechamento(${idx})">🗑️ Excluir Fechamento</button>
        </div>
      `;
      containerFechamentos.appendChild(extrato);
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

// FECHAR MÊS
btnFecharMes.addEventListener('click', () => {
  if (dadosApp.gastos.length === 0) {
    alert('Não há lançamentos para fechar o mês.');
    return;
  }

  const totalGasto = dadosApp.gastos.reduce((acc, curr) => acc + curr.valor, 0);
  const agora = new Date();
  const dataFormatada = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

  dadosApp.fechamentos.push({
    dataFechamento: dataFormatada,
    saldoInicial: dadosApp.saldoInicial,
    totalGasto: totalGasto,
    saldoRestante: dadosApp.saldoInicial - totalGasto,
    itens: [...dadosApp.gastos]
  });

  dadosApp.gastos = [];
  atualizarInterface();
  alert('Mês fechado e comprovante gerado com sucesso!');
});

// TELA INICIAL
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
  alert('Dados salvos com sucesso neste dispositivo!');
});

btnSair.addEventListener('click', () => {
  salvarDadosNoAparelho();
  painelPrincipal.classList.add('hidden');
  telaInicio.classList.remove('hidden');
});

inputSaldoInicial.addEventListener('change', atualizarInterface);

// NAVEGAÇÃO DE ABAS
function trocarAba(abaAtiva, btnAtivo) {
  [telaLancamento, telaResumo, telaRelatorio].forEach(t => t.classList.add('hidden'));
  [btnNavLancamento, btnNavResumo, btnNavRelatorio].forEach(b => b.classList.remove('active'));

  abaAtiva.classList.remove('hidden');
  btnAtivo.classList.add('active');
}

btnNavLancamento.addEventListener('click', () => trocarAba(telaLancamento, btnNavLancamento));
btnNavResumo.addEventListener('click', () => trocarAba(telaResumo, btnNavResumo));
btnNavRelatorio.addEventListener('click', () => trocarAba(telaRelatorio, btnNavRelatorio));