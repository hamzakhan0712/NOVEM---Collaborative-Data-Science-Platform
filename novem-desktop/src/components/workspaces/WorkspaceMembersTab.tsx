import React, { useState } from 'react';
import {
  Tabs,
  Table,
  Avatar,
  Typography,
  Space,
  Tag,
  Badge,
  Button,
  Popconfirm,
  message,
  Form,
  Input,
  Select,
  Modal,
  Card,
} from 'antd';
import {
  UserOutlined,
  DeleteOutlined,
  UsergroupAddOutlined,
  MailOutlined,
  SafetyOutlined,
  TeamOutlined,
  SendOutlined,
  ClockCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { backendAPI } from '../../services/api';
import { colors } from '../../theme/config';

const { Text } = Typography;
const { Option } = Select;

interface WorkspaceMembersTabProps {
  workspace: any;
  onUpdate: () => void;
}

const WorkspaceMembersTab: React.FC<WorkspaceMembersTabProps> = ({
  workspace,
  onUpdate,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeSubTab, setActiveSubTab] = useState('members');
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteForm] = Form.useForm();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const canManage =
    workspace?.current_user_permissions?.is_owner ||
    workspace?.current_user_permissions?.is_admin;

  React.useEffect(() => {
    if (activeSubTab === 'invitations') {
      loadInvitations();
    } else if (activeSubTab === 'requests') {
      loadJoinRequests();
    }
  }, [activeSubTab]);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      console.log('📋 [WorkspaceMembersTab] Loading invitations for workspace:', workspace.id);
      const data = await backendAPI.getWorkspaceInvitations(workspace.id);
      console.log('✅ [WorkspaceMembersTab] Loaded', data.length, 'invitations');
      setInvitations(data || []);
    } catch (error: any) {
      console.error('❌ [WorkspaceMembersTab] Failed to load invitations:', error);
      if (!error.offline) {
        message.error('Failed to load invitations');
      }
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      setLoading(true);
      console.log('📋 [WorkspaceMembersTab] Loading join requests for workspace:', workspace.id);
      const data = await backendAPI.getWorkspaceJoinRequests(workspace.id);
      console.log('✅ [WorkspaceMembersTab] Loaded', data.length, 'join requests');
      setJoinRequests(data || []);
    } catch (error: any) {
      console.error('❌ [WorkspaceMembersTab] Failed to load join requests:', error);
      if (!error.offline) {
        message.error('Failed to load join requests');
      }
      setJoinRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    try {
      const values = await inviteForm.validateFields();
      await backendAPI.inviteWorkspaceMember(workspace.id, {
        email: values.email,
        role: values.role,
        message: values.message,
      });
      message.success('Invitation sent successfully');
      setInviteModalVisible(false);
      inviteForm.resetFields();
      onUpdate();
      if (activeSubTab === 'invitations') {
        loadInvitations();
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await backendAPI.removeWorkspaceMember(workspace.id, userId);
      message.success('Member removed');
      onUpdate();
    } catch (error) {
      message.error('Failed to remove member');
    }
  };

   const handleCancelInvitation = async (invitationId: number) => {
    try {
      console.log('❌ [WorkspaceMembersTab] Cancelling invitation:', invitationId);
      await backendAPI.cancelWorkspaceInvitation(workspace.id, invitationId);
      message.success('Invitation cancelled');
      loadInvitations();
    } catch (error: any) {
      console.error('❌ [WorkspaceMembersTab] Failed to cancel invitation:', error);
      message.error('Failed to cancel invitation');
    }
  };

 const handleApproveRequest = async (requestId: number) => {
    try {
      console.log('✅ [WorkspaceMembersTab] Approving request:', requestId);
      await backendAPI.approveWorkspaceJoinRequest(workspace.id, requestId, 'member');
      message.success('Request approved - member added to workspace');
      loadJoinRequests();
      onUpdate();
    } catch (error: any) {
      console.error('❌ [WorkspaceMembersTab] Failed to approve request:', error);
      message.error(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      console.log('❌ [WorkspaceMembersTab] Rejecting request:', requestId);
      await backendAPI.rejectWorkspaceJoinRequest(workspace.id, requestId);
      message.success('Request rejected');
      loadJoinRequests();
    } catch (error: any) {
      console.error('❌ [WorkspaceMembersTab] Failed to reject request:', error);
      message.error(error.response?.data?.error || 'Failed to reject request');
    }
  };

  const getRoleBadgeStatus = (role: string): 'success' | 'processing' | 'default' => {
    switch (role) {
      case 'owner':
        return 'success';
      case 'admin':
        return 'processing';
      default:
        return 'default';
    }
  };

  // Members Table Columns
  const memberColumns = [
    {
      title: 'Member',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            size={40}
            icon={<UserOutlined />}
            src={user.profile_picture}
            style={{
              backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
          />
          <div>
            <Text
              strong
              style={{
                fontSize: '14px',
                display: 'block',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                marginBottom: '2px',
              }}
            >
              {user.first_name} {user.last_name}
            </Text>
            <Text
              style={{
                fontSize: '13px',
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              {user.email}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 140,
      render: (role: string) => (
        <Badge
          status={getRoleBadgeStatus(role)}
          text={
            <Text
              style={{
                fontSize: '13px',
                textTransform: 'capitalize',
                fontWeight: 500,
              }}
            >
              {role}
            </Text>
          }
        />
      ),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      width: 240,
      render: (_: any, record: any) => (
        <Space size={6} wrap>
          {record.can_create_projects && (
            <Tag
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? colors.backgroundTertiaryDark
                  : colors.backgroundTertiary,
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Projects
            </Tag>
          )}
          {record.can_invite_members && (
            <Tag
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? colors.backgroundTertiaryDark
                  : colors.backgroundTertiary,
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Invite
            </Tag>
          )}
          {record.can_manage_settings && (
            <Tag
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: isDark
                  ? colors.backgroundTertiaryDark
                  : colors.backgroundTertiary,
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Settings
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Joined',
      dataIndex: 'joined_at',
      key: 'joined_at',
      width: 120,
      render: (date: string) => (
        <Text
          style={{
            fontSize: '13px',
            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
          }}
        >
          {new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => {
        if (record.user.id === workspace?.owner?.id) {
          return (
            <Tag
              color="gold"
              style={{
                fontSize: '11px',
                fontWeight: 500,
                border: 'none',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              Owner
            </Tag>
          );
        }
        if (!canManage) return null;

        return (
          <Popconfirm
            title="Remove member?"
            description="They will lose access to this workspace."
            onConfirm={() => handleRemoveMember(record.user.id)}
            okText="Remove"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              size="small"
              style={{ fontSize: '12px' }}
            />
          </Popconfirm>
        );
      },
    },
  ];

    // Invitations Table Columns
  const invitationColumns = [
    {
      title: 'Email',
      dataIndex: 'invitee_email',  // ✅ Changed from 'email'
      key: 'invitee_email',
      render: (email: string) => (
        <Space>
          <MailOutlined style={{ color: colors.logoCyan }} />
          <Text>{email}</Text>
        </Space>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag style={{ textTransform: 'capitalize' }}>{role}</Tag>
      ),
    },
    {
      title: 'Invited By',
      dataIndex: 'inviter',  // ✅ Changed from 'invited_by'
      key: 'inviter',
      render: (user: any) => {
        // ✅ Add null check
        if (!user) return <Text type="secondary">Unknown</Text>;
        return (
          <Space size={8}>
            <Avatar size="small" icon={<UserOutlined />} src={user.profile_picture} />
            <Text>
              {user.first_name} {user.last_name}
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Sent',
      dataIndex: 'invited_at',  // ✅ Changed from 'created_at'
      key: 'invited_at',
      render: (date: string) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ fontSize: '12px', color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            {new Date(date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: 'Pending' },
          accepted: { color: 'green', text: 'Accepted' },
          declined: { color: 'red', text: 'Declined' },
          expired: { color: 'default', text: 'Expired' },
        };
        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
        return (
          <Tag color={config.color} style={{ fontSize: '12px', fontWeight: 500 }}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      align: 'right' as const,
      width: 100,
      render: (_: any, record: any) => {
        // ✅ Only show cancel for pending invitations
        if (record.status !== 'pending') return null;
        
        return (
          <Popconfirm
            title="Cancel invitation?"
            description="This invitation will be cancelled."
            onConfirm={() => handleCancelInvitation(record.id)}
            okText="Yes, cancel"
            okButtonProps={{ danger: true }}
          >
            <Button 
              type="text" 
              danger 
              size="small"
              icon={<CloseOutlined />}
              style={{ fontSize: '12px' }}
            >
              Cancel
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  // Join Requests Table Columns
  const requestColumns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} src={user.profile_picture} />
          <div>
            <Text strong>
              {user.first_name} {user.last_name}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text
          style={{
            fontSize: '13px',
            fontStyle: message ? 'italic' : 'normal',
            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
          }}
        >
          {message || 'No message'}
        </Text>
      ),
    },
    {
      title: 'Requested',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Popconfirm
            title="Reject this request?"
            onConfirm={() => handleRejectRequest(record.id)}
            okText="Reject"
            okButtonProps={{ danger: true }}
          >
            <Button
              danger
              icon={<CloseOutlined />}
              size="small"
            >
              Reject
            </Button>
          </Popconfirm>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => handleApproveRequest(record.id)}
          >
            Approve
          </Button>
        </Space>
      ),
    },
  ];

  const subTabs = [
    {
      key: 'members',
      label: (
        <span>
          <TeamOutlined /> Members
          {workspace.memberships && (
            <Tag
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                padding: '0 6px',
              }}
            >
              {workspace.memberships.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <div>
          
          <Table
            dataSource={workspace.memberships}
            columns={memberColumns}
            rowKey={(record) => record.user.id}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `${total} member${total !== 1 ? 's' : ''}`,
            }}
          />
        </div>
      ),
    },
    {
      key: 'invitations',
      label: (
        <span>
          <SendOutlined /> Invitations
          {invitations.length > 0 && (
            <Badge count={invitations.length} style={{ marginLeft: '8px' }} />
          )}
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">
              Pending invitations sent to join this workspace
            </Text>
          </div>
          <Table
            dataSource={invitations}
            columns={invitationColumns}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{
              emptyText: 'No pending invitations',
            }}
          />
        </div>
      ),
      disabled: !canManage,
    },
    {
      key: 'requests',
      label: (
        <span>
          <ClockCircleOutlined /> Join Requests
          {joinRequests.length > 0 && (
            <Badge count={joinRequests.length} style={{ marginLeft: '8px' }} />
          )}
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">
              Users requesting to join this workspace
            </Text>
          </div>
          <Table
            dataSource={joinRequests}
            columns={requestColumns}
            rowKey="id"
            loading={loading}
            pagination={false}
            locale={{
              emptyText: 'No pending join requests',
            }}
          />
        </div>
      ),
      disabled: !canManage,
    },
  ];

  return (
    <div
    >
      <div style={{ paddingBottom:24, display: 'flex', justifyContent: 'space-between' }}>
        <Text type="secondary">
          Manage workspace members and their permissions
        </Text>
        {canManage && (
          <Button
            type="primary"
            icon={<UsergroupAddOutlined />}
            onClick={() => setInviteModalVisible(true)}
          >
            Invite Member
          </Button>
        )}
      </div>
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Tabs
          activeKey={activeSubTab}
          onChange={setActiveSubTab}
          items={subTabs}
        />
      </Card>
     

      {/* Invite Member Modal */}
      <Modal
        title={
          <Space size={8}>
            <UsergroupAddOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
            <Text strong style={{ fontSize: '16px' }}>
              Invite Member
            </Text>
          </Space>
        }
        open={inviteModalVisible}
        onCancel={() => {
          setInviteModalVisible(false);
          inviteForm.resetFields();
        }}
        onOk={handleInviteMember}
        okText="Send Invitation"
        cancelText="Cancel"
        width={540}
        styles={{
          body: { paddingTop: '24px' },
        }}
      >
        <Form form={inviteForm} layout="vertical">
          <Form.Item
            name="email"
            label={
              <Text strong style={{ fontSize: '13px' }}>
                Email Address
              </Text>
            }
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
          >
            <Input
              size="large"
              placeholder="colleague@example.com"
              prefix={
                <MailOutlined
                  style={{
                    color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                  }}
                />
              }
              style={{ fontSize: '14px' }}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label={
              <Text strong style={{ fontSize: '13px' }}>
                Role
              </Text>
            }
            rules={[{ required: true, message: 'Please select a role' }]}
            initialValue="member"
          >
            <Select size="large" placeholder="Select role">
              <Option value="member">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <UserOutlined />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>Member</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Can participate in projects
                    </Text>
                  </div>
                </div>
              </Option>
              <Option value="admin">
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <SafetyOutlined />
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '14px' }}>Admin</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Can manage workspace settings
                    </Text>
                  </div>
                </div>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message"
            label={
              <Text strong style={{ fontSize: '13px' }}>
                Personal Message (Optional)
              </Text>
            }
          >
            <Input.TextArea
              rows={3}
              placeholder="Add a personal message to the invitation..."
              maxLength={500}
              showCount
              style={{ resize: 'none', fontSize: '14px' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkspaceMembersTab;