// src/routes/apiRoutes.ts
import { register, unregister } from './controllers/pluginController';
import express from 'express';

const defineRoutes = (app: express.Express) => {
    app.post('/register', register);
    app.post('/unregister', unregister);
}

export default defineRoutes;
