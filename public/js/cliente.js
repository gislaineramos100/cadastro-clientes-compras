async function carregarFichaCompleta() {
    // 1. Pega o CPF da URL (ex: cliente.html?cpf=123)
    const urlParams = new URLSearchParams(window.location.search);
    const cpf = urlParams.get('cpf');

    if (!cpf) {
        alert("CPF não encontrado!");
        window.location.href = 'clientes.html';
        return;
    }

    try {
        const response = await fetch(`/api/clientes/${cpf}`);
        const data = await response.json();

        // 2. Preenche Dados Pessoais
        const c = data.cliente;
        document.getElementById('dadosCliente').innerHTML = `
            <p><strong>Nome:</strong> ${c.nome}</p>
            <p><strong>CPF:</strong> ${c.cpf}</p>
            <p><strong>Telefone:</strong> ${c.tel || 'Não informado'}</p>
            <p><strong>E-mail:</strong> ${c.email || 'Não informado'}</p>
        `;

        // 3. Preenche Resumo Financeiro
        document.getElementById('resumoGasto').innerText = `R$ ${data.financeiro.totalGasto.toFixed(2)}`;
        document.getElementById('resumoPago').innerText = `R$ ${data.financeiro.totalPago.toFixed(2)}`;
        document.getElementById('resumoAberto').innerText = `R$ ${data.financeiro.totalAberto.toFixed(2)}`;

        // 4. Lista Histórico de Compras
        const lista = document.getElementById('listaHistorico');
        if (data.compras.length === 0) {
            lista.innerHTML = "<p>Nenhuma compra registrada para este CPF.</p>";
            return;
        }

        lista.innerHTML = data.compras.reverse().map(compra => `
            <div class="compra-card">
                <div style="display: flex; justify-content: space-between;">
                    <strong>Data: ${new Date(compra.data).toLocaleDateString('pt-BR')}</strong>
                    <span>Registrado por: ${compra.registradoPor || 'Admin'}</span>
                </div>
                <p><strong>Itens:</strong> ${compra.itens.map(i => `${i.nome} (R$ ${i.valor})`).join(', ')}</p>
                <div style="background: #f9f9f9; padding: 10px; margin-top: 5px; border-radius: 5px;">
                    <span>Total: R$ ${compra.total.toFixed(2)}</span> | 
                    <span>Entrada: R$ ${compra.entrada.toFixed(2)}</span> | 
                    <span class="${compra.saldo > 0 ? 'tag-divida' : 'tag-pago'}">
                        ${compra.saldo > 0 ? `Restante: R$ ${compra.saldo.toFixed(2)}` : 'PAGO'}
                    </span>
                    <br><small>Parcelado em: ${compra.parcelas}x</small>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Erro ao carregar ficha:", error);
        alert("Erro ao buscar dados do servidor.");
    }
async function alterarValorCompra(compraId) {
    const login = prompt("Usuário de Administrador:");
    const senha = prompt("Senha:");
    const novoValor = prompt("Digite o novo valor TOTAL da compra:");

    if (novoValor) {
        const res = await fetch(`/api/compras/${compraId}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ login, senha, novoValor })
        });

        if (res.ok) {
            alert("Valor alterado com sucesso!");
            location.reload();
        } else {
            alert("Erro na autenticação ou dados inválidos.");
        }
    }
}

}

// Inicia a busca assim que a página abre
carregarFichaCompleta();