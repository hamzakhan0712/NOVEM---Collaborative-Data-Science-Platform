import React, { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Button,
  Modal,
  Form,
  Input,
  Checkbox,
  message,
} from 'antd';
import {
  ExclamationCircleOutlined,
  DeleteOutlined,
  WarningOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';

const { Title, Text, Paragraph } = Typography;

const DangerZoneSection: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme } = useTheme();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteForm] = Form.useForm();
  const [deleting, setDeleting] = useState(false);

  const isDark = theme === 'dark';

  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async (values: any) => {
    try {
      setDeleting(true);
      
      await backendAPI.deleteAccount(values.password, values.confirmation);
      
      message.success('Your account has been deleted');
      
      // Logout and redirect
      await logout();
      navigate('/login');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const errorMsg = error.response?.data?.error || 'Failed to delete account';
      message.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalVisible(false);
    deleteForm.resetFields();
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px', color: '#ff4d4f' }}>
          <WarningOutlined style={{ marginRight: '8px' }} />
          Danger Zone
        </Title>
        <Text type="secondary">
          Irreversible and destructive actions
        </Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `2px solid #ff4d4f`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '20px', color: '#ff4d4f', marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: '15px', color: '#ff4d4f', display: 'block', marginBottom: '8px' }}>
                  Delete Account
                </Text>
                <Paragraph type="secondary" style={{ marginBottom: '12px' }}>
                  Once you delete your account, there is no going back. This action will:
                </Paragraph>
                <ul style={{ 
                  marginLeft: '20px', 
                  marginBottom: '16px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary 
                }}>
                  <li>Permanently delete your account and profile</li>
                  <li>Remove you from all workspaces and projects</li>
                  <li>Delete all your personal data and settings</li>
                  <li>Remove all activity logs associated with your account</li>
                  <li>Cancel any active sessions</li>
                </ul>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  <strong>Warning:</strong> This action cannot be undone. Make sure to export your data before proceeding.
                </Paragraph>
              </div>
            </div>
            <Button
              danger
              type="primary"
              icon={<DeleteOutlined />}
              onClick={handleDeleteAccount}
            >
              Delete My Account
            </Button>
          </div>
        </Space>
      </Card>

      {/* Delete Account Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: '20px' }} />
            <span>Confirm Account Deletion</span>
          </Space>
        }
        open={deleteModalVisible}
        onCancel={handleCancelDelete}
        footer={null}
        width={560}
      >
        <Form
          form={deleteForm}
          layout="vertical"
          onFinish={handleConfirmDelete}
        >
          <Space direction="vertical" size={20} style={{ width: '100%', marginTop: '20px' }}>
            <div
              style={{
                padding: '16px',
                backgroundColor: isDark ? 'rgba(255, 77, 79, 0.1)' : '#fff2f0',
                border: '1px solid #ff4d4f',
                borderRadius: '8px',
              }}
            >
              <Paragraph strong style={{ marginBottom: '12px', color: '#ff4d4f' }}>
                ⚠️ This action is permanent and cannot be reversed
              </Paragraph>
              <Paragraph style={{ marginBottom: '8px' }}>
                By deleting your account, you will:
              </Paragraph>
              <ul style={{ marginLeft: '20px', marginBottom: '0' }}>
                <li>Lose access to all your projects and workspaces</li>
                <li>Lose all your data, settings, and preferences</li>
                <li>Be immediately logged out from all devices</li>
                <li>Not be able to recover any data after deletion</li>
              </ul>
            </div>

            <Form.Item
              label="Enter your password to confirm"
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                placeholder="Enter your password"
              />
            </Form.Item>

            <Form.Item
              label="Type DELETE to confirm"
              name="confirmation"
              rules={[
                { required: true, message: 'Please type DELETE to confirm' },
                {
                  validator: (_, value) => {
                    if (value === 'DELETE') {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('You must type DELETE exactly'));
                  },
                },
              ]}
            >
              <Input
                placeholder="Type DELETE in capital letters"
                autoComplete="off"
              />
            </Form.Item>

            <Form.Item
              name="understand"
              valuePropName="checked"
              rules={[
                {
                  validator: (_, value) =>
                    value
                      ? Promise.resolve()
                      : Promise.reject(new Error('You must acknowledge this')),
                },
              ]}
            >
              <Checkbox>
                I understand that this action is permanent and my data cannot be recovered
              </Checkbox>
            </Form.Item>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '12px',
                borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              }}
            >
              <Button onClick={handleCancelDelete} disabled={deleting}>
                Cancel
              </Button>
              <Button
                danger
                type="primary"
                htmlType="submit"
                icon={<DeleteOutlined />}
                loading={deleting}
              >
                Delete My Account Permanently
              </Button>
            </div>
          </Space>
        </Form>
      </Modal>
    </Space>
  );
};

export default DangerZoneSection;