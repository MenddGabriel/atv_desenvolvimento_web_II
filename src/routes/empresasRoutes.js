const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const caminho = path.join(__dirname, '../db/empresas.json');

// le o arquivo JSON e devolve o array de empresas
function lerEmpresas() {
  const dados = fs.readFileSync(caminho, 'utf-8');
  return JSON.parse(dados);
}

// grava o array de empresas no arquivo JSON (indentado com 2 espacos)
function salvarEmpresas(empresas) {
  fs.writeFileSync(caminho, JSON.stringify(empresas, null, 2));
}

// Deixa so os números do CNPJ: "12.345.678/0001-90" vira "12345678000190"
function limparCnpj(cnpj) {
  return String(cnpj).replace(/\D/g, '');
}

/**
 * @swagger
 * tags:
 *   name: Empresas
 *   description: Cadastro de empresas
 *
 * components:
 *   schemas:
 *     Empresa:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Tech Sul Ltda
 *         cnpj:
 *           type: string
 *           description: Apenas os 14 números
 *           example: "12345678000190"
 *         email:
 *           type: string
 *           example: contato@techsul.com
 *         telefone:
 *           type: string
 *           example: "4834310000"
 *         endereco:
 *           type: string
 *           example: Rua das Flores, 100 - Centro, Criciúma/SC
 *         dataCadastro:
 *           type: string
 *           format: date
 *           example: "2026-09-20"
 *     EmpresaInput:
 *       type: object
 *       required:
 *         - nome
 *         - cnpj
 *       properties:
 *         nome:
 *           type: string
 *           example: Tech Sul Ltda
 *         cnpj:
 *           type: string
 *           description: Aceita com ou sem pontuação, precisa ter 14 números
 *           example: "12.345.678/0001-90"
 *         email:
 *           type: string
 *           example: contato@techsul.com
 *         telefone:
 *           type: string
 *           example: "4834310000"
 *         endereco:
 *           type: string
 *           example: Rua das Flores, 100 - Centro, Criciúma/SC
 */

/**
 * @swagger
 * /empresas:
 *   get:
 *     summary: Lista todas as empresas
 *     tags: [Empresas]
 *     responses:
 *       200:
 *         description: Lista de empresas ordenada por nome
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get('/', (req, res) => {
  const empresas = lerEmpresas().sort((a, b) => a.nome.localeCompare(b.nome));

  res.json(empresas);
});

/**
 * @swagger
 * /empresas/nome/{nome}:
 *   get:
 *     summary: Busca empresas pelo nome (parcial, sem diferenciar maiúsculas)
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema:
 *           type: string
 *         example: sul
 *     responses:
 *       200:
 *         description: Empresas encontradas (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get('/nome/:nome', (req, res) => {
  const busca = req.params.nome.toLowerCase();

  const empresas = lerEmpresas().filter((e) => e.nome.toLowerCase().includes(busca));

  res.json(empresas);
});

/**
 * @swagger
 * /empresas/data/{data}:
 *   get:
 *     summary: Busca empresas pela data de cadastro
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data no formato AAAA-MM-DD
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-09-22"
 *     responses:
 *       200:
 *         description: Empresas cadastradas na data (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Empresa'
 */
router.get('/data/:data', (req, res) => {
  const empresas = lerEmpresas().filter((e) => e.dataCadastro === req.params.data);

  res.json(empresas);
});

/**
 * @swagger
 * /empresas/cnpj/{cnpj}:
 *   get:
 *     summary: Busca uma empresa pelo CNPJ
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: cnpj
 *         required: true
 *         description: Apenas números (sem pontos, barra ou traço)
 *         schema:
 *           type: string
 *         example: "12345678000190"
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/cnpj/:cnpj', (req, res) => {
  const cnpj = limparCnpj(req.params.cnpj);
  const empresa = lerEmpresas().find((e) => e.cnpj === cnpj);

  if (!empresa) {
    return res.status(404).json({ mensagem: 'Empresa não encontrada' });
  }

  res.json(empresa);
});

/**
 * @swagger
 * /empresas/{id}:
 *   get:
 *     summary: Busca uma empresa pelo id
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Empresa encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const empresa = lerEmpresas().find((e) => e.id === id);

  if (!empresa) {
    return res.status(404).json({ mensagem: 'Empresa não encontrada' });
  }

  res.json(empresa);
});

/**
 * @swagger
 * /empresas:
 *   post:
 *     summary: Cadastra uma nova empresa
 *     tags: [Empresas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmpresaInput'
 *     responses:
 *       201:
 *         description: Empresa criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       400:
 *         description: Campos obrigatórios faltando ou CNPJ inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: CNPJ já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/', (req, res) => {
  const { nome, email, telefone, endereco } = req.body;

  if (!nome || !req.body.cnpj) {
    return res.status(400).json({ mensagem: 'Nome e CNPJ são obrigatórios' });
  }

  const cnpj = limparCnpj(req.body.cnpj);

  if (cnpj.length !== 14) {
    return res.status(400).json({ mensagem: 'CNPJ deve ter 14 números' });
  }

  const empresas = lerEmpresas();

  if (empresas.some((e) => e.cnpj === cnpj)) {
    return res.status(409).json({ mensagem: 'CNPJ já cadastrado' });
  }

  // Próximo id = maior id existente + 1
  const novoId = empresas.reduce((maior, e) => Math.max(maior, e.id), 0) + 1;

  const novaEmpresa = {
    id: novoId,
    nome,
    cnpj,
    email: email || '',
    telefone: telefone || '',
    endereco: endereco || '',
    dataCadastro: new Date().toLocaleDateString('en-CA'), // AAAA-MM-DD no fuso local
  };

  empresas.push(novaEmpresa);
  salvarEmpresas(empresas);

  res.status(201).json(novaEmpresa);
});

/**
 * @swagger
 * /empresas/{id}:
 *   put:
 *     summary: Atualiza uma empresa (envie só os campos que quer alterar)
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmpresaInput'
 *     responses:
 *       200:
 *         description: Empresa atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       400:
 *         description: CNPJ inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Empresa não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: CNPJ já cadastrado para outra empresa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const empresas = lerEmpresas();
  const indice = empresas.findIndex((e) => e.id === id);

  if (indice === -1) {
    return res.status(404).json({ mensagem: 'Empresa não encontrada' });
  }

  const { nome, email, telefone, endereco } = req.body;
  let cnpj;

  if (req.body.cnpj !== undefined) {
    cnpj = limparCnpj(req.body.cnpj);

    if (cnpj.length !== 14) {
      return res.status(400).json({ mensagem: 'CNPJ deve ter 14 números' });
    }

    if (empresas.some((e) => e.cnpj === cnpj && e.id !== id)) {
      return res.status(409).json({ mensagem: 'CNPJ já cadastrado para outra empresa' });
    }
  }

  // mantém os valores antigos para os campos que não vieram no body.
  // id e dataCadastro não podem ser alterados.
  const atualizada = {
    ...empresas[indice],
    ...(nome !== undefined && { nome }),
    ...(cnpj !== undefined && { cnpj }),
    ...(email !== undefined && { email }),
    ...(telefone !== undefined && { telefone }),
    ...(endereco !== undefined && { endereco }),
  };

  empresas[indice] = atualizada;
  salvarEmpresas(empresas);

  res.json(atualizada);
});

/**
 * @swagger
 * /empresas/{id}:
 *   delete:
 *     summary: Remove uma empresa
 *     tags: [Empresas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Empresa removida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Empresa'
 *       404:
 *         description: Empresa não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const empresas = lerEmpresas();
  const empresa = empresas.find((e) => e.id === id);

  if (!empresa) {
    return res.status(404).json({ mensagem: 'Empresa não encontrada' });
  }

  salvarEmpresas(empresas.filter((e) => e.id !== id));

  res.json(empresa);
});

module.exports = router;
