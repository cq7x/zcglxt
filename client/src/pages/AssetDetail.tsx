import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Asset, Operation, CreateOperationDTO } from '../types';
import { getAsset, getOperations, createOperation, updateAsset, deleteAsset, getPhotoUrl } from '../api';

const statusColors: Record<string, string> = {
  '在库': 'bg-green-100 text-green-800',
  '在用': 'bg-blue-100 text-blue-800',
  '维修': 'bg-yellow-100 text-yellow-800',
  '报废': 'bg-red-100 text-red-800',
};

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [checkInForm, setCheckInForm] = useState<CreateOperationDTO>({
    type: '签到',
    operator: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  async function loadData() {
    try {
      setLoading(true);
      const [assetData, opsData] = await Promise.all([
        getAsset(Number(id)),
        getOperations(Number(id)),
      ]);
      setAsset(assetData);
      setOperations(opsData);
      
      // 生成二维码
      const qrUrl = await QRCode.toDataURL(assetData.qr_code, {
        width: 200,
        margin: 2,
      });
      setQrDataUrl(qrUrl);
    } catch (err) {
      alert('加载资产失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!asset || !confirm(`确定要删除资产"${asset.brand || asset.category}"吗？`)) return;
    
    try {
      await deleteAsset(asset.id);
      navigate('/');
    } catch (err) {
      alert('删除失败');
    }
  }

  function downloadQR() {
    if (!qrDataUrl || !asset) return;
    
    const link = document.createElement('a');
    link.download = `二维码_${asset.brand || asset.category}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    
    if (!checkInForm.operator) {
      alert('请填写操作人');
      return;
    }
    
    try {
      await createOperation(Number(id), checkInForm);
      setShowCheckIn(false);
      setCheckInForm({ type: '签到', operator: '', notes: '' });
      loadData();
    } catch (err) {
      alert('签到失败');
    }
  }

  async function updateStatus(status: Asset['status']) {
    if (!asset) return;
    
    try {
      await updateAsset(asset.id, { status });
      loadData();
    } catch (err) {
      alert('更新状态失败');
    }
  }

  async function handlePrint() {
    if (!asset) return;
    
    setPrinting(true);
    
    // 等待足够时间确保二维码图片完全渲染后再打印
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 1000);
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    );
  }

  if (!asset) {
    return <div className="text-center py-12 text-gray-600">资产不存在</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/" className="text-blue-600 hover:underline text-sm">← 返回列表</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{asset.brand || asset.category}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/edit/${asset.id}`}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            编辑
          </Link>
          <button
            onClick={handlePrint}
            disabled={printing}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {printing ? '准备中...' : '打印标签'}
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            删除
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本信息 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {asset.photo_url && (
              <div className="col-span-2 mb-4">
                <label className="text-sm text-gray-500">照片</label>
                <div className="mt-2">
                  <img
                    src={getPhotoUrl(asset.photo_url)}
                    alt={asset.brand || asset.category}
                    className="w-full max-w-xs object-cover rounded border"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500">资产编码</label>
              <p className="text-gray-900 font-mono text-sm">{asset.asset_code}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">品类</label>
              <p className="text-gray-900 font-medium">{asset.category}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">品牌</label>
              <p className="text-gray-900 font-medium">{asset.brand || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">型号</label>
              <p className="text-gray-900 font-medium">{asset.model || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">状态</label>
              <div className="mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[asset.status]}`}>
                  {asset.status}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">登记日期</label>
              <p className="text-gray-900 font-medium">{asset.purchase_date}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">部门</label>
              <p className="text-gray-900 font-medium">{asset.department || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">地址</label>
              <p className="text-gray-900 font-medium">{asset.address || '-'}</p>
            </div>

            {/* 品类特有字段显示 */}
            {asset.category.includes('电脑') && (
              <>
                <div>
                  <label className="text-sm text-gray-500">CPU</label>
                  <p className="text-gray-900">{asset.cpu || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">内存</label>
                  <p className="text-gray-900">{asset.ram || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">SSD</label>
                  <p className="text-gray-900">{asset.ssd || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">HDD</label>
                  <p className="text-gray-900">{asset.hdd || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">显卡</label>
                  <p className="text-gray-900">{asset.gpu || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">系统</label>
                  <p className="text-gray-900">{asset.os || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">网络</label>
                  <p className="text-gray-900">{asset.network || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">IP地址</label>
                  <p className="text-gray-900">{asset.ip_address || '-'}</p>
                </div>
              </>
            )}

            {asset.category.includes('显示器') && (
              <>
                <div>
                  <label className="text-sm text-gray-500">尺寸</label>
                  <p className="text-gray-900">{asset.display_size || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">接口</label>
                  <p className="text-gray-900">{asset.ports || '-'}</p>
                </div>
              </>
            )}

            <div className="col-span-2">
              <label className="text-sm text-gray-500">描述</label>
              <p className="text-gray-900">{asset.description || '-'}</p>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-gray-500">二维码编号</label>
              <p className="text-gray-900 font-mono text-sm break-all">{asset.qr_code}</p>
            </div>
          </div>

          {/* 状态操作 */}
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-700 mb-3">快速更改状态</h3>
            <div className="flex gap-2 flex-wrap">
              {(['在库', '在用', '维修', '报废'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  disabled={asset.status === status}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    asset.status === status
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  设为{status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 二维码 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">二维码</h2>
          
          {qrDataUrl && (
            <div className="text-center">
              <img src={qrDataUrl} alt="二维码" className="mx-auto mb-4" />
              <button
                onClick={downloadQR}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                下载二维码
              </button>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => setShowCheckIn(true)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              签到
            </button>
          </div>
        </div>
      </div>

      {/* 操作记录 */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">操作记录</h2>
        
        {operations.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无操作记录</p>
        ) : (
          <div className="space-y-3">
            {operations.map((op) => (
            <div key={op.id} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{op.type}</span>
                  <span className="text-gray-500">·</span>
                  <span className="text-gray-600">{op.operator}</span>
                </div>
                {op.notes && <p className="text-sm text-gray-600 mt-1">{op.notes}</p>}
              </div>
              <div className="text-sm text-gray-500">
                {new Date(op.timestamp).toLocaleString('zh-CN')}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* 签到弹窗 */}
      {showCheckIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">资产签到</h3>
            
            <form onSubmit={handleCheckIn}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    操作类型
                  </label>
                  <select
                    value={checkInForm.type}
                    onChange={(e) => setCheckInForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="签到">签到</option>
                    <option value="借出">借出</option>
                    <option value="归还">归还</option>
                    <option value="维修">维修</option>
                    <option value="报废">报废</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    操作人 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={checkInForm.operator}
                    onChange={(e) => setCheckInForm(prev => ({ ...prev, operator: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={checkInForm.notes}
                    onChange={(e) => setCheckInForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckIn(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  确认
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 打印内容区域 */}
      {printing && asset && (
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
                .print-content { display: block !important; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); }
                .print-label { page-break-inside: avoid; display: block !important; }
              }
              @page { margin: 10mm; }
            `}
          </style>
          <div className="p-4">
            <div 
              className="print-label"
              style={{ 
                border: '2px solid #000', 
                padding: '15px', 
                textAlign: 'center',
                width: '250px',
                display: 'inline-block',
              }}
            >
              {qrDataUrl && (
                <img 
                  src={qrDataUrl} 
                  alt="二维码" 
                  style={{ width: '150px', height: '150px', margin: '0 auto', display: 'block' }}
                />
              )}
              <div style={{ marginTop: '10px', fontWeight: 'bold', fontSize: '14px' }}>
                {asset.brand || asset.category}
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
          </div>
        </div>
      )}
    </div>
  );
}
