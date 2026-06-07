import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Asset, CreateAssetDTO, UpdateAssetDTO, Category, Department, Brand } from '../types';
import { getAsset, createAsset, updateAsset, getPhotoUrl, getCategories, getDepartments, getBrands } from '../api';

// 部门树节点类型
interface DepartmentNode extends Department {
  children: DepartmentNode[];
  level: number;
}

export default function AssetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [savedAsset, setSavedAsset] = useState<Asset | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  const [autoGenerateQR, setAutoGenerateQR] = useState(true);
  const [customQRCode, setCustomQRCode] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  
  const [formData, setFormData] = useState<CreateAssetDTO>({
    category: '',
    model: '',
    description: '',
    purchase_date: new Date().toISOString().split('T')[0],
    status: '在库',
    department: '',
    address: '',
    brand: '',
    cpu: '',
    ram: '',
    ssd: '',
    hdd: '',
    gpu: '',
    os: '',
    network: '',
    ip_address: '',
    display_size: '',
    ports: '',
  });

  useEffect(() => {
    loadOptionData();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadAsset();
    }
  }, [id, isEdit]);

  // 清理扫描器
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current = null;
      }
    };
  }, []);

  // 构建部门树形结构
  const buildDepartmentTree = (deps: Department[]): DepartmentNode[] => {
    const map = new Map<number, DepartmentNode>();
    const roots: DepartmentNode[] = [];
    
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
  
  // 获取位置的前缀空格字符串
  const getIndent = (level: number) => {
    return '　'.repeat(level) + (level > 0 ? '├─ ' : '');
  };

  async function loadOptionData() {
    try {
      const [cats, deps, brands] = await Promise.all([
        getCategories(),
        getDepartments(),
        getBrands(),
      ]);
      setCategories(cats);
      setDepartments(deps);
      setBrands(brands);
    } catch (err) {
      console.error('加载选项数据失败');
    }
  }

  async function loadAsset() {
    try {
      setLoading(true);
      const asset = await getAsset(Number(id));
      setFormData({
        category: asset.category,
        model: asset.model,
        description: asset.description,
        purchase_date: asset.purchase_date,
        status: asset.status,
        department: asset.department,
        address: asset.address,
        brand: asset.brand,
        cpu: asset.cpu,
        ram: asset.ram,
        ssd: asset.ssd,
        hdd: asset.hdd,
        gpu: asset.gpu,
        os: asset.os,
        network: asset.network,
        ip_address: asset.ip_address,
        display_size: asset.display_size,
        ports: asset.ports,
      });
      // 设置已选择的品类
      setSelectedCategory(asset.category);
      if (asset.photo_url) {
        setPhotoPreview(getPhotoUrl(asset.photo_url));
      }
    } catch (err) {
      alert('加载资产失败');
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function startScanning() {
    try {
      setScanning(true);
      setCameraError('');

      const scanner = new Html5Qrcode('qr-reader-inline');
      html5QrcodeRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          handleQRCodeSuccess(decodedText);
        },
        (errorMessage: string) => {
          console.log('扫描失败:', errorMessage);
        }
      ).catch((err: any) => {
        console.error('摄像头启动失败:', err);
        setCameraError("无法访问后置摄像头，尝试使用前置摄像头...");
        return scanner.start(
          { facingMode: 'user' },
          config,
          (decodedText: string) => {
            handleQRCodeSuccess(decodedText);
          },
          () => {}
        ).catch(() => {
          setCameraError('无法访问摄像头，请检查权限设置或使用手动输入');
          setScanning(false);
        });
      });
    } catch (err: any) {
      console.error('扫描启动失败:', err);
      setCameraError('摄像头访问失败，请检查权限设置');
      setScanning(false);
    }
  }

  function stopScanning() {
    if (html5QrcodeRef.current) {
      html5QrcodeRef.current.stop().catch(() => {});
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  }

  function handleQRCodeSuccess(qrCode: string) {
    setCustomQRCode(qrCode);
    stopScanning();
    setShowScanner(false);
  }

  function handleOpenScanner() {
    console.log('打开扫描模态框');
    setShowScanner(true);
    setCameraError('');
    setTimeout(() => {
      console.log('开始扫描');
      startScanning();
    }, 100);
  }

  function handleCloseScanner() {
    stopScanning();
    setShowScanner(false);
    setCameraError('');
  }

  function handleCategoryChange(categoryName: string) {
    setSelectedCategory(categoryName);
    setFormData(prev => ({
      ...prev,
      category: categoryName
    }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSide = 640;
          let { width, height } = img;
          
          if (width > maxSide || height > maxSide) {
            if (width > height) {
              height = Math.round((height * maxSide) / width);
              width = maxSide;
            } else {
              width = Math.round((width * maxSide) / height);
              height = maxSide;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            let quality = 0.9;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            while (compressedDataUrl.length > 200 * 1024 && quality > 0.1) {
              quality -= 0.1;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            
            setPhotoPreview(compressedDataUrl);
            setPhotoData(compressedDataUrl);
            setRemovePhoto(false);
            setIsCompressing(false);
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  }

  function handleRemovePhoto() {
    setPhotoPreview(null);
    setPhotoData(null);
    setRemovePhoto(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedCategory || !formData.purchase_date) {
      alert('请填写必填项');
      return;
    }
    
    if (!autoGenerateQR && !customQRCode.trim()) {
      alert('请输入要绑定的二维码内容');
      return;
    }
    
    try {
      setSaving(true);
      
      if (isEdit && id) {
        const updateData: UpdateAssetDTO = { ...formData };
        if (removePhoto) {
          updateData.photo = null;
        } else if (photoData) {
          updateData.photo = photoData;
        }
        await updateAsset(Number(id), updateData);
        navigate(`/asset/${id}`);
      } else {
        const createData: CreateAssetDTO = { ...formData };
        if (photoData) {
          createData.photo = photoData;
        }
        if (!autoGenerateQR && customQRCode.trim()) {
          createData.qr_code = customQRCode.trim();
        }
        const newAsset = await createAsset(createData);
        setSavedAsset(newAsset);
        
        const qrUrl = await QRCode.toDataURL(newAsset.qr_code, {
          width: 300,
          margin: 2,
        });
        setQrDataUrl(qrUrl);
        setShowQR(true);
      }
    } catch (err) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }

  function downloadQR() {
    if (!qrDataUrl || !savedAsset) return;
    
    const link = document.createElement('a');
    link.download = `二维码_${savedAsset.name}.png`;
    link.href = qrDataUrl;
    link.click();
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">加载中...</p>
      </div>
    );
  }

  if (showQR && savedAsset) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0a9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">资产创建成功！</h2>
          <p className="text-gray-600 mb-1">{savedAsset.name}</p>
          <p className="text-sm text-gray-500 mb-4 font-mono">{savedAsset.asset_code}</p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
            <img src={qrDataUrl} alt="二维码" className="mx-auto" />
            <p className="text-sm text-gray-500 mt-2">扫描此二维码查看资产</p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={downloadQR}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              下载二维码
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              打印标签
            </button>
            <button
              onClick={() => navigate(`/asset/${savedAsset.id}`)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              查看详情
            </button>
            <button
              onClick={() => {
                setShowQR(false);
                setSavedAsset(null);
                setQrDataUrl('');
                setPhotoPreview(null);
                setPhotoData(null);
                setRemovePhoto(false);
                setAutoGenerateQR(true);
                setCustomQRCode('');
                setFormData({
                  category: '',
                  model: '',
                  description: '',
                  purchase_date: new Date().toISOString().split('T')[0],
                  status: '在库',
                  department: '',
                  address: '',
                  brand: '',
                  cpu: '',
                  ram: '',
                  ssd: '',
                  hdd: '',
                  gpu: '',
                  os: '',
                  network: '',
                  ip_address: '',
                  display_size: '',
                  ports: '',
                });
                setSelectedCategory('');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              继续添加
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '编辑资产' : '添加资产'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {!isEdit && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-700">二维码绑定方式</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${autoGenerateQR ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>自动生成</span>
                <button
                  type="button"
                  onClick={() => setAutoGenerateQR(!autoGenerateQR)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    autoGenerateQR ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      autoGenerateQR ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${!autoGenerateQR ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>绑定已有</span>
              </div>
            </div>
            
            {!autoGenerateQR && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  输入已有二维码内容
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customQRCode}
                    onChange={(e) => setCustomQRCode(e.target.value)}
                    placeholder="请输入二维码内容"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      console.log('扫描按钮被点击');
                      e.preventDefault();
                      handleOpenScanner();
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors whitespace-nowrap"
                  >
                    📷 扫描
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  可以扫描实物二维码获取其内容，然后粘贴到此处进行绑定
                </p>
              </div>
            )}
            
            {autoGenerateQR && (
              <p className="text-sm text-gray-500">
                系统将为该资产自动生成唯一的二维码
              </p>
            )}
          </div>
        )}

        {/* 第一排：登记日期、品类、品牌、状态 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              登记日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="purchase_date"
              value={formData.purchase_date}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              品类 <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择品类</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              品牌
            </label>
            <select
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择品牌</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="在库">在库</option>
              <option value="在用">在用</option>
              <option value="维修">维修</option>
              <option value="报废">报废</option>
            </select>
          </div>
        </div>

        {/* 第二排：部门、地址 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">部门</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">请选择部门</option>
              {(() => {
                const tree = buildDepartmentTree(departments);
                const options: JSX.Element[] = [];
                
                const renderOptions = (nodes: DepartmentNode[]) => {
                  nodes.forEach(node => {
                    options.push(
                      <option key={node.id} value={node.name}>
                        {getIndent(node.level)}{node.name}
                      </option>
                    );
                    if (node.children.length > 0) {
                      renderOptions(node.children);
                    }
                  });
                };
                
                renderOptions(tree);
                return options;
              })()}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">地址</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="请输入地址"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 品类特有字段，4个一排 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 所有品类都需要型号 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">型号</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="例如：Pro Max 14"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 电脑特有字段 */}
          {selectedCategory === '电脑' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPU</label>
                <input
                  type="text"
                  name="cpu"
                  value={formData.cpu}
                  onChange={handleChange}
                  placeholder="请输入CPU"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内存</label>
                <input
                  type="text"
                  name="ram"
                  value={formData.ram}
                  onChange={handleChange}
                  placeholder="请输入内存"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SSD</label>
                <input
                  type="text"
                  name="ssd"
                  value={formData.ssd}
                  onChange={handleChange}
                  placeholder="请输入SSD"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">HDD</label>
                <input
                  type="text"
                  name="hdd"
                  value={formData.hdd}
                  onChange={handleChange}
                  placeholder="请输入HDD"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显卡</label>
                <input
                  type="text"
                  name="gpu"
                  value={formData.gpu}
                  onChange={handleChange}
                  placeholder="请输入显卡"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">系统</label>
                <input
                  type="text"
                  name="os"
                  value={formData.os}
                  onChange={handleChange}
                  placeholder="请输入系统"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">网络</label>
                <input
                  type="text"
                  name="network"
                  value={formData.network}
                  onChange={handleChange}
                  placeholder="请输入网络"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IP地址</label>
                <input
                  type="text"
                  name="ip_address"
                  value={formData.ip_address}
                  onChange={handleChange}
                  placeholder="请输入IP地址"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* 显示器特有字段 */}
          {selectedCategory === '显示器' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
                <input
                  type="text"
                  name="display_size"
                  value={formData.display_size}
                  onChange={handleChange}
                  placeholder="请输入尺寸"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接口</label>
                <input
                  type="text"
                  name="ports"
                  value={formData.ports}
                  onChange={handleChange}
                  placeholder="请输入接口"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* 打印机、一体机、复印机、服务器只需要品牌和型号，型号已经存在了 */}
        </div>

        {/* 照片区域占2列 */}
        <div className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">照片</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              {isCompressing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">正在压缩照片...</p>
                  <p className="text-sm text-gray-400 mt-1">长边不超过640px</p>
                </div>
              ) : photoPreview ? (
                <div className="flex items-center gap-4">
                  <img
                    src={photoPreview}
                    alt="预览"
                    className="w-32 h-32 object-cover rounded border"
                  />
                  <div>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                    >
                      移除照片
                    </button>
                    <p className="text-sm text-gray-500 mt-2">照片已压缩</p>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-600">点击上传照片</p>
                    <p className="text-sm text-gray-400 mt-1">照片将自动压缩，长边不超过640px</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : (isEdit ? '更新' : '创建')}
          </button>
        </div>
      </form>

      {/* 扫描模态框 */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">扫描二维码</h3>
              <button
                type="button"
                onClick={handleCloseScanner}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div id="qr-reader-inline" className="w-full mb-4" style={{ minHeight: '300px' }}></div>
              {cameraError && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                  {cameraError}
                </div>
              )}
              <button
                type="button"
                onClick={handleCloseScanner}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {scanning ? '停止扫描' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
