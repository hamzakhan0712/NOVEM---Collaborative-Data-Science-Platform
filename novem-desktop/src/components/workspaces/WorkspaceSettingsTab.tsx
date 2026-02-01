import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Modal,
  message,
  Switch,
  Alert,
  Upload,
  Avatar,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  CameraOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

interface WorkspaceSettingsTabProps {
  workspace: any;
  onUpdate: () => void;
}

const WorkspaceSettingsTab: React.FC<WorkspaceSettingsTabProps> = ({
  workspace,
  onUpdate,
}) => {
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  // Check if user can manage settings
  const canManage =
    workspace.current_user_permissions?.is_owner ||
    workspace.current_user_permissions?.can_manage_settings;

  const canDelete = workspace.current_user_permissions?.can_delete_workspace;

  const handleSaveGeneral = async () => {
    try {
      const values = await form.validateFields([
        'name',
        'description',
        'workspace_type',
        'visibility',
        'website',
      ]);
      setLoading(true);

      console.log('💾 Saving workspace settings:', values);

      await backendAPI.client.put(`/workspaces/workspaces/${workspace.id}/`, values);

      message.success('Workspace settings updated successfully');
      onUpdate();
    } catch (error: any) {
      if (error.errorFields) return;
      console.error('❌ Failed to update workspace:', error);
      message.error(error.response?.data?.error || 'Failed to update workspace settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    try {
      const values = await form.validateFields([
        'default_project_visibility',
        'allow_member_project_creation',
        'require_join_approval',
      ]);
      setLoading(true);

      console.log('🔐 Saving workspace permissions:', values);

      await backendAPI.client.put(`/workspaces/workspaces/${workspace.id}/`, values);

      message.success('Workspace permissions updated successfully');
      onUpdate();
    } catch (error: any) {
      if (error.errorFields) return;
      console.error('❌ Failed to update permissions:', error);
      message.error('Failed to update workspace permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }

      // Validate file size (2MB)
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Image must be smaller than 2MB!');
        return false;
      }

      setUploadLoading(true);
      console.log('📸 Uploading workspace avatar...');

      const formData = new FormData();
      formData.append('avatar', file);

      await backendAPI.client.patch(
        `/workspaces/workspaces/${workspace.id}/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      message.success('Workspace avatar updated successfully');
      onUpdate();
    } catch (error: any) {
      console.error('❌ Avatar upload failed:', error);
      message.error('Failed to upload workspace avatar');
    } finally {
      setUploadLoading(false);
    }

    return false; // Prevent default upload
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploadLoading(true);

      await backendAPI.client.patch(`/workspaces/workspaces/${workspace.id}/`, {
        avatar: null,
      });

      message.success('Workspace avatar removed successfully');
      onUpdate();
    } catch (error: any) {
      console.error('❌ Failed to remove avatar:', error);
      message.error('Failed to remove workspace avatar');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDeleteWorkspace = () => {
    Modal.confirm({
      title: 'Delete Workspace',
      icon: <ExclamationCircleOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            message="This action cannot be undone"
            description="Deleting this workspace will permanently remove all associated data."
            type="warning"
            showIcon
          />
          <Paragraph>
            This will permanently delete:
          </Paragraph>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>All projects in this workspace ({workspace.project_count || 0} projects)</li>
            <li>All team members and their access ({workspace.member_count || 0} members)</li>
            <li>All workspace settings and configurations</li>
            <li>All datasets and files associated with projects</li>
          </ul>
          <Paragraph type="danger" strong style={{ marginTop: '16px' }}>
            Type the workspace name "<Text code>{workspace.name}</Text>" to confirm:
          </Paragraph>
        </Space>
      ),
      okText: 'Delete Workspace',
      okType: 'danger',
      cancelText: 'Cancel',
      width: 560,
      onOk: async () => {
        // In production, you'd verify the typed name matches
        try {
          console.log('🗑️ Deleting workspace:', workspace.id);
          await backendAPI.client.delete(`/workspaces/workspaces/${workspace.id}/`);
          message.success('Workspace deleted successfully');
          navigate('/workspaces');
        } catch (error: any) {
          console.error('❌ Failed to delete workspace:', error);
          message.error(error.response?.data?.error || 'Failed to delete workspace');
        }
      },
    });
  };

  
  // Get avatar URL with backend domain
    const getAvatarUrl = () => {
    if (!workspace.avatar) return null;
    
    // If it's already a full URL (http/https), use it
    if (workspace.avatar.startsWith('http')) {
        return workspace.avatar;
    }
    
    // Otherwise, prepend backend URL
    const backendUrl = 'http://localhost:8000';
    return `${backendUrl}${workspace.avatar}`;
    };

    const avatarUrl = getAvatarUrl();


  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {/* Permission Alert */}
      {!canManage && (
        <Alert
          message="View Only"
          description="You don't have permission to modify workspace settings. Contact a workspace owner or admin."
          type="info"
          showIcon
        />
      )}

      {/* Workspace Avatar */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Title level={4} style={{ marginTop: 0 }}>
          Workspace Avatar
        </Title>
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Avatar
              size={96}
              icon={<TeamOutlined />}
              src={avatarUrl}
              style={{
                backgroundColor: workspace.avatar ? 'transparent' : colors.logoCyan,
                fontSize: '36px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: '15px', marginBottom: '8px' }}>
                Workspace Image
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '13px', marginBottom: '16px' }}>
                JPG, PNG or GIF. Max size 2MB. Recommended 400x400px.
              </Text>
              <Space size={12}>
                <Upload
                  showUploadList={false}
                  beforeUpload={handleAvatarUpload}
                  accept="image/*"
                  disabled={!canManage || uploadLoading}
                >
                  <Button
                    icon={<CameraOutlined />}
                    loading={uploadLoading}
                    disabled={!canManage}
                  >
                    {workspace.avatar ? 'Change Image' : 'Upload Image'}
                  </Button>
                </Upload>
                {workspace.avatar && (
                  <Button
                    danger
                    onClick={handleRemoveAvatar}
                    loading={uploadLoading}
                    disabled={!canManage || uploadLoading}
                  >
                    Remove
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      {/* General Settings */}
      <Card
        bordered={false}
        title={<Title level={4} style={{ margin: 0 }}>General Settings</Title>}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            name: workspace.name,
            description: workspace.description || '',
            workspace_type: workspace.workspace_type,
            visibility: workspace.visibility,
            website: workspace.website || '',
          }}
          disabled={!canManage}
        >
          <Form.Item
            label="Workspace Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter a workspace name' },
              { min: 3, message: 'Name must be at least 3 characters' },
            ]}
          >
            <Input placeholder="Enter workspace name" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea
              rows={4}
              placeholder="Describe the purpose of this workspace..."
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item
            label="Workspace Type"
            name="workspace_type"
            rules={[{ required: true }]}
            tooltip="The type determines how the workspace is organized and used"
          >
            <Select>
              <Select.Option value="personal">Personal</Select.Option>
              <Select.Option value="team">Team</Select.Option>
              <Select.Option value="organization">Organization</Select.Option>
              <Select.Option value="client">Client</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Visibility"
            name="visibility"
            rules={[{ required: true }]}
            tooltip="Controls who can discover and request to join this workspace"
          >
            <Select>
              <Select.Option value="private">
                <Space>
                  <LockOutlined />
                  Private - Invitation Only
                </Space>
              </Select.Option>
              <Select.Option value="internal">
                <Space>
                  <EyeOutlined />
                  Internal - Visible to Members
                </Space>
              </Select.Option>
              <Select.Option value="public">
                <Space>
                  <GlobalOutlined />
                  Public - Anyone Can Discover
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Website"
            name="website"
            rules={[
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSaveGeneral}
              loading={loading}
              disabled={!canManage}
            >
              Save General Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Member Permissions */}
      <Card
        bordered={false}
        title={<Title level={4} style={{ margin: 0 }}>Member Permissions</Title>}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            default_project_visibility: workspace.default_project_visibility || 'private',
            allow_member_project_creation: workspace.allow_member_project_creation ?? true,
            require_join_approval: workspace.require_join_approval ?? true,
          }}
          disabled={!canManage}
        >
          <Form.Item
            label="Default Project Visibility"
            name="default_project_visibility"
            rules={[{ required: true }]}
            tooltip="New projects will use this visibility setting by default"
          >
            <Select>
              <Select.Option value="private">Private</Select.Option>
              <Select.Option value="team">Team</Select.Option>
              <Select.Option value="public">Public</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Project Creation"
            name="allow_member_project_creation"
            valuePropName="checked"
            tooltip="Allow regular members to create new projects in this workspace"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
              }}
            >
              <Space direction="vertical" size={4}>
                <Text strong style={{ fontSize: '14px' }}>
                  Allow Members to Create Projects
                </Text>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  When enabled, all workspace members can create new projects
                </Text>
              </Space>
              <Switch disabled={!canManage} />
            </div>
          </Form.Item>

          <Form.Item
            label="Join Approval"
            name="require_join_approval"
            valuePropName="checked"
            tooltip="Require admin approval for workspace join requests"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
              }}
            >
              <Space direction="vertical" size={4}>
                <Text strong style={{ fontSize: '14px' }}>
                  Require Join Approval
                </Text>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  New members must be approved by an admin or owner
                </Text>
              </Space>
              <Switch disabled={!canManage} />
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSavePermissions}
              loading={loading}
              disabled={!canManage}
            >
              Save Permission Settings
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Danger Zone */}
<Card
  bordered={false}
  style={{
    backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
    border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
  }}
>
  <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <div>
      <Title level={4} style={{ margin: 0, marginBottom: '8px' }}>
        Danger Zone
      </Title>
      <Text type="secondary">
        Irreversible and destructive actions
      </Text>
    </div>

    <div
      style={{
        padding: '20px',
        borderRadius: '8px',
        border: `1px solid ${isDark ? 'rgba(255, 77, 79, 0.15)' : 'rgba(255, 77, 79, 0.2)'}`,
        backgroundColor: isDark ? 'rgba(255, 77, 79, 0.03)' : 'rgba(255, 77, 79, 0.02)',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '8px' }}>
            Delete This Workspace
          </Text>
          <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: '12px' }}>
            Permanently remove this workspace and all of its contents. This action is irreversible.
          </Text>
          
          <Space wrap size={8} style={{ marginBottom: '16px' }}>
            <Tag 
              style={{ 
                borderColor: isDark ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 77, 79, 0.4)',
                color: isDark ? 'rgba(255, 77, 79, 0.9)' : '#ff4d4f',
                backgroundColor: 'transparent'
              }}
            >
              {workspace.project_count || 0} Projects
            </Tag>
            <Tag 
              style={{ 
                borderColor: isDark ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 77, 79, 0.4)',
                color: isDark ? 'rgba(255, 77, 79, 0.9)' : '#ff4d4f',
                backgroundColor: 'transparent'
              }}
            >
              {workspace.member_count || 0} Members
            </Tag>
          </Space>
        </div>

        <div>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteWorkspace}
            disabled={!canDelete}
            style={{
              height: '36px',
            }}
          >
            Delete Workspace
          </Button>
          
          {!canDelete && (
            <Text 
              type="secondary" 
              style={{ 
                fontSize: '12px', 
                display: 'block', 
                marginTop: '8px',
                fontStyle: 'italic'
              }}
            >
              Only workspace owners can delete this workspace
            </Text>
          )}
        </div>
      </Space>
    </div>
  </Space>
</Card>
    </Space>
  );
};

export default WorkspaceSettingsTab;