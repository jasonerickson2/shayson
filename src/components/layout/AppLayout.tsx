
import { useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Bot,
  Home,
  Settings,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  MoreHorizontal,
  ClipboardCheck,
  BarChart3,
  ScrollText,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';

interface AppLayoutProps {
  children: ReactNode;
}

const sidebarNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: ClipboardCheck, label: 'Approvals', path: '/approvals' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: ScrollText, label: 'Logs', path: '/logs' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: Bot, label: 'AI Assistant', path: '/ai' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const bottomNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: ClipboardCheck, label: 'Approvals', path: '/approvals' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: MessageSquare, label: 'Messages', path: '/messages' },
  { icon: MoreHorizontal, label: 'More', path: '__more__' },
];

const moreMenuItems = [
  { icon: ScrollText, label: 'Logs', path: '/logs' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Bot, label: 'AI Assistant', path: '/ai' },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Poll for notification counts every 30 seconds
  const { data: notifCounts } = useQuery({
    queryKey: ['notification-counts'],
    queryFn: api.notifications.getCounts,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: false,
    throwOnError: false,
  });
  const pendingApprovals = notifCounts?.pendingApprovals || 0;
  const unreadMessages = notifCounts?.unreadMessages || 0;
  const hasAnyNotification = pendingApprovals > 0 || unreadMessages > 0;

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const moreIsActive = moreMenuItems.some((item) => isActive(item.path));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transition-transform duration-300 -translate-x-full lg:translate-x-0"
      >
        <div className="flex flex-col h-full">
          {/* Logo - Centered */}
          <div className="h-16 flex items-center justify-center border-b border-gray-200">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-gray-900 text-base">Shayson</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const showSidebarDot = (item.path === '/messages' && unreadMessages > 0) || (item.path === '/approvals' && pendingApprovals > 0);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 cursor-pointer
                    ${active ? 'bg-[#F0F4F1] text-[#7C9082]' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {showSidebarDot && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </div>
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 pb-20 lg:pb-0">
        {/* Top Bar */}
        <header className="h-14 lg:h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="h-full px-4 flex items-center justify-between gap-4">
            {/* Left Section */}
            <div className="flex items-center gap-3">
              {/* Desktop Search */}
              <div className="hidden lg:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-80">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search properties, guests..."
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
            </div>

            {/* Center - Mobile Logo */}
            <div
              className="flex items-center gap-2 lg:hidden cursor-pointer absolute left-1/2 -translate-x-1/2"
              onClick={() => navigate('/')}
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="font-semibold text-gray-900 text-sm">Shayson</span>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg relative cursor-pointer">
                <Bell className="w-5 h-5 text-gray-600" />
                {hasAnyNotification && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#7C9082] flex items-center justify-center text-white font-bold text-sm">
                    {user?.name?.charAt(0) || 'J'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">
                    {user?.name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-500 hidden md:block" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 lg:hidden">
        <div className="flex items-center justify-around h-16 px-1 relative">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            if (item.path === '__more__') {
              return (
                <button
                  key="more"
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 cursor-pointer transition-colors ${
                    moreIsActive || isMoreMenuOpen ? 'text-[#7C9082]' : 'text-gray-500'
                  }`}
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            const active = isActive(item.path);
            const showDot = (item.path === '/messages' && unreadMessages > 0) || (item.path === '/approvals' && pendingApprovals > 0);

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setIsMoreMenuOpen(false);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 cursor-pointer transition-colors ${
                  active ? 'text-[#7C9082]' : 'text-gray-500'
                }`}
              >
                <div className="w-6 h-6 flex items-center justify-center relative">
                  <Icon className="w-5 h-5" />
                  {showDot && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* More Menu Popup */}
        {isMoreMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsMoreMenuOpen(false)}
            />
            <div className="absolute bottom-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg rounded-t-2xl px-2 py-3 mb-0">
              <div className="grid grid-cols-4 gap-1">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setIsMoreMenuOpen(false);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#F0F4F1] text-[#7C9082]'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
