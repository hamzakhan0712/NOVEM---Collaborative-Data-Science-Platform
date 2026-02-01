import React, { useState } from 'react';
import { Form, Input, Button,  Alert, Checkbox, Typography, Space } from 'antd';
import { UserOutlined, LockOutlined, WifiOutlined, } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { colors } from '../theme/config';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, isOnline } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (error: any) {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
      }}
    >
      {/* Left Panel - Branding */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 80px',
          backgroundColor: isDark ? colors.backgroundSecondaryDark : colors.backgroundSecondary,
          borderRight: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <div style={{ maxWidth: 480 }}>
          
          {/* Logo */}
          <div style={{ 
            marginBottom: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}>
            <img 
              src="/logo.png" 
              alt="NOVEM Logo" 
              style={{ 
                height: '120px',
                width: 'auto',
                display: 'block',
              }}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <Title
              level={1}
              style={{
                fontSize: 74,
                fontWeight: 700,
                margin: 0,
                background: `linear-gradient(135deg, ${colors.logoCyan} 0%, ${colors.logoCyan} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
              }}
            >
              NOVEM
            </Title>
          </div>

          <Title
            level={2}
            style={{
              fontSize: 32,
              fontWeight: 600,
              marginBottom: 24,
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Local-First Data Science Platform
          </Title>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
              display: 'block',
              marginBottom: 48,
            }}
          >
            Enterprise-grade analytics with complete data sovereignty. Process locally, collaborate globally.
          </Text>

          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.logoCyan,
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 15,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  100% Local Processing
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  All computation happens on your device
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.logoCyan,
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 15,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Offline Capable
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Work seamlessly without internet connectivity
                </Text>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.logoCyan,
                  marginTop: 8,
                  flexShrink: 0,
                }}
              />
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 15,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Real Collaboration
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Share insights while maintaining data privacy
                </Text>
              </div>
            </div>
          </Space>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div
        style={{
          width: 520,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'start',
            padding: '40px 64px',
            minHeight: '100vh',
          }}
        >
          <div style={{ maxWidth: 400, width: '100%' }}>
            <Title level={3} style={{ marginBottom: 8, fontSize: 24 }}>
              Sign In
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: 14,
                display: 'block',
                marginBottom: 32,
              }}
            >
              Access your workspace
            </Text>

            {!isOnline && (
              <Alert
                message="Internet connection required"
                description="Please check your connection and try again."
                type="warning"
                showIcon
                icon={<WifiOutlined />}
                style={{ marginBottom: 24 }}
              />
            )}

            <Form name="login" onFinish={onFinish} layout="vertical" size="large">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Invalid email format' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="name@company.com"
                  disabled={!isOnline}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Password is required' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Enter password"
                  disabled={!isOnline}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Form.Item>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                    Remember me
                  </Checkbox>
                  <Link to="/password-reset" style={{ fontSize: 14, color: colors.error }}>
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!isOnline}
                  block
                  style={{ height: 44, fontWeight: 500 }}
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Don't have an account?{' '}
                <Link to="/register" style={{ fontWeight: 500, color: colors.info }}>
                  Create Account
                </Link>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;