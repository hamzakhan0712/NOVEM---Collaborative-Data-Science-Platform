import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Tag,
  message,
  Statistic,
  Dropdown,
  MenuProps,
  Spin,
  Breadcrumb,
} from 'antd';
import {
  TeamOutlined,
  FolderOutlined,
  UserOutlined,
  DeleteOutlined,
  SettingOutlined,
  GlobalOutlined,
  LockOutlined,
  EyeOutlined,
  CalendarOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import MainLayout from '../components/layout/MainLayout';
import { backendAPI } from '../services/api';
import { colors } from '../theme/config';

// Import workspace components
import WorkspaceOverviewTab from '../components/workspaces/WorkspaceOverviewTab';
import WorkspaceProjectsTab from '../components/workspaces/WorkspaceProjectsTab';
import WorkspaceMembersTab from '../components/workspaces/WorkspaceMembersTab';
import WorkspaceActivityTab from '../components/workspaces/WorkspaceActivityTab';
import WorkspaceJoinRequestsBadge from '../components/workspaces/WorkspaceJoinRequestsBadge';
import WorkspaceSettingsTab from '../components/workspaces/WorkspaceSettingsTab';

const { Title, Text } = Typography;

const WorkspaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { theme } = useTheme();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  useEffect(() => {
    loadWorkspace();
    loadProjects();
  }, [id]);

  const loadWorkspace = async () => {
    try {
      const data = await backendAPI.getWorkspace(Number(id));
      setWorkspace(data);
    } catch (error) {
      message.error('Failed to load workspace');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await backendAPI.getProjects();
      const workspaceProjects = Array.isArray(data)
        ? data.filter((p: any) => p.workspace === Number(id))
        : [];
      setProjects(workspaceProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjects([]);
    }
  };

  const canManage =
    workspace?.current_user_permissions?.is_owner ||
    workspace?.current_user_permissions?.is_admin;

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <GlobalOutlined />;
      case 'internal':
        return <EyeOutlined />;
      default:
        return <LockOutlined />;
    }
  };


  const getWorkspaceMenuItems = (): MenuProps['items'] => [
    {
      key: 'refresh',
      label: 'Refresh',
      onClick: () => {
        loadWorkspace();
        loadProjects();
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Workspace Settings',
      onClick: () => setActiveTab('settings'),
      disabled: !canManage,
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete Workspace',
      danger: true,
      disabled: !workspace?.current_user_permissions?.can_delete_workspace,
    },
  ];

  if (loading || !workspace) {
    return (
      <MainLayout>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <Spin size="large" />
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Loading workspace...
          </Text>
        </div>
      </MainLayout>
    );
  }

  // Calculate activity stats
  const activeProjects = projects.filter((p) => {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(p.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate <= 7;
  }).length;

  const tabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <HomeOutlined />,
      children: <WorkspaceOverviewTab workspace={workspace} projects={projects} />,
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: <FolderOutlined />,
      children: <WorkspaceProjectsTab workspace={workspace} projects={projects} />,
    },
    {
      key: 'members',
      label: 'Team',
      icon: <TeamOutlined />,
      children: (
        <WorkspaceMembersTab
          workspace={workspace}
          onUpdate={() => loadWorkspace()}
        />
      ),
    },
    {
      key: 'activity',
      label: 'Activity',
      icon: <ClockCircleOutlined />,
      children: <WorkspaceActivityTab />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
      children: (
        <WorkspaceSettingsTab
          workspace={workspace}
          onUpdate={() => {
            loadWorkspace();
            loadProjects();
          }}
        />
      ),
    },
  ];


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
    <MainLayout>
      <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
        {/* Breadcrumb - Match ProjectDetailPage */}
        <Breadcrumb style={{ marginBottom: '16px' }}>
          <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item onClick={() => navigate('/workspaces')} style={{ cursor: 'pointer' }}>
            Workspaces
          </Breadcrumb.Item>
          <Breadcrumb.Item>{workspace.name}</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header Section - Match ProjectDetailPage Style */}
        <div
          style={{
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <Space direction="vertical" size="small">
            <Space align="center">
              {avatarUrl ? (
  <img
    src={avatarUrl}
    alt={workspace.name}
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '6px',
      objectFit: 'cover',
    }}
  />
) : (
  <TeamOutlined style={{ fontSize: '32px', color: colors.logoCyan }} />
)}
              <Title level={2} style={{ margin: 0 }}>
                {workspace.name}
              </Title>
              <Tag color="blue" style={{ textTransform: 'capitalize' }}>
                {workspace.current_user_role}
              </Tag>
            </Space>
            <Text type="secondary">{workspace.description || 'No description'}</Text>
            <Space wrap>
              <Tag
                icon={getVisibilityIcon(workspace.visibility)}
                color={
                  workspace.visibility === 'private'
                    ? 'red'
                    : workspace.visibility === 'internal'
                    ? 'blue'
                    : 'green'
                }
                style={{ textTransform: 'capitalize' }}
              >
                {workspace.visibility}
              </Tag>
              <Tag style={{ textTransform: 'capitalize' }}>
                {workspace.workspace_type}
              </Tag>
              {workspace.owner && (
                <Tag icon={<UserOutlined />}>
                  {workspace.owner.first_name} {workspace.owner.last_name}
                </Tag>
              )}
              <Tag icon={<CalendarOutlined />}>
                {new Date(workspace.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Tag>
            </Space>
          </Space>

          {/* Right: Actions - Match ProjectDetailPage */}
          <Space>
            {/* Join Requests Badge - Only visible to admins/owners */}
            {canManage && (
              <WorkspaceJoinRequestsBadge
                workspaceId={workspace.id}
                onUpdate={() => loadWorkspace()}
              />
            )}

            <Dropdown menu={{ items: getWorkspaceMenuItems() }} trigger={['click']}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>

        {/* Stats Bar - Match ProjectDetailPage */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Projects"
                value={workspace.project_count || 0}
                prefix={<FolderOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Team Members"
                value={workspace.member_count || 0}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Active Projects"
                value={activeProjects}
                suffix={`/ ${projects.length}`}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Total Datasets"
                value={projects.reduce((sum, p) => sum + (p.dataset_count || 0), 0)}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* Content Tabs - Match ProjectDetailPage */}
        <Card
          bordered={false}
          style={{
            backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
            border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          }}
        >
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
        </Card>
      </div>
    </MainLayout>
  );
};

export default WorkspaceDetailPage;