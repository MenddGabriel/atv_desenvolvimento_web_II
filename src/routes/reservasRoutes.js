const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const caminho = path.join(__dirname, '../db/reservas.json');
const caminhoEspacos = path.join(__dirname, '../db/espacos.json');
const caminhoUsuarios = path.join(__dirname, '../db/usuarios.json');
const caminhoEmpresas = path.join(__dirname, '../db/empresas.json');
const caminhoDisponibilidades = path.join(__dirname, '../db/disponibilidades.json');

const STATUS_VALIDOS = ['CONFIRMADA', 'CANCELADA'];

// le qualquer arquivo JSON da pasta db (usado para consultar as outras entidades)
function lerJson(arquivo) {
  return JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
}

// le o arquivo JSON e devolve o array de reservas
function lerReservas() {
  return lerJson(caminho);
}

// grava o array de reservas no arquivo JSON (indentado com 2 espacos)
function salvarReservas(reservas) {
  fs.writeFileSync(caminho, JSON.stringify(reservas, null, 2));
}

// Valida o formato "HH:MM"
function horaValida(hora) {
  return typeof hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

// Valida "AAAA-MM-DD" e se a data realmente existe (ex.: rejeita 2026-02-31)
function dataValida(data) {
  if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(`${data}T00:00:00`);
  return !isNaN(d.getTime()) && d.toLocaleDateString('en-CA') === data;
}

// Dia da semana (0 = Domingo ... 6 = Sábado), igual ao de disponibilidades
function diaDaSemana(data) {
  return new Date(`${data}T00:00:00`).getDay();
}

// Ordena por data e, no mesmo dia, pelo horário de início
function ordenarPorDataHora(a, b) {
  return a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio);
}

/**
 * Aplica todas as regras de negócio a uma reserva.
 * Retorna { status, mensagem } se houver erro, ou null se estiver tudo certo.
 * idIgnorar: id da própria reserva (usado no PUT para não conflitar consigo mesma).
 */
function validarReserva(r, idIgnorar = null) {
  const espaco = lerJson(caminhoEspacos).find((e) => e.id === r.espacoId);
  if (!espaco) return { status: 404, mensagem: 'Espaço não encontrado' };
  if (!espaco.ativo) {
    return { status: 400, mensagem: 'Não é possível reservar um espaço inativo' };
  }

  if (!lerJson(caminhoUsuarios).some((u) => u.id === r.usuarioId)) {
    return { status: 404, mensagem: 'Usuário não encontrado' };
  }

  if (r.empresaId !== null && !lerJson(caminhoEmpresas).some((e) => e.id === r.empresaId)) {
    return { status: 404, mensagem: 'Empresa não encontrada' };
  }

  if (!dataValida(r.data)) {
    return { status: 400, mensagem: 'data deve estar no formato AAAA-MM-DD e ser válida' };
  }

  if (!horaValida(r.horaInicio) || !horaValida(r.horaFim)) {
    return { status: 400, mensagem: 'Horários devem estar no formato HH:MM' };
  }

  if (r.horaInicio >= r.horaFim) {
    return { status: 400, mensagem: 'horaInicio deve ser anterior a horaFim' };
  }

  if (!STATUS_VALIDOS.includes(r.status)) {
    return { status: 400, mensagem: 'status inválido. Use CONFIRMADA ou CANCELADA' };
  }

  // Reserva cancelada não ocupa o espaço, então não precisa das regras abaixo
  if (r.status === 'CANCELADA') return null;

  // A reserva precisa caber dentro de alguma disponibilidade do espaço naquele dia da semana
  const dia = diaDaSemana(r.data);
  const disponibilidade = lerJson(caminhoDisponibilidades).find(
    (d) =>
      d.espacoId === r.espacoId &&
      d.diaSemana === dia &&
      r.horaInicio >= d.horaInicio &&
      r.horaFim <= d.horaFim
  );

  if (!disponibilidade) {
    return {
      status: 400,
      mensagem: 'O espaço não tem disponibilidade para esta data e horário',
    };
  }

  // Externo = reserva feita sem empresa vinculada
  if (!disponibilidade.permiteExterno && r.empresaId === null) {
    return {
      status: 403,
      mensagem: 'Esta disponibilidade não permite reservas externas (informe empresaId)',
    };
  }

  // Sem sobreposição com outra reserva confirmada no mesmo espaço e data
  const conflito = lerReservas().some(
    (o) =>
      o.id !== idIgnorar &&
      o.status === 'CONFIRMADA' &&
      o.espacoId === r.espacoId &&
      o.data === r.data &&
      r.horaInicio < o.horaFim &&
      r.horaFim > o.horaInicio
  );

  if (conflito) {
    return { status: 409, mensagem: 'Já existe uma reserva neste espaço que conflita com este horário' };
  }

  return null;
}

/**
 * @swagger
 * tags:
 *   name: Reservas
 *   description: Reservas de espaços
 *
 * components:
 *   schemas:
 *     Reserva:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         espacoId:
 *           type: integer
 *           example: 1
 *         usuarioId:
 *           type: integer
 *           example: 1
 *         empresaId:
 *           type: integer
 *           nullable: true
 *           example: null
 *         data:
 *           type: string
 *           format: date
 *           example: "2026-10-13"
 *         horaInicio:
 *           type: string
 *           example: "09:00"
 *         horaFim:
 *           type: string
 *           example: "11:00"
 *         status:
 *           type: string
 *           enum: [CONFIRMADA, CANCELADA]
 *           example: CONFIRMADA
 *         dataCadastro:
 *           type: string
 *           format: date
 *           example: "2026-10-04"
 *     ReservaInput:
 *       type: object
 *       required:
 *         - espacoId
 *         - usuarioId
 *         - data
 *         - horaInicio
 *         - horaFim
 *       properties:
 *         espacoId:
 *           type: integer
 *           example: 1
 *         usuarioId:
 *           type: integer
 *           example: 1
 *         empresaId:
 *           type: integer
 *           nullable: true
 *           description: Opcional. Sem empresa a reserva é considerada externa
 *           example: null
 *         data:
 *           type: string
 *           format: date
 *           example: "2026-10-13"
 *         horaInicio:
 *           type: string
 *           example: "09:00"
 *         horaFim:
 *           type: string
 *           example: "11:00"
 *         status:
 *           type: string
 *           enum: [CONFIRMADA, CANCELADA]
 *           example: CONFIRMADA
 */

/**
 * @swagger
 * /reservas:
 *   get:
 *     summary: Lista todas as reservas
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas ordenada por data e horário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 */
router.get('/', (req, res) => {
  const reservas = lerReservas().sort(ordenarPorDataHora);

  res.json(reservas);
});

/**
 * @swagger
 * /reservas/data/{data}:
 *   get:
 *     summary: Busca as reservas de uma data
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: data
 *         required: true
 *         description: Data no formato AAAA-MM-DD
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-10-13"
 *     responses:
 *       200:
 *         description: Reservas da data, ordenadas por horário (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 */
router.get('/data/:data', (req, res) => {
  const reservas = lerReservas()
    .filter((r) => r.data === req.params.data)
    .sort(ordenarPorDataHora);

  res.json(reservas);
});

/**
 * @swagger
 * /reservas/espaco/{espacoId}:
 *   get:
 *     summary: Lista as reservas de um espaço
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: espacoId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Reservas do espaço (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Espaço não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/espaco/:espacoId', (req, res) => {
  const espacoId = Number(req.params.espacoId);

  if (!lerJson(caminhoEspacos).some((e) => e.id === espacoId)) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  const reservas = lerReservas()
    .filter((r) => r.espacoId === espacoId)
    .sort(ordenarPorDataHora);

  res.json(reservas);
});

/**
 * @swagger
 * /reservas/usuario/{usuarioId}:
 *   get:
 *     summary: Lista as reservas de um usuário
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: usuarioId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Reservas do usuário (pode ser uma lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/usuario/:usuarioId', (req, res) => {
  const usuarioId = Number(req.params.usuarioId);

  if (!lerJson(caminhoUsuarios).some((u) => u.id === usuarioId)) {
    return res.status(404).json({ mensagem: 'Usuário não encontrado' });
  }

  const reservas = lerReservas()
    .filter((r) => r.usuarioId === usuarioId)
    .sort(ordenarPorDataHora);

  res.json(reservas);
});

/**
 * @swagger
 * /reservas/{id}:
 *   get:
 *     summary: Busca uma reserva pelo id
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Reserva encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Reserva não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const reserva = lerReservas().find((r) => r.id === id);

  if (!reserva) {
    return res.status(404).json({ mensagem: 'Reserva não encontrada' });
  }

  res.json(reserva);
});

/**
 * @swagger
 * /reservas:
 *   post:
 *     summary: Cria uma nova reserva
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservaInput'
 *     responses:
 *       201:
 *         description: Reserva criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       400:
 *         description: Campos inválidos, espaço inativo ou fora da disponibilidade
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Disponibilidade não permite reserva externa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Espaço, usuário ou empresa não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: Conflito de horário com outra reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.post('/', (req, res) => {
  const { espacoId, usuarioId, empresaId, data, horaInicio, horaFim, status } = req.body || {};

  if (espacoId === undefined || usuarioId === undefined || !data || !horaInicio || !horaFim) {
    return res.status(400).json({
      mensagem: 'espacoId, usuarioId, data, horaInicio e horaFim são obrigatórios',
    });
  }

  const novaReserva = {
    espacoId: Number(espacoId),
    usuarioId: Number(usuarioId),
    empresaId: empresaId === undefined || empresaId === null ? null : Number(empresaId),
    data,
    horaInicio,
    horaFim,
    status: status !== undefined ? status : 'CONFIRMADA',
  };

  const erro = validarReserva(novaReserva);
  if (erro) {
    return res.status(erro.status).json({ mensagem: erro.mensagem });
  }

  const reservas = lerReservas();

  // Próximo id = maior id existente + 1
  const novoId = reservas.reduce((maior, r) => Math.max(maior, r.id), 0) + 1;

  const reserva = {
    id: novoId,
    ...novaReserva,
    dataCadastro: new Date().toLocaleDateString('en-CA'), // AAAA-MM-DD no fuso local
  };

  reservas.push(reserva);
  salvarReservas(reservas);

  res.status(201).json(reserva);
});

/**
 * @swagger
 * /reservas/{id}:
 *   put:
 *     summary: Atualiza uma reserva (envie só os campos que quer alterar)
 *     tags: [Reservas]
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
 *             $ref: '#/components/schemas/ReservaInput'
 *     responses:
 *       200:
 *         description: Reserva atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       400:
 *         description: Campos inválidos, espaço inativo ou fora da disponibilidade
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       403:
 *         description: Disponibilidade não permite reserva externa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       404:
 *         description: Reserva, espaço, usuário ou empresa não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 *       409:
 *         description: Conflito de horário com outra reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const reservas = lerReservas();
  const indice = reservas.findIndex((r) => r.id === id);

  if (indice === -1) {
    return res.status(404).json({ mensagem: 'Reserva não encontrada' });
  }

  const { espacoId, usuarioId, empresaId, data, horaInicio, horaFim, status } = req.body || {};

  // Mantém os valores antigos para os campos que não vieram no body.
  // id e dataCadastro não podem ser alterados.
  const atualizada = {
    ...reservas[indice],
    ...(espacoId !== undefined && { espacoId: Number(espacoId) }),
    ...(usuarioId !== undefined && { usuarioId: Number(usuarioId) }),
    ...(empresaId !== undefined && { empresaId: empresaId === null ? null : Number(empresaId) }),
    ...(data !== undefined && { data }),
    ...(horaInicio !== undefined && { horaInicio }),
    ...(horaFim !== undefined && { horaFim }),
    ...(status !== undefined && { status }),
  };

  const erro = validarReserva(atualizada, id);
  if (erro) {
    return res.status(erro.status).json({ mensagem: erro.mensagem });
  }

  reservas[indice] = atualizada;
  salvarReservas(reservas);

  res.json(atualizada);
});

/**
 * @swagger
 * /reservas/{id}:
 *   delete:
 *     summary: Remove uma reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Reserva removida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Reserva não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Erro'
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const reservas = lerReservas();
  const reserva = reservas.find((r) => r.id === id);

  if (!reserva) {
    return res.status(404).json({ mensagem: 'Reserva não encontrada' });
  }

  salvarReservas(reservas.filter((r) => r.id !== id));

  res.json(reserva);
});

module.exports = router;
