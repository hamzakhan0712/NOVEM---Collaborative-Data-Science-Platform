import React, { useState } from 'react';
import {
  Button,
  Form,
  Input,
  Select,
  Typography,
  Space,
  message,
  Steps,
  Row,
  Col,
} from 'antd';
import {
  TeamOutlined,
  CheckCircleOutlined,
  LockOutlined,
  GlobalOutlined,
  EyeOutlined,
  BankOutlined,
  EnvironmentOutlined,
  IdcardOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../theme/config';
import { backendAPI } from '../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const OnboardingPage: React.FC = () => {
  const [form] = Form.useForm();
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const isDark = theme === 'dark';

  const steps = [
    {
      title: 'Profile',
      description: 'Your information',
    },
    {
      title: 'Organization',
      description: 'Work details',
    },
    {
      title: 'Workspace',
      description: 'Setup workspace',
    },
  ];

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        await form.validateFields(['first_name', 'last_name']);
      } else if (currentStep === 1) {
        await form.validateFields(['organization', 'job_title', 'location']);
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      // Validation failed
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const allValues = await form.validateFields();
      setLoading(true);

      const profileData = {
        first_name: allValues.first_name,
        last_name: allValues.last_name,
        bio: allValues.bio || '',
        organization: allValues.organization,
        job_title: allValues.job_title,
        location: allValues.location,
      };

      if (!profileData.first_name || !profileData.last_name || 
          !profileData.organization || !profileData.job_title || !profileData.location) {
        message.error('Please complete all required fields in previous steps');
        setLoading(false);
        if (!profileData.first_name || !profileData.last_name) {
          setCurrentStep(0);
        } else {
          setCurrentStep(1);
        }
        return;
      }

      await completeOnboarding(profileData);

      const workspaceData = {
        name: allValues.workspace_name,
        workspace_type: allValues.workspace_type,
        visibility: allValues.visibility,
        description: allValues.workspace_description || '',
        allow_member_project_creation: true,
      };
      
      await backendAPI.createWorkspace(workspaceData);

      setCompleted(true);
      message.success('Setup completed successfully');

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (err: any) {
      if (err.errorFields) {
        message.error('Please complete all required fields');
        return;
      }

      const errorMessage = err.response?.data?.error 
        || err.response?.data?.name?.[0]
        || err.response?.data?.first_name?.[0]
        || err.response?.data?.organization?.[0]
        || err.response?.data?.detail
        || err.message
        || 'Failed to complete setup';
      
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundSecondary,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            textAlign: 'center',
            padding: '48px 24px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: isDark 
                ? colors.backgroundTertiaryDark
                : colors.backgroundTertiary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <CheckCircleOutlined
              style={{
                fontSize: '40px',
                color: colors.logoCyan,
              }}
            />
          </div>
          <Title 
            level={2} 
            style={{ 
              marginBottom: '12px',
              fontWeight: 600,
              color: isDark ? colors.textPrimaryDark : colors.textPrimary,
            }}
          >
            Setup Complete
          </Title>
          <Text
            style={{
              fontSize: '15px',
              color: isDark ? colors.textSecondaryDark : colors.textSecondary,
            }}
          >
            Taking you to your dashboard...
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.backgroundPrimary,
      }}
    >
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
                color: colors.logoCyan,
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
            Welcome aboard!
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
            Let's set up your account and create your first workspace to get started with NOVEM.
          </Text>

          <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                  Complete Control
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Your data stays on your device
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
                  Share insights while maintaining privacy
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
                  EDA, ML, forecasting and more
                </Text>
              </div>
            </div>
          </Space>
        </div>
      </div>

      <div
        style={{
          width: 600,
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
            padding: '30px 64px',
            minHeight: '100vh',
          }}
        >
          <div style={{ marginBottom: 48 }}>
            <Text
              strong
              style={{
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                display: 'block',
                marginBottom: 16,
              }}
            >
              Progress
            </Text>
            <Steps
              current={currentStep}
              direction="horizontal"
              items={steps.map((step, index) => ({
                title: (
                  <Text
                    strong={index === currentStep}
                    style={{
                      fontSize: 15,
                      color: index === currentStep
                        ? (isDark ? colors.textPrimaryDark : colors.textPrimary)
                        : (isDark ? colors.textSecondaryDark : colors.textSecondary),
                    }}
                  >
                    {step.title}
                  </Text>
                ),
                description: (
                  <Text
                    style={{
                      fontSize: 13,
                      color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                    }}
                  >
                    {step.description}
                  </Text>
                ),
              }))}
            />
          </div>

          <Form
            form={form}
            layout="vertical"
            size="large"
            initialValues={{
              first_name: user?.first_name || '',
              last_name: user?.last_name || '',
              visibility: 'private',
            }}
            style={{ maxWidth: 480, width: '100%' }}
          >
            <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
              <div style={{ marginBottom: 32 }}>
                <Title 
                  level={3} 
                  style={{ 
                    marginBottom: 8,
                    fontSize: 24,
                    fontWeight: 600,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  }}
                >
                  Your Profile
                </Title>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Tell us about yourself
                </Text>
              </div>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="first_name"
                    label="First Name"
                    rules={[
                      { required: true, message: 'Required' },
                      { min: 2, message: 'Minimum 2 characters' },
                    ]}
                  >
                    <Input 
                      placeholder="John"
                      style={{ height: 44 }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="last_name"
                    label="Last Name"
                    rules={[
                      { required: true, message: 'Required' },
                      { min: 2, message: 'Minimum 2 characters' },
                    ]}
                  >
                    <Input 
                      placeholder="Doe"
                      style={{ height: 44 }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="bio"
                label={
                  <span>
                    Bio <Text type="secondary">(Optional)</Text>
                  </span>
                }
              >
                <TextArea
                  rows={4}
                  placeholder="Brief description about yourself..."
                  maxLength={500}
                  showCount
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </div>

            <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
              <div style={{ marginBottom: 32 }}>
                <Title 
                  level={3} 
                  style={{ 
                    marginBottom: 8,
                    fontSize: 24,
                    fontWeight: 600,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  }}
                >
                  Organization Details
                </Title>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Your professional information
                </Text>
              </div>

              <Form.Item
                name="organization"
                label="Organization"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input 
                  placeholder="Acme Corporation"
                  prefix={<BankOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="job_title"
                    label="Job Title"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input 
                      placeholder="Data Scientist"
                      prefix={<IdcardOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                      style={{ height: 44 }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="location"
                    label="Location"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input 
                      placeholder="San Francisco, CA"
                      prefix={<EnvironmentOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                      style={{ height: 44 }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
              <div style={{ marginBottom: 32 }}>
                <Title 
                  level={3} 
                  style={{ 
                    marginBottom: 8,
                    fontSize: 24,
                    fontWeight: 600,
                    color: isDark ? colors.textPrimaryDark : colors.textPrimary,
                  }}
                >
                  Create Workspace
                </Title>
                <Text
                  style={{
                    fontSize: 14,
                    color: isDark ? colors.textSecondaryDark : colors.textSecondary,
                  }}
                >
                  Set up your team or personal workspace
                </Text>
              </div>

              <Form.Item
                name="workspace_name"
                label="Workspace Name"
                rules={[
                  { required: true, message: 'Required' },
                  { min: 3, message: 'Minimum 3 characters' },
                ]}
              >
                <Input
                  placeholder="My Analytics Team"
                  prefix={<TeamOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                  style={{ height: 44 }}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="workspace_type"
                    label="Type"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Select placeholder="Select type" style={{ height: 44 }}>
                      <Option value="personal">Personal</Option>
                      <Option value="team">Team</Option>
                      <Option value="organization">Organization</Option>
                      <Option value="client">Client</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="visibility"
                    label="Visibility"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Select style={{ height: 44 }}>
                      <Option value="private">
                        <Space>
                          <LockOutlined />
                          Private
                        </Space>
                      </Option>
                      <Option value="internal">
                        <Space>
                          <EyeOutlined />
                          Internal
                        </Space>
                      </Option>
                      <Option value="public">
                        <Space>
                          <GlobalOutlined />
                          Public
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="workspace_description"
                label={
                  <span>
                    Description <Text type="secondary">(Optional)</Text>
                  </span>
                }
              >
                <TextArea
                  rows={4}
                  placeholder="What will this workspace be used for..."
                  maxLength={500}
                  showCount
                  style={{ resize: 'none' }}
                />
              </Form.Item>
            </div>

            <div
              style={{
                marginTop: 40,
                paddingTop: 24,
                borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Button
                size="large"
                onClick={handlePrev}
                disabled={currentStep === 0}
                icon={<ArrowLeftOutlined />}
                style={{
                  minWidth: 120,
                  height: 44,
                }}
              >
                Previous
              </Button>

              {currentStep < 2 ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleNext}
                  iconPosition="end"
                  icon={<ArrowRightOutlined />}
                  style={{
                    minWidth: 120,
                    height: 44,
                    fontWeight: 500,
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleSubmit}
                  loading={loading}
                  iconPosition="end"
                  icon={<CheckCircleOutlined />}
                  style={{
                    minWidth: 120,
                    height: 44,
                    fontWeight: 500,
                  }}
                >
                  Complete
                </Button>
              )}
            </div>

            <div
              style={{
                marginTop: 24,
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: isDark ? colors.textTertiaryDark : colors.textTertiary,
                }}
              >
                Step {currentStep + 1} of {steps.length}
              </Text>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;