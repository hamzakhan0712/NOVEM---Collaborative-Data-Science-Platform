import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Badge,
  Dropdown,
  MenuProps,
  Divider,
  Tag,
  Spin,
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  UserOutlined,
  FolderOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  UsergroupAddOutlined,
  CalendarOutlined,
  SearchOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import MainLayout from '../components/layout/MainLayout';
import { colors } from '../theme/config';

const { Title, Text, Paragraph } = Typography;
const { TextArea, Search } = Input;

const WorkspacesPage: React.FC = () => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [form] = Form.useForm();
  const { workspaces, createWorkspace, loading } = useWorkspace();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const isDark = theme === 'dark';

  // Ensure workspaces is always an array before filtering
  const workspacesArray = Array.isArray(workspaces) ? workspaces : [];
  
  const filteredWorkspaces = workspacesArray.filter(workspace => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workspace.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || workspace.workspace_type === typeFilter;
    const matchesVisibility = visibilityFilter === 'all' || workspace.visibility === visibilityFilter;
    return matchesSearch && matchesType && matchesVisibility;
  });

  const handleCreateWorkspace = async () => {
    try {
      const values = await form.validateFields();
      await createWorkspace({
        name: values.name,
        description: values.description,
        workspace_type: values.workspace_type,
        visibility: values.visibility,
        allow_member_project_creation: true,
      });
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const getVisibilityConfig = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return {
          icon: <GlobalOutlined />,
          color: colors.success,
          label: 'Public',
        };
      case 'internal':
        return {
          icon: <EyeOutlined />,
          color: colors.warning,
          label: 'Internal',
        };
      default:
        return {
          icon: <LockOutlined />,
          color: isDark ? colors.textSecondaryDark : colors.textSecondary,
          label: 'Private',
        };
    }
  };

  const getWorkspaceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      personal: 'Personal',
      team: 'Team',
      organization: 'Organization',
      client: 'Client',
    };
    return types[type] || type;
  };

  const getRoleBadgeStatus = (workspace: any): 'success' | 'processing' | 'default' => {
    if (workspace.current_user_permissions?.is_owner) return 'success';
    if (workspace.current_user_permissions?.is_admin) return 'processing';
    return 'default';
  };

  const getWorkspaceMenuItems = (workspace: any): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit Workspace',
      onClick: () => navigate(`/workspaces/${workspace.id}/settings`),
    },
    {
      key: 'members',
      icon: <UsergroupAddOutlined />,
      label: 'Manage Members',
      onClick: () => navigate(`/workspaces/${workspace.id}/members`),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete Workspace',
      danger: true,
      disabled: !workspace.current_user_permissions?.can_delete_workspace,
    },
  ];

  const getAvatarUrl = (avatar: string | null | undefined) => {
  if (!avatar) return null;
  
  // If it's already a full URL, use it
  if (avatar.startsWith('http')) {
    return avatar;
  }
  
  // Prepend backend URL
  const backendUrl = 'http://localhost:8000';
  return `${backendUrl}${avatar}`;
};

  return (
    <MainLayout>
      <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                marginBottom: '6px',
                fontWeight: 600,
                fontSize: '24px',
                letterSpacing: '-0.01em',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              Workspaces
            </Title>
            <Text
              style={{
                fontSize: '14px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Organize projects and collaborate with teams
            </Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
            style={{
              height: '40px',
              padding: '0 20px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            New Workspace
          </Button>
        </div>

        {/* Filters */}
        <Card
          bordered={false}
          style={{
            marginBottom: '16px',
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Space
            style={{
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <Search
              placeholder="Search workspaces..."
              allowClear
              prefix={<SearchOutlined />}
              style={{ width: 400, maxWidth: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="large"
            />
            <Space wrap>
              <Select
                style={{ width: 180 }}
                placeholder="Filter by type"
                value={typeFilter}
                onChange={setTypeFilter}
                size="large"
                options={[
                  { label: 'All Types', value: 'all' },
                  { label: 'Personal', value: 'personal' },
                  { label: 'Team', value: 'team' },
                  { label: 'Organization', value: 'organization' },
                  { label: 'Client', value: 'client' },
                ]}
              />
              <Select
                style={{ width: 180 }}
                placeholder="Filter by visibility"
                value={visibilityFilter}
                onChange={setVisibilityFilter}
                size="large"
                options={[
                  { label: 'All Visibility', value: 'all' },
                  { label: 'Private', value: 'private' },
                  { label: 'Internal', value: 'internal' },
                  { label: 'Public', value: 'public' },
                ]}
              />
            </Space>
          </Space>
        </Card>

        {/* Workspaces Grid */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              padding: '60px 24px',
            }}
          >
            <Space direction="vertical" align="center" size={16}>
              <Spin
                indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
                size="large"
              />
              <Text
                style={{
                  fontSize: '14px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                }}
              >
                Loading workspaces...
              </Text>
            </Space>
          </div>
        ) : filteredWorkspaces.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '50vh',
              padding: '60px 24px',
            }}
          >
            <div style={{ textAlign: 'center', maxWidth: '420px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <TeamOutlined style={{ fontSize: '28px', color: colors.logoCyan }} />
              </div>

              <Title
                level={3}
                style={{
                  marginBottom: '8px',
                  fontWeight: 600,
                  fontSize: '18px',
                }}
              >
                {searchTerm ? `No workspaces found matching "${searchTerm}"` : 'No workspaces yet'}
              </Title>
              <Text
                style={{
                  fontSize: '14px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  display: 'block',
                  marginBottom: '24px',
                  lineHeight: '1.5',
                }}
              >
                {searchTerm
                  ? 'Try adjusting your search or filters'
                  : 'Create your first workspace to organize projects and collaborate with your team'
                }
              </Text>

              {!searchTerm && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateModalVisible(true)}
                  style={{
                    height: '40px',
                    padding: '0 24px',
                    fontSize: '14px',
                  }}
                >
                  Create Workspace
                </Button>
              )}
            </div>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredWorkspaces.map((workspace) => {
              const visibilityConfig = getVisibilityConfig(workspace.visibility);

              return (
                <Col xs={24} sm={12} lg={8} key={workspace.id}>
                  <Card
                    bordered={false}
                    hoverable
                    style={{
                      backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    bodyStyle={{ padding: 0 }}
                    onClick={() => navigate(`/workspaces/${workspace.id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = colors.logoCyan;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = isDark ? colors.borderDark : colors.border;
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
                            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {getAvatarUrl(workspace.avatar) ? (
                            <img
                              src={getAvatarUrl(workspace.avatar)!}
                              alt={workspace.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '6px',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <TeamOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                          )}
                        </div>

                        {/* Title & Meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <Title
                              level={5}
                              style={{
                                margin: 0,
                                fontWeight: 600,
                                fontSize: '15px',
                                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {workspace.name}
                            </Title>
                            <Dropdown
                              menu={{ items: getWorkspaceMenuItems(workspace) }}
                              trigger={['click']}
                              placement="bottomRight"
                            >
                              <Button
                                type="text"
                                icon={<MoreOutlined />}
                                size="small"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  padding: '4px',
                                  height: 'auto',
                                }}
                              />
                            </Dropdown>
                          </div>
                          
                          <Space size={8} style={{ marginTop: '6px' }}>
                            <Text
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                textTransform: 'capitalize',
                              }}
                            >
                              {getWorkspaceTypeLabel(workspace.workspace_type)}
                            </Text>
                            <Divider type="vertical" style={{ margin: 0, height: '12px' }} />
                            <Badge
                              status={getRoleBadgeStatus(workspace)}
                              text={
                                <Text
                                  style={{
                                    fontSize: '12px',
                                    color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {workspace.current_user_role}
                                </Text>
                              }
                            />
                          </Space>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '16px 20px' }}>
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {/* Description */}
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            minHeight: '40px',
                            color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                            lineHeight: '1.5',
                          }}
                        >
                          {workspace.description || 'No description provided'}
                        </Paragraph>

                        {/* Stats Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size={16}>
                            <Space size={6}>
                              <FolderOutlined
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  fontWeight: 500,
                                }}
                              >
                                {workspace.project_count || 0}
                              </Text>
                            </Space>
                            <Space size={6}>
                              <UserOutlined
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: '13px',
                                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                                  fontWeight: 500,
                                }}
                              >
                                {workspace.member_count || 0}
                              </Text>
                            </Space>
                          </Space>
                          
                          <Tag
                            icon={visibilityConfig.icon}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              border: 'none',
                              borderRadius: '4px',
                              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
                              color: visibilityConfig.color,
                            }}
                          >
                            {visibilityConfig.label}
                          </Tag>
                        </div>

                        {/* Footer Info */}
                        <div style={{ paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
                          <Space size={6}>
                            <CalendarOutlined
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: '12px',
                                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                              }}
                            >
                              Created {new Date(workspace.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </Space>
                        </div>
                      </Space>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}

        {/* Create Workspace Modal */}
        <Modal
          title={
            <Space size={8}>
              <TeamOutlined style={{ fontSize: '16px', color: colors.logoCyan }} />
              <Text strong style={{ fontSize: '16px' }}>
                Create New Workspace
              </Text>
            </Space>
          }
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false);
            form.resetFields();
          }}
          onOk={handleCreateWorkspace}
          okText="Create Workspace"
          cancelText="Cancel"
          width={540}
          styles={{
            body: { paddingTop: '24px' },
          }}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label={
                <Text strong style={{ fontSize: '13px' }}>
                  Workspace Name
                </Text>
              }
              rules={[
                { required: true, message: 'Please enter a workspace name' },
                { min: 3, message: 'Name must be at least 3 characters' },
              ]}
            >
              <Input
                size="large"
                placeholder="e.g., Analytics Team, Client Projects"
                style={{ fontSize: '14px' }}
              />
            </Form.Item>

            <Form.Item
              name="workspace_type"
              label={
                <Text strong style={{ fontSize: '13px' }}>
                  Type
                </Text>
              }
              rules={[{ required: true, message: 'Please select a workspace type' }]}
            >
              <Select size="large" placeholder="Select workspace type">
                <Select.Option value="personal">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <UserOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Personal</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Individual projects
                      </Text>
                    </div>
                  </div>
                </Select.Option>
                <Select.Option value="team">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <TeamOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Team</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Collaborative workspace
                      </Text>
                    </div>
                  </div>
                </Select.Option>
                <Select.Option value="organization">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <GlobalOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Organization</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Company-wide workspace
                      </Text>
                    </div>
                  </div>
                </Select.Option>
                <Select.Option value="client">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <FolderOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Client</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        External collaboration
                      </Text>
                    </div>
                  </div>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="visibility"
              label={
                <Text strong style={{ fontSize: '13px' }}>
                  Visibility
                </Text>
              }
              rules={[{ required: true, message: 'Please select visibility' }]}
              initialValue="private"
            >
              <Select size="large">
                <Select.Option value="private">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <LockOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Private</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Only members can see
                      </Text>
                    </div>
                  </div>
                </Select.Option>
                <Select.Option value="internal">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <EyeOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Internal</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Members can discover
                      </Text>
                    </div>
                  </div>
                </Select.Option>
                <Select.Option value="public">
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <GlobalOutlined />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '14px' }}>Public</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Anyone can discover
                      </Text>
                    </div>
                  </div>
                </Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label={
                <Text strong style={{ fontSize: '13px' }}>
                  Description (Optional)
                </Text>
              }
            >
              <TextArea
                rows={3}
                placeholder="Describe the purpose and goals of this workspace..."
                maxLength={500}
                showCount
                style={{ resize: 'none', fontSize: '14px' }}
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  );
};

export default WorkspacesPage;