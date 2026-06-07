import { 
  Asset, CreateAssetDTO, UpdateAssetDTO, Operation, CreateOperationDTO,
  User, Category, Department, Brand 
} from '../types';

const API_BASE = '/api';
const UPLOAD_BASE = '/uploads';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// Token管理
let authToken: string | null = localStorage.getItem('authToken');

export function getAuthToken(): string | null {
  return authToken;
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
  authToken = token;
}

// 获取照片URL
export function getPhotoUrl(photoUrl?: string): string {
  if (!photoUrl) return '';
  // 如果路径已经包含 /uploads，直接返回
  if (photoUrl.startsWith('/uploads')) {
    return photoUrl;
  }
  // 否则添加 /uploads 前缀
  return `${UPLOAD_BASE}${photoUrl}`;
}

// 登录
export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '登录失败');
  }
  const data: AuthResponse = await response.json();
  setAuthToken(data.token);
  return data;
}

// 登出
export async function logout(): Promise<void> {
  const token = getAuthToken();
  if (token) {
    await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  setAuthToken(null);
}

// 验证token
export async function verifyAuth(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.user;
  } catch {
    return null;
  }
}

// 获取所有资产
export async function getAssets(params?: { 
  search?: string; 
  category?: string; 
  status?: string;
  department?: string;
  ip?: string;
  network?: string;
}): Promise<Asset[]> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.category) query.append('category', params.category);
  if (params?.status) query.append('status', params.status);
  if (params?.department) query.append('department', params.department);
  if (params?.ip) query.append('ip', params.ip);
  if (params?.network) query.append('network', params.network);
  
  const response = await fetch(`${API_BASE}/assets?${query}`);
  if (!response.ok) throw new Error('获取资产列表失败');
  return response.json();
}

// 获取单个资产
export async function getAsset(id: number): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets/${id}`);
  if (!response.ok) throw new Error('获取资产详情失败');
  return response.json();
}

// 创建资产
export async function createAsset(data: CreateAssetDTO): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('创建资产失败');
  return response.json();
}

// 更新资产
export async function updateAsset(id: number, data: UpdateAssetDTO): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('更新资产失败');
  return response.json();
}

// 删除资产
export async function deleteAsset(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('删除资产失败');
}

// 通过二维码查询资产
export async function getAssetByQRCode(qrCode: string): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets/qrcode/${qrCode}`);
  if (!response.ok) throw new Error('未找到对应的资产');
  return response.json();
}

// 通过资产编码查询资产
export async function getAssetByCode(assetCode: string): Promise<Asset> {
  const response = await fetch(`${API_BASE}/assets/code/${assetCode}`);
  if (!response.ok) throw new Error('未找到对应的资产');
  return response.json();
}

// 获取操作记录
export async function getOperations(assetId: number): Promise<Operation[]> {
  const response = await fetch(`${API_BASE}/assets/${assetId}/operations`);
  if (!response.ok) throw new Error('获取操作记录失败');
  return response.json();
}

// 添加操作记录
export async function createOperation(assetId: number, data: CreateOperationDTO): Promise<Operation> {
  const response = await fetch(`${API_BASE}/assets/${assetId}/operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('添加操作记录失败');
  return response.json();
}

// 导出数据
export async function exportData(format: 'xlsx' | 'csv'): Promise<void> {
  window.open(`${API_BASE}/export?format=${format}`, '_blank');
}

// 获取统计数据
export async function getStats(): Promise<{ total: number; byStatus: { status: string; count: number }[]; byCategory: { category: string; count: number }[] }> {
  const response = await fetch(`${API_BASE}/stats`);
  if (!response.ok) throw new Error('获取统计数据失败');
  return response.json();
}

// ==================== 用户管理API ====================
export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  if (!response.ok) throw new Error('获取用户列表失败');
  return response.json();
}

export async function createUser(data: { username: string; password: string; display_name: string }): Promise<User> {
  const response = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建用户失败');
  }
  return response.json();
}

export async function updateUser(id: number, data: { username?: string; password?: string; display_name?: string }): Promise<User> {
  const response = await fetch(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '更新用户失败');
  }
  return response.json();
}

export async function deleteUser(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除用户失败');
  }
}

// ==================== 分类管理API ====================
export async function getCategories(): Promise<Category[]> {
  const response = await fetch(`${API_BASE}/categories`);
  if (!response.ok) throw new Error('获取品类列表失败');
  return response.json();
}

export async function createCategory(data: { name: string }): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建品类失败');
  }
  return response.json();
}

export async function updateCategory(id: number, data: { name?: string; sort_order?: number }): Promise<Category> {
  const response = await fetch(`${API_BASE}/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '更新品类失败');
  }
  return response.json();
}

export async function deleteCategory(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除品类失败');
  }
}

// ==================== 部门管理API ====================
export async function getDepartments(): Promise<Department[]> {
  const response = await fetch(`${API_BASE}/departments`);
  if (!response.ok) throw new Error('获取部门列表失败');
  return response.json();
}

export async function createDepartment(data: { name: string; parent_id?: number | null }): Promise<Department> {
  const response = await fetch(`${API_BASE}/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建部门失败');
  }
  return response.json();
}

export async function updateDepartment(id: number, data: { name?: string; parent_id?: number | null; sort_order?: number }): Promise<Department> {
  const response = await fetch(`${API_BASE}/departments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '更新部门失败');
  }
  return response.json();
}

export async function deleteDepartment(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/departments/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '删除部门失败');
  }
}

// ==================== 品牌管理API ====================
export async function getBrands(): Promise<Brand[]> {
  const response = await fetch(`${API_BASE}/brands`);
  if (!response.ok) throw new Error('获取品牌列表失败');
  return response.json();
}

export async function createBrand(data: { name: string }): Promise<Brand> {
  const response = await fetch(`${API_BASE}/brands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建品牌失败');
  }
  return response.json();
}

export async function deleteBrand(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/brands/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('删除品牌失败');
}
