import { lazy } from 'react';
import { RouteObject, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = lazy(() => import('../pages/home/page'));
const DashboardPage = lazy(() => import('../pages/dashboard/page'));
const CalendarPage = lazy(() => import('../pages/calendar/page'));
const MessagesPage = lazy(() => import('../pages/messages/page'));
const ApprovalsPage = lazy(() => import('../pages/approvals/page'));
const AIPage = lazy(() => import('../pages/ai/page'));
const SettingsPage = lazy(() => import('../pages/settings/page'));
const AnalyticsPage = lazy(() => import('../pages/analytics/page'));
const LogsPage = lazy(() => import('../pages/logs/page'));
const LoginPage = lazy(() => import('../pages/login/page'));
const OrdersPage = lazy(() => import('../pages/orders/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute><HomePage /></ProtectedRoute>,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/approvals',
    element: <ProtectedRoute><ApprovalsPage /></ProtectedRoute>,
  },
  {
    path: '/calendar',
    element: <ProtectedRoute><CalendarPage /></ProtectedRoute>,
  },
  {
    path: '/messages',
    element: <ProtectedRoute><MessagesPage /></ProtectedRoute>,
  },
  {
    path: '/ai',
    element: <ProtectedRoute><AIPage /></ProtectedRoute>,
  },
  {
    path: '/settings',
    element: <ProtectedRoute><SettingsPage /></ProtectedRoute>,
  },
  {
    path: '/analytics',
    element: <ProtectedRoute><AnalyticsPage /></ProtectedRoute>,
  },
  {
    path: '/logs',
    element: <ProtectedRoute><LogsPage /></ProtectedRoute>,
  },
  {
    path: '/orders',
    element: <ProtectedRoute><OrdersPage /></ProtectedRoute>,
  },
  {
    path: '/404',
    element: <NotFoundPage />,
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />,
  },
];

export default routes;
