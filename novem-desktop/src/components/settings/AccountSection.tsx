import React, { useState, useEffect } from 'react';
import {
  Card,
  Space,
  Typography,
  Descriptions,
  Button,
  Table,
  Modal,
  Tag,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
} from 'antd';
import {
  DownloadOutlined,
  LogoutOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  ProjectOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  DesktopOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface AccountSectionProps {
  profileData: any;
}

interface AccountStats {
  projects_count: number;
  workspaces_count: number;
  recent_activity_count: number;
  account_age_days: number;
  member_since: string;
  last_login: string;
}

interface Session {
  id: number;
  device_info: string;
  ip_address: string;
  location: string;
  created_at: string;
  last_activity: string;
  is_active: boolean;
}

const AccountSection: React.FC<AccountSectionProps> = ({ profileData }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [exportingData, setExportingData] = useState(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    loadAccountStats();
    loadActiveSessions();
  }, []);

  const loadAccountStats = async () => {
    try {
      setLoadingStats(true);
      const data = await backendAPI.getAccountStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load account stats:', error);
      message.error('Failed to load account statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const data = await backendAPI.getActiveSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      message.error('Failed to load active sessions');
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExportingData(true);
      const blob = await backendAPI.exportAccountData();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `novem_account_data_${user?.username}_${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success('Account data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      message.error('Failed to export account data');
    } finally {
      setExportingData(false);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    try {
      await backendAPI.terminateSession(sessionId);
      message.success('Session terminated successfully');
      loadActiveSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
      message.error('Failed to terminate session');
    }
  };

  const handleTerminateAllSessions = async () => {
    Modal.confirm({
      title: 'Terminate All Sessions',
      content: 'Are you sure you want to terminate all other sessions? You will remain logged in on this device.',
      okText: 'Terminate All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await backendAPI.terminateSession('all');
          message.success('All other sessions terminated');
          loadActiveSessions();
        } catch (error) {
          console.error('Failed to terminate sessions:', error);
          message.error('Failed to terminate sessions');
        }
      },
    });
  };

  const sessionColumns = [
    {
      title: 'Device',
      dataIndex: 'device_info',
      key: 'device_info',
      render: (text: string) => (
        <Space>
          <DesktopOutlined style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondary }} />
          <Text>{text || 'Unknown Device'}</Text>
        </Space>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (record: Session) => (
        <Space>
          <EnvironmentOutlined style={{ color: isDark ? colors.textSecondaryDark : colors.textSecondary }} />
          <Text type="secondary">
            {record.location || record.ip_address || 'Unknown'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Last Active',
      dataIndex: 'last_activity',
      key: 'last_activity',
      render: (date: string) => (
        <Text type="secondary">{dayjs(date).fromNow()}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: Session) => (
        <Popconfirm
          title="Terminate this session?"
          description="The user will be logged out from this device."
          onConfirm={() => handleTerminateSession(record.id)}
          okText="Terminate"
          cancelText="Cancel"
        >
          <Button 
            type="link" 
            danger 
            size="small"
            icon={<LogoutOutlined />}
          >
            Terminate
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Account Management
        </Title>
        <Text type="secondary">
          View account information, statistics, and manage your data
        </Text>
      </div>

      {/* Account Overview */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Account Overview
          </Text>

          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="Email">
              {user?.email}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              {user?.username}
            </Descriptions.Item>
            <Descriptions.Item label="Account Status">
              <Tag color="green">{user?.account_state?.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Member Since">
              {stats ? dayjs(stats.member_since).format('MMMM D, YYYY') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Last Login">
              {stats?.last_login ? dayjs(stats.last_login).fromNow() : 'Never'}
            </Descriptions.Item>
            <Descriptions.Item label="Account Age">
              {stats ? `${stats.account_age_days} days` : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      {/* Account Statistics */}
      <Card
        bordered={false}
        loading={loadingStats}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Usage Statistics
          </Text>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Statistic
                  title="Projects"
                  value={stats?.projects_count || 0}
                  prefix={<ProjectOutlined style={{ color: colors.logoCyan }} />}
                  valueStyle={{ color: isDark ? colors.textPrimaryDark : colors.textPrimary }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Statistic
                  title="Workspaces"
                  value={stats?.workspaces_count || 0}
                  prefix={<TeamOutlined style={{ color: colors.logoCyan }} />}
                  valueStyle={{ color: isDark ? colors.textPrimaryDark : colors.textPrimary }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Statistic
                  title="Recent Activity"
                  value={stats?.recent_activity_count || 0}
                  prefix={<ThunderboltOutlined style={{ color: colors.logoCyan }} />}
                  valueStyle={{ color: isDark ? colors.textPrimaryDark : colors.textPrimary }}
                  suffix={
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      / 30 days
                    </Text>
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card
                size="small"
                style={{
                  backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              >
                <Statistic
                  title="Active Sessions"
                  value={sessions.filter(s => s.is_active).length}
                  prefix={<GlobalOutlined style={{ color: colors.logoCyan }} />}
                  valueStyle={{ color: isDark ? colors.textPrimaryDark : colors.textPrimary }}
                />
              </Card>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Active Sessions */}
      <Card
        bordered={false}
        loading={loadingSessions}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ fontSize: '15px', display: 'block' }}>
                Active Sessions
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Manage devices where you're currently logged in
              </Text>
            </div>
            {sessions.length > 1 && (
              <Button
                danger
                icon={<LogoutOutlined />}
                onClick={handleTerminateAllSessions}
              >
                Terminate All Others
              </Button>
            )}
          </div>

          <Table
            dataSource={sessions}
            columns={sessionColumns}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Space>
      </Card>

      {/* Data Management */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '15px' }}>
            Data Management
          </Text>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                Export Account Data
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Download all your account data including profile, projects, workspaces, and activity logs
              </Text>
            </div>
            <Button
              icon={<DownloadOutlined />}
              onClick={handleExportData}
              loading={exportingData}
            >
              Export Data (JSON)
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default AccountSection;