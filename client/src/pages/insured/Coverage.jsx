import { useEffect, useState } from 'react';
import { Card, Descriptions, Tag, Typography, Space, Spin, Progress, Row, Col, Divider } from 'antd';
import api from '../../api';

const { Title, Text } = Typography;

export default function InsuredCoverage() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get('/enrollments', { params: { status: 'active' } })
      .then(async (r) => {
        const list = Array.isArray(r.data.enrollments) ? r.data.enrollments : [];
        const details = await Promise.all(list.map(e => api.get(`/enrollments/${e._id}`).then(d => d.data.enrollment)));
        setEnrollments(details);
      })
      .catch(err => console.error('Coverage load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  if (!enrollments.length) return (
    <Card style={{ borderRadius: 12 }}>
      <Title level={4}>My Benefits</Title>
      <Text type="secondary">You are not currently enrolled in any active policy.</Text>
    </Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#111827' }}>My Benefits & Coverage</Title>
          <span style={{ color: '#6b7280', fontSize: 14 }}>View your active coverage details and benefit limits.</span>
        </div>
      </div>

      {enrollments.map(enrollment => (
        <Card key={enrollment._id} style={{ borderRadius: 12 }}
          title={<Space><Tag color="blue">{enrollment.tier?.name || 'Standard'}</Tag><Text strong>{enrollment.product?.name}</Text></Space>}>

          <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Enrollment #">{enrollment.enrollmentNumber}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color="success">Active</Tag></Descriptions.Item>
            <Descriptions.Item label="Valid Until">{new Date(enrollment.endDate).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Product Type"><Tag>{enrollment.product?.productType}</Tag></Descriptions.Item>
          </Descriptions>

          <Divider>Coverage Details</Divider>
          {enrollment.tier?.coverages?.length > 0 ? (
            <Row gutter={[12, 12]}>
              {enrollment.tier.coverages.map((tc, i) => {
                const cov = tc.coverage;
                const limit = tc.customLimit || cov?.limits?.annual || 0;
                return (
                  <Col xs={24} md={12} key={i}>
                    <Card size="small" style={{ background: '#f9fafb', borderRadius: 8, border: '1px solid #e8edf3' }}>
                      <Text strong style={{ fontSize: 13 }}>{cov?.name}</Text>
                      <div style={{ marginTop: 4, color: '#6b7280', fontSize: 12 }}>{cov?.description}</div>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12 }}>Annual Limit</Text>
                          <Text strong style={{ fontSize: 12 }}>{limit ? `${limit.toLocaleString()} ETB` : '—'}</Text>
                        </div>
                        {cov?.limits?.perClaim && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12 }}>Per Claim</Text>
                            <Text style={{ fontSize: 12 }}>{cov.limits.perClaim.toLocaleString()} ETB</Text>
                          </div>
                        )}
                        {cov?.deductible > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12 }}>Deductible</Text>
                            <Text style={{ fontSize: 12 }}>{cov.deductible.toLocaleString()} ETB</Text>
                          </div>
                        )}
                        {cov?.copaymentPct > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12 }}>Your Co-pay</Text>
                            <Text style={{ fontSize: 12 }}>{cov.copaymentPct}%</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Text type="secondary">No detailed coverage information available.</Text>
          )}
        </Card>
      ))}
    </div>
  );
}
