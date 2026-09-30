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
function buscarEspaco(space_id) {
    const dados = fs.readFileSync(caminhoEspacos, 'utf-8');
    const espacos = JSON.parse(dados);
    return espacos.find((e) => e.id === Number(space_id));
}

// Verifica se um espaço existe
function espacoExiste(space_id) {
    return buscarEspaco(space_id) !== undefined;
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
 *         space_id:
 *           type: integer
 *           example: 1
 *         dia_semana:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         hora_inicio:
 *           type: string
 *           example: "08:00"
 *         hora_fim:
 *           type: string
 *           example: "18:00"
 *         permite_externo:
 *           type: boolean
 *           example: true
 *     DisponibilidadeInput:
 *       type: object
 *       required:
 *         - space_id
 *         - dia_semana
 *         - hora_inicio
 *         - hora_fim
 *       properties:
 *         space_id:
 *           type: integer
 *           example: 1
 *         dia_semana:
 *           type: integer
 *           minimum: 0
 *           maximum: 6
 *           example: 1
 *         hora_inicio:
 *           type: string
 *           example: "08:00"
 *         hora_fim:
 *           type: string
 *           example: "18:00"
 *         permite_externo:
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
        .sort((a, b) => a.space_id - b.space_id || a.dia_semana - b.dia_semana);

    res.json(disponibilidades);
});

/**
 * @swagger
 * /disponibilidades/espaco/{space_id}:
 *   get:
 *     summary: Lista as disponibilidades de um espaço específico
 *     tags: [Disponibilidades]
 *     parameters:
 *       - in: path
 *         name: space_id
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
router.get('/espaco/:space_id', (req, res) => {
    const space_id = Number(req.params.space_id);

    if (!espacoExiste(space_id)) {
        return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    }

    const disponibilidades = lerDisponibilidades()
        .filter((d) => d.space_id === space_id)
        .sort((a, b) => a.dia_semana - b.dia_semana);

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
 *         description: Campos inválidos, formato de horário incorreto, hora_inicio >= hora_fim, ou espaço está inativo
 *       404:
 *         description: Espaço não encontrado
 *       409:
 *         description: Já existe disponibilidade para este espaço neste dia e horário
 */
router.post('/', (req, res) => {
    const { space_id, dia_semana, hora_inicio, hora_fim, permite_externo } = req.body;

    if (space_id === undefined || dia_semana === undefined || !hora_inicio || !hora_fim) {
        return res.status(400).json({
            mensagem: 'space_id, dia_semana, hora_inicio e hora_fim são obrigatórios',
        });
    }

    const espaco = buscarEspaco(space_id);

    if (!espaco) {
        return res.status(404).json({ mensagem: 'Espaço não encontrado' });
    }

    if (!espaco.ativo) {
        return res.status(400).json({
            mensagem: 'Não é possível cadastrar disponibilidade para um espaço inativo',
        });
    }

    const dia = Number(dia_semana);
    if (dia < 0 || dia > 6) {
        return res.status(400).json({ mensagem: 'dia_semana deve estar entre 0 (Domingo) e 6 (Sábado)' });
    }

    if (!horaValida(hora_inicio) || !horaValida(hora_fim)) {
        return res.status(400).json({ mensagem: 'Horários devem estar no formato HH:MM' });
    }

    if (hora_inicio >= hora_fim) {
        return res.status(400).json({ mensagem: 'hora_inicio deve ser anterior a hora_fim' });
    }

    const disponibilidades = lerDisponibilidades();

    const conflito = disponibilidades.some(
        (d) =>
            d.space_id === Number(space_id) &&
            d.dia_semana === dia &&
            d.hora_inicio === hora_inicio &&
            d.hora_fim === hora_fim
    );

    if (conflito) {
        return res.status(409).json({
            mensagem: 'Já existe uma disponibilidade para este espaço neste dia e horário',
        });
    }

    const novoId = disponibilidades.reduce((maior, d) => Math.max(maior, d.id), 0) + 1;

    const novaDisponibilidade = {
        id: novoId,
        space_id: Number(space_id),
        dia_semana: dia,
        hora_inicio,
        hora_fim,
        permite_externo: permite_externo !== undefined ? Boolean(permite_externo) : true,
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
 *         description: Campos inválidos, formato de horário incorreto, hora_inicio >= hora_fim, ou espaço está inativo
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

    const { space_id, dia_semana, hora_inicio, hora_fim, permite_externo } = req.body;

    if (space_id !== undefined) {
        const espaco = buscarEspaco(space_id);
        if (!espaco) {
            return res.status(404).json({ mensagem: 'Espaço não encontrado' });
        }
        if (!espaco.ativo) {
            return res.status(400).json({
                mensagem: 'Não é possível vincular disponibilidade a um espaço inativo',
            });
        }
    }

    if (dia_semana !== undefined && (Number(dia_semana) < 0 || Number(dia_semana) > 6)) {
        return res.status(400).json({ mensagem: 'dia_semana deve estar entre 0 e 6' });
    }

    if (hora_inicio !== undefined && !horaValida(hora_inicio)) {
        return res.status(400).json({ mensagem: 'hora_inicio deve estar no formato HH:MM' });
    }

    if (hora_fim !== undefined && !horaValida(hora_fim)) {
        return res.status(400).json({ mensagem: 'hora_fim deve estar no formato HH:MM' });
    }

    const atual = disponibilidades[indice];
    const inicioFinal = hora_inicio !== undefined ? hora_inicio : atual.hora_inicio;
    const fimFinal = hora_fim !== undefined ? hora_fim : atual.hora_fim;

    if (inicioFinal >= fimFinal) {
        return res.status(400).json({ mensagem: 'hora_inicio deve ser anterior a hora_fim' });
    }

    const atualizada = {
        ...atual,
        ...(space_id !== undefined && { space_id: Number(space_id) }),
        ...(dia_semana !== undefined && { dia_semana: Number(dia_semana) }),
        ...(hora_inicio !== undefined && { hora_inicio }),
        ...(hora_fim !== undefined && { hora_fim }),
        ...(permite_externo !== undefined && { permite_externo: Boolean(permite_externo) }),
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