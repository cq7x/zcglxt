import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const dbPath = path.join(__dirname, '../../data/assets.db');

// 确保数据目录存在
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    model TEXT DEFAULT '',
    description TEXT DEFAULT '',
    purchase_date TEXT NOT NULL,
    status TEXT DEFAULT '在库',
    department TEXT DEFAULT '',
    address TEXT DEFAULT '',
    qr_code TEXT UNIQUE NOT NULL,
    asset_code TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    brand TEXT DEFAULT '',
    cpu TEXT DEFAULT '',
    ram TEXT DEFAULT '',
    ssd TEXT DEFAULT '',
    hdd TEXT DEFAULT '',
    gpu TEXT DEFAULT '',
    os TEXT DEFAULT '',
    network TEXT DEFAULT '',
    ip_address TEXT DEFAULT '',
    display_size TEXT DEFAULT '',
    ports TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    operator TEXT NOT NULL,
    notes TEXT DEFAULT '',
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_fixed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_assets_qr_code ON assets(qr_code);
  CREATE INDEX IF NOT EXISTS idx_assets_asset_code ON assets(asset_code);
  CREATE INDEX IF NOT EXISTS idx_operations_asset_id ON operations(asset_id);
`);

// 重置/创建管理员账户
const hash = crypto.createHash('sha256').update('admin123').digest('hex');
const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (existingUser) {
  // 更新现有admin密码
  db.prepare('UPDATE users SET password = ?, display_name = ? WHERE username = ?').run(hash, '管理员', 'admin');
  console.log('管理员密码已重置: admin / admin123');
} else {
  // 创建新admin
  db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)').run('admin', hash, '管理员');
  console.log('默认管理员账户已创建: admin / admin123');
}

// 初始化默认数据
const initDefaultData = () => {
  const defaultCategories = [
    { name: '电脑', sort_order: 1, is_fixed: 1 },
    { name: '显示器', sort_order: 2, is_fixed: 1 },
    { name: '打印机', sort_order: 3, is_fixed: 1 },
    { name: '一体机', sort_order: 4, is_fixed: 1 },
    { name: '复印机', sort_order: 5, is_fixed: 1 },
    { name: '服务器', sort_order: 6, is_fixed: 1 }
  ];
  
  // 检查是否已有部门数据
  const existingDepartments = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number };
  if (existingDepartments.count === 0) {
    // 插入示例层级部门
    const insertDepartment = db.prepare('INSERT INTO departments (name, parent_id, sort_order) VALUES (?, ?, ?)');
    
    // 第一级
    const daduiId = insertDepartment.run('某某大队', null, 1).lastInsertRowid as number;
    
    // 第二级 - 大队下的
    const zhongdui1Id = insertDepartment.run('一中队', daduiId, 1).lastInsertRowid as number;
    const zhongdui2Id = insertDepartment.run('二中队', daduiId, 2).lastInsertRowid as number;
    const keshikeId = insertDepartment.run('科室', daduiId, 3).lastInsertRowid as number;
    
    // 第三级 - 中队下的
    insertDepartment.run('一班', zhongdui1Id, 1);
    insertDepartment.run('二班', zhongdui1Id, 2);
    insertDepartment.run('三班', zhongdui2Id, 1);
    
    // 第三级 - 科室下的
    insertDepartment.run('办公室', keshikeId, 1);
    insertDepartment.run('财务室', keshikeId, 2);
    insertDepartment.run('资料室', keshikeId, 3);
    
    // 其他部门
    insertDepartment.run('仓库A', null, 4);
    insertDepartment.run('仓库B', null, 5);
    insertDepartment.run('会议室', null, 6);
  }
  
  const defaultBrands = ['联想', '戴尔', '惠普', '苹果', '华为'];

  const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, sort_order, is_fixed) VALUES (?, ?, ?)');
  const insertBrand = db.prepare('INSERT OR IGNORE INTO brands (name) VALUES (?)');

  defaultCategories.forEach(cat => insertCategory.run(cat.name, cat.sort_order, cat.is_fixed));
  defaultBrands.forEach(name => insertBrand.run(name));
  
  console.log('默认数据初始化完成');
};

initDefaultData();

console.log('数据库初始化完成');

export default db;
