import 'antd/dist/reset.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import App from './App';
import './index.css';

const { defaultAlgorithm } = theme;

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    theme={{
      algorithm: defaultAlgorithm,
      token: {
        colorPrimary: '#22c55e',
        colorBgBase: '#f5f6fa',
        colorBgContainer: '#ffffff',
        colorBgElevated: '#ffffff',
        colorBorder: '#e8edf3',
        colorBorderSecondary: '#eff2f7',
        borderRadius: 8,
        borderRadiusLG: 12,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 14,
        colorText: '#111827',
        colorTextSecondary: '#6b7280',
        colorTextTertiary: '#9ca3af',
        colorSuccess: '#22c55e',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        colorInfo: '#3b82f6',
        boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        boxShadowSecondary: '0 1px 8px rgba(0,0,0,0.06)',
      },
      components: {
        Layout: { siderBg: '#111417', headerBg: '#ffffff', bodyBg: '#f5f6fa', triggerBg: '#111417' },
        Menu: { darkItemBg: 'transparent', darkSubMenuItemBg: 'transparent', itemBg: 'transparent', popupBg: '#111417', darkItemSelectedBg: 'rgba(34,197,94,0.15)', darkItemSelectedColor: '#22c55e' },
        Card: { colorBgContainer: '#ffffff', boxShadowTertiary: '0 1px 8px rgba(0,0,0,0.06)' },
        Table: { colorBgContainer: '#ffffff', headerBg: '#f9fafb', rowHoverBg: '#f5fdf8', borderColor: '#e8edf3' },
        Modal: { contentBg: '#ffffff', headerBg: '#ffffff', footerBg: '#ffffff' },
        Drawer: { colorBgElevated: '#ffffff' },
        Input: { colorBgContainer: '#ffffff', activeBorderColor: '#22c55e' },
        Select: { colorBgContainer: '#ffffff', colorBgElevated: '#ffffff' },
        DatePicker: { colorBgContainer: '#ffffff', colorBgElevated: '#ffffff' },
        InputNumber: { colorBgContainer: '#ffffff' },
        Form: { labelColor: '#6b7280' },
        Button: { defaultBg: '#ffffff', defaultBorderColor: '#e2e8f0', defaultColor: '#374151' },
        Tag: { defaultBg: '#f0fdf4', defaultColor: '#374151' },
        Statistic: { titleFontSize: 13 },
        Steps: { colorPrimary: '#22c55e' },
        Timeline: { dotBg: '#ffffff' },
        Descriptions: { labelBg: '#f9fafb' },
        Divider: { colorSplit: '#e8edf3' },
        Progress: { defaultColor: '#22c55e', remainingColor: '#e8edf3' },
        Tabs: { cardBg: '#f9fafb', itemSelectedColor: '#22c55e' },
        Badge: { colorBgContainer: '#ffffff' },
        Avatar: { colorBgBase: '#f0fdf4' },
        Tooltip: { colorBgSpotlight: '#1f2937' },
        Popconfirm: { colorBgElevated: '#ffffff' },
        Dropdown: { colorBgElevated: '#ffffff' },
        Checkbox: { colorBgContainer: '#ffffff' },
        Radio: { colorBgContainer: '#ffffff', buttonBg: '#ffffff', buttonCheckedBg: '#22c55e' },
        Alert: { colorInfoBg: '#eff6ff', colorSuccessBg: '#f0fdf4', colorWarningBg: '#fffbeb', colorErrorBg: '#fef2f2' },
      },
    }}
  >
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);
