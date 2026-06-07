import React, { useState, useEffect } from 'react';
import { 
  getUsers, createUser, updateUser, deleteUser,
  getCategories, createCategory, updateCategory, deleteCategory,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getBrands, createBrand, deleteBrand
} from '../api';
import { User, Category, Department, Brand } from '../types';

// 部门树节点类型
interface DepartmentNode extends Department {
  children: DepartmentNode[];
  level: number;
}

const statusColors: Record<string, string> = {
  success: 'bg-green-100 text-green-800 border border-green-200',
  error: 'bg-red-100 text-red-800 border border-red-200'
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState('users');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 用户管理
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState<{ username: string; password: string; display_name: string }>({
    username: '', password: '', display_name: ''
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  // 分类管理
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // 部门管理
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  const [editingDepartmentId, setEditingDepartmentId] = useState<number | null>(null);
  const [editingDepartmentName, setEditingDepartmentName] = useState('');
  const [addingChildToId, setAddingChildToId] = useState<number | null>(null);
  const [newChildName, setNewChildName] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 品牌管理
  const [brands, setBrands] = useState<Brand[]>([]);
  const [newBrand, setNewBrand] = useState('');

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // 加载数据
  const loadData = async () => {
    try {
      const [users, cats, deps, brands] = await Promise.all([
        getUsers(), getCategories(), getDepartments(), getBrands()
      ]);
      setUsers(users);
      setCategories(cats);
      setDepartments(deps);
      setBrands(brands);
    } catch (err) {
      showToast('error', '加载数据失败');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 用户管理
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const data: any = { ...userForm };
        if (!userForm.password) delete data.password;
        await updateUser(editingUserId, data);
        showToast('success', '用户更新成功');
      } else {
        await createUser(userForm);
        showToast('success', '用户创建成功');
      }
      setUserForm({ username: '', password: '', display_name: '' });
      setEditingUserId(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '操作失败');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({ username: user.username, password: '', display_name: user.display_name });
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (username === 'admin') {
      alert('不能删除管理员账号');
      return;
    }
    if (!confirm(`确定要删除用户"${username}"吗？`)) return;
    try {
      await deleteUser(id);
      showToast('success', '用户删除成功');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '删除失败');
    }
  };

  // 分类管理
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      await createCategory({ name: newCategory.trim() });
      showToast('success', '品类创建成功');
      setNewCategory('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '创建失败');
    }
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategoryId(cat.id);
    setEditingCategoryName(cat.name);
  };

  const handleSaveCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;
    try {
      await updateCategory(editingCategoryId, { name: editingCategoryName.trim() });
      showToast('success', '品类更新成功');
      setEditingCategoryId(null);
      setEditingCategoryName('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '更新失败');
    }
  };

  const handleMoveCategory = async (id: number, direction: 'up' | 'down') => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    
    const currentCat = categories[index];
    const targetCat = categories[targetIndex];
    
    try {
      // 交换排序
      await updateCategory(currentCat.id, { sort_order: targetCat.sort_order });
      await updateCategory(targetCat.id, { sort_order: currentCat.sort_order });
      showToast('success', '排序更新成功');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '排序失败');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('确定要删除该品类吗？')) return;
    try {
      await deleteCategory(id);
      showToast('success', '品类删除成功');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '删除失败');
    }
  };

  // 部门管理 - 构建树形结构
  const buildDepartmentTree = (deps: Department[]): DepartmentNode[] => {
    const map = new Map<number, DepartmentNode>();
    const roots: DepartmentNode[] = [];
    
    // 第一遍，创建所有节点
    deps.forEach(dep => {
      map.set(dep.id, { ...dep, children: [], level: 0 });
    });
    
    // 第二遍，构建树形
    deps.forEach(dep => {
      const node = map.get(dep.id)!;
      if (dep.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(dep.parent_id);
        if (parent) {
          parent.children.push(node);
          node.level = parent.level + 1;
        }
      }
    });
    
    return roots;
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleAddDepartment = async () => {
    if (!newDepartment.trim()) return;
    try {
      await createDepartment({ name: newDepartment.trim() });
      showToast('success', '部门创建成功');
      setNewDepartment('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '创建失败');
    }
  };

  const handleAddChildDepartment = async (parentId: number) => {
    if (!newChildName.trim()) return;
    try {
      await createDepartment({ name: newChildName.trim(), parent_id: parentId });
      showToast('success', '子部门创建成功');
      setNewChildName('');
      setAddingChildToId(null);
      setExpandedIds(new Set(expandedIds).add(parentId)); // 展开父级
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '创建失败');
    }
  };

  const handleEditDepartment = (dep: Department) => {
    setEditingDepartmentId(dep.id);
    setEditingDepartmentName(dep.name);
  };

  const handleSaveDepartment = async () => {
    if (!editingDepartmentId || !editingDepartmentName.trim()) return;
    try {
      await updateDepartment(editingDepartmentId, { name: editingDepartmentName.trim() });
      showToast('success', '部门更新成功');
      setEditingDepartmentId(null);
      setEditingDepartmentName('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '更新失败');
    }
  };

  const handleMoveDepartment = async (id: number, direction: 'up' | 'down') => {
    const dep = departments.find(d => d.id === id);
    if (!dep) return;
    
    const siblings = departments.filter(d => d.parent_id === dep.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex(d => d.id === id);
    
    if (direction === 'up' && idx > 0) {
      const target = siblings[idx - 1];
      await Promise.all([
        updateDepartment(id, { sort_order: target.sort_order }),
        updateDepartment(target.id, { sort_order: dep.sort_order })
      ]);
    } else if (direction === 'down' && idx < siblings.length - 1) {
      const target = siblings[idx + 1];
      await Promise.all([
        updateDepartment(id, { sort_order: target.sort_order }),
        updateDepartment(target.id, { sort_order: dep.sort_order })
      ]);
    }
    
    showToast('success', '排序更新成功');
    loadData();
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm('确定要删除该部门及其所有子部门吗？')) return;
    try {
      await deleteDepartment(id);
      showToast('success', '部门删除成功');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '删除失败');
    }
  };

  // 品牌管理
  const handleAddBrand = async () => {
    if (!newBrand.trim()) return;
    try {
      await createBrand({ name: newBrand.trim() });
      showToast('success', '品牌创建成功');
      setNewBrand('');
      loadData();
    } catch (err: any) {
      showToast('error', err.message || '创建失败');
    }
  };

  const handleDeleteBrand = async (id: number) => {
    if (!confirm('确定要删除该品牌吗？')) return;
    try {
      await deleteBrand(id);
      showToast('success', '品牌删除成功');
      loadData();
    } catch (err) {
      showToast('error', '删除失败');
    }
  };

  const tabs = [
    { id: 'users', label: '账号管理' },
    { id: 'categories', label: '品类管理' },
    { id: 'departments', label: '部门管理' },
    { id: 'brands', label: '品牌管理' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">参数设置</h1>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg ${statusColors[toast.type]}`}>
          {toast.message}
        </div>
      )}

      {/* 标签页导航 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* 账号管理 */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">用户列表</h2>
            
            <form onSubmit={handleUserSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                {editingUserId ? '编辑用户' : '添加新用户'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码 {editingUserId && <span className="text-gray-500">(留空则不修改)</span>}
                  </label>
                  <input
                    type="password"
                    required={!editingUserId}
                    value={userForm.password}
                    onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                  <input
                    type="text"
                    required
                    value={userForm.display_name}
                    onChange={(e) => setUserForm(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingUserId ? '更新用户' : '添加用户'}
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(null);
                      setUserForm({ username: '', password: '', display_name: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                )}
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">显示名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {user.username}
                        {user.username === 'admin' && (
                          <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">管理员</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">{user.display_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{user.created_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:underline text-sm"
                          >
                            编辑
                          </button>
                          {user.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              className="text-red-600 hover:underline text-sm"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 分类管理 */}
        {activeTab === 'categories' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">品类管理</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="输入新品类名称"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顺序
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      品类名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      固定
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((cat, index) => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'up')}
                            disabled={index === 0}
                            className={`px-2 py-1 text-xs rounded ${
                              index === 0
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveCategory(cat.id, 'down')}
                            disabled={index === categories.length - 1}
                            className={`px-2 py-1 text-xs rounded ${
                              index === categories.length - 1
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCategoryId === cat.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm"
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                            />
                            <button
                              onClick={handleSaveCategory}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                            >
                              保存
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryName('');
                              }}
                              className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-900">{cat.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cat.is_fixed ? (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">是</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">否</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          {!cat.is_fixed && editingCategoryId !== cat.id && (
                            <>
                              <button
                                onClick={() => handleEditCategory(cat)}
                                className="text-blue-600 hover:underline text-sm"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id)}
                                className="text-red-600 hover:underline text-sm"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 部门管理 */}
        {activeTab === 'departments' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">部门管理</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                placeholder="输入新顶级部门名称"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
              />
              <button
                onClick={handleAddDepartment}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                添加顶级部门
              </button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顺序
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      部门名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const tree = buildDepartmentTree(departments);
                    
                    // 递归渲染节点
                    const renderNode = (node: DepartmentNode) => {
                      const hasChildren = node.children.length > 0;
                      const siblings = departments.filter(l => l.parent_id === node.parent_id).sort((a, b) => a.sort_order - b.sort_order);
                      const idx = siblings.findIndex(l => l.id === node.id);
                      
                      return (
                        <React.Fragment key={node.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleMoveDepartment(node.id, 'up')}
                                  disabled={idx === 0}
                                  className={`px-2 py-1 text-xs rounded ${
                                    idx === 0
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  ↑
                                </button>
                                <button
                                  onClick={() => handleMoveDepartment(node.id, 'down')}
                                  disabled={idx === siblings.length - 1}
                                  className={`px-2 py-1 text-xs rounded ${
                                    idx === siblings.length - 1
                                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                  }`}
                                >
                                  ↓
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div style={{ paddingLeft: `${node.level * 24}px` }} className="flex items-center gap-2">
                                {hasChildren ? (
                                  <button
                                    onClick={() => toggleExpand(node.id)}
                                    className="text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedIds.has(node.id) ? '▼' : '▶'}
                                  </button>
                                ) : (
                                  <span className="w-4"></span>
                                )}
                                {editingDepartmentId === node.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingDepartmentName}
                                      onChange={(e) => setEditingDepartmentName(e.target.value)}
                                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveDepartment()}
                                    />
                                    <button
                                      onClick={handleSaveDepartment}
                                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingDepartmentId(null);
                                        setEditingDepartmentName('');
                                      }}
                                      className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                    >
                                      取消
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-900">{node.name}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingDepartmentId !== node.id && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditDepartment(node)}
                                    className="text-blue-600 hover:underline text-sm"
                                  >
                                    编辑
                                  </button>
                                  {addingChildToId === node.id ? (
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={newChildName}
                                        onChange={(e) => setNewChildName(e.target.value)}
                                        placeholder="输入子部门"
                                        className="px-2 py-1 border border-gray-300 rounded text-xs w-32"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddChildDepartment(node.id)}
                                      />
                                      <button
                                        onClick={() => handleAddChildDepartment(node.id)}
                                        className="text-green-600 hover:underline text-xs"
                                      >
                                        确认
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAddingChildToId(null);
                                          setNewChildName('');
                                        }}
                                        className="text-gray-500 hover:underline text-xs"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setAddingChildToId(node.id)}
                                      className="text-purple-600 hover:underline text-sm"
                                    >
                                      添加子部门
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteDepartment(node.id)}
                                    className="text-red-600 hover:underline text-sm"
                                  >
                                    删除
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                          {hasChildren && expandedIds.has(node.id) && (
                            node.children.map(child => renderNode(child))
                          )}
                        </React.Fragment>
                      );
                    };
                    
                    return tree.map(node => renderNode(node));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 品牌管理 */}
        {activeTab === 'brands' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">品牌管理</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="输入新品牌名称"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
              />
              <button
                onClick={handleAddBrand}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {brands.map((brand) => (
                <div key={brand.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-900">{brand.name}</span>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
