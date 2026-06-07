import express from 'express';
import cors from 'cors';
import multer from 'multer';
import routes from './routes/index';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 文件上传中间件
const upload = multer({ dest: path.join(__dirname, '../uploads') });
app.use((req, res, next) => {
  (req as any).upload = upload;
  next();
});

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 API地址: http://localhost:${PORT}/api`);
  console.log(`📷 照片服务: http://localhost:${PORT}/uploads`);
});

export default app;
