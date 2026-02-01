import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Spin, message } from 'antd';
import {
  UserOutlined,
  BellOutlined,
  SafetyOutlined,
  WarningOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import { backendAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

// Import section components
import ProfileSection from '../components/settings/ProfileSection';
import AccountSection from '../components/settings/AccountSection';
import SecuritySection from '../components/settings/SecuritySection';
import NotificationsSection from '../components/settings/NotificationsSection';
import DangerZoneSection from '../components/settings/DangerZoneSection';

const { Sider, Content } = Layout;
const { Text } = Typography;

type SettingsSection = 'profile' | 'account' | 'security' | 'notifications' | 'danger';

const SettingsPage: React.FC = () => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const isDark = theme === 'dark';

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await backendAPI.getProfile();
      setProfileData(data.profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
      message.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: 'account',
      icon: <ToolOutlined />,
      label: 'Account',
    },
    {
      key: 'security',
      icon: <SafetyOutlined />,
      label: 'Security',
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Notifications',
    },
    {
      key: 'danger',
      icon: <WarningOutlined />,
      label: 'Danger Zone',
    },
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection profileData={profileData} onUpdate={loadProfileData} />;
      case 'account':
        return <AccountSection profileData={profileData} />;
      case 'security':
        return <SecuritySection />;
      case 'notifications':
        return <NotificationsSection profileData={profileData} />;
      case 'danger':
        return <DangerZoneSection />;
      default:
        return <ProfileSection profileData={profileData} onUpdate={loadProfileData} />;
    }
  };

  if (loading && !profileData) {
    return (
      <MainLayout>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
        }}>
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Layout 
        style={{ 
          minHeight: 'calc(100vh - 64px)', 
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
        }}
      >
        {/* Main Content */}
        <Content
          style={{
            padding: '40px 48px',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            overflow: 'auto',
          }}
        >
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {renderSection()}
          </div>
        </Content>

        {/* Right Sidebar Navigation */}
        <Sider
          width={240}
          style={{
            backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
            borderLeft: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            padding: '40px 0',
          }}
        >
          <div style={{ padding: '0 20px', marginBottom: '24px' }}>
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '11px', 
                textTransform: 'uppercase', 
                letterSpacing: '1px', 
                fontWeight: 600,
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              Settings
            </Text>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[activeSection]}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
            }}
          >
            {menuItems.map((item) => (
              <Menu.Item
                key={item.key}
                icon={item.icon}
                onClick={() => setActiveSection(item.key as SettingsSection)}
                style={{
                  height: '40px',
                  margin: '2px 12px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  lineHeight: '40px',
                  padding: '0 16px',
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                }}
              >
                {item.label}
              </Menu.Item>
            ))}
          </Menu>
        </Sider>
      </Layout>
    </MainLayout>
  );
};

export default SettingsPage;