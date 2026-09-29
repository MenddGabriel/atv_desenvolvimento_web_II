const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const caminho = path.join(__dirname, '../db/usuarios.json');

// le o arquivo JSON e devolve o array de users
function lerUsuarios() {
  const dados = fs.readFileSync(caminho, 'utf-8');
  return JSON.parse(dados);
}

// grava o array de users no arquivo JSON (indentado com 2 espacos)
function salvarUsuarios(usuarios) {
  fs.writeFileSync(caminho, JSON.stringify(usuarios, null, 2));
}

// Remove a senha antes de devolver o user na res
function semSenha(usuario) {
  const { senha, ...resto } = usuario;
  return resto;
}

/**
 * @swagger
 * tags:
 *   name: Usuários
 *   description: Cadastro de usuários
 *
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Ana Souza
 *         email:
 *           type: string
 *           example: ana@email.com
 *         telefone:
 *           type: string
 *           example: "48999990000"
 *         dataCadastro:
 *           type: string
 *           format: date
 *           example: "2026-09-20"
 *     UsuarioInput:
 *       type: object
 *       required:
 *         - nome
 *         - email
 *         - senha
 *       properties:
 *         nome:
 *           type: string
 *           example: Ana Souza
 *         email:
 *           type: string
 *           example: ana@email.com
 *         senha:
 *           type: string
 *           example: "123456"
 *         telefone:
 *           type: string
 *           example: "48999990000"
 *     Erro:
 *       type: object
 *       properties:
 *         mensagem:
 *           type: string
 *           example: Usuário não encontrado
 */

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários ordenada por nome
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 */
router.get('/', (req, res) => {
  const usuarios = lerUsuarios()
    .map(semSenha)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  res.json(usuarios);
});

/**
 * @swagger
 * /usuarios/nome/{nome}:
 *   get:
 *     summary: Busca usuários pelo nome (parcial, sem diferenciar maiúsculas)
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: nome
 *         required: true
 *         schema:
 *           type: string
 *         example: ana
 *     responses:
 *       200:
 *         description: Usuários encontrados (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 */
router.get('/nome/:nome', (req, res) => {
  const busca = req.params.nome.toLowerCase();

  const usuarios = lerUsuarios()
    .filter((u) => u.nome.toLowerCase().includes(busca))
    .map(semSenha);

  res.json(usuarios);
});

/**
 * @swagger
 * /usuarios/data/{data}:
 *   get:
 *     summary: Busca usuários pela data de cadastro
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data no formato AAAA-MM-DD
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-09-20"
 *     responses:
 *       200:
 *         description: Usuários cadastrados na data (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Usuario'
 */
router.get('/data/:data', (req, res) => {
  const usuarios = lerUsuarios()
    .filter((u) => u.dataCadastro === req.params.data)
    .map(semSenha);

  res.json(usuarios);
});

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Busca um usuário pelo id
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Usuário encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuario = lerUsuarios().find((u) => u.id === id);

  if (!usuario) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado' });
  }

  res.json(semSenha(usuario));
});

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       201:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       400:
 *         description: Campos obrigatórios faltando
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: E-mail já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/', (req, res) => {
  const { nome, email, senha, telefone } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios' });
  }

  const usuarios = lerUsuarios();

  if (usuarios.some((u) => u.email === email)) {
    return res.status(409).json({ mensagem: 'E-mail já cadastrado' });
  }

  // Próximo id = maior id existente + 1
  const novoId = usuarios.reduce((maior, u) => Math.max(maior, u.id), 0) + 1;

  const novoUsuario = {
    id: novoId,
    nome,
    email,
    senha,
    telefone: telefone || '',
    dataCadastro: new Date().toLocaleDateString('en-CA'), // AAAA-MM-DD no fuso local
  };

  usuarios.push(novoUsuario);
  salvarUsuarios(usuarios);

  res.status(201).json(semSenha(novoUsuario));
});

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza um usuário (envie só os campos que quer alterar)
 *     tags: [Usuários]
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
 *             $ref: '#/components/schemas/UsuarioInput'
 *     responses:
 *       200:
 *         description: Usuário atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: E-mail já cadastrado para outro usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuarios = lerUsuarios();
  const indice = usuarios.findIndex((u) => u.id === id);

  if (indice === -1) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado' });
  }

  const { nome, email, senha, telefone } = req.body;

  if (email && usuarios.some((u) => u.email === email && u.id !== id)) {
    return res.status(409).json({ mensagem: 'E-mail já cadastrado para outro usuário' });
  }

  // Mantém os valores antigos para os campos que não vieram no body.
  // id e dataCadastro não podem ser alterados.
  const atualizado = {
    ...usuarios[indice],
    ...(nome !== undefined && { nome }),
    ...(email !== undefined && { email }),
    ...(senha !== undefined && { senha }),
    ...(telefone !== undefined && { telefone }),
  };

  usuarios[indice] = atualizado;
  salvarUsuarios(usuarios);

  res.json(semSenha(atualizado));
});

/**
 * @swagger
 * /usuarios/{id}:
 *   delete:
 *     summary: Remove um usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Usuário removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Usuario'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const usuarios = lerUsuarios();
  const usuario = usuarios.find((u) => u.id === id);

  if (!usuario) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado' });
  }

  salvarUsuarios(usuarios.filter((u) => u.id !== id));

  res.json(semSenha(usuario));
});

module.exports = router;
