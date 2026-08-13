import { existsSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { port } from './config.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'study-planner' });
});
app.use(routes);

const distPath = path.join(process.cwd(), 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use('/api', (req, res) => res.status(404).json({ error: '接口不存在' }));

app.listen(port, '0.0.0.0', () => {
  console.log(`Study Planner server listening on http://0.0.0.0:${port}`);
});
