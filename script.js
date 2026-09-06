// Cole abaixo o link da URL do seu Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycby88vN8kNSd4hD7QzNLUZ0p3CNJe0l6sNPUxS3Hw8yqkB5cypub7tmRD_qQ9n7QpL4Pww/exec";

// Preenche o campo de data automaticamente com o dia de hoje
document.getElementById('data').valueAsDate = new Date();

document.getElementById('form-gasto').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btn-salvar');
    const statusMsg = document.getElementById('status-msg');

    const payload = {
        data: document.getElementById('data').value,
        descricao: document.getElementById('descricao').value,
        valor: document.getElementById('valor').value
    };

    btn.disabled = true;
    btn.innerText = "Salvando...";
    statusMsg.innerText = "";

    try {
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', // Evita bloqueio de segurança CORS no navegador
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        statusMsg.style.color = "green";
        statusMsg.innerText = "✅ Gasto registrado com sucesso!";

        // Limpa apenas os campos de Descrição e Valor
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