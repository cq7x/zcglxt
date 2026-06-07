# 资产管理系统 (zcglxt)

一个功能完整的资产管理系统，支持资产追踪、二维码管理、导入导出等功能。

## 功能特性

- 📋 资产列表管理
- ➕ 添加和编辑资产
- 📷 二维码扫描
- 🖨️ 标签打印
- 📤 数据导入导出 (Excel/CSV)
- 📊 部门管理
- ⚙️ 参数设置

## 技术栈

### 后端
- Node.js + Express
- SQLite 数据库
- TypeScript

### 前端
- React + TypeScript
- Vite 构建工具
- Tailwind CSS

## 快速开始

### 安装依赖

```bash
npm run install:all
```

### 开发模式

```bash
npm run dev
```

### 单独启动服务

**启动后端 (端口 3001):**
```bash
npm run dev:server
```

**启动前端 (端口 5177):**
```bash
npm run dev:client
```

### 构建

```bash
npm run build
```

### 生产环境

```bash
npm run start
```

## 默认登录账号

- 用户名: `admin`
- 密码: `admin123`

## 项目结构

```
zcglxt/
├── client/          # 前端项目
├── server/          # 后端项目
├── package.json     # 根 package.json
└── README.md
```

## License

MIT
