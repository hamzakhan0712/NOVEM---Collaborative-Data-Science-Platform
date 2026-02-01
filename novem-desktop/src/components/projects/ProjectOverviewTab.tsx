import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Empty,
  Timeline,
  Typography,
  Space,
  Button,
  Tag,
  Avatar,
} from 'antd';
import {
  ClockCircleOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  UserOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { backendAPI } from '../../services/api';

const { Text } = Typography;

interface ProjectOverviewTabProps {
  project: any;
}

const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({ project }) => {
  const [recentActivity] = useState<any[]>([]);
  const [, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (project) {
      loadOverviewData();
    }
  }, [project]);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [statsData] = await Promise.all([
        backendAPI.getProjectStats(project.id),
        // TODO: Load recent activity when audit endpoint is ready
      ]);
      setStats(statsData);
      
      
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'dataset':
        return <DatabaseOutlined />;
      case 'analysis':
        return <BarChartOutlined />;
      case 'model':
        return <RobotOutlined />;
      case 'member':
        return <UserOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'dataset':
        return '#1890ff';
      case 'analysis':
        return '#52c41a';
      case 'model':
        return '#722ed1';
      case 'member':
        return '#fa8c16';
      default:
        return '#d9d9d9';
    }
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={16}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>Recent Activity</span>
              </Space>
            }
            loading={loading}
          >
            {recentActivity.length === 0 ? (
              <Empty
                description="No activity yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <Timeline
                items={recentActivity.map((activity) => ({
                  dot: getActivityIcon(activity.type),
                  color: getActivityColor(activity.type),
                  children: (
                    <Space direction="vertical" size={0}>
                      <Text strong>
                        {activity.user.first_name} {activity.user.last_name}
                      </Text>
                      <Text>
                        {activity.action} <Text code>{activity.resource}</Text>
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </Text>
                    </Space>
                  ),
                }))}
              />
            )}
          </Card>

          <Card
            title="Quick Actions"
            style={{ marginTop: '16px' }}
          >
            <Space wrap>
              <Button type="primary" icon={<DatabaseOutlined />}>
                Import Dataset
              </Button>
              <Button icon={<BarChartOutlined />}>
                Run Analysis
              </Button>
              <Button icon={<RobotOutlined />}>
                Train Model
              </Button>
              <Button icon={<UserOutlined />}>
                Invite Member
              </Button>
            </Space>
          </Card>
        </Col>

        <Col span={8}>
          <Card title="Project Information" loading={loading}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text type="secondary">Created</Text>
                <br />
                <Text strong>
                  {new Date(project.created_at).toLocaleDateString()}
                </Text>
              </div>

              <div>
                <Text type="secondary">Last Updated</Text>
                <br />
                <Text strong>
                  {new Date(project.updated_at).toLocaleDateString()}
                </Text>
              </div>

              <div>
                <Text type="secondary">Created By</Text>
                <br />
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  <Text strong>
                    {project.creator.first_name} {project.creator.last_name}
                  </Text>
                </Space>
              </div>

              <div>
                <Text type="secondary">Visibility</Text>
                <br />
                <Tag color={project.visibility === 'private' ? 'red' : project.visibility === 'team' ? 'blue' : 'green'}>
                  {project.visibility}
                </Tag>
              </div>

              {project.name && (
                <div>
                  <Text type="secondary">Workspace</Text>
                  <br />
                  <Tag>{project.name}</Tag>
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div>
                  <Text type="secondary">Tags</Text>
                  <br />
                  <Space wrap>
                    {project.tags.map((tag: string) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Card>

          <Card
            title="Your Permissions"
            style={{ marginTop: '16px' }}
            loading={loading}
          >
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <PermissionItem
                label="View Data"
                granted={project.current_user_permissions?.can_view_data}
              />
              <PermissionItem
                label="Run Analysis"
                granted={project.current_user_permissions?.can_run_analysis}
              />
              <PermissionItem
                label="Publish Results"
                granted={project.current_user_permissions?.can_publish_results}
              />
              <PermissionItem
                label="Manage Connectors"
                granted={project.current_user_permissions?.can_manage_connectors}
              />
              <PermissionItem
                label="Invite Members"
                granted={project.current_user_permissions?.can_invite_members}
              />
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const PermissionItem: React.FC<{ label: string; granted?: boolean }> = ({
  label,
  granted,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Text>{label}</Text>
    <Tag color={granted ? 'success' : 'default'}>
      {granted ? 'Granted' : 'Not Granted'}
    </Tag>
  </div>
);

export default ProjectOverviewTab;