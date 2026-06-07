import { useState } from 'react';
import { Link } from 'react-router-dom';
import { exportData } from '../api';

export default function ImportExport() {
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExportXLSX = async () => {
    try {
      await exportData('xlsx');
    } catch (err) {
      alert('导出失败');
    }
  };

  const handleExportCSV = async () => {
    try {
      await exportData('csv');
    } catch (err) {
      alert('导出失败');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setImportSuccess(null);
    setImportError(null);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setImportError('请选择要导入的文件');
      return;
    }

    setImporting(true);
    setImportSuccess(null);
    setImportError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '导入失败');
      }

      const result = await response.json();
      setImportSuccess(`成功导入 ${result.count} 条资产数据`);
      setSelectedFile(null);
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      setImportError(err.message || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link to="/" className="text-blue-600 hover:underline text-sm">← 返回列表</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">导入导出</h1>
        <p className="text-gray-600 mt-1">批量导入和导出资产数据</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 导出区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">导出数据</h2>
          <p className="text-gray-600 mb-6">将所有资产数据导出为 Excel 或 CSV 文件</p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleExportXLSX}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出 Excel (.xlsx)
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              导出 CSV
            </button>
          </div>
        </div>

        {/* 导入区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">导入数据</h2>
          <p className="text-gray-600 mb-6">从 Excel 或 CSV 文件导入资产数据</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">选择文件</label>
              <div className="flex gap-4">
                <input
                  id="fileInput"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  已选择: {selectedFile.name}
                </p>
              )}
            </div>

            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  导入中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  导入数据
                </>
              )}
            </button>

            {importSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {importSuccess}
              </div>
            )}

            {importError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {importError}
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 mb-2">导入说明</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 支持的文件格式: .xlsx, .xls, .csv</li>
              <li>• 文件应包含以下列: 资产编码、名称、品类、型号、描述、登记日期、状态、部门、地址</li>
              <li>• 如需获取标准格式模板，请先导出一份数据作为参考</li>
              <li>• 导入时会自动跳过空行和无效数据</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
