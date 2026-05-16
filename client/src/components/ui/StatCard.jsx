import { Card } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, MinusOutlined } from '@ant-design/icons';

/**
 * StatCard — matches the reference design:
 *   [Icon sq]         ↑ 12%
 *
 *   Label
 *   45,231 (large)
 *
 * Props:
 *   title     — label text
 *   value     — number or string
 *   icon      — React node (Ant Design icon)
 *   color     — icon square accent color (e.g. '#3b82f6')
 *   trend     — number (positive = up, negative = down, 0/undefined = flat)
 *   suffix    — optional suffix string (e.g. 'ETB')
 *   onClick   — optional click handler
 */
export default function StatCard({ title, value, icon, color = '#3b82f6', trend, suffix, onClick }) {
  const trendAbs = trend !== undefined ? Math.abs(trend) : null;
  const isUp    = trend > 0;
  const isDown  = trend < 0;
  const isFlat  = trend === 0 || trend === undefined;

  return (
    <Card
      onClick={onClick}
      style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.18s, transform 0.18s',
      }}
      styles={{ body: { padding: '20px 22px' } }}
      className={onClick ? 'ei-card-hover' : ''}
    >
      {/* Top row: icon + trend */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        {/* Icon square */}
        <div style={{
          width: 46, height: 46, borderRadius: 10, flexShrink: 0,
          background: `${color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
        </div>

        {/* Trend badge */}
        {trendAbs !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 12, fontWeight: 600,
            color: isUp ? '#22c55e' : isDown ? '#ef4444' : '#9ca3af',
          }}>
            {isUp   && <ArrowUpOutlined   style={{ fontSize: 10 }} />}
            {isDown && <ArrowDownOutlined style={{ fontSize: 10 }} />}
            {isFlat && <MinusOutlined     style={{ fontSize: 10 }} />}
            {trendAbs !== null ? `${trendAbs}%` : '—'}
          </div>
        )}
      </div>

      {/* Label */}
      <div style={{ color: '#6b7280', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>
        {title}
      </div>

      {/* Value */}
      <div style={{ color: '#111827', fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span style={{ fontSize: 14, fontWeight: 500, color: '#6b7280', marginLeft: 5 }}>{suffix}</span>}
      </div>
    </Card>
  );
}
