import { Layout, Typography } from 'antd';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function SideContent() {
  return (
    <Content
      style={{
        padding: '150px 30px 30px',
        width: '100%',
        maxWidth: '480px',
        margin: '0 auto',
      }}
      className="sideContent"
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <img
            src="/Lambang_Polda_DIY.png"
            alt="Lambang Polda DIY"
            style={{ height: 76, width: 'auto', objectFit: 'contain' }}
          />
          <img
            src="/TIK_POLRI.png"
            alt="Logo BID TIK POLRI"
            style={{ height: 76, width: 'auto', objectFit: 'contain' }}
          />
        </div>

        <Title level={1} style={{ fontSize: 28, marginBottom: 12 }}>
          SIM-ASET BID TIK POLDA DIY
        </Title>
        <Text style={{ fontSize: 15, display: 'block', lineHeight: 1.6 }}>
          Sistem Informasi Manajemen Aset TIK (BMN) dengan Penerapan Metode <strong>K-Means Clustering</strong> untuk Deteksi Dini Indikasi <em>Fraud</em>.
        </Text>

        <div className="space20"></div>
      </div>
    </Content>
  );
}
