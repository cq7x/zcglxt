import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import AssetForm from './pages/AssetForm';
import AssetDetail from './pages/AssetDetail';
import QRScanner from './pages/QRScanner';
import PrintLabels from './pages/PrintLabels';
import ImportExport from './pages/ImportExport';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AuthUser, verifyAuth, logout as apiLogout, AuthResponse } from './api';

function Sidebar({ user, isOpen, onClose, collapsed, onToggleCollapse }: { 
  user: AuthUser | null; 
  isOpen: boolean; 
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const location = useLocation();
  
  const menuItems = [
    { path: '/', label: '资产列表', icon: '📋' },
    { path: '/add', label: '添加资产', icon: '➕' },
    { path: '/scan', label: '扫描二维码', icon: '📷' },
    { path: '/print', label: '打印标签', icon: '🖨️' },
    { path: '/import-export', label: '导入导出', icon: '📤' },
    { path: '/settings', label: '参数设置', icon: '⚙️' },
  ];
  
  if (!user) return null;
  
  return (
    <>
      {/* 移动端遮罩层 */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* 侧边栏 - 桌面端支持折叠 */}
      <aside className={`
        fixed lg:relative inset-y-0 left-0 z-50
        bg-white shadow-lg border-r border-gray-200
        transform transition-all duration-400 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        w-64 lg:block
        flex flex-col
      `}>
        <div className="flex-1 p-4">
          <nav className="space-y-0.5">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-0 py-2 rounded-lg transition-all duration-300 ${
                  location.pathname === item.path
                    ? 'text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <span className={`text-xl ${collapsed ? 'lg:text-2xl' : ''}`}>{item.icon}</span>
                <span className={`${collapsed ? 'lg:hidden' : ''} transition-all duration-300`}>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* 折叠/展开按钮 - 放到侧边栏右侧中缝位置 */}
        <button
          onClick={onToggleCollapse}
          className={`
            hidden lg:flex
            absolute top-1/2 -right-2 transform -translate-y-1/2
            w-8 h-8 
            bg-gray-200 hover:bg-gray-300
            text-gray-600
            rounded-full 
            items-center justify-center 
            shadow-sm 
            transition-all duration-300 ease-in-out
            z-10
          `}
          title={collapsed ? '展开菜单' : '收起菜单'}
        >
          <svg 
            className={`
              w-4 h-4 
              transition-transform duration-400 ease-in-out
              ${collapsed ? 'rotate-180' : ''}
            `} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </aside>
    </>
  );
}

function Header({ user, onLogout, onMenuClick }: { user: AuthUser | null; onLogout: () => void; onMenuClick: () => void }) {
  return (
    <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-30">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          {/* 左侧：汉堡菜单 + 标题 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md hover:bg-blue-700 transition-colors"
              aria-label="菜单"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m2 0h10M7 7h10" />
            </svg>
            <h1 className="text-lg lg:text-xl font-bold">资产管理系统</h1>
          </div>
          
          {/* 右侧：用户信息 + 退出 */}
          {user && (
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-700 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0a4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="font-medium text-sm lg:text-base">{user.displayName}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors text-sm"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">退出登录</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: AuthUser | null }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const user = await verifyAuth();
      setUser(user);
    } catch (error) {
      console.error('验证失败:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await apiLogout();
    setUser(null);
  }

  function handleLoginSuccess(authResponse: AuthResponse) {
    setUser(authResponse.user);
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header user={user} onLogout={handleLogout} onMenuClick={toggleSidebar} />
        <div className="flex flex-1 relative">
          <Sidebar 
            user={user} 
            isOpen={sidebarOpen} 
            onClose={closeSidebar}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleCollapse}
          />
          <main className={`flex-1 p-4 lg:p-6 overflow-x-auto transition-all duration-400 ${sidebarCollapsed ? 'lg:ml-0' : ''}`}>
            <Routes>
              <Route path="/" element={<ProtectedRoute user={user}><Home /></ProtectedRoute>} />
              <Route path="/add" element={<ProtectedRoute user={user}><AssetForm /></ProtectedRoute>} />
              <Route path="/edit/:id" element={<ProtectedRoute user={user}><AssetForm /></ProtectedRoute>} />
              <Route path="/asset/:id" element={<ProtectedRoute user={user}><AssetDetail /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute user={user}><QRScanner /></ProtectedRoute>} />
              <Route path="/print" element={<ProtectedRoute user={user}><PrintLabels /></ProtectedRoute>} />
              <Route path="/import-export" element={<ProtectedRoute user={user}><ImportExport /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute user={user}><Settings /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
