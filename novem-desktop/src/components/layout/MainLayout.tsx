import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Dropdown,
  Button,
  Space,
  Badge,
  Avatar,
  Typography,
  Divider,
  MenuProps,
  Popover,
  List,
  Spin,
  Alert,
  Tooltip,
} from 'antd';
import {
  ProjectOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  BulbOutlined,
  FolderOutlined,
  DownOutlined,
  HomeOutlined,
  CloudOutlined,
  BellOutlined,
  CheckOutlined,
  SearchOutlined,
  TeamOutlined,
  WifiOutlined,
  DisconnectOutlined,
  WarningOutlined,
  MailOutlined,
  ClockCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useProject } from '../../contexts/ProjectContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { backendAPI } from '../../services/api';
import { colors } from '../../theme/config';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { user, logout, offlineMode, daysRemaining } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspace();
  useProject();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [workspaceInvitations, setWorkspaceInvitations] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isDark = theme === 'dark';

  // Load notifications
  useEffect(() => {
    if (user && !offlineMode) {
      loadNotifications();
    }
  }, [user, offlineMode]);

  const loadNotifications = async () => {
    setRequestsLoading(true);
    try {
      const [requestsData, projectInvitationsData, workspaceInvitationsData] = await Promise.all([
        backendAPI.getMyJoinRequests(),
        backendAPI.getMyInvitations(),
        backendAPI.getMyWorkspaceInvitations(),
      ]);
      setJoinRequests(requestsData || []);
      setInvitations(projectInvitationsData || []);
      setWorkspaceInvitations(workspaceInvitationsData || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setJoinRequests([]);
      setInvitations([]);
      setWorkspaceInvitations([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const workspaceList = Array.isArray(workspaces) ? workspaces : [];

  // Workspace dropdown menu
  const workspaceMenuItems: MenuProps['items'] = workspaceList.map((workspace) => ({
    key: `workspace-${workspace.id}`,
    icon: <TeamOutlined style={{ fontSize: '14px' }} />,
    label: (
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          minWidth: 220,
          padding: '4px 0',
        }}
      >
        <Space size={12}>
          <Avatar
            size={24}
            style={{
              backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
              color: colors.logoCyan,
              fontSize: '12px',
            }}
          >
            {workspace.name.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text
              strong
              style={{
                fontSize: '14px',
                display: 'block',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              {workspace.name}
            </Text>
            <Text
              style={{
                fontSize: '12px',
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              {workspace.project_count || 0} projects
            </Text>
          </div>
        </Space>
        {currentWorkspace?.id === workspace.id && (
          <CheckOutlined style={{ color: colors.logoCyan, fontSize: '14px' }} />
        )}
      </div>
    ),
    onClick: () => {
      setCurrentWorkspace(workspace);
      navigate('/dashboard');
    },
  }));

  // User dropdown menu
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined style={{ fontSize: '14px' }} />,
      label: <Text style={{ fontSize: '14px' }}>Settings</Text>,
      onClick: () => navigate('/settings'),
    },
    
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined style={{ fontSize: '14px' }} />,
      label: <Text style={{ fontSize: '14px' }}>Sign Out</Text>,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const getSelectedKey = () => {
    if (location.pathname === '/dashboard') return 'dashboard';
    if (location.pathname.startsWith('/workspaces')) return 'workspaces';
    if (location.pathname.startsWith('/projects')) return 'projects';
    if (location.pathname.startsWith('/data')) return 'data';
    if (location.pathname.startsWith('/analytics')) return 'analytics';
    if (location.pathname.startsWith('/browse')) return 'browse';
    if (location.pathname.startsWith('/community')) return 'community';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };

  const pendingRequestsCount = joinRequests.filter((r) => r.status === 'pending').length;
  const pendingInvitationsCount = invitations.filter(
    (inv) => inv.status === 'pending' && !inv.is_expired
  ).length;
  const pendingWorkspaceInvitationsCount = workspaceInvitations.filter(
    (inv) => inv.status === 'pending' && !inv.is_expired
  ).length;
  const totalNotifications =
    pendingRequestsCount + pendingInvitationsCount + pendingWorkspaceInvitationsCount;

  // Notifications popover content
  const notificationsContent = (
    <div
      style={{
        width: 420,
        maxHeight: 600,
        backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
        borderRadius: '6px',
        overflow: 'hidden',
        border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            strong
            style={{
              fontSize: '16px',
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Notifications
          </Text>
          {totalNotifications > 0 && (
            <Badge
              count={totalNotifications}
              style={{
                backgroundColor: colors.logoCyan,
                fontSize: '12px',
                fontWeight: 600,
              }}
            />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxHeight: 520,
          overflowY: 'auto',
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
        }}
      >
        {requestsLoading ? (
          <div style={{ padding: '80px 20px', textAlign: 'center' }}>
            <Spin size="large" />
            <Text
              style={{
                display: 'block',
                marginTop: '16px',
                fontSize: '14px',
                color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              }}
            >
              Loading notifications...
            </Text>
          </div>
        ) : totalNotifications === 0 ? (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <BellOutlined style={{ fontSize: '28px', color: colors.logoCyan }} />
            </div>
            <Text
              strong
              style={{
                display: 'block',
                fontSize: '15px',
                marginBottom: '6px',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
              }}
            >
              All caught up!
            </Text>
            <Text
              style={{
                fontSize: '13px',
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
              }}
            >
              No new notifications at this time
            </Text>
          </div>
        ) : (
          <List
            dataSource={[
              ...workspaceInvitations
                .filter((inv) => inv.status === 'pending' && !inv.is_expired)
                .map((inv) => ({ ...inv, type: 'workspace-invitation' })),
              ...invitations
                .filter((inv) => inv.status === 'pending' && !inv.is_expired)
                .map((inv) => ({ ...inv, type: 'project-invitation' })),
              ...joinRequests
                .filter((req) => req.status === 'pending')
                .map((req) => ({ ...req, type: 'join-request' })),
            ]}
            renderItem={(item, index) => (
              <div
                style={{
                  padding: '20px 24px',
                  borderBottom:
                    index <
                    workspaceInvitations.length +
                      invitations.length +
                      joinRequests.length -
                      1
                      ? `1px solid ${isDark ? colors.borderDark : colors.border}`
                      : 'none',
                  backgroundColor: isDark ? colors.surfaceDark : colors.surfaceLight,
                  transition: 'background-color 0.2s',
                }}
              >
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: isDark
                          ? 'rgba(0, 200, 83, 0.1)'
                          : 'rgba(0, 200, 83, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {item.type === 'workspace-invitation' && (
                        <TeamOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                      )}
                      {item.type === 'project-invitation' && (
                        <FolderOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                      )}
                      {item.type === 'join-request' && (
                        <MailOutlined style={{ fontSize: '18px', color: colors.logoCyan }} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          fontSize: '15px',
                          display: 'block',
                          marginBottom: '6px',
                          color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                        }}
                      >
                        {item.type === 'workspace-invitation' && `Workspace Invitation`}
                        {item.type === 'project-invitation' && `Project Invitation`}
                        {item.type === 'join-request' && `Join Request`}
                      </Text>

                      <Text
                        style={{
                          fontSize: '14px',
                          color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                          display: 'block',
                          lineHeight: '1.5',
                        }}
                      >
                        {item.type === 'workspace-invitation' && (
                          <>
                            <Text strong style={{ color: 'inherit' }}>
                              {item.inviter.first_name} {item.inviter.last_name}
                            </Text>{' '}
                            invited you to join{' '}
                            <Text strong style={{ color: 'inherit' }}>
                              {item.workspace_name}
                            </Text>
                          </>
                        )}
                        {item.type === 'project-invitation' && (
                          <>
                            <Text strong style={{ color: 'inherit' }}>
                              {item.inviter.first_name} {item.inviter.last_name}
                            </Text>{' '}
                            invited you to join{' '}
                            <Text strong style={{ color: 'inherit' }}>
                              {item.project_name}
                            </Text>
                          </>
                        )}
                        {item.type === 'join-request' && (
                          <>
                            Your request to join{' '}
                            <Text strong style={{ color: 'inherit' }}>
                              {item.project_name}
                            </Text>{' '}
                            is {item.status}
                          </>
                        )}
                      </Text>

                      {item.message && (
                        <div
                          style={{
                            marginTop: '10px',
                            padding: '12px',
                            borderRadius: '4px',
                            backgroundColor: isDark
                              ? colors.backgroundTertiaryDark
                              : colors.backgroundTertiary,
                            borderLeft: `3px solid ${colors.logoCyan}`,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: '13px',
                              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                              fontStyle: 'italic',
                              lineHeight: '1.5',
                            }}
                          >
                            "{item.message}"
                          </Text>
                        </div>
                      )}

                      <Space size={6} style={{ marginTop: '10px' }}>
                        <ClockCircleOutlined
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                          }}
                        />
                        <Text
                          style={{
                            fontSize: '12px',
                            color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                            fontWeight: 500,
                          }}
                        >
                          {new Date(item.invited_at || item.requested_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </Text>
                      </Space>
                    </div>
                  </div>

                  {/* Actions */}
                  {(item.type === 'workspace-invitation' ||
                    item.type === 'project-invitation') && (
                    <div style={{ display: 'flex', gap: '10px', marginLeft: '54px' }}>
                      <Button
                        size="middle"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (item.type === 'workspace-invitation') {
                              await backendAPI.declineWorkspaceInvitation(
                                item.workspace,
                                item.id
                              );
                            } else {
                              await backendAPI.declineInvitation(item.project, item.id);
                            }
                            loadNotifications();
                          } catch (error) {
                            console.error('Failed to decline invitation');
                          }
                        }}
                        style={{ flex: 1, height: '36px', fontWeight: 500 }}
                      >
                        Decline
                      </Button>
                      <Button
                        type="primary"
                        size="middle"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            if (item.type === 'workspace-invitation') {
                              await backendAPI.acceptWorkspaceInvitation(
                                item.workspace,
                                item.id
                              );
                              setNotificationsOpen(false);
                              navigate(`/workspaces/${item.workspace}`);
                            } else {
                              await backendAPI.acceptInvitation(item.project, item.id);
                              setNotificationsOpen(false);
                              navigate(`/projects/${item.project}`);
                            }
                          } catch (error) {
                            console.error('Failed to accept invitation');
                          }
                        }}
                        style={{ flex: 1, height: '36px', fontWeight: 500 }}
                      >
                        Accept
                      </Button>
                    </div>
                  )}
                </Space>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <Header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 32px',
          height: '64px',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Left Section */}
        <Space size={28} align="center">
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px', 
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            <img
              src="/logo.png"
              alt="NOVEM"
              style={{ height: '32px', width: 'auto' }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Text
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: colors.logoCyan,
                letterSpacing: '-0.02em',
              }}
            >
              NOVEM
            </Text>
          </div>

          {/* Workspace Selector */}
          {currentWorkspace && workspaceList.length > 0 && (
            <>
              <Divider
                type="vertical"
                style={{
                  height: '24px',
                  borderColor: isDark ? colors.borderDark : colors.border,
                  margin: 0,
                }}
              />
              <Dropdown
                menu={{ items: workspaceMenuItems }}
                trigger={['click']}
                disabled={workspaceList.length === 0}
              >
                <Button
                  type="text"
                  style={{
                    height: '40px',
                    padding: '0 16px',
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    fontWeight: 500,
                    border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                    backgroundColor: isDark
                      ? colors.backgroundTertiaryDark
                      : colors.backgroundTertiary,
                  }}
                >
                  <Space size={10}>
                    <Avatar
                      size={24}
                      style={{
                        backgroundColor: isDark
                          ? 'rgba(0, 200, 83, 0.1)'
                          : 'rgba(0, 200, 83, 0.08)',
                        color: colors.logoCyan,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {currentWorkspace.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text
                      style={{
                        color: 'inherit',
                        fontSize: '14px',
                        fontWeight: 500,
                        maxWidth: '180px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {currentWorkspace.name}
                    </Text>
                    <DownOutlined style={{ fontSize: '11px', opacity: 0.6 }} />
                  </Space>
                </Button>
              </Dropdown>
            </>
          )}
        </Space>

        {/* Right Section */}
        <Space size={14}>
          {/* Connection Status */}
          <Tooltip
            title={
              offlineMode
                ? `Offline mode - ${daysRemaining} days remaining`
                : 'Connected to server'
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: offlineMode
                  ? isDark
                    ? 'rgba(250, 173, 20, 0.1)'
                    : 'rgba(250, 173, 20, 0.08)'
                  : isDark
                  ? 'rgba(0, 200, 83, 0.1)'
                  : 'rgba(0, 200, 83, 0.08)',
                border: `1px solid ${
                  offlineMode
                    ? isDark
                      ? 'rgba(250, 173, 20, 0.2)'
                      : 'rgba(250, 173, 20, 0.15)'
                    : isDark
                    ? 'rgba(0, 200, 83, 0.2)'
                    : 'rgba(0, 200, 83, 0.15)'
                }`,
              }}
            >
              {offlineMode ? (
                <DisconnectOutlined
                  style={{
                    fontSize: '13px',
                    color: colors.warning,
                  }}
                />
              ) : (
                <WifiOutlined
                  style={{
                    fontSize: '13px',
                    color: colors.success,
                  }}
                />
              )}
              <Text
                style={{
                  fontSize: '13px',
                  color: offlineMode ? colors.warning : colors.success,
                  fontWeight: 600,
                  letterSpacing: '0.01em',
                }}
              >
                {offlineMode ? 'Offline' : 'Online'}
              </Text>
            </div>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            <Button
              type="text"
              icon={<BulbOutlined style={{ fontSize: '18px' }} />}
              onClick={toggleTheme}
              style={{
                height: '40px',
                width: '40px',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              }}
            />
          </Tooltip>

          {/* Notifications */}
          <Popover
            content={notificationsContent}
            trigger="click"
            placement="bottomRight"
            open={notificationsOpen}
            onOpenChange={setNotificationsOpen}
            overlayStyle={{ padding: 0 }}
            arrow={false}
          >
            <Badge
              count={totalNotifications}
              offset={[-6, 6]}
              style={{
                backgroundColor: colors.logoCyan,
                fontSize: '11px',
                fontWeight: 600,
                minWidth: '18px',
                height: '18px',
                lineHeight: '18px',
              }}
            >
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: '18px' }} />}
                style={{
                  height: '40px',
                  width: '40px',
                  color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                }}
              />
            </Badge>
          </Popover>

          {/* User Menu */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
            <Button
              type="text"
              style={{
                height: '40px',
                padding: '0 14px',
                color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              }}
            >
              <Space size={10}>
                <Avatar
                  size={26}
                  icon={<UserOutlined />}
                  src={(user as any)?.profile_picture}
                  style={{
                    backgroundColor: colors.logoCyan,
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                />
                <div style={{ textAlign: 'left', lineHeight: '1.3' }}>
                  <Text
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'inherit',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '140px',
                    }}
                  >
                    {user?.first_name || user?.username}
                  </Text>
                  <Text
                    style={{
                      fontSize: '12px',
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '140px',
                    }}
                  >
                    {user?.email}
                  </Text>
                </div>
                <DownOutlined style={{ fontSize: '11px', opacity: 0.6 }} />
              </Space>
            </Button>
          </Dropdown>
        </Space>
      </Header>

      {/* Offline Warning */}
      {offlineMode && daysRemaining <= 3 && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            zIndex: 999,
          }}
        >
          <Alert
            message={
              <Space size={10}>
                <WarningOutlined style={{ fontSize: '14px' }} />
                <Text strong style={{ fontSize: '14px' }}>
                  Offline Mode: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                </Text>
              </Space>
            }
            description={
              <Text style={{ fontSize: '13px', lineHeight: '1.5' }}>
                Your offline access will expire soon. Please reconnect to sync your work and
                continue collaborating.
              </Text>
            }
            type="warning"
            banner
            closable
            style={{
              borderRadius: 0,
              padding: '16px 32px',
              borderBottom: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            }}
          />
        </div>
      )}

      <Layout style={{ marginTop: offlineMode && daysRemaining <= 3 ? 112 : 64 }}>
        {/* Sidebar */}
        <Sider
          width={240}
          collapsedWidth={64}
          collapsed={collapsed}
          trigger={null}
          style={{
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: offlineMode && daysRemaining <= 3 ? 112 : 64,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.surfaceLight,
            borderRight: `1px solid ${isDark ? colors.borderDark : colors.border}`,
            transition: 'all 0.2s',
          }}
        >
          <div style={{ padding: '20px 16px' }}>
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
              }}
              items={[
                {
                  key: 'dashboard',
                  icon: <HomeOutlined style={{ fontSize: '16px' }} />,
                  label: collapsed ? null : (
                    <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                      Dashboard
                    </Text>
                  ),
                  title: 'Dashboard',
                  onClick: () => navigate('/dashboard'),
                  style: { height: '44px', marginBottom: '4px', borderRadius: '6px' },
                },
                {
                  key: 'workspaces',
                  icon: <TeamOutlined style={{ fontSize: '16px' }} />,
                  label: collapsed ? null : (
                    <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                      Workspaces
                    </Text>
                  ),
                  title: 'Workspaces',
                  onClick: () => navigate('/workspaces'),
                  style: { height: '44px', marginBottom: '4px', borderRadius: '6px' },
                },
                {
                  key: 'projects',
                  icon: <ProjectOutlined style={{ fontSize: '16px' }} />,
                  label: collapsed ? null : (
                    <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                      Projects
                    </Text>
                  ),
                  title: 'Projects',
                  onClick: () => navigate('/projects'),
                  style: { height: '44px', marginBottom: '4px', borderRadius: '6px' },
                },
                {
                  key: 'browse',
                  icon: <SearchOutlined style={{ fontSize: '16px' }} />,
                  label: collapsed ? null : (
                    <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                      Browse
                    </Text>
                  ),
                  title: 'Browse',
                  onClick: () => navigate('/browse'),
                  disabled: offlineMode,
                  style: { height: '44px', marginBottom: '16px', borderRadius: '6px' },
                },
                {
                  type: 'divider',
                  style: { margin: '0 0 16px 0' },
                },
                {
                  key: 'settings',
                  icon: <SettingOutlined style={{ fontSize: '16px' }} />,
                  label: collapsed ? null : (
                    <Text style={{ fontSize: '14px', fontWeight: 500 }}>
                      Settings
                    </Text>
                  ),
                  title: 'Settings',
                  onClick: () => navigate('/settings'),
                  style: { height: '44px', borderRadius: '6px' },
                },
              ]}
            />
          </div>

          {/* Collapse Toggle */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px',
              borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.surfaceLight,
            }}
          >
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
              <Button
                type="text"
                block
                icon={
                  collapsed ? (
                    <MenuUnfoldOutlined style={{ fontSize: '16px' }} />
                  ) : (
                    <MenuFoldOutlined style={{ fontSize: '16px' }} />
                  )
                }
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  height: '40px',
                  color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  gap: '12px',
                }}
              >
                {!collapsed && <Text style={{ fontSize: '14px' }}>Collapse</Text>}
              </Button>
            </Tooltip>
          </div>
        </Sider>

        {/* Main Content */}
        <Layout
          style={{
            marginLeft: collapsed ? 80 : 240,
            transition: 'margin-left 0.2s',
            height: 'calc(100vh - 60px)',
            overflow: 'hidden',
          }}
        >
          <Content
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default MainLayout;