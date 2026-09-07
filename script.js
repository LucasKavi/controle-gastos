// EDITAR ITEM DE UM FECHAMENTO (CORRIGIDO)
window.editarItemFechamento = function(fechamentoIdx, itemIdx, campo, novoValor) {
    const fechamento = dadosApp.fechamentos[fechamentoIdx];
    if (!fechamento || !fechamento.itens[itemIdx]) return;

    if (campo === 'data') {
        if (novoValor.includes('/')) {
            const [dia, mes, ano] = novoValor.split('/');
            fechamento.itens[itemIdx].data = `${ano}-${mes}-${dia}`;
        } else {
            fechamento.itens[itemIdx].data = novoValor;
        }
    } else if (campo === 'descricao') {
        fechamento.itens[itemIdx].descricao = novoValor.trim();
    } else if (campo === 'valor') {
        const val = parseFloat(novoValor);
        if (!isNaN(val)) {
            fechamento.itens[itemIdx].valor = val;
            // Recalcula totais internamente
            fechamento.totalGasto = fechamento.itens.reduce((acc, curr) => acc + curr.valor, 0);
            fechamento.saldoRestante = fechamento.saldoInicial - fechamento.totalGasto;
        }
    }

    // Salva localmente sem destruir o HTML em edição
    salvarDadosNoAparelho();
};