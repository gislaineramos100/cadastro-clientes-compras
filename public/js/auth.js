function realizarLogin() {
    const user = document.getElementById('userInput').value;
    const pass = document.getElementById('passInput').value;

    // Autenticação simples para teste
    // ... dentro da função realizarLogin()
if (user === 'admin' && pass === '123') {
    localStorage.setItem('usuarioLogado', user);
    window.location.href = 'index.html'; // Mude de clientes.html para index.html
} else {
        alert('Usuário ou senha incorretos!');
    }
}

// Função para proteger as outras páginas (coloque no topo de clientes.js e compras.js)
function verificarAcesso() {
    const logado = localStorage.getItem('usuarioLogado');
    if (!logado) {
        window.location.href = 'login.html';
    }
}