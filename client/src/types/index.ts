export interface Asset {
  id: number;
  name: string;
  category: string;
  model: string;
  description: string;
  purchase_date: string;
  status: '在库' | '在用' | '维修' | '报废';
  department: string;
  address: string;
  qr_code: string;
  asset_code: string;
  photo_url?: string;
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

export interface Operation {
  id: number;
  asset_id: number;
  type: '签到' | '借出' | '归还' | '维修' | '报废' | '其他';
  operator: string;
  notes: string;
  timestamp: string;
}

export interface CreateAssetDTO {
  category: string;
  model?: string;
  description?: string;
  purchase_date: string;
  status?: string;
  department?: string;
  address?: string;
  photo?: string;
  qr_code?: string;
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

export interface UpdateAssetDTO {
  category?: string;
  model?: string;
  description?: string;
  purchase_date?: string;
  status?: string;
  department?: string;
  address?: string;
  photo?: string | null;
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

export interface CreateOperationDTO {
  type: string;
  operator: string;
  notes?: string;
}

export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  sort_order?: number;
  is_fixed?: number;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  created_at: string;
}

export interface Brand {
  id: number;
  name: string;
  created_at: string;
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}
