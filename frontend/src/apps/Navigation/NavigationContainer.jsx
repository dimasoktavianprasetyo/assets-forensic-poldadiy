import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Layout, Menu } from 'antd';
import { useSelector } from 'react-redux';

import { useAppContext } from '@/context/appContext';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import useResponsive from '@/hooks/useResponsive';

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

function Sidebar({ collapsible, isMobile = false }) {
  const location = useLocation();
  const navigate = useNavigate();
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
      label: <Link to={'/'}>Dashboard</Link>,
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'masterData',
      icon: <DatabaseOutlined />,
      label: 'Master Data BMN',
      roles: ['admin_subbagrenmin'],
      children: [
        { key: 'master/satker', label: <Link to={'/master/satker'}>Satker</Link> },
        { key: 'master/personel', label: <Link to={'/master/personel'}>Personel</Link> },
        { key: 'master/kategori', label: <Link to={'/master/kategori'}>Kategori & Sub-Kategori</Link> },
        { key: 'master/lokasi', label: <Link to={'/master/lokasi'}>Lokasi Ruangan</Link> },
        { key: 'master/vendor', label: <Link to={'/master/vendor'}>Vendor Rekanan</Link> },
      ],
    },
    {
      key: 'aset-tik',
      icon: <LaptopOutlined />,
      label: <Link to={'/aset-tik'}>Aset TIK & Depresiasi</Link>,
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'sirkulasi',
      icon: <SwapOutlined />,
      label: <Link to={'/sirkulasi'}>Sirkulasi & BAST</Link>,
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal'],
    },
    {
      key: 'pemeliharaan',
      icon: <ToolOutlined />,
      label: <Link to={'/pemeliharaan'}>Pemeliharaan & QC</Link>,
      roles: ['admin_subbagrenmin', 'operator_teknisi', 'satker', 'pengawas_internal'],
    },
    {
      key: 'rekonsiliasi',
      icon: <ReconciliationOutlined />,
      label: <Link to={'/rekonsiliasi'}>Rekonsiliasi BMN</Link>,
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'kmeans-analytics',
      icon: <RadarChartOutlined />,
      label: <Link to={'/kmeans-analytics'}>Analitik K-Means</Link>,
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'early-warning',
      icon: <AlertOutlined />,
      label: <Link to={'/early-warning'}>Early Warning & Audit</Link>,
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'laporan',
      icon: <FilePdfOutlined />,
      label: <Link to={'/laporan'}>Laporan PDF Resmi</Link>,
      roles: ['admin_subbagrenmin', 'pengawas_internal', 'kabid_tik'],
    },
    {
      key: 'manajemen-user',
      icon: <TeamOutlined />,
      label: <Link to={'/manajemen-user'}>Manajemen User & Audit Trail</Link>,
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
