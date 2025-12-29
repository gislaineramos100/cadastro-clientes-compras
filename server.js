const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

// --- CONFIGURAÇÃO DE SEGURANÇA (CSP) ---
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; connect-src 'self' http://localhost:3000; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    );
    next();
});

app.use(express.json());
app.use(express.static('public'));

// --- CONFIGURAÇÃO DO BANCO DE DADOS ---
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) { fs.mkdirSync(dbDir); }
const DB_PATH = path.join(dbDir, 'database.json');

const getData = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const init = { clientes: [], compras: [], usuarios: [], config: {} };
            fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
            return init;
        }
        const content = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (e) { return { clientes: [], compras: [], usuarios: [], config: {} }; }
};

const saveData = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// --- 1. LOGIN ---
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    const db = getData();
    const u = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);
    if (u || (usuario === 'admin' && senha === '123')) {
        res.json({ success: true, nome: u ? u.nome : 'ADMINISTRADOR', login: usuario });
    } else { res.status(401).json({ success: false }); }
});

// --- 2. CLIENTES (CADASTRO COM TRAVA DE CPF) ---
app.post('/api/clientes', (req, res) => {
    try {
        const db = getData();
        const { nome, cpf, telefone, endereco } = req.body;
        if (!nome || !cpf) return res.status(400).json({ error: "NOME E CPF SÃO OBRIGATÓRIOS" });
        const cpfLimpo = cpf.trim();
        if (db.clientes.find(c => c.cpf.trim() === cpfLimpo)) {
            return res.status(400).json({ error: "ERRO: ESTE CPF JÁ ESTÁ CADASTRADO!" });
        }
        db.clientes.push({ 
            nome: nome.toUpperCase(), 
            cpf: cpfLimpo, 
            telefone: telefone || "NÃO INFORMADO", 
            endereco: endereco ? endereco.toUpperCase() : "NÃO INFORMADO",
            dataCadastro: new Date().toISOString()
        });
        saveData(db);
        res.json({ success: true, message: "CLIENTE CADASTRADO COM SUCESSO!" });
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "ERRO AO SALVAR" }); 
    }
});

app.get('/api/clientes', (req, res) => res.json(getData().clientes));

// --- 3. FICHA DO CLIENTE (DADOS + COMPRAS) ---
app.get('/api/clientes/:cpf', (req, res) => {
    try {
        const db = getData();
        const cpfBusca = (req.params.cpf || "").trim();
        const cliente = db.clientes.find(c => c.cpf && c.cpf.trim() === cpfBusca);
        const compras = db.compras.filter(c => c.cpf && typeof c.cpf === 'string' && c.cpf.trim() === cpfBusca);
        if (cliente) { res.json({ cliente, compras }); } 
        else { res.status(404).json({ error: "CLIENTE NÃO ENCONTRADO" }); }
    } catch (err) {
        res.status(500).json({ error: "ERRO INTERNO NO SERVIDOR" });
    }
});

// --- 4. MOVIMENTAÇÕES (VENDAS - CORRIGIDO) ---
app.post('/api/compras', (req, res) => {
    try {
        const db = getData();
        const d = req.body;

        if (!d.cpf) return res.status(400).send("CPF OBRIGATÓRIO");

        // Captura valores usando vários nomes possíveis para evitar o 'zerado'
        const vBruto = Math.abs(parseFloat(d.total || d.valorTotal || d.valor || 0));
        const vEntrada = Math.abs(parseFloat(d.entrada || 0));
        const vDesconto = Math.abs(parseFloat(d.desconto || 0));
        const vTipo = (d.tipoPagamento || "A PRAZO").toUpperCase();

        const vFinalVenda = vBruto - vDesconto;
        
        let saldoCalculado = 0;
        if (vTipo !== "A VISTA") {
            saldoCalculado = vFinalVenda - vEntrada;
        }

        const novaVenda = { 
            id: Date.now().toString(), 
            cpf: d.cpf.trim(),
            tipoPagamento: vTipo,
            total: vBruto.toFixed(2),
            valorFinal: vFinalVenda.toFixed(2),
            entrada: vEntrada.toFixed(2),
            desconto: vDesconto.toFixed(2),
            saldoDevedor: saldoCalculado.toFixed(2),
            itens: d.itens || [],
            data: new Date().toISOString(),
            historico: [{
                data: new Date().toISOString(),
                tipo: "VENDA", 
                descricao: `VENDA INICIAL ${vTipo} - TOTAL: R$ ${vFinalVenda.toFixed(2)}`,
                usuario: "SISTEMA"
            }]
        };

        db.compras.push(novaVenda);
        saveData(db);
        res.json(novaVenda);
    } catch (err) { 
        console.error("Erro ao salvar compra:", err);
        res.status(500).send("ERRO AO PROCESSAR VALORES"); 
    }
});

// --- 5. AJUSTE E ABATIMENTO (UNIFICADO) ---
app.put('/api/compras/:id', (req, res) => {
    try {
        const db = getData();
        const { id } = req.params;
        const { valorAbatido, novoValor, usuarioMotivo } = req.body;
        const index = db.compras.findIndex(c => c.id === id);

        if (index === -1) return res.status(404).send("VENDA NÃO ENCONTRADA");
        if (!db.compras[index].historico) db.compras[index].historico = [];
        
        const venda = db.compras[index];

        if (novoValor !== undefined) {
            if (venda.tipoPagamento === "A VISTA") return res.status(403).json({ error: "PROIBIDO EM VENDAS À VISTA" });
            const vAntigo = venda.saldoDevedor;
            const vNovo = parseFloat(novoValor || 0).toFixed(2);
            db.compras[index].historico.push({
                data: new Date().toISOString(),
                tipo: "AJUSTE",
                descricao: `ALTEROU SALDO DE R$ ${vAntigo} PARA R$ ${vNovo}`,
                usuario: usuarioMotivo || "ADMIN"
            });
            db.compras[index].saldoDevedor = vNovo;
            saveData(db);
            return res.json({ success: true });
        }

        const valorPagar = parseFloat(valorAbatido || 0);
        const saldoAtual = parseFloat(venda.saldoDevedor || 0);
        if (valorPagar > saldoAtual) return res.status(400).json({ error: "PAGAMENTO MAIOR QUE O SALDO" });

        db.compras[index].historico.push({
            data: new Date().toISOString(),
            tipo: "PAGAMENTO",
            valor: valorPagar.toFixed(2),
            descricao: `PAGAMENTO PARCIAL RECEBIDO`,
            usuario: usuarioMotivo || "ADMIN"
        });
        db.compras[index].saldoDevedor = (saldoAtual - valorPagar).toFixed(2);
        db.compras[index].entrada = (parseFloat(venda.entrada || 0) + valorPagar).toFixed(2);
        saveData(db);
        res.json({ success: true });
    } catch (err) { res.status(500).send("ERRO NO PROCESSAMENTO"); }
});

// --- 6. RECIBO ---
app.get('/api/movimento/:id', (req, res) => {
    const db = getData();
    const movimento = db.compras.find(c => c.id === req.params.id);
    if (!movimento) return res.status(404).send("MOVIMENTO NÃO ENCONTRADO");
    const cliente = db.clientes.find(c => c.cpf === movimento.cpf);
    res.json({ movimento, cliente });
});

// --- 7. USUÁRIOS ---
app.post('/api/usuarios', (req, res) => {
    try {
        const db = getData();
        const { nome, usuario, senha } = req.body;
        if (!nome || !usuario || !senha) return res.status(400).json({ error: "CAMPOS OBRIGATÓRIOS" });
        if (db.usuarios.find(u => u.usuario === usuario.toLowerCase())) return res.status(400).json({ error: "LOGIN JÁ EXISTE!" });
        db.usuarios.push({ nome: nome.toUpperCase(), usuario: usuario.toLowerCase(), senha, dataCriacao: new Date().toISOString() });
        saveData(db);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "ERRO AO SALVAR" }); }
});

app.get('/api/usuarios', (req, res) => res.json(getData().usuarios));

// --- 8. RELATÓRIOS ---
app.get('/api/relatorios', (req, res) => {
    try {
        const db = getData();
        const relatorio = db.compras.map(mov => {
            const cliente = db.clientes.find(c => c.cpf === mov.cpf);
            return { ...mov, nomeCliente: cliente ? cliente.nome : "CLIENTE REMOVIDO", saldoDevedor: parseFloat(mov.saldoDevedor || 0) };
        });
        res.json(relatorio);
    } catch (err) { res.status(500).json({ error: "ERRO NO RELATÓRIO" }); }
});

app.listen(3000, () => console.log("SISTEMA RODANDO EM HTTP://LOCALHOST:3000"));