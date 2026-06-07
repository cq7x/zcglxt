import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { Asset } from '../types';
import { getAssetByQRCode, createOperation } from '../api';

export default function QRScanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [operator, setOperator] = useState('');
  const [cameraError, setCameraError] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  async function startScanning() {
    try {
      setScanning(true);
      setError('');
      setCameraError('');
      setAsset(null);

      const scanner = new Html5Qrcode('qr-reader');
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
          handleQRCode(decodedText);
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
            handleQRCode(decodedText);
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

  async function handleQRCode(qrCode: string) {
    try {
      setError('');
      const assetData = await getAssetByQRCode(qrCode);
      setAsset(assetData);
      stopScanning();
    } catch (err) {
      setError('未找到对应的资产，请检查二维码是否正确');
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQRCode(manualCode.trim());
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();

    if (!asset || !operator) {
      alert('请填写操作人');
      return;
    }

    try {
      await createOperation(asset.id, {
        type: '签到',
        operator,
        notes: '通过二维码扫描签到',
      });
      alert('签到成功！');
      setShowCheckIn(false);
      setOperator('');
    } catch (err) {
      alert('签到失败');
    }
  }

  function handleViewDetail() {
    if (asset) {
      navigate('/asset/' + asset.id);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900">扫描二维码</h1>
        <p className="text-gray-600 mt-1">使用摄像头扫描资产二维码或手动输入编号</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 lg:p-6">
        {!scanning && !asset && (
          <div>
            <button
              onClick={startScanning}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              开始扫描
            </button>

            {cameraError && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">
                {cameraError}
              </div>
            )}

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">或手动输入</span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="mt-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="输入二维码编号..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    查询
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {scanning && (
          <div>
            <div id="qr-reader" className="w-full mb-4" style={{ minHeight: '300px' }}></div>
            <button
              onClick={stopScanning}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              停止扫描
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {asset && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">找到资产</h3>
            <div className="space-y-2 text-green-700">
              <p><span className="font-medium">名称：</span>{asset.name}</p>
              <p><span className="font-medium">品类：</span>{asset.category}</p>
              {asset.model && <p><span className="font-medium">型号：</span>{asset.model}</p>}
              <p><span className="font-medium">状态：</span>{asset.status}</p>
              <p><span className="font-medium">位置：</span>{asset.location || '-'}</p>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleViewDetail}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                查看详情
              </button>
              <button
                onClick={() => setShowCheckIn(true)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                签到
              </button>
              <button
                onClick={() => {
                  setAsset(null);
                  setError('');
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                继续扫描
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 签到弹窗 */}
      {showCheckIn && asset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">资产签到</h3>
            <p className="text-gray-600 mb-4">资产：{asset.name}</p>
            
            <form onSubmit={handleCheckIn}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  操作人 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckIn(false)}
                  className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  确认签到
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
