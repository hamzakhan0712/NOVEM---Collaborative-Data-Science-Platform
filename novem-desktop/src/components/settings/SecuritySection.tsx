import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Select,
  Switch,
  Divider,
  message,
  Modal,
} from 'antd';
import {
  LockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  GlobalOutlined,
  TeamOutlined,
  SafetyOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

const SecuritySection: React.FC = () => {
  const { theme } = useTheme();
  const [passwordForm] = Form.useForm();
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    profile_visibility: 'workspace',
    show_active_status: true,
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    loadSecuritySettings();
  }, []);

  const loadSecuritySettings = async () => {
    try {
      const data = await backendAPI.getSecuritySettings();
      setSecuritySettings(data);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const handlePasswordChange = async (values: any) => {
    try {
      setLoadingPassword(true);
      await backendAPI.changePassword(
        values.current_password,
        values.new_password,
        values.new_password_confirm
      );

      passwordForm.resetFields();
      message.success('Password changed successfully');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      const errorMsg = error.response?.data?.current_password?.[0] ||
                       error.response?.data?.new_password?.[0] ||
                       error.response?.data?.error ||
                       'Failed to change password';
      message.error(errorMsg);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleVisibilityChange = async (value: string) => {
    try {
      setLoadingSettings(true);
      await backendAPI.updateSecuritySettings({ profile_visibility: value });
      setSecuritySettings(prev => ({ ...prev, profile_visibility: value }));
      message.success('Profile visibility updated');
    } catch (error) {
      console.error('Failed to update visibility:', error);
      message.error('Failed to update profile visibility');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleActiveStatusChange = async (checked: boolean) => {
    try {
      setLoadingSettings(true);
      await backendAPI.updateSecuritySettings({ show_active_status: checked });
      setSecuritySettings(prev => ({ ...prev, show_active_status: checked }));
      message.success('Active status setting updated');
    } catch (error) {
      console.error('Failed to update active status:', error);
      message.error('Failed to update active status setting');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleClearCache = async () => {
    Modal.confirm({
      title: 'Clear Local Cache',
      content: 'This will clear all locally stored data. The application will reload and you will remain logged in.',
      okText: 'Clear Cache',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await backendAPI.clearLocalCache();
          
          // Clear localStorage except auth tokens
          const access = localStorage.getItem('access_token');
          const refresh = localStorage.getItem('refresh_token');
          localStorage.clear();
          if (access) localStorage.setItem('access_token', access);
          if (refresh) localStorage.setItem('refresh_token', refresh);
          
          // Clear sessionStorage
          sessionStorage.clear();
          
          message.success('Cache cleared successfully');
          
          // Reload page
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          console.error('Failed to clear cache:', error);
          message.error('Failed to clear cache');
        }
      },
    });
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Security & Privacy
        </Title>
        <Text type="secondary">
          Manage your password, privacy settings, and security preferences
        </Text>
      </div>

      {/* Change Password */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
        >
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              Change Password
            </Text>

            <Form.Item
              label="Current Password"
              name="current_password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter current password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              label="New Password"
              name="new_password"
              rules={[
                { required: true, message: 'Please enter a new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter new password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              label="Confirm New Password"
              name="new_password_confirm"
              dependencies={['new_password']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Confirm new password"
                iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<CheckCircleOutlined />}
                loading={loadingPassword}
              >
                Change Password
              </Button>
            </div>
          </Space>
        </Form>
      </Card>

      {/* Privacy Settings */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Privacy Settings
          </Text>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Profile Visibility
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Control who can view your profile information
              </Text>
            </div>
            <Select
              value={securitySettings.profile_visibility}
              onChange={handleVisibilityChange}
              style={{ width: '100%' }}
              loading={loadingSettings}
            >
              <Option value="public">
                <Space>
                  <GlobalOutlined />
                  <span>Public - Anyone can view</span>
                </Space>
              </Option>
              <Option value="workspace">
                <Space>
                  <TeamOutlined />
                  <span>Workspace Members - Only workspace members can view</span>
                </Space>
              </Option>
              <Option value="private">
                <Space>
                  <LockOutlined />
                  <span>Private - Only you can view</span>
                </Space>
              </Option>
            </Select>
          </div>

          <Divider style={{ margin: 0 }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Show Active Status
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Let others see when you're active on NOVEM
              </Text>
            </div>
            <Switch
              checked={securitySettings.show_active_status}
              onChange={handleActiveStatusChange}
              loading={loadingSettings}
            />
          </div>
        </Space>
      </Card>

      {/* Data & Cache */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Local Data
          </Text>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Clear Local Cache
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Remove all locally stored data. You will remain logged in but the app will reload.
              </Text>
            </div>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearCache}
            >
              Clear Cache
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default SecuritySection;