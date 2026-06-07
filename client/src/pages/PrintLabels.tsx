import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Asset, Category, Department } from '../types';
import { getAssets, getCategories, getDepartments } from '../api';

interface QRData {
  assetId: number;
  url: string;
}

export default function PrintLabels() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [qrUrls, setQrUrls] = useState<QRData[]>([]);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // 筛选条件
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [assetData, catData, depData] = await Promise.all([
        getAssets(),
        getCategories(),
        getDepartments(),
      ]);
      setAssets(assetData);
      setCategories(catData);
      setDepartments(depData);
    } catch (err) {
      alert('加载数据失败');
    } finally {
      setLoading(false);
    }
  }

  // 过滤后的资产列表
  const filteredAssets = assets.filter(asset => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      if (!asset.name.toLowerCase().includes(keyword) && 
          !asset.asset_code.toLowerCase().includes(keyword) &&
          !asset.brand?.toLowerCase().includes(keyword) &&
          !asset.model?.toLowerCase().includes(keyword)) {
        return false;
      }
    }
    if (filterCategory && asset.category !== filterCategory) return false;
    if (filterDepartment && asset.department !== filterDepartment) return false;
    if (filterStatus && asset.status !== filterStatus) return false;
    return true;
  });

  // 构建部门树形结构
  const buildDepartmentTree = (deps: Department[]): (Department & { children: (Department & { level: number; children: any[] })[]; level: number })[] => {
    const map = new Map<number, any>();
    const roots: any[] = [];
    
    deps.forEach(dep => {
      map.set(dep.id, { ...dep, children: [], level: 0 });
    });
    
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

  // 获取部门的前缀空格字符串
  const getIndent = (level: number) => {
    return '　'.repeat(level) + (level > 0 ? '├─ ' : '');
  };

  // 展开部门树到一维数组
  const flattenDepartments = (nodes: any[]): Department[] => {
    let result: Department[] = [];
    nodes.forEach(node => {
      result.push(node);
      if (node.children.length > 0) {
        result = result.concat(flattenDepartments(node.children));
      }
    });
    return result;
  };

  function toggleSelect(id: number) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function deselectAll() {
    setSelectedIds([]);
  }

  function selectAllFiltered() {
    setSelectedIds(filteredAssets.map(a => a.id));
  }

  // 生成选中资产的二维码图片
  async function generateQRCodes(): Promise<QRData[]> {
    const newQrUrls: QRData[] = [];
    
    for (const id of selectedIds) {
      const asset = assets.find(a => a.id === id);
      if (asset && asset.qr_code) {
        try {
          const url = await QRCode.toDataURL(asset.qr_code, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'M',
          });
          newQrUrls.push({ assetId: id, url });
        } catch (err) {
          console.error(`生成二维码失败: ${asset.name}`, err);
        }
      }
    }
    
    return newQrUrls;
  }

  // 下载选中资产的二维码
  async function downloadQRCodes() {
    if (selectedIds.length === 0) {
      alert('请选择要下载二维码的资产');
      return;
    }

    setGeneratingQR(true);

    try {
      const newQrUrls = await generateQRCodes();
      setQrUrls(newQrUrls);

      // 逐个下载二维码
      for (const qrData of newQrUrls) {
        const asset = assets.find(a => a.id === qrData.assetId);
        if (asset) {
          const link = document.createElement('a');
          link.download = `二维码_${asset.asset_code}.png`;
          link.href = qrData.url;
          link.click();
          // 等待一下再下载下一个
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (err) {
      console.error('生成二维码失败:', err);
      alert('生成二维码失败');
    } finally {
      setGeneratingQR(false);
    }
  }

  async function handlePrint() {
    if (selectedIds.length === 0) {
      alert('请选择要打印的资产');
      return;
    }

    setPrinting(true);

    try {
      const newQrUrls = await generateQRCodes();
      setQrUrls(newQrUrls);

      // 等待足够时间确保二维码图片完全渲染后再打印
      setTimeout(() => {
        window.print();
        setPrinting(false);
      }, 2000);
    } catch (err) {
      console.error('打印错误:', err);
      alert('生成二维码失败');
      setPrinting(false);
    }
  }

  const selectedAssets = assets.filter(a => selectedIds.includes(a.id));

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    );
  }

  const departmentTree = buildDepartmentTree(departments);
  const flattenedDepartments = flattenDepartments(departmentTree);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="text-blue-600 hover:underline text-sm">← 返回列表</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">打印二维码标签</h1>
          <p className="text-gray-600 mt-1">选择资产后批量打印二维码标签</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAllFiltered}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            全选筛选结果
          </button>
          <button
            onClick={deselectAll}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消全选
          </button>
          <button
            onClick={downloadQRCodes}
            disabled={selectedIds.length === 0 || generatingQR}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {generatingQR ? '生成中...' : `下载二维码 (${selectedIds.length})`}
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedIds.length === 0 || printing}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {printing ? '准备中...' : `打印标签 (${selectedIds.length})`}
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索名称、编码、品牌、型号..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品类</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部品类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部部门</option>
              {flattenedDepartments.map(dep => (
                <option key={dep.id} value={dep.name}>
                  {getIndent((dep as any).level)}{dep.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部状态</option>
              <option value="在用">在用</option>
              <option value="在库">在库</option>
              <option value="报废">报废</option>
            </select>
          </div>
        </div>
        {(searchKeyword || filterCategory || filterDepartment || filterStatus) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              筛选结果：{filteredAssets.length} 项（共 {assets.length} 项）
            </span>
            <button
              onClick={() => {
                setSearchKeyword('');
                setFilterCategory('');
                setFilterDepartment('');
                setFilterStatus('');
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      {filteredAssets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">{assets.length === 0 ? '暂无资产数据' : '没有匹配的资产'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredAssets.length && filteredAssets.length > 0}
                      onChange={(e) => e.target.checked ? selectAllFiltered() : deselectAll()}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">资产编码</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">品类</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">型号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">地址</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登记日期</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => toggleSelect(asset.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedIds.includes(asset.id)
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(asset.id)}
                        onChange={() => toggleSelect(asset.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{asset.asset_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{asset.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.model || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.department || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.address || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        asset.status === '在用' ? 'bg-green-100 text-green-800' :
                        asset.status === '在库' ? 'bg-yellow-100 text-yellow-800' :
                        asset.status === '报废' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {asset.status || '在用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{asset.purchase_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              已选择 <span className="font-medium text-blue-600">{selectedIds.length}</span> 项，
              {searchKeyword || filterCategory || filterDepartment || filterStatus 
                ? `筛选结果 ${filteredAssets.length} 项，共 ${assets.length} 项资产`
                : `共 ${assets.length} 项资产`
              }
            </p>
          </div>
        </div>
      )}

      {printing && qrUrls.length > 0 && (
        <div 
          ref={printRef}
          className="print-content"
          style={{
            display: 'none',
          }}
        >
          <style>
            {`
              @media print {
                body * { visibility: hidden !important; }
                .print-content, .print-content * { visibility: visible !important; }
                .print-content { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
                .print-label { page-break-inside: avoid; display: block !important; }
              }
              @page { margin: 10mm; }
            `}
          </style>
          <div className="p-4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {selectedAssets.map((asset) => {
                const qrData = qrUrls.find(q => q.assetId === asset.id);
                return (
                  <div 
                    key={asset.id} 
                    className="print-label"
                    style={{ 
                      border: '2px solid #000', 
                      padding: '15px', 
                      textAlign: 'center',
                      width: '250px',
                      display: 'inline-block',
                    }}
                  >
                    {qrData && (
                      <img 
                        src={qrData.url} 
                        alt="二维码" 
                        style={{ width: '150px', height: '150px', margin: '0 auto', display: 'block' }}
                      />
                    )}
                    <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                      {asset.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
                      {asset.asset_code}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      {asset.category}
                    </div>
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>
                      {asset.department || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
