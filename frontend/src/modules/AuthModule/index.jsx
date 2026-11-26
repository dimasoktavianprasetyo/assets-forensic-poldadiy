import useLanguage from '@/locale/useLanguage';

import { Layout, Col, Divider, Typography } from 'antd';

import AuthLayout from '@/layout/AuthLayout';
import SideContent from './SideContent';

const { Content } = Layout;
const { Title } = Typography;

const AuthModule = ({ authContent, AUTH_TITLE, isForRegistre = false }) => {
  const translate = useLanguage();
  return (
    <AuthLayout sideContent={<SideContent />}>
      <Content
        style={{
          padding: isForRegistre ? '40px 30px 30px' : '100px 30px 30px',
          maxWidth: '440px',
          margin: '0 auto',
        }}
      >
        <Col xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 0 }} span={0}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <img
              src="/Lambang_Polda_DIY.png"
              alt="Lambang Polda DIY"
              style={{ height: 56, width: 'auto', objectFit: 'contain' }}
            />
            <img
              src="/TIK_POLRI.png"
              alt="Logo BID TIK POLRI"
              style={{ height: 56, width: 'auto', objectFit: 'contain' }}
            />
          </div>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 16 }}>
            SIM-ASET BID TIK POLDA DIY
          </Title>
          <div className="space10" />
        </Col>
        <Title level={1}>{translate(AUTH_TITLE)}</Title>

        <Divider />
        <div className="site-layout-content">{authContent}</div>
      </Content>
    </AuthLayout>
  );
};

export default AuthModule;
