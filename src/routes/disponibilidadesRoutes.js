const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const caminho = path.join(__dirname, '../db/disponibilidades.json');
const caminhoEspacos = path.join(__dirname, '../db/espacos.json');

// Funções auxiliares para disponibilidades
function lerDisponibilidades() {
  const dados = fs.readFileSync(caminho, 'utf-8');
  return JSON.parse(dados);
}

function salvarDisponibilidades(disponibilidades) {
  fs.writeFileSync(caminho, JSON.stringify(disponibilidades, null, 2));
}

// Busca um espaço pelo id (retorna o objeto ou undefined)
function buscarEspaco(espacoId) {
  const dados = fs.readFileSync(caminhoEspacos, 'utf-8');
  const espacos = JSON.parse(dados);
  return espacos.find((e) => e.id === Number(espacoId));
}

// Verifica se um espaço existe
function espacoExiste(espacoId) {
  return buscarEspaco(espacoId) !== undefined;
}

// Valida o formato "HH:MM"
function horaValida(hora) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

/**
 * @swagger
 * tags:
 *   name: Disponibilidades
 *   description: Regras de disponibilidade semanal dos espaços
 *
 * components:
 *   schemas:
 *     Disponibilidade:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         espacoId:
 *           type: integer
 *           example: 1
 *         diaSemana:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         horaInicio:
 *           type: string
 *           example: "08:00"
 *         horaFim:
 *           type: string
 *           example: "18:00"
 *         permiteExterno:
 *           type: boolean
 *           example: true
 *     DisponibilidadeInput:
 *       type: object
 *       required:
 *         - espacoId
 *         - diaSemana
 *         - horaInicio
 *         - horaFim
 *       properties:
 *         espacoId:
 *           type: integer
 *           example: 1
 *         diaSemana:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         horaInicio:
 *           type: string
 *           example: "08:00"
 *         horaFim:
 *           type: string
 *           example: "18:00"
 *         permiteExterno:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /disponibilidades:
 *   get:
 *     summary: Lista todas as disponibilidades
 *     tags: [Disponibilidades]
 *     responses:
 *       200:
 *         description: Lista de disponibilidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Disponibilidade'
 */
router.get('/', (req, res) => {
  const disponibilidades = lerDisponibilidades()
    .sort((a, b) => a.espacoId - b.espacoId || a.diaSemana - b.diaSemana);

  res.json(disponibilidades);
});

/**
 * @swagger
 * /disponibilidades/espaco/{espacoId}:
 *   get:
 *     summary: Lista as disponibilidades de um espaço específico
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: espacoId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Disponibilidades do espaço (pode ser lista vazia)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Disponibilidade'
 *       404:
 *         description: Espaço não encontrado
 */
router.get('/espaco/:espacoId', (req, res) => {
  const espacoId = Number(req.params.espacoId);

  if (!espacoExiste(espacoId)) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  const disponibilidades = lerDisponibilidades()
    .filter((d) => d.espacoId === espacoId)
    .sort((a, b) => a.diaSemana - b.diaSemana);

  res.json(disponibilidades);
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   get:
 *     summary: Busca uma disponibilidade pelo id
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Disponibilidade encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const disponibilidade = lerDisponibilidades().find((d) => d.id === id);

  if (!disponibilidade) {
    return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
  }

  res.json(disponibilidade);
});

/**
 * @swagger
 * /disponibilidades:
 *   post:
 *     summary: Cadastra uma nova disponibilidade
 *     tags: [Disponibilidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *     responses:
 *       201:
 *         description: Disponibilidade criada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       400:
 *         description: Campos inválidos, formato de horário incorreto, horaInicio >= horaFim, ou espaço está inativo
 *       404:
 *         description: Espaço não encontrado
 *       409:
 *         description: Já existe disponibilidade para este espaço neste dia e horário
 */
router.post('/', (req, res) => {
  const { espacoId, diaSemana, horaInicio, horaFim, permiteExterno } = req.body || {};

  if (espacoId === undefined || diaSemana === undefined || !horaInicio || !horaFim) {
    return res.status(400).json({
      mensagem: 'espacoId, diaSemana, horaInicio e horaFim são obrigatórios',
    });
  }

  const espaco = buscarEspaco(espacoId);

  if (!espaco) {
    return res.status(404).json({ mensagem: 'Espaço não encontrado' });
  }

  if (!espaco.ativo) {
    return res.status(400).json({
      mensagem: 'Não é possível cadastrar disponibilidade para um espaço inativo',
    });
  }

  const dia = Number(diaSemana);
  if (dia < 0 || dia > 6) {
    return res.status(400).json({ mensagem: 'diaSemana deve estar entre 0 (Domingo) e 6 (Sábado)' });
  }

  if (!horaValida(horaInicio) || !horaValida(horaFim)) {
    return res.status(400).json({ mensagem: 'Horários devem estar no formato HH:MM' });
  }

  if (horaInicio >= horaFim) {
    return res.status(400).json({ mensagem: 'horaInicio deve ser anterior a horaFim' });
  }

  const disponibilidades = lerDisponibilidades();

  const conflito = disponibilidades.some(
    (d) =>
      d.espacoId === Number(espacoId) &&
      d.diaSemana === dia &&
      d.horaInicio === horaInicio &&
      d.horaFim === horaFim
  );

  if (conflito) {
    return res.status(409).json({
      mensagem: 'Já existe uma disponibilidade para este espaço neste dia e horário',
    });
  }

  const novoId = disponibilidades.reduce((maior, d) => Math.max(maior, d.id), 0) + 1;

  const novaDisponibilidade = {
    id: novoId,
    espacoId: Number(espacoId),
    diaSemana: dia,
    horaInicio,
    horaFim,
    permiteExterno: permiteExterno !== undefined ? Boolean(permiteExterno) : true,
  };

  disponibilidades.push(novaDisponibilidade);
  salvarDisponibilidades(disponibilidades);

  res.status(201).json(novaDisponibilidade);
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   put:
 *     summary: Atualiza uma disponibilidade
 *     tags: [Disponibilidades]
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
 *             $ref: '#/components/schemas/DisponibilidadeInput'
 *     responses:
 *       200:
 *         description: Disponibilidade atualizada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       400:
 *         description: Campos inválidos, formato de horário incorreto, horaInicio >= horaFim, ou espaço está inativo
 *       404:
 *         description: Disponibilidade ou espaço não encontrado
 */
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const disponibilidades = lerDisponibilidades();
  const indice = disponibilidades.findIndex((d) => d.id === id);

  if (indice === -1) {
    return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
  }

  const { espacoId, diaSemana, horaInicio, horaFim, permiteExterno } = req.body || {};

  if (espacoId !== undefined) {
    const espaco = buscarEspaco(espacoId);
    if (!espaco) {
      return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    }
    if (!espaco.ativo) {
      return res.status(400).json({
        mensagem: 'Não é possível vincular disponibilidade a um espaço inativo',
      });
    }
  }

  if (diaSemana !== undefined && (Number(diaSemana) < 0 || Number(diaSemana) > 6)) {
    return res.status(400).json({ mensagem: 'diaSemana deve estar entre 0 e 6' });
  }

  if (horaInicio !== undefined && !horaValida(horaInicio)) {
    return res.status(400).json({ mensagem: 'horaInicio deve estar no formato HH:MM' });
  }

  if (horaFim !== undefined && !horaValida(horaFim)) {
    return res.status(400).json({ mensagem: 'horaFim deve estar no formato HH:MM' });
  }

  const atual = disponibilidades[indice];
  const inicioFinal = horaInicio !== undefined ? horaInicio : atual.horaInicio;
  const fimFinal = horaFim !== undefined ? horaFim : atual.horaFim;

  if (inicioFinal >= fimFinal) {
    return res.status(400).json({ mensagem: 'horaInicio deve ser anterior a horaFim' });
  }

  const atualizada = {
    ...atual,
    ...(espacoId !== undefined && { espacoId: Number(espacoId) }),
    ...(diaSemana !== undefined && { diaSemana: Number(diaSemana) }),
    ...(horaInicio !== undefined && { horaInicio }),
    ...(horaFim !== undefined && { horaFim }),
    ...(permiteExterno !== undefined && { permiteExterno: Boolean(permiteExterno) }),
  };

  disponibilidades[indice] = atualizada;
  salvarDisponibilidades(disponibilidades);

  res.json(atualizada);
});

/**
 * @swagger
 * /disponibilidades/{id}:
 *   delete:
 *     summary: Remove uma disponibilidade
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: Disponibilidade removida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Disponibilidade'
 *       404:
 *         description: Disponibilidade não encontrada
 */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const disponibilidades = lerDisponibilidades();
  const disponibilidade = disponibilidades.find((d) => d.id === id);

  if (!disponibilidade) {
    return res.status(404).json({ mensagem: 'Disponibilidade não encontrada' });
  }

  salvarDisponibilidades(disponibilidades.filter((d) => d.id !== id));

  res.json(disponibilidade);
});

module.exports = router;