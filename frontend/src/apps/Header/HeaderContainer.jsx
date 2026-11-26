import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { AutoComplete, Avatar, Dropdown, Input, Layout, Badge, Button, Tag, Tooltip } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  ToolOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons';

import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { FILE_BASE_URL } from '@/config/serverApiConfig';
import useLanguage from '@/locale/useLanguage';

const ROLE_LABELS = {
  owner: 'Admin Subbagrenmin',
  admin_subbagrenmin: 'Admin Subbagrenmin',
  operator_teknisi: 'Operator Tekkom-Tekinfo',
  satker: 'Satker / Personel',
  pengawas_internal: 'Pengawas Internal',
  kabid_tik: 'Kepala Bidang TIK',
};

const SEARCH_INDEX = [
  { value: '3100102029 - Router Mikrotik CCR1036 (Alert Merah)', path: '/early-warning', category: 'Early Warning' },
  { value: '3100102042 - Laptop Operasional ThinkPad X1 (Alert Merah)', path: '/early-warning', category: 'Early Warning' },
  { value: '3100102014 - Switch Core Cisco Catalyst 9300', path: '/aset-tik', category: 'Aset TIK' },
  { value: '3100102001 - Server Rack Dell PowerEdge R740', path: '/aset-tik', category: 'Aset TIK' },
  { value: 'Inventaris Aset TIK & Depresiasi Garis Lurus', path: '/aset-tik', category: 'Modul' },
  { value: 'Sirkulasi Peminjaman, Mutasi & BAST Digital', path: '/sirkulasi', category: 'Modul' },
  { value: 'Pemeliharaan, Tiket Kerusakan, SPK & Uji QC', path: '/pemeliharaan', category: 'Modul' },
  { value: 'Rekonsiliasi Fisik / Stock Opname BMN (BAR)', path: '/rekonsiliasi', category: 'Modul' },
  { value: 'Analitik K-Means Clustering (K=3) & Kurva Elbow', path: '/kmeans-analytics', category: 'Analitik' },
  { value: 'Early Warning Alert & Audit Investigasi', path: '/early-warning', category: 'Audit' },
  { value: 'Master Data Satuan Kerja (Satker)', path: '/master/satker', category: 'Master' },
  { value: 'Master Data Personel (NRP)', path: '/master/personel', category: 'Master' },
  { value: 'Master Data Kategori & Sub-Kategori BMN', path: '/master/kategori', category: 'Master' },
  { value: 'Master Data Lokasi Penempatan (DIR)', path: '/master/lokasi', category: 'Master' },
  { value: 'Master Data Vendor Rekanan', path: '/master/vendor', category: 'Master' },
  { value: 'Laporan PDF Resmi BID TIK Polda DIY', path: '/laporan', category: 'Laporan' },
  { value: 'Manajemen User, RBAC & Audit Trail', path: '/manajemen-user', category: 'Sistem' },
];

export default function HeaderContent() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { Header } = Layout;
  const navigate = useNavigate();
  const translate = useLanguage();
  const [searchText, setSearchText] = useState('');
  const [options, setOptions] = useState([]);

  const roleLabel = ROLE_LABELS[currentAdmin?.role] || 'Admin Subbagrenmin';

  const handleSearch = (value) => {
    setSearchText(value);
    if (!value.trim()) {
      setOptions([]);
      return;
    }
    const q = value.toLowerCase();
    const matched = SEARCH_INDEX.filter(
      (item) => item.value.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
    ).map((item) => ({
      value: item.value,
      path: item.path,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{item.value}</span>
          <Tag color="#0958d9" style={{ margin: 0, fontSize: 11 }}>{item.category}</Tag>
        </div>
      ),
    }));
    setOptions(matched);
  };

  const handleSelect = (_, option) => {
    if (option?.path) {
      navigate(option.path);
      setSearchText('');
      setOptions([]);
    }
  };

  const ProfileDropdown = () => (
    <div className="profileDropdown" onClick={() => navigate('/profile')}>
      <Avatar
        size="large"
        className="last"
        src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
        style={{
          color: '#f56a00',
          backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
          boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 6px 1px',
        }}
      >
        {currentAdmin?.name?.charAt(0)?.toUpperCase()}
      </Avatar>
      <div className="profileDropdownInfo">
        <p>
          {currentAdmin?.name} {currentAdmin?.surname}
        </p>
        <p>{currentAdmin?.email}</p>
      </div>
    </div>
  );

  const items = [
    {
      label: <ProfileDropdown className="headerDropDownMenu" />,
      key: 'ProfileDropdown',
    },
    { type: 'divider' },
    {
      icon: <UserOutlined />,
      key: 'settingProfile',
      label: <Link to={'/profile'}>{translate('profile_settings')}</Link>,
    },
    {
      icon: <ToolOutlined />,
      key: 'settingApp',
      label: <Link to={'/settings'}>{translate('app_settings')}</Link>,
    },
    { type: 'divider' },
    {
      icon: <LogoutOutlined />,
      key: 'logout',
      label: <Link to={'/logout'}>{translate('logout')}</Link>,
    },
  ];

  return (
    <Header
      style={{
        padding: '0 24px',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      {/* Pencarian Lengkap Global */}
      <div style={{ flex: 1, maxWidth: 460 }}>
        <AutoComplete
          value={searchText}
          options={options}
          onSearch={handleSearch}
          onSelect={handleSelect}
          style={{ width: '100%' }}
        >
          <Input
            allowClear
            prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
            placeholder="Cari Kode BMN, perangkat TIK, BAST, tiket servis, atau menu..."
            onPressEnter={() => {
              if (options.length > 0 && options[0].path) {
                navigate(options[0].path);
                setSearchText('');
                setOptions([]);
              }
            }}
          />
        </AutoComplete>
      </div>

      {/* Kanan: Badge Peran, Notifikasi Fraud, & Profil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <Tag icon={<SafetyCertificateOutlined />} color="#1d39c4" style={{ margin: 0, padding: '3px 10px', fontSize: 13, fontWeight: 500 }}>
          {roleLabel}
        </Tag>

        <Tooltip title="Notifikasi Early Warning Fraud">
          <Badge count={2} size="small" offset={[-2, 4]}>
            <Button
              type="text"
              shape="circle"
              icon={<BellOutlined style={{ fontSize: 18, color: '#cf1322' }} />}
              onClick={() => navigate('/early-warning')}
            />
          </Badge>
        </Tooltip>

        <Dropdown
          menu={{ items }}
          trigger={['click']}
          placement="bottomRight"
          style={{ width: '280px' }}
        >
          <Avatar
            className="last"
            src={currentAdmin?.photo ? FILE_BASE_URL + currentAdmin?.photo : undefined}
            style={{
              color: '#f56a00',
              backgroundColor: currentAdmin?.photo ? 'none' : '#fde3cf',
              boxShadow: 'rgba(150, 190, 238, 0.35) 0px 0px 10px 2px',
              cursor: 'pointer',
            }}
            size="large"
          >
            {currentAdmin?.name?.charAt(0)?.toUpperCase()}
          </Avatar>
        </Dropdown>
      </div>
    </Header>
  );
}
