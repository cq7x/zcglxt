import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Asset, Category } from '../types';
import { getAssets, deleteAsset, getPhotoUrl, getCategories } from '../api';

const statusColors: Record<string, string> = {
  '在库': 'bg-green-100 text-green-800',
  '在用': 'bg-blue-100 text-blue-800',
  '维修': 'bg-yellow-100 text-yellow-800',
  '报废': 'bg-red-100 text-red-800',
};

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('加载品类列表失败:', err);
    }
  }

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params: any = {};
      if (search.trim()) params.search = search.trim();
      if (categoryFilter) params.category = categoryFilter;
      
      const data = await getAssets(Object.keys(params).length > 0 ? params : undefined);
      setAssets(data);
    } catch (err) {
      console.error('加载资产列表失败:', err);
      setError('加载资产列表失败');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  const debouncedLoadAssets = useMemo(
    () => debounce(loadAssets, 300),
    [loadAssets]
  );

  useEffect(() => {
    debouncedLoadAssets();
  }, [debouncedLoadAssets]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`确定要删除资产"${name}"吗？`)) return;
    try {
      await deleteAsset(id);
      loadAssets();
    } catch (err) {
      alert('删除失败');
    }
  }

  function resetFilters() {
    setSearch('');
    setCategoryFilter('');
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewImage) {
        setPreviewImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  const hasFilters = search.trim() || categoryFilter;

  function handleCategoryTagClick(categoryName: string) {
    setCategoryFilter(categoryFilter === categoryName ? '' : categoryName);
  }

  const getCategoryTags = () => {
    const tags = ['全部'];
    categories.forEach(cat => {
      if (!tags.includes(cat.name)) {
        tags.push(cat.name);
      }
    });
    return tags;
  };

  const categoryTags = getCategoryTags();

  return (
    <div>
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">资产列表</h1>
          <p className="text-gray-600 text-sm mt-1">共 {assets.length} 项资产</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/print" className="px-3 py-2 lg:px-4 lg:py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm">批量打印</Link>
          <Link to="/add" className="px-3 py-2 lg:px-4 lg:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">添加资产</Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 lg:mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {categoryTags.map(tag => {
            const isActive = (tag === '全部' && !categoryFilter) || (tag !== '全部' && categoryFilter === tag);
            return (
              <button
                key={tag}
                onClick={() => handleCategoryTagClick(tag === '全部' ? '' : tag)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索品牌、型号、编码..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button onClick={resetFilters} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm">重置</button>
            </div>
          )}
        </div>
        
        {hasFilters && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="font-medium">筛选条件：</span>
            {search.trim() && <span className="ml-2">搜索「{search.trim()}」</span>}
            {categoryFilter && <span className="ml-2">品类「{categoryFilter}」</span>}
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 lg:mb-6">{error}</div>}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m4 0h8m-4 0v4m0 0h4m-4 0H8m0 0V9m0 4h4" />
          </svg>
          <p className="text-gray-600">暂无资产数据</p>
          <Link to="/add" className="mt-4 inline-block text-blue-600 hover:underline">添加第一个资产</Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="lg:hidden divide-y divide-gray-200">
            {assets.map((asset) => (
              <div key={asset.id} className="p-4">
                <div className="flex items-start gap-3">
                  {asset.photo_url ? (
                    <img
                      src={getPhotoUrl(asset.photo_url)}
                      alt={asset.brand || asset.category}
                      className="w-16 h-16 object-cover rounded border cursor-pointer"
                      onClick={() => setPreviewImage({ url: getPhotoUrl(asset.photo_url), name: asset.brand || asset.category })}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 flex-shrink-0">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to={`/asset/${asset.id}`} className="text-blue-600 hover:underline font-medium block truncate">
                      {asset.brand || asset.category}
                    </Link>
                    <p className="text-xs text-gray-500 font-mono mt-1">{asset.asset_code}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">{asset.category}</span>
                      {asset.model && <span className="text-xs bg-gray-100 px-2 py-1 rounded">{asset.model}</span>}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[asset.status]}`}>
                        {asset.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link to={`/asset/${asset.id}`} className="flex-1 text-center px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs">查看</Link>
                      <Link to={`/edit/${asset.id}`} className="flex-1 text-center px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs">编辑</Link>
                      <button onClick={() => handleDelete(asset.id, asset.brand || asset.category)} className="flex-1 px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">照片</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">编码</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品类</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">型号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登记日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {asset.photo_url ? (
                        <img
                          src={getPhotoUrl(asset.photo_url)}
                          alt={asset.brand || asset.category}
                          className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage({ url: getPhotoUrl(asset.photo_url), name: asset.brand || asset.category })}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/asset/${asset.id}`} className="text-blue-600 hover:underline font-medium">
                        {asset.brand || asset.category}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm font-mono">{asset.asset_code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.model || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[asset.status]}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.department || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{asset.purchase_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link to={`/asset/${asset.id}`} className="text-blue-600 hover:underline text-sm">查看</Link>
                        <Link to={`/edit/${asset.id}`} className="text-green-600 hover:underline text-sm">编辑</Link>
                        <button onClick={() => handleDelete(asset.id, asset.brand || asset.category)} className="text-red-600 hover:underline text-sm">删除</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={previewImage.url} alt={previewImage.name} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            <p className="text-white text-center mt-4 text-lg">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
