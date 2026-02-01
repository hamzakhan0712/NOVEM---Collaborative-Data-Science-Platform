import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography, Space, Row, Col, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, WifiOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import ErrorAlert from '../components/common/ErrorAlert';
import { colors } from '../theme/config';


const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<any>(null);
  const { register, isOnline } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
    return Math.min(strength, 100);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return colors.error;
    if (passwordStrength < 70) return colors.warning;
    return colors.success;
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await register(values);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err);
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
            Join the Platform
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
            Create your account and start analyzing data with complete privacy and control.
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
                  Complete Data Control
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Your data never leaves your device
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
                  Advanced Analytics
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  EDA, ML, forecasting, and more
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
                  Team Collaboration
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

      {/* Right Panel - Registration Form */}
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
              Create Account
            </Title>
            <Text
              type="secondary"
              style={{
                fontSize: 14,
                display: 'block',
                marginBottom: 32,
              }}
            >
              Get started with NOVEM
            </Text>

            {error && (
              <ErrorAlert
                error={error}
                title="Registration Failed"
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 24 }}
              />
            )}

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

            <Form name="register" onFinish={onFinish} layout="vertical" size="large">
              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { required: true, message: 'Email is required' },
                  { type: 'email', message: 'Invalid email format' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="name@company.com"
                  disabled={!isOnline}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Form.Item
                label="Username"
                name="username"
                rules={[
                  { required: true, message: 'Username is required' },
                  { min: 3, message: 'Minimum 3 characters' },
                  {
                    pattern: /^[a-zA-Z0-9_]+$/,
                    message: 'Letters, numbers, and underscores only',
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="username"
                  disabled={!isOnline}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="First Name"
                    name="first_name"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="John" disabled={!isOnline} style={{ height: 44 }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Last Name"
                    name="last_name"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="Doe" disabled={!isOnline} style={{ height: 44 }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="Password"
                name="password"
                rules={[
                  { required: true, message: 'Password is required' },
                  { min: 8, message: 'Minimum 8 characters' },
                  {
                    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                    message: 'Must contain uppercase, lowercase, and number',
                  },
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Create password"
                  disabled={!isOnline}
                  onChange={(e) => setPasswordStrength(calculatePasswordStrength(e.target.value))}
                  style={{ height: 44 }}
                />
              </Form.Item>

              {passwordStrength > 0 && (
                <div style={{ marginTop: -16, marginBottom: 16 }}>
                  <Progress
                    percent={passwordStrength}
                    strokeColor={getPasswordStrengthColor()}
                    showInfo={false}
                    strokeWidth={4}
                    style={{ marginBottom: 4 }}
                  />
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: 12,
                      color: getPasswordStrengthColor(),
                    }}
                  >
                    {passwordStrength < 40 ? 'Weak' : passwordStrength < 70 ? 'Medium' : 'Strong'} password
                  </Text>
                </div>
              )}

              <Form.Item
                label="Confirm Password"
                name="password_confirm"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirm password' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Confirm password"
                  disabled={!isOnline}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={!isOnline}
                  block
                  style={{ height: 44, fontWeight: 500 }}
                >
                  Create Account
                </Button>
              </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Already have an account?{' '}
                <Link to="/login" style={{ fontWeight: 500, color: colors.info }}>
                  Sign In
                </Link>
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;