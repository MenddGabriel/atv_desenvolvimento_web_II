const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const caminho = path.join(__dirname, '../db/espacos.json');

// le o arquivo JSON e devolve o array de espacos
function lerEspacos() {
  const dados = fs.readFileSync(caminho, 'utf-8');
  return JSON.parse(dados);
}

function salvarEspacos(espacos) {
  fs.writeFileSync(caminho, JSON.stringify(espacos, null, 2));
}

/**
 * @swagger
 * tags:
 *   name: Espaços
 *   description: Gerenciamento de locais e salas alocáveis
 *
 * components:
 *   schemas:
 *     Espaco:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nome:
 *           type: string
 *           example: Sala de Coworking 01
 *         tipo:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           example: COWORKING
 *         capacidade:
 *           type: integer
 *           example: 10
 *         descricao:
 *           type: string
 *           example: Sala compartilhada com mesas individuais.
 *         ativo:
 *           type: boolean
 *           example: true
 *     EspacoInput:
 *       type: object
 *       required:
 *         - nome
 *         - tipo
 *         - capacidade
 *       properties:
 *         nome:
 *           type: string
 *           example: Sala de Coworking 01
 *         tipo:
 *           type: string
 *           enum: [COWORKING, LAB, MEETING_ROOM]
 *           example: COWORKING
 *         capacidade:
 *           type: integer
 *           example: 10
 *         descricao:
 *           type: string
 *           example: Sala compartilhada com mesas individuais.
 *         ativo:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /espacos:
 *   get:
 *     summary: Lista todos os espaços
 *     tags: [Espaços]
 *     responses:
 *       200:
 *         description: Lista de espaços
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Espaco'
 */
router.get('/', (req, res) => {
  const espacos = lerEspacos().sort((a, b) => a.nome.localeCompare(b.nome));
  res.json(espacos);
});

/**
 * @swagger
 * /espacos/{id}:
 *   get:
 *     summary: Busca um espaço pelo id
 *     tags: [Espaços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Espaço encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espaco'
 *       404:
 *         description: Espaço não encontrado
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const espaco = lerEspacos().find((e) => e.id === id);

  if (!espaco) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  res.json(espaco);
});

/**
 * @swagger
 * /espacos:
 *   post:
 *     summary: Cadastra um novo espaço
 *     tags: [Espaços]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EspacoInput'
 *     responses:
 *       201:
 *         description: Espaço criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espaco'
 *       400:
 *         description: Campos obrigatórios faltando
 */
router.post('/', (req, res) => {
  const { nome, tipo, capacidade, descricao, ativo } = req.body || {};

  if (!nome || !tipo || capacidade === undefined) {
    return res.status(400).json({ mensagem: 'Nome, tipo e capacidade são obrigatórios' });
  }

  const tiposValidos = ['COWORKING', 'LAB', 'MEETING_ROOM'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ mensagem: 'Tipo inválido. Use COWORKING, LAB ou MEETING_ROOM' });
  }

  const espacos = lerEspacos();
  const novoId = espacos.reduce((maior, e) => Math.max(maior, e.id), 0) + 1;

  const novoEspaco = {
    id: novoId,
    nome,
    tipo,
    capacidade: Number(capacidade),
    descricao: descricao || '',
    ativo: ativo !== undefined ? ativo : true,
  };

  espacos.push(novoEspaco);
  salvarEspacos(espacos);

  res.status(201).json(novoEspaco);
});

/**
 * @swagger
 * /espacos/{id}:
 *   put:
 *     summary: Atualiza um espaço
 *     tags: [Espaços]
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
 *             $ref: '#/components/schemas/EspacoInput'
 *     responses:
 *       200:
 *         description: Espaço atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espaco'
 *       404:
 *         description: Espaço não encontrado
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const espacos = lerEspacos();
  const indice = espacos.findIndex((e) => e.id === id);

  if (indice === -1) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  const { nome, tipo, capacidade, descricao, ativo } = req.body || {};

  const atualizado = {
    ...espacos[indice],
    ...(nome !== undefined && { nome }),
    ...(tipo !== undefined && { tipo }),
    ...(capacidade !== undefined && { capacidade: Number(capacidade) }),
    ...(descricao !== undefined && { descricao }),
    ...(ativo !== undefined && { ativo }),
  };

  espacos[indice] = atualizado;
  salvarEspacos(espacos);

  res.json(atualizado);
});

/**
 * @swagger
 * /espacos/{id}:
 *   delete:
 *     summary: Remove um espaço
 *     tags: [Espaços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Espaço removido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Espaco'
 *       404:
 *         description: Espaço não encontrado
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const espacos = lerEspacos();
  const espaco = espacos.find((e) => e.id === id);

  if (!espaco) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  salvarEspacos(espacos.filter((e) => e.id !== id));

  res.json(espaco);
});

module.exports = router;