import React from 'react';
import { Card, Button, Switch, Select, Space, Typography, Divider } from 'antd';
import { DownloadOutlined, ClearOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Title, Text } = Typography;

const DataSection: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Data & Privacy
        </Title>
        <Text type="secondary">
          Manage your data and privacy settings
        </Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: isDark ? colors.backgroundPrimaryDark : colors.surfaceLight,
          border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Data Management
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Download Your Data</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Export all your account data in JSON format
              </Text>
            </Space>
            <Button icon={<DownloadOutlined />}>Request Export</Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Clear Cache</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Clear locally stored temporary data
              </Text>
            </Space>
            <Button icon={<ClearOutlined />}>Clear Cache</Button>
          </div>

          <Divider />

          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Privacy Controls
            </Text>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Profile Visibility</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Control who can view your profile information
              </Text>
            </Space>
            <Select defaultValue="public" style={{ width: 140 }}>
              <Select.Option value="public">Public</Select.Option>
              <Select.Option value="team">Team Only</Select.Option>
              <Select.Option value="private">Private</Select.Option>
            </Select>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? colors.borderDark : colors.border}`,
              backgroundColor: isDark ? colors.backgroundTertiaryDark : colors.backgroundTertiary,
            }}
          >
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: '14px' }}>Activity Status</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Show when you're currently online
              </Text>
            </Space>
            <Switch defaultChecked />
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default DataSection;