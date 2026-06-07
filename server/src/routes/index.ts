import { Router, Request, Response } from 'express';
import db from '../database/index';
import { 
  Asset, CreateAssetDTO, UpdateAssetDTO, Operation, CreateOperationDTO,
  User, Category, Department, Brand
} from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const router = Router();

// 配置文件上传
const upload = multer({ dest: path.join(__dirname, '../../uploads') });

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 简单session存储（生产环境应使用redis或数据库）
const sessions: Map<string, { userId: number; username: string; displayName: string }> = new Map();

// 登录
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hash) as { id: number; username: string; password: string; display_name: string } | undefined;
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    
    const token = uuidv4();
    sessions.set(token, {
      userId: user.id,
      username: user.username,
      displayName: user.display_name
    });
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 登出
router.post('/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && sessions.has(token)) {
    sessions.delete(token);
  }
  res.json({ message: '登出成功' });
});

// 验证token
router.get('/auth/verify', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const session = sessions.get(token)!;
  res.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName
    }
  });
});

// 生成唯一资产编码
function generateAssetCode(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `ASSET-${year}${month}${day}-${random}`;
}

// 处理照片压缩
async function processPhoto(base64Data: string): Promise<string | null> {
  try {
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    
    let processedBuffer = sharp(buffer);
    
    const metadata = await processedBuffer.metadata();
    if (!metadata.width || !metadata.height) {
      return null;
    }
    
    const maxSize = 640;
    if (metadata.width > metadata.height) {
      if (metadata.width > maxSize) {
        processedBuffer = processedBuffer.resize(maxSize, null, { withoutEnlargement: true });
      }
    } else {
      if (metadata.height > maxSize) {
        processedBuffer = processedBuffer.resize(null, maxSize, { withoutEnlargement: true });
      }
    }
    
    let quality = 80;
    let finalBuffer: Buffer;
    
    while (true) {
      finalBuffer = await processedBuffer
        .jpeg({ quality })
        .toBuffer();
      
      if (finalBuffer.length <= 20 * 1024 || quality <= 10) {
        break;
      }
      quality -= 10;
    }
    
    const filename = `${uuidv4()}.jpg`;
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, finalBuffer);
    
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('照片处理失败:', error);
    return null;
  }
}

// ==================== 资产相关API ====================

// 获取所有资产
router.get('/assets', (req: Request, res: Response) => {
  try {
    const { search, category, status, department, ip, network } = req.query;
    
    // 构建SQL查询
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 搜索关键字条件（覆盖更多字段）
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(`(
        name LIKE ? OR 
        brand LIKE ? OR 
        model LIKE ? OR 
        category LIKE ? OR 
        description LIKE ? OR 
        department LIKE ? OR 
        address LIKE ? OR 
        asset_code LIKE ? OR
        cpu LIKE ? OR
        ram LIKE ? OR
        ip_address LIKE ? OR
        network LIKE ?
      )`);
      // 重复12次，对应上面的12个字段
      params.push(
        searchTerm, searchTerm, searchTerm, searchTerm, 
        searchTerm, searchTerm, searchTerm, searchTerm,
        searchTerm, searchTerm, searchTerm, searchTerm
      );
    }
    
    // 品类筛选条件
    if (category && typeof category === 'string' && category.trim()) {
      conditions.push('category = ?');
      params.push(category.trim());
    }
    
    // 状态筛选条件
    if (status && typeof status === 'string' && status.trim()) {
      conditions.push('status = ?');
      params.push(status.trim());
    }
    
    // 部门筛选条件
    if (department && typeof department === 'string' && department.trim()) {
      conditions.push('department LIKE ?');
      params.push(`%${department.trim()}%`);
    }
    
    // IP地址筛选条件
    if (ip && typeof ip === 'string' && ip.trim()) {
      conditions.push('ip_address LIKE ?');
      params.push(`%${ip.trim()}%`);
    }
    
    // 网络筛选条件
    if (network && typeof network === 'string' && network.trim()) {
      conditions.push('network LIKE ?');
      params.push(`%${network.trim()}%`);
    }
    
    // 组合SQL
    let sql = 'SELECT * FROM assets';
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY created_at DESC';
    
    console.log('资产列表查询SQL:', sql, '参数:', params);
    
    const assets = db.prepare(sql).all(...params) as Asset[];
    res.json(assets);
  } catch (error) {
    console.error('获取资产列表失败:', error);
    res.status(500).json({ error: '获取资产列表失败' });
  }
});

// 获取单个资产
router.get('/assets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    
    if (!asset) {
      return res.status(404).json({ error: '资产不存在' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('获取资产详情失败:', error);
    res.status(500).json({ error: '获取资产详情失败' });
  }
});

// 创建资产
router.post('/assets', async (req: Request, res: Response) => {
  try {
    const data: CreateAssetDTO = req.body;
    const qr_code = data.qr_code || uuidv4();
    const asset_code = generateAssetCode();
    
    let photo_url: string | null = null;
    if (data.photo) {
      photo_url = await processPhoto(data.photo);
    }
    
    // 如果没有提供名称，则使用品牌+品类作为名称
    const name = data.brand ? `${data.brand}${data.category}` : data.category;
    
    const stmt = db.prepare(`
      INSERT INTO assets (name, category, model, description, purchase_date, status, department, address, qr_code, asset_code, photo_url, brand, cpu, ram, ssd, hdd, gpu, os, network, ip_address, display_size, ports)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      name,
      data.category,
      data.model || '',
      data.description || '',
      data.purchase_date,
      data.status || '在库',
      data.department || '',
      data.address || '',
      qr_code,
      asset_code,
      photo_url,
      data.brand || '',
      data.cpu || '',
      data.ram || '',
      data.ssd || '',
      data.hdd || '',
      data.gpu || '',
      data.os || '',
      data.network || '',
      data.ip_address || '',
      data.display_size || '',
      data.ports || ''
    );
    
    const newAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(result.lastInsertRowid) as Asset;
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('创建资产失败:', error);
    res.status(500).json({ error: '创建资产失败' });
  }
});

// 更新资产
router.put('/assets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateAssetDTO = req.body;
    
    const existingAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    if (!existingAsset) {
      return res.status(404).json({ error: '资产不存在' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      values.push(data.category);
    }
    if (data.model !== undefined) {
      updates.push('model = ?');
      values.push(data.model);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.purchase_date !== undefined) {
      updates.push('purchase_date = ?');
      values.push(data.purchase_date);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.department !== undefined) {
      updates.push('department = ?');
      values.push(data.department);
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      values.push(data.address);
    }
    // 新字段支持
    if (data.brand !== undefined) {
      updates.push('brand = ?');
      values.push(data.brand);
    }
    if (data.cpu !== undefined) {
      updates.push('cpu = ?');
      values.push(data.cpu);
    }
    if (data.ram !== undefined) {
      updates.push('ram = ?');
      values.push(data.ram);
    }
    if (data.ssd !== undefined) {
      updates.push('ssd = ?');
      values.push(data.ssd);
    }
    if (data.hdd !== undefined) {
      updates.push('hdd = ?');
      values.push(data.hdd);
    }
    if (data.gpu !== undefined) {
      updates.push('gpu = ?');
      values.push(data.gpu);
    }
    if (data.os !== undefined) {
      updates.push('os = ?');
      values.push(data.os);
    }
    if (data.network !== undefined) {
      updates.push('network = ?');
      values.push(data.network);
    }
    if (data.ip_address !== undefined) {
      updates.push('ip_address = ?');
      values.push(data.ip_address);
    }
    if (data.display_size !== undefined) {
      updates.push('display_size = ?');
      values.push(data.display_size);
    }
    if (data.ports !== undefined) {
      updates.push('ports = ?');
      values.push(data.ports);
    }
    
    if (data.photo !== undefined) {
      if (existingAsset.photo_url) {
        const oldPath = path.join(__dirname, '../..', existingAsset.photo_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      let photo_url: string | null = null;
      if (data.photo) {
        photo_url = await processPhoto(data.photo);
      }
      
      updates.push('photo_url = ?');
      values.push(photo_url);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE assets SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
    
    const updatedAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset;
    res.json(updatedAsset);
  } catch (error) {
    console.error('更新资产失败:', error);
    res.status(500).json({ error: '更新资产失败' });
  }
});

// 删除资产
router.delete('/assets/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existingAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    if (!existingAsset) {
      return res.status(404).json({ error: '资产不存在' });
    }
    
    if (existingAsset.photo_url) {
      const photoPath = path.join(__dirname, '../..', existingAsset.photo_url);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
    res.json({ message: '资产删除成功' });
  } catch (error) {
    console.error('删除资产失败:', error);
    res.status(500).json({ error: '删除资产失败' });
  }
});

// 通过二维码查询资产
router.get('/assets/qrcode/:qrCode', (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;
    const asset = db.prepare('SELECT * FROM assets WHERE qr_code = ?').get(qrCode) as Asset | undefined;
    
    if (!asset) {
      return res.status(404).json({ error: '未找到对应的资产' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('二维码查询失败:', error);
    res.status(500).json({ error: '二维码查询失败' });
  }
});

// 通过资产编码查询资产
router.get('/assets/code/:assetCode', (req: Request, res: Response) => {
  try {
    const { assetCode } = req.params;
    const asset = db.prepare('SELECT * FROM assets WHERE asset_code = ?').get(assetCode) as Asset | undefined;
    
    if (!asset) {
      return res.status(404).json({ error: '未找到对应的资产' });
    }
    
    res.json(asset);
  } catch (error) {
    console.error('资产编码查询失败:', error);
    res.status(500).json({ error: '资产编码查询失败' });
  }
});

// 获取资产的操作记录
router.get('/assets/:id/operations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const operations = db.prepare('SELECT * FROM operations WHERE asset_id = ? ORDER BY timestamp DESC').all(id) as Operation[];
    res.json(operations);
  } catch (error) {
    console.error('获取操作记录失败:', error);
    res.status(500).json({ error: '获取操作记录失败' });
  }
});

// 添加操作记录
router.post('/assets/:id/operations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: CreateOperationDTO = req.body;
    
    const existingAsset = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as Asset | undefined;
    if (!existingAsset) {
      return res.status(404).json({ error: '资产不存在' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO operations (asset_id, type, operator, notes)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(id, data.type, data.operator, data.notes || '');
    
    const newOperation = db.prepare('SELECT * FROM operations WHERE id = ?').get(result.lastInsertRowid) as Operation;
    res.status(201).json(newOperation);
  } catch (error) {
    console.error('添加操作记录失败:', error);
    res.status(500).json({ error: '添加操作记录失败' });
  }
});

// 导出数据
router.get('/export', (req: Request, res: Response) => {
  try {
    const { format = 'xlsx' } = req.query;
    
    const assets = db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all() as Asset[];
    
    if (format === 'csv') {
      const headers = ['ID', '资产编码', '名称', '品类', '型号', '描述', '登记日期', '状态', '部门', '地址', '二维码', '创建时间', '更新时间'];
      const rows = assets.map(a => [
        a.id, a.asset_code, a.name, a.category, a.model, a.description, a.purchase_date, a.status, a.department, a.address, a.qr_code, a.created_at, a.updated_at
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=assets.csv');
      res.send('\uFEFF' + csv);
    } else {
      const worksheet = XLSX.utils.json_to_sheet(assets.map(a => ({
        'ID': a.id,
        '资产编码': a.asset_code,
        '名称': a.name,
        '品类': a.category,
        '型号': a.model,
        '描述': a.description,
        '登记日期': a.purchase_date,
        '状态': a.status,
        '部门': a.department,
        '地址': a.address,
        '二维码': a.qr_code,
        '创建时间': a.created_at,
        '更新时间': a.updated_at
      })));
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '资产列表');
      
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=assets.xlsx');
      res.send(buffer);
    }
  } catch (error) {
    console.error('导出数据失败:', error);
    res.status(500).json({ error: '导出数据失败' });
  }
});

// 导入数据
router.post('/import', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要导入的文件' });
    }

    const filePath = req.file.path;
    let data: any[] = [];

    try {
      // 读取文件
      const fileBuffer = fs.readFileSync(filePath);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } finally {
      // 删除临时文件
      try {
        fs.unlinkSync(filePath);
      } catch {
        // 忽略删除错误
      }
    }

    if (data.length === 0) {
      return res.status(400).json({ error: '文件中没有数据' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    data.forEach((row: any, index: number) => {
      try {
        // 检查必填字段
        const assetCode = row['资产编码'] || row['asset_code'] || '';
        const name = row['名称'] || row['name'] || '';
        const category = row['品类'] || row['category'] || '';
        
        if (!name || !category) {
          errors.push(`第 ${index + 2} 行: 名称和品类为必填字段`);
          return;
        }

        // 如果有资产编码，检查是否已存在
        let existingAsset: Asset | undefined;
        if (assetCode) {
          existingAsset = db.prepare('SELECT * FROM assets WHERE asset_code = ?').get(assetCode) as Asset | undefined;
        }

        const now = new Date().toISOString();
        const qrCode = assetCode || generateAssetCode();
        
        if (existingAsset) {
          // 更新现有资产
          db.prepare(`
            UPDATE assets 
            SET name = ?, category = ?, model = ?, description = ?, 
                purchase_date = ?, status = ?, department = ?, address = ?, updated_at = ?
            WHERE id = ?
          `).run(
            name,
            category,
            row['型号'] || row['model'] || '',
            row['描述'] || row['description'] || '',
            row['登记日期'] || row['purchase_date'] || new Date().toISOString().split('T')[0],
            row['状态'] || row['status'] || '在库',
            row['部门'] || row['department'] || '',
            row['地址'] || row['address'] || '',
            now,
            existingAsset.id
          );
          importedCount++;
        } else {
          // 创建新资产
          const finalAssetCode = assetCode || generateAssetCode();
          const finalQRCode = row['二维码'] || row['qr_code'] || finalAssetCode;
          
          db.prepare(`
            INSERT INTO assets 
            (asset_code, qr_code, name, category, model, description, purchase_date, status, department, address, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            finalAssetCode,
            finalQRCode,
            name,
            category,
            row['型号'] || row['model'] || '',
            row['描述'] || row['description'] || '',
            row['登记日期'] || row['purchase_date'] || new Date().toISOString().split('T')[0],
            row['状态'] || row['status'] || '在库',
            row['部门'] || row['department'] || '',
            row['地址'] || row['address'] || '',
            now,
            now
          );
          importedCount++;
        }
      } catch (rowError: any) {
        errors.push(`第 ${index + 2} 行: ${rowError.message}`);
      }
    });

    if (errors.length > 0 && importedCount === 0) {
      return res.status(400).json({ error: '导入失败: ' + errors.join('; ') });
    }

    res.json({ 
      count: importedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('导入数据失败:', error);
    res.status(500).json({ error: '导入数据失败' });
  }
});

// 获取统计数据
router.get('/stats', (req: Request, res: Response) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number };
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM assets GROUP BY status').all() as { status: string; count: number }[];
    const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM assets GROUP BY category').all() as { category: string; count: number }[];
    
    res.json({
      total: total.count,
      byStatus,
      byCategory
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ==================== 用户管理API ====================

router.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.prepare('SELECT id, username, display_name, created_at FROM users ORDER BY created_at DESC').all() as User[];
    res.json(users);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.post('/users', (req: Request, res: Response) => {
  try {
    const { username, password, display_name } = req.body;
    
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: '用户名、密码和显示名称不能为空' });
    }
    
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const stmt = db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)');
    const result = stmt.run(username, hash, display_name);
    
    const newUser = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: '用户名已存在' });
    }
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

router.put('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, display_name } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (display_name !== undefined) {
      updates.push('display_name = ?');
      values.push(display_name);
    }
    if (password !== undefined) {
      updates.push('password = ?');
      values.push(crypto.createHash('sha256').update(password).digest('hex'));
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }
    
    values.push(id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    try {
      db.prepare(sql).run(...values);
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: '用户名已存在' });
      }
      throw error;
    }
    
    const updatedUser = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?').get(id) as User;
    res.json(updatedUser);
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as { username: string } | undefined;
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    if (user.username === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账户' });
    }
    
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

// ==================== 分类管理API ====================

router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id ASC').all() as Category[];
    res.json(categories);
  } catch (error) {
    console.error('获取分类列表失败:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

router.post('/categories', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '品类名称不能为空' });
    }
    
    // 获取最大的 sort_order
    const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM categories').get() as { max: number | null };
    const nextSort = (maxSort.max || 0) + 1;
    
    const stmt = db.prepare('INSERT INTO categories (name, sort_order, is_fixed) VALUES (?, ?, 0)');
    const result = stmt.run(name, nextSort);
    
    const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid) as Category;
    res.status(201).json(newCategory);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: '品类已存在' });
    }
    console.error('创建品类失败:', error);
    res.status(500).json({ error: '创建品类失败' });
  }
});

router.put('/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
    if (!existing) {
      return res.status(404).json({ error: '品类不存在' });
    }
    
    if (existing.is_fixed && name && name !== existing.name) {
      return res.status(400).json({ error: '固定品类不能修改名称' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }
    
    values.push(id);
    const sql = `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
    
    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category;
    res.json(updatedCategory);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: '品类名称已存在' });
    }
    console.error('更新品类失败:', error);
    res.status(500).json({ error: '更新品类失败' });
  }
});

router.delete('/categories/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
    if (!existing) {
      return res.status(404).json({ error: '品类不存在' });
    }
    
    if (existing.is_fixed) {
      return res.status(400).json({ error: '固定品类不能删除' });
    }
    
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ message: '品类删除成功' });
  } catch (error) {
    console.error('删除品类失败:', error);
    res.status(500).json({ error: '删除品类失败' });
  }
});

// ==================== 部门管理API ====================

router.get('/departments', (req: Request, res: Response) => {
  try {
    const departments = db.prepare('SELECT * FROM departments ORDER BY sort_order ASC, id ASC').all() as Department[];
    res.json(departments);
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ error: '获取部门列表失败' });
  }
});

router.post('/departments', (req: Request, res: Response) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) {
      return res.status(400).json({ error: '部门名称不能为空' });
    }
    
    // 获取最大的 sort_order
    const maxSort = db.prepare('SELECT MAX(sort_order) as max FROM departments WHERE parent_id = ?').get(parent_id ?? null) as { max: number | null };
    const nextSort = (maxSort.max ?? 0) + 1;
    
    const stmt = db.prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)');
    const result = stmt.run(name, parent_id ?? null, nextSort);
    
    const newDepartment = db.prepare('SELECT * FROM departments WHERE id = ?').get(result.lastInsertRowid) as Department;
    res.status(201).json(newDepartment);
  } catch (error: any) {
    console.error('创建部门失败:', error);
    res.status(500).json({ error: '创建部门失败' });
  }
});

router.put('/departments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parent_id, sort_order } = req.body;
    
    const existing = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as Department | undefined;
    if (!existing) {
      return res.status(404).json({ error: '部门不存在' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?');
      values.push(parent_id);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      values.push(sort_order);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }
    
    values.push(id);
    const sql = `UPDATE departments SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);
    
    const updatedDepartment = db.prepare('SELECT * FROM departments WHERE id = ?').get(id) as Department;
    res.json(updatedDepartment);
  } catch (error: any) {
    console.error('更新部门失败:', error);
    res.status(500).json({ error: '更新部门失败' });
  }
});

router.delete('/departments/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM departments WHERE id = ?').run(id);
    res.json({ message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ error: '删除部门失败' });
  }
});

// ==================== 品牌管理API ====================

router.get('/brands', (req: Request, res: Response) => {
  try {
    const brands = db.prepare('SELECT * FROM brands ORDER BY name').all() as Brand[];
    res.json(brands);
  } catch (error) {
    console.error('获取品牌列表失败:', error);
    res.status(500).json({ error: '获取品牌列表失败' });
  }
});

router.post('/brands', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: '品牌名称不能为空' });
    }
    
    const stmt = db.prepare('INSERT INTO brands (name) VALUES (?)');
    const result = stmt.run(name);
    
    const newBrand = db.prepare('SELECT * FROM brands WHERE id = ?').get(result.lastInsertRowid) as Brand;
    res.status(201).json(newBrand);
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(400).json({ error: '品牌已存在' });
    }
    console.error('创建品牌失败:', error);
    res.status(500).json({ error: '创建品牌失败' });
  }
});

router.delete('/brands/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM brands WHERE id = ?').run(id);
    res.json({ message: '品牌删除成功' });
  } catch (error) {
    console.error('删除品牌失败:', error);
    res.status(500).json({ error: '删除品牌失败' });
  }
});

export default router;
