import express from 'express';
import defineRoutes from './routes';
import config from './config/default';
import path from 'path';
import { Sequelize } from 'sequelize-typescript';
import Plugin from './models/plugin';

const sequelize = new Sequelize(config.mysql!.uri,{models: [path.join(__dirname, './models')]});

Plugin.findOrCreate({
  where: { priority: 0 },
  defaults: {
    name: config.coreStagePluginName,
    type: 'blocking',
    priority: 0,
    input_topic: 'logs',
    output_topic: 'logs_0'
  }
});
var cors = require('cors');
var app = express();

app.use(cors());

app.use(express.json());

defineRoutes(app);

const startServer = () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
  });
};

const start = async () => {
  startServer();
};

const handleExit = async () => {
  console.log('Arresto del server in corso...');
  await sequelize.close();
  console.log('Mysql disconnesso correttamente');
  process.exit(0);
};

process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);

start().catch((err) => {
  console.error('Errore durante l\'avvio del server:', err);
  handleExit();
});
