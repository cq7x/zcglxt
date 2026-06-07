// 资产接口
export interface Asset {
  id: number;
  name: string;
  category: string;
  model: string; // 型号
  description: string;
  purchase_date: string;
  status: '在库' | '在用' | '维修' | '报废';
  department: string;
  address: string;
  qr_code: string;
  asset_code: string; // 唯一编码
  photo_url?: string; // 照片URL
  // 通用字段
  brand: string; // 品牌
  // 电脑专用字段
  cpu: string;
  ram: string;
  ssd: string;
  hdd: string;
  gpu: string;
  os: string;
  network: string;
  ip_address: string;
  // 显示器专用字段
  display_size: string;
  ports: string;
  created_at: string;
  updated_at: string;
}

// 操作记录接口
export interface Operation {
  id: number;
  asset_id: number;
  type: '签到' | '借出' | '归还' | '维修' | '报废' | '其他';
  operator: string;
  notes: string;
  timestamp: string;
}

// 创建资产DTO
export interface CreateAssetDTO {
  name: string;
  category: string;
  model?: string; // 型号
  description?: string;
  purchase_date: string;
  status?: '在库' | '在用' | '维修' | '报废';
  department?: string;
  address?: string;
  photo?: string; // Base64照片
  qr_code?: string; // 自定义二维码（用于绑定已有二维码）
  // 通用字段
  brand?: string; // 品牌
  // 电脑专用字段
  cpu?: string;
  ram?: string;
  ssd?: string;
  hdd?: string;
  gpu?: string;
  os?: string;
  network?: string;
  ip_address?: string;
  // 显示器专用字段
  display_size?: string;
  ports?: string;
}

// 更新资产DTO
export interface UpdateAssetDTO {
  name?: string;
  category?: string;
  model?: string; // 型号
  description?: string;
  purchase_date?: string;
  status?: '在库' | '在用' | '维修' | '报废';
  department?: string;
  address?: string;
  photo?: string | null; // Base64照片或null删除照片
  // 通用字段
  brand?: string; // 品牌
  // 电脑专用字段
  cpu?: string;
  ram?: string;
  ssd?: string;
  hdd?: string;
  gpu?: string;
  os?: string;
  network?: string;
  ip_address?: string;
  // 显示器专用字段
  display_size?: string;
  ports?: string;
}

// 创建操作记录DTO
export interface CreateOperationDTO {
  type: '签到' | '借出' | '归还' | '维修' | '报废' | '其他';
  operator: string;
  notes?: string;
}

// 用户接口
export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

// 分类接口
export interface Category {
  id: number;
  name: string;
  sort_order?: number;
  is_fixed?: number;
  created_at: string;
}

// 部门接口
export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

// 设备名称接口
export interface Brand {
  id: number;
  name: string;
  created_at: string;
}

// 统计数据
export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}
