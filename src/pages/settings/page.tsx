import { useState } from 'react';
import { User, Key, Bell } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'api', label: 'API Configuration', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-[#7C9082] text-[#7C9082]'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'api' && <APIConfigTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function ProfileTab() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Profile Information</h3>
        <p className="text-sm text-gray-600">Your account details</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Name</label>
          <p className="text-sm text-gray-900 mt-1">{user?.name || 'Not set'}</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</label>
          <p className="text-sm text-gray-900 mt-1">{user?.email || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
}

function APIConfigTab() {
  const [hostexKey, setHostexKey] = useState('');
  const [fastapiUrl, setFastapiUrl] = useState(import.meta.env.VITE_API_URL || '');

  const handleSave = () => {
    // UI only - doesn't persist yet
    alert('Settings saved (UI only - not persisted yet)');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">API Configuration</h3>
        <p className="text-sm text-gray-600">Configure your API keys and endpoints</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">Hostex API Key</label>
          <input
            type="text"
            value={hostexKey}
            onChange={(e) => setHostexKey(e.target.value)}
            placeholder="Enter your Hostex API key"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">FastAPI URL</label>
          <input
            type="text"
            value={fastapiUrl}
            onChange={(e) => setFastapiUrl(e.target.value)}
            placeholder="https://your-api.herokuapp.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7C9082] focus:border-transparent"
          />
        </div>
      </div>

      <button 
        onClick={handleSave}
        className="flex items-center gap-2 px-4 py-2 bg-[#7C9082] hover:bg-[#6B7F71] text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
      >
        <Key className="w-4 h-4" />
        Save Configuration
      </button>
    </div>
  );
}

function NotificationsTab() {
  const [settings, setSettings] = useState({
    newBooking: true,
    messageNotifications: true,
    approvalRequests: true,
    revenueReports: false,
  });

  const notificationLabels = {
    newBooking: 'New booking alerts',
    messageNotifications: 'Message notifications',
    approvalRequests: 'Approval requests',
    revenueReports: 'Revenue reports',
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Notification Preferences</h3>
        <p className="text-sm text-gray-600">Choose what notifications you want to receive</p>
      </div>

      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {notificationLabels[key as keyof typeof notificationLabels]}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">Get notified about this event</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, [key]: !value })}
              className={`
                relative w-11 h-6 rounded-full transition-colors cursor-pointer
                ${value ? 'bg-[#7C9082]' : 'bg-gray-300'}
              `}
            >
              <span className={`
                absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform
                ${value ? 'translate-x-5' : 'translate-x-0'}
              `} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
