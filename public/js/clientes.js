// Salvar Cliente
async function salvarCliente() {
    const cliente = {
        nome: document.getElementById('nome').value,
        cpf: document.getElementById('cpf').value,
        tel: document.getElementById('tel').value,
        email: document.getElementById('email').value,
        endereco: document.getElementById('endereco').value // Capturando o endereço
    };

    if(!cliente.cpf || !cliente.nome) return alert("CPF e Nome são obrigatórios!");

    const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(cliente)
    });

    if(res.ok) {
        alert("Cliente cadastrado!");
        location.reload(); // Atualiza a lista
    } else {
        alert("Erro: CPF já cadastrado ou erro no servidor");
    }
    endereco: document.getElementById('endereco').value
}

// Carregar Lista
async function carregarClientes() {
    const res = await fetch('/api/clientes');
    const clientes = await res.json();
    const tabela = document.getElementById('corpoTabelaClientes');
    
    tabela.innerHTML = clientes.map(c => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 10px;">${c.cpf}</td>
            <td>${c.nome}</td>
            <td><button onclick="window.location.href='cliente.html?cpf=${c.cpf}'">Ver Ficha / Histórico</button></td>
        </tr>
    `).join('');
}

carregarClientes();