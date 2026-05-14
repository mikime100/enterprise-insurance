import 'antd/dist/reset.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import App from './App';
import './index.css';

const { darkAlgorithm } = theme;

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    theme={{
      algorithm: darkAlgorithm,
      token: {
        colorPrimary: '#3b82f6',
        colorBgBase: '#09111e',
        colorBgContainer: '#0d1a2d',
        colorBgElevated: '#122036',
        colorBorder: '#1a2d45',
        colorBorderSecondary: '#142236',
        borderRadius: 8,
        borderRadiusLG: 12,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 14,
        colorText: '#e2e8f0',
        colorTextSecondary: '#8b9ab0',
        colorTextTertiary: '#4f6272',
        colorSuccess: '#10b981',
        colorWarning: '#f59e0b',
        colorError: '#ef4444',
        colorInfo: '#3b82f6',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        boxShadowSecondary: '0 2px 12px rgba(0,0,0,0.3)',
      },
      components: {
        Layout: { siderBg: '#060e1a', headerBg: '#0d1a2d', bodyBg: '#09111e', triggerBg: '#060e1a' },
        Menu: { darkItemBg: 'transparent', darkSubMenuItemBg: 'transparent', itemBg: 'transparent', popupBg: '#0d1a2d' },
        Card: { colorBgContainer: '#0d1a2d', headerBg: '#0d1a2d', boxShadowTertiary: '0 2px 12px rgba(0,0,0,0.3)' },
        Table: { colorBgContainer: '#0d1a2d', headerBg: '#0a1628', rowHoverBg: '#122036', borderColor: '#1a2d45' },
        Modal: { contentBg: '#0d1a2d', headerBg: '#0d1a2d', footerBg: '#0d1a2d' },
        Drawer: { colorBgElevated: '#0d1a2d' },
        Input: { colorBgContainer: '#060e1a', activeBorderColor: '#3b82f6' },
        Select: { colorBgContainer: '#060e1a', colorBgElevated: '#0d1a2d' },
        DatePicker: { colorBgContainer: '#060e1a', colorBgElevated: '#0d1a2d' },
        InputNumber: { colorBgContainer: '#060e1a' },
        Form: { labelColor: '#8b9ab0' },
        Button: { defaultBg: '#122036', defaultBorderColor: '#1a2d45', defaultColor: '#e2e8f0' },
        Tag: { defaultBg: '#122036', defaultColor: '#8b9ab0' },
        Statistic: { titleFontSize: 13 },
        Steps: { colorPrimary: '#3b82f6' },
        Timeline: { dotBg: '#0d1a2d' },
        Descriptions: { labelBg: '#0a1628' },
        Divider: { colorSplit: '#1a2d45' },
        Progress: { defaultColor: '#3b82f6', remainingColor: '#1a2d45' },
        Tabs: { cardBg: '#0a1628', itemSelectedColor: '#3b82f6' },
        Badge: { colorBgContainer: '#0d1a2d' },
        Avatar: { colorBgBase: '#122036' },
        Tooltip: { colorBgSpotlight: '#122036' },
        Popconfirm: { colorBgElevated: '#0d1a2d' },
        Dropdown: { colorBgElevated: '#0d1a2d' },
        Checkbox: { colorBgContainer: '#060e1a' },
        Radio: { colorBgContainer: '#060e1a', buttonBg: '#060e1a', buttonCheckedBg: '#1d4ed8' },
        Alert: { colorInfoBg: '#0a1e3d', colorSuccessBg: '#052e16', colorWarningBg: '#451a03', colorErrorBg: '#450a0a' },
      },
    }}
  >
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>
);
