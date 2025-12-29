let itensCompra = [];

function adicionarPeca() {
    const nome = document.getElementById('itemNome').value;
    const valor = parseFloat(document.getElementById('itemValor').value);
    
    if(nome && valor) {
        itensCompra.push({ nome, valor });
        atualizarListaItens();
    }
}


function atualizarListaItens() {
    const lista = document.getElementById('listaItens');
    lista.innerHTML = itensCompra.map(i => `<li>${i.nome} - R$ ${i.valor}</li>`).join('');
    
    const totalBruto = itensCompra.reduce((acc, i) => acc + i.valor, 0);
    document.getElementById('totalDisplay').innerText = `Total: R$ ${totalBruto}`;
}

async function finalizarCompra() {
    const cpf = document.getElementById('compraCpf').value;
    const dados = {
        cpf: cpf,
        itens: itensCompra, // Aqui estão os nomes e valores
        desconto: parseFloat(document.getElementById('desconto').value || 0),
        entrada: parseFloat(document.getElementById('entrada').value || 0),
        parcelas: parseInt(document.getElementById('parcelas').value),
        usuarioLogado: localStorage.getItem('usuarioLogado')
    };

    const res = await fetch('/api/compras', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(dados)
    });

    if(res.ok) {
        const compraSalva = await res.json();
        // Guardamos para o comprovante ler
        localStorage.setItem('ultimaCompra', JSON.stringify({
            ...compraSalva,
            clienteNome: "Ver ficha do cliente" // Opcional buscar o nome aqui
        }));
        // AGORA DIRECIONA PARA O COMPROVANTE
        window.location.href = 'comprovante.html';
    }
}