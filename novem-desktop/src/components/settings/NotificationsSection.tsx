import React, { useState, useEffect } from 'react';
import {
  Card,
  Space,
  Typography,
  Switch,
  Divider,
  List,
  Badge,
  Button,
  Tag,
  Empty,
  message,
  Spin,
} from 'antd';
import {
  BellOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ProjectOutlined,
  TeamOutlined,
  MessageOutlined,
  UserAddOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

interface NotificationsSectionProps {
  profileData: any;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = ({ profileData }) => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emailSettings, setEmailSettings] = useState({
    email_notifications_enabled: true,
    email_project_invitations: true,
    email_project_updates: true,
    email_project_comments: true,
    email_workspace_invitations: true,
    email_workspace_activity: true,
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    if (profileData) {
      setEmailSettings({
        email_notifications_enabled: profileData.email_notifications_enabled ?? true,
        email_project_invitations: profileData.email_project_invitations ?? true,
        email_project_updates: profileData.email_project_updates ?? true,
        email_project_comments: profileData.email_project_comments ?? true,
        email_workspace_invitations: profileData.email_workspace_invitations ?? true,
        email_workspace_activity: profileData.email_workspace_activity ?? true,
      });
    }
    loadNotifications();
  }, [profileData]);

  const loadNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const data = await backendAPI.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleEmailSettingChange = async (field: string, value: boolean) => {
    try {
      setLoading(true);
      await backendAPI.updateProfile({ [field]: value });
      setEmailSettings(prev => ({ ...prev, [field]: value }));
      message.success('Email preferences updated');
    } catch (error) {
      console.error('Failed to update email preferences:', error);
      message.error('Failed to update email preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await backendAPI.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      message.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await backendAPI.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );
      message.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      message.error('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_invitation':
        return <UserAddOutlined style={{ color: colors.logoCyan }} />;
      case 'project_update':
        return <ProjectOutlined style={{ color: colors.logoCyan }} />;
      case 'project_comment':
        return <MessageOutlined style={{ color: colors.logoCyan }} />;
      case 'workspace_invitation':
        return <UserAddOutlined style={{ color: colors.logoCyan }} />;
      case 'workspace_activity':
        return <TeamOutlined style={{ color: colors.logoCyan }} />;
      case 'system':
        return <BellOutlined style={{ color: colors.logoCyan }} />;
      default:
        return <ThunderboltOutlined style={{ color: colors.logoCyan }} />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Notifications
        </Title>
        <Text type="secondary">
          Manage your notification preferences and view recent notifications
        </Text>
      </div>

      {/* Email Notification Settings */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <MailOutlined style={{ fontSize: '20px', color: colors.logoCyan }} />
            <Text strong style={{ fontSize: '15px' }}>
              Email Notifications
            </Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', marginBottom: '4px' }}>
                All Email Notifications
              </Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Master toggle for all email notifications
              </Text>
            </div>
            <Switch
              checked={emailSettings.email_notifications_enabled}
              onChange={(checked) => handleEmailSettingChange('email_notifications_enabled', checked)}
              loading={loading}
            />
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: '16px' }}>
              Project Activity
            </Text>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text>Project Invitations</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    When someone invites you to join a project
                  </Text>
                </div>
                <Switch
                  checked={emailSettings.email_project_invitations}
                  onChange={(checked) => handleEmailSettingChange('email_project_invitations', checked)}
                  disabled={!emailSettings.email_notifications_enabled}
                  loading={loading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text>Project Updates</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    When projects you're part of are updated
                  </Text>
                </div>
                <Switch
                  checked={emailSettings.email_project_updates}
                  onChange={(checked) => handleEmailSettingChange('email_project_updates', checked)}
                  disabled={!emailSettings.email_notifications_enabled}
                  loading={loading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text>Comments & Mentions</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    When someone comments or mentions you
                  </Text>
                </div>
                <Switch
                  checked={emailSettings.email_project_comments}
                  onChange={(checked) => handleEmailSettingChange('email_project_comments', checked)}
                  disabled={!emailSettings.email_notifications_enabled}
                  loading={loading}
                />
              </div>
            </Space>
          </div>

          <Divider style={{ margin: 0 }} />

          <div>
            <Text strong style={{ display: 'block', marginBottom: '16px' }}>
              Workspace Activity
            </Text>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text>Workspace Invitations</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    When someone invites you to join a workspace
                  </Text>
                </div>
                <Switch
                  checked={emailSettings.email_workspace_invitations}
                  onChange={(checked) => handleEmailSettingChange('email_workspace_invitations', checked)}
                  disabled={!emailSettings.email_notifications_enabled}
                  loading={loading}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text>Member Activity</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    When members join or leave your workspaces
                  </Text>
                </div>
                <Switch
                  checked={emailSettings.email_workspace_activity}
                  onChange={(checked) => handleEmailSettingChange('email_workspace_activity', checked)}
                  disabled={!emailSettings.email_notifications_enabled}
                  loading={loading}
                />
              </div>
            </Space>
          </div>
        </Space>
      </Card>

      {/* Recent Notifications */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <BellOutlined style={{ fontSize: '20px', color: colors.logoCyan }} />
              <Text strong style={{ fontSize: '15px' }}>
                Recent Notifications
              </Text>
              {unreadCount > 0 && (
                <Badge count={unreadCount} style={{ backgroundColor: colors.logoCyan }} />
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                type="link"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={handleMarkAllAsRead}
              >
                Mark All as Read
              </Button>
            )}
          </div>

          <Spin spinning={loadingNotifications}>
            {notifications.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No notifications yet"
                style={{ padding: '40px 0' }}
              />
            ) : (
              <List
                dataSource={notifications}
                renderItem={(notification) => (
                  <List.Item
                    style={{
                      backgroundColor: notification.read
                        ? 'transparent'
                        : isDark
                        ? colors.backgroundSecondaryDark
                        : colors.backgroundSecondary,
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    }}
                    actions={[
                      !notification.read && (
                        <Button
                          type="link"
                          size="small"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          Mark as read
                        </Button>
                      ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={getNotificationIcon(notification.type)}
                      title={
                        <Space>
                          <Text strong={!notification.read}>{notification.title}</Text>
                          {!notification.read && <Badge status="processing" />}
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size={4}>
                          <Text type="secondary">{notification.message}</Text>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {dayjs(notification.created_at).fromNow()}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Spin>
        </Space>
      </Card>
    </Space>
  );
};

export default NotificationsSection;