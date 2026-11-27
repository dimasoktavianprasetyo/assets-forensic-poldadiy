import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';
import { useSelector } from 'react-redux';

import { useAppContext } from '@/context/appContext';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import useResponsive from '@/hooks/useResponsive';
import { useSecureNavigate } from '@/utils/urlSecurity';

import {
  DashboardOutlined,
  MenuOutlined,
  ReconciliationOutlined,
  DatabaseOutlined,
  LaptopOutlined,
  SwapOutlined,
  ToolOutlined,
  RadarChartOutlined,
  AlertOutlined,
  FilePdfOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

export default function Navigation() {
  const { isMobile } = useResponsive();
  return isMobile ? <MobileSidebar /> : <Sidebar collapsible={false} />;
}

const MENU_PATHS = {
  dashboard: '/',
  'master/satker': '/master/satker',
  'master/personel': '/master/personel',
  'master/kategori': '/master/kategori',
  'master/lokasi': '/master/lokasi',
  'master/vendor': '/master/vendor',
  'aset-tik': '/aset-tik',
  sirkulasi: '/sirkulasi',
  pemeliharaan: '/pemeliharaan',
  rekonsiliasi: '/rekonsiliasi',
  'kmeans-analytics': '/kmeans-analytics',
  'early-warning': '/early-warning',
  laporan: '/laporan',
  'manajemen-user': '/manajemen-user',
};

function Sidebar({ collapsible, isMobile = false }) {
  const location = useLocation();
  const navigate = useSecureNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const role = currentAdmin?.role || 'owner';

  const { state: stateApp, appContextAction } = useAppContext();
  const { isNavMenuClose } = stateApp;
  const { navMenu } = appContextAction;
  const [showLogoApp, setLogoApp] = useState(isNavMenuClose);
  const [currentPath, setCurrentPath] = useState(location.pathname.slice(1));

  const canAccess = (allowedRoles) => role === 'owner' || allowedRoles.includes(role);

  const rawItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'masterData',
      icon: <DatabaseOutlined />,
      label: 'Master Data BMN',
      roles: ['admin_subbagrenmin'],
      children: [
        { key: 'master/satker', label: 'Satker' },
        { key: 'master/personel', label: 'Personel' },
        { key: 'master/kategori', label: 'Kategori & Sub-Kategori' },
        { key: 'master/lokasi', label: 'Lokasi Ruangan' },
        { key: 'master/vendor', label: 'Vendor Rekanan' },
      ],
    },
    {
      key: 'aset-tik',
      icon: <LaptopOutlined />,
      label: 'Aset TIK & Depresiasi',
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'sirkulasi',
      icon: <SwapOutlined />,
      label: 'Sirkulasi & BAST',
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal'],
    },
    {
      key: 'pemeliharaan',
      icon: <ToolOutlined />,
      label: 'Pemeliharaan & QC',
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal'],
    },
    {
      key: 'rekonsiliasi',
      icon: <ReconciliationOutlined />,
      label: 'Rekonsiliasi BMN',
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'kmeans-analytics',
      icon: <RadarChartOutlined />,
      label: 'Analitik K-Means',
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'early-warning',
      icon: <AlertOutlined />,
      label: 'Early Warning & Audit',
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'laporan',
      icon: <FilePdfOutlined />,
      label: 'Laporan PDF Resmi',
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'manajemen-user',
      icon: <TeamOutlined />,
      label: 'Manajemen User & Audit Trail',
      roles: ['admin_subbagrenmin'],
    },
  ];

  const items = rawItems
    .filter((item) => canAccess(item.roles))
    .map(({ roles, ...menuItem }) => menuItem);

  useEffect(() => {
    if (location && currentPath !== location.pathname) {
      if (location.pathname === '/') {
        setCurrentPath('dashboard');
      } else {
        setCurrentPath(location.pathname.slice(1));
      }
    }
  }, [location, currentPath]);

  useEffect(() => {
    if (isNavMenuClose) {
      setLogoApp(isNavMenuClose);
    }
    const timer = setTimeout(() => {
      if (!isNavMenuClose) {
        setLogoApp(isNavMenuClose);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [isNavMenuClose]);

  const onCollapse = () => {
    navMenu.collapse();
  };

  return (
    <Sider
      collapsible={collapsible}
      collapsed={collapsible ? isNavMenuClose : collapsible}
      onCollapse={onCollapse}
      className="navigation"
      width={256}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: isMobile ? 'absolute' : 'relative',
        bottom: '20px',
        ...(!isMobile && {
          background: 'none',
          border: 'none',
          left: '20px',
          top: '20px',
          borderRadius: '8px',
        }),
      }}
      theme={'light'}
    >
      <div
        className="logo"
        onClick={() => navigate('/')}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: 'auto',
          overflow: 'visible',
          padding: '12px 12px',
          margin: '4px 8px 12px',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <img src="/Lambang_Polda_DIY.png" alt="Polda DIY" style={{ height: 28, width: 'auto', flexShrink: 0, objectFit: 'contain' }} />
        <img src="/TIK_POLRI.png" alt="TIK POLRI" style={{ height: 28, width: 'auto', flexShrink: 0, objectFit: 'contain' }} />
        {!showLogoApp && (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
              SIM-ASET
            </span>
            <span style={{ fontWeight: 600, fontSize: '10px', color: '#64748b', letterSpacing: '0.4px' }}>
              BID TIK POLDA DIY
            </span>
          </div>
        )}
      </div>
      <Menu
        items={items}
        mode="inline"
        theme={'light'}
        selectedKeys={[currentPath]}
        onClick={({ key }) => {
          const target = MENU_PATHS[key];
          if (target) navigate(target);
        }}
        style={{
          background: 'none',
          border: 'none',
          width: 256,
        }}
      />
    </Sider>
  );
}

function MobileSidebar() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => setVisible(true);
  const onClose = () => setVisible(false);

  return (
    <>
      <Button
        type="text"
        size="large"
        onClick={showDrawer}
        className="mobile-sidebar-btn"
        style={{ marginLeft: 25 }}
      >
        <MenuOutlined style={{ fontSize: 18 }} />
      </Button>
      <Drawer
        width={250}
        contentWrapperStyle={{ boxShadow: 'none' }}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0)' }}
        placement="left"
        closable={false}
        onClose={onClose}
        open={visible}
      >
        <Sidebar collapsible={false} isMobile={true} />
      </Drawer>
    </>
  );
}
