import React, { useEffect, useState } from 'react';
import {
  Tabs,
  Card,
  Statistic,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Typography,
  Breadcrumb,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  HomeOutlined,
  FolderOutlined,
  TeamOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  MoreOutlined,
  RobotOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useTheme } from '../contexts/ThemeContext';
import { backendAPI } from '../services/api';
import MainLayout from '../components/layout/MainLayout';
import ProjectOverviewTab from '../components/projects/ProjectOverviewTab';
import ProjectTeamTab from '../components/projects/ProjectTeamTab';
import ProjectSettingsTab from '../components/projects/ProjectSettingsTab';
import JoinRequestsBadge from '../components/projects/JoinRequestsBadge';

import { colors } from '../theme/config';

const { Title, Text } = Typography;

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, setCurrentProject, refreshProject } = useProject();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const isDark = theme === 'dark';

  useEffect(() => {
    if (id) {
      loadProject(parseInt(id));
    }
  }, [id]);

  const loadProject = async (projectId: number) => {
    setLoading(true);
    try {
      const project = await backendAPI.getProject(projectId);
      setCurrentProject(project);
    } catch (error) {
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const projectMenuItems: MenuProps['items'] = [
    {
      key: 'refresh',
      label: 'Refresh',
      onClick: () => currentProject && refreshProject(currentProject.id),
    },
    {
      type: 'divider',
    },
    {
      key: 'settings',
      label: 'Project Settings',
      icon: <SettingOutlined />,
      onClick: () => setActiveTab('settings'),
    },
  ];

  const tabs = currentProject ? [
  {
    key: 'overview',
    label: 'Overview',
    icon: <HomeOutlined />,
    children: <ProjectOverviewTab project={currentProject} />,
  },
  {
    key: 'team',
    label: 'Team',
    icon: <TeamOutlined />,
    children: (
      <ProjectTeamTab
        project={currentProject}
        onUpdate={() => currentProject && refreshProject(currentProject.id)}
      />
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <SettingOutlined />,
    children: <ProjectSettingsTab project={currentProject} />,
  },
] : [];

  if (loading || !currentProject) {
    return (
      <MainLayout>
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Title level={4}>Loading project...</Title>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
        <Breadcrumb style={{ marginBottom: '16px' }}>
          <Breadcrumb.Item onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
            <HomeOutlined />
          </Breadcrumb.Item>
          <Breadcrumb.Item onClick={() => navigate('/projects')} style={{ cursor: 'pointer' }}>
            Projects
          </Breadcrumb.Item>
          <Breadcrumb.Item>{currentProject.name}</Breadcrumb.Item>
        </Breadcrumb>

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
              <FolderOutlined style={{ fontSize: '32px', color: colors.logoCyan }} />
              <Title level={2} style={{ margin: 0 }}>
                {currentProject.name}
              </Title>
              <Tag color="blue">{currentProject.current_user_role}</Tag>
            </Space>
            <Text type="secondary">{currentProject.description || 'No description'}</Text>
            <Space wrap>
              <Tag
                color={
                  currentProject.visibility === 'private'
                    ? 'red'
                    : currentProject.visibility === 'team'
                    ? 'blue'
                    : 'green'
                }
              >
                {currentProject.visibility}
              </Tag>
              {currentProject.name && (
                <Tag icon={<TeamOutlined />}>{currentProject.name}</Tag>
              )}
              {currentProject.tags?.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Space>

          <Space>
            {/* Join Requests Badge - Only visible to users with invite permissions */}
            {currentProject.current_user_permissions?.can_invite_members && (
              <JoinRequestsBadge
                projectId={currentProject.id}
                onUpdate={() => refreshProject(currentProject.id)}
              />
            )}

            <Dropdown menu={{ items: projectMenuItems }} trigger={['click']}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        </div>

        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Datasets"
                value={currentProject.dataset_count}
                prefix={<DatabaseOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic
                title="Team Members"
                value={currentProject.member_count}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic title="Analyses" value={0} prefix={<BarChartOutlined />} />
            </Card>
          </Col>
          <Col span={6}>
            <Card bordered={false}>
              <Statistic title="Models" value={0} prefix={<RobotOutlined />} />
            </Card>
          </Col>
        </Row>

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

export default ProjectDetailPage;