const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes/index');

const app = express();
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Gestão de Espaços',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.js'],   // onde procurar os comentários @swagger
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(routes);

app.listen(3000, () => {
    console.log('http://localhost:3000');
    console.log('Swagger em http://localhost:3000/api-docs');
})