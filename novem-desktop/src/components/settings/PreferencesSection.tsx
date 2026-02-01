import React from 'react';
import { Card, Select, Space, Typography, Divider } from 'antd';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../theme/config';

const { Title, Text } = Typography;

const PreferencesSection: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
          Application Preferences
        </Title>
        <Text type="secondary">
          Customize your application experience
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
              Appearance
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
              <Text strong style={{ fontSize: '14px' }}>Theme</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Choose your preferred color theme
              </Text>
            </Space>
            <Select
              value={theme}
              onChange={toggleTheme}
              style={{ width: 140 }}
            >
              <Select.Option value="light">Light</Select.Option>
              <Select.Option value="dark">Dark</Select.Option>
            </Select>
          </div>

          <Divider />

          <div>
            <Text strong style={{ fontSize: '15px' }}>
              Language & Region
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
              <Text strong style={{ fontSize: '14px' }}>Language</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Select your preferred interface language
              </Text>
            </Space>
            <Select defaultValue="en" style={{ width: 140 }}>
              <Select.Option value="en">English</Select.Option>
              <Select.Option value="es">Español</Select.Option>
              <Select.Option value="fr">Français</Select.Option>
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
              <Text strong style={{ fontSize: '14px' }}>Timezone</Text>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Detected from your system settings
              </Text>
            </Space>
            <Text code style={{ fontSize: '13px' }}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
          </div>
        </Space>
      </Card>
    </Space>
  );
};

export default PreferencesSection;