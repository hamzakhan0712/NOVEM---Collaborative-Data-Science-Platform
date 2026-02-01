import React, { useState } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Avatar,
  Upload,
  Typography,
  Divider,
  Row,
  Col,
  message,
  Modal,
} from 'antd';
import {
  UserOutlined,
  CameraOutlined,
  SaveOutlined,
  MailOutlined,
  EnvironmentOutlined,
  LinkOutlined,
  RiseOutlined,
  BankOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';
import { backendAPI } from '../../services/api';
import type { UploadFile, RcFile } from 'antd/es/upload/interface';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ProfileSectionProps {
  profileData: any;
  onUpdate: () => void;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ profileData, onUpdate }) => {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const isDark = theme === 'dark';

  React.useEffect(() => {
    if (profileData) {
      form.setFieldsValue({
        first_name: user?.first_name,
        last_name: user?.last_name,
        email: user?.email,
        bio: profileData.bio,
        organization: profileData.organization,
        job_title: profileData.job_title,
        location: profileData.location,
        website: profileData.website,
      });
    }
  }, [profileData, user, form]);

  const handleProfileUpdate = async (values: any) => {
    try {
      setLoading(true);
      await backendAPI.updateProfile(values);
      
      updateUser({
        first_name: values.first_name,
        last_name: values.last_name,
      });

      setHasUnsavedChanges(false);
      message.success('Profile updated successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      message.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('Image must be smaller than 2MB!');
      return false;
    }
    
    return true;
  };

  const handlePhotoUpload = async (file: RcFile) => {
    try {
      setUploadingPhoto(true);
      const response = await backendAPI.uploadProfilePhoto(file);
      
      updateUser({
        profile_picture: response.user.profile_picture,
      });
      
      message.success('Profile photo updated successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      message.error(error.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
    
    return false; // Prevent default upload behavior
  };

  const handlePhotoRemove = () => {
    Modal.confirm({
      title: 'Remove Profile Photo',
      content: 'Are you sure you want to remove your profile photo?',
      okText: 'Remove',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await backendAPI.deleteProfilePhoto();
          
          updateUser({
            profile_picture: undefined,
          });
          
          message.success('Profile photo removed');
          onUpdate();
        } catch (error: any) {
          console.error('Failed to remove photo:', error);
          message.error('Failed to remove photo');
        }
      },
    });
  };

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Profile Information
        </Title>
        <Text type="secondary">
          Manage your personal information and public profile
        </Text>
      </div>

      {/* Profile Picture */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Avatar
              size={96}
              icon={uploadingPhoto ? <LoadingOutlined /> : <UserOutlined />}
              src={user?.profile_picture}
              style={{
                backgroundColor: colors.logoCyan,
                fontSize: '36px',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: '15px', marginBottom: '8px' }}>
                Profile Picture
              </Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '13px', marginBottom: '16px' }}>
                JPG, PNG or GIF. Max size 2MB. Recommended 400x400px.
              </Text>
              <Space size={12}>
                <Upload
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  customRequest={({ file }) => handlePhotoUpload(file as RcFile)}
                  disabled={uploadingPhoto}
                >
                  <Button 
                    icon={uploadingPhoto ? <LoadingOutlined /> : <CameraOutlined />}
                    loading={uploadingPhoto}
                  >
                    Upload New
                  </Button>
                </Upload>
                {user?.profile_picture && (
                  <Button 
                    danger 
                    icon={<DeleteOutlined />}
                    onClick={handlePhotoRemove}
                    disabled={uploadingPhoto}
                  >
                    Remove
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </Space>
      </Card>

      {/* Basic Information */}
      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleProfileUpdate}
          onValuesChange={() => setHasUnsavedChanges(true)}
        >
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '15px' }}>
              Personal Information
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="First Name"
                  name="first_name"
                  rules={[{ required: true, message: 'Please enter your first name' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="John"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Last Name"
                  name="last_name"
                  rules={[{ required: true, message: 'Please enter your last name' }]}
                >
                  <Input
                    prefix={<UserOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Doe"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Email Address"
              name="email"
              extra="Your email address cannot be changed. Contact support if needed."
            >
              <Input
                prefix={<MailOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                disabled
              />
            </Form.Item>

            <Form.Item
              label="Bio"
              name="bio"
              extra="Brief description about yourself. Visible to team members."
            >
              <TextArea
                rows={4}
                placeholder="Tell us about yourself..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Divider />

            <Text strong style={{ fontSize: '15px', display: 'block', marginBottom: '16px' }}>
              Professional Details
            </Text>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Organization"
                  name="organization"
                >
                  <Input
                    prefix={<BankOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Company or organization name"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Job Title"
                  name="job_title"
                >
                  <Input
                    prefix={<RiseOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="Your role or position"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Location"
                  name="location"
                >
                  <Input
                    prefix={<EnvironmentOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="City, Country"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Website"
                  name="website"
                  rules={[{ type: 'url', message: 'Please enter a valid URL' }]}
                >
                  <Input
                    prefix={<LinkOutlined style={{ color: isDark ? colors.textTertiaryDark : colors.textTertiary }} />}
                    placeholder="https://example.com"
                  />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: `1px solid ${isDark ? colors.borderDark : colors.border}` }}>
              <Button
                onClick={() => {
                  form.resetFields();
                  setHasUnsavedChanges(false);
                }}
                disabled={!hasUnsavedChanges}
              >
                Discard Changes
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={loading}
                disabled={!hasUnsavedChanges}
              >
                Save Changes
              </Button>
            </div>
          </Space>
        </Form>
      </Card>
    </Space>
  );
};

export default ProfileSection;