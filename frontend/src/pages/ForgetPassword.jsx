import { useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import AuthModule from '@/modules/AuthModule';

const ForgetPassword = () => {
  const navigate = useNavigate();

  return (
    <AuthModule
      AUTH_TITLE="Lupa Kata Sandi"
      authContent={
        <Result
          status="404"
          title="Reset Mandiri Tidak Tersedia"
          subTitle="Silakan hubungi Admin Subbagrenmin BID TIK Polda DIY untuk melakukan reset kata sandi akun Anda agar dapat digunakan kembali."
          extra={
            <Button type="primary" size="large" onClick={() => navigate('/login')}>
              Kembali ke Halaman Masuk
            </Button>
          }
        />
      }
    />
  );
};

export default ForgetPassword;
