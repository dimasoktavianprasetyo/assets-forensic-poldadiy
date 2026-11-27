import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'antd';
import { CloseOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { useSecureNavigate } from '@/utils/urlSecurity';

const ROLE_INTROS = {
  admin_subbagrenmin: {
    label: 'Admin Subbagrenmin',
    text: 'Kelola inventaris aset BMN, verifikasi sirkulasi BAST, pantau pemeliharaan, dan cetak laporan resmi BID TIK.',
    cta: 'Kelola Aset TIK',
    path: '/aset-tik',
  },
  operator_teknisi: {
    label: 'Operator / Teknisi',
    text: 'Verifikasi pengajuan BAST peminjaman, catat diagnosis tiket kerusakan, dan lakukan uji kelayakan teknis (QC).',
    cta: 'Cek Sirkulasi & BAST',
    path: '/sirkulasi',
  },
  satker: {
    label: 'Satker / Personel',
    text: 'Ajukan peminjaman atau mutasi perangkat TIK dan pantau progres laporan kerusakan secara transparan.',
    cta: 'Ajukan Peminjaman',
    path: '/sirkulasi',
  },
  pengawas_internal: {
    label: 'Pengawas Internal',
    text: 'Jalankan Engine K-Means (K=3) untuk mendeteksi anomali pemeliharaan dan tindak lanjuti tiket Early Warning.',
    cta: 'Buka Analitik K-Means',
    path: '/kmeans-analytics',
  },
  kabid_tik: {
    label: 'Kepala Bidang TIK',
    text: 'Pantau ringkasan eksekutif nilai buku BMN, temuan audit investigasi, dan laporan manajerial BID TIK Polda DIY.',
    cta: 'Lihat Early Warning',
    path: '/early-warning',
  },
};

export default function WelcomeGreetingWidget() {
  const navigate = useSecureNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [closed, setClosed] = useState(() => sessionStorage.getItem('sim_aset_greeting_closed') === '1');

  if (closed || !currentAdmin?.name) return null;

  const roleCode = currentAdmin?.role || 'admin_subbagrenmin';
  const info = ROLE_INTROS[roleCode] || ROLE_INTROS.admin_subbagrenmin;

  const handleClose = () => {
    sessionStorage.setItem('sim_aset_greeting_closed', '1');
    setClosed(true);
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 22,
        bottom: 20,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        maxWidth: 'calc(100vw - 24px)',
      }}
    >
      <img
        src="/Maskot_Polri.png"
        alt="Maskot Polri"
        style={{
          width: 116,
          height: 116,
          objectFit: 'contain',
          flexShrink: 0,
          marginRight: -18,
          marginBottom: -4,
          zIndex: 2,
          filter: 'drop-shadow(0 8px 16px rgba(15, 23, 42, 0.22))',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: 285,
          maxWidth: 'calc(100vw - 130px)',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 12,
          boxShadow: '0 10px 28px rgba(15, 23, 42, 0.16)',
          padding: '14px 16px 14px 24px',
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={handleClose}
          title="Tutup sapaan"
          style={{ position: 'absolute', top: 8, right: 8, color: '#64748b' }}
        />

        <div style={{ paddingRight: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>
            Halo, {currentAdmin.name}!
          </div>
          <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
            {info.text}
          </div>
          <Button
            type="primary"
            size="small"
            icon={<ArrowRightOutlined />}
            onClick={() => {
              handleClose();
              navigate(info.path);
            }}
          >
            {info.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}

