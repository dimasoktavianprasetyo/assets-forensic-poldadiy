import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const Logout = lazy(() => import('@/pages/Logout.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Profile = lazy(() => import('@/pages/Profile'));

const Satker = lazy(() => import('@/pages/MasterData/Satker'));
const Personel = lazy(() => import('@/pages/MasterData/Personel'));
const KategoriAset = lazy(() => import('@/pages/MasterData/KategoriAset'));
const LokasiPenempatan = lazy(() => import('@/pages/MasterData/LokasiPenempatan'));
const VendorPelaksana = lazy(() => import('@/pages/MasterData/VendorPelaksana'));
const AsetTik = lazy(() => import('@/pages/AsetTik'));
const Sirkulasi = lazy(() => import('@/pages/Sirkulasi'));
const Pemeliharaan = lazy(() => import('@/pages/Pemeliharaan'));
const Rekonsiliasi = lazy(() => import('@/pages/Rekonsiliasi'));
const KMeansAnalytics = lazy(() => import('@/pages/KMeansAnalytics'));
const EarlyWarning = lazy(() => import('@/pages/EarlyWarning'));
const Laporan = lazy(() => import('@/pages/Laporan'));
const ManajemenUser = lazy(() => import('@/pages/ManajemenUser'));

let routes = {
  expense: [],
  default: [
    { path: '/login', element: <Navigate to="/" /> },
    { path: '/logout', element: <Logout /> },
    { path: '/', element: <Dashboard /> },
    { path: '/master/satker', element: <Satker /> },
    { path: '/master/personel', element: <Personel /> },
    { path: '/master/kategori', element: <KategoriAset /> },
    { path: '/master/lokasi', element: <LokasiPenempatan /> },
    { path: '/master/vendor', element: <VendorPelaksana /> },
    { path: '/aset-tik', element: <AsetTik /> },
    { path: '/sirkulasi', element: <Sirkulasi /> },
    { path: '/pemeliharaan', element: <Pemeliharaan /> },
    { path: '/rekonsiliasi', element: <Rekonsiliasi /> },
    { path: '/kmeans-analytics', element: <KMeansAnalytics /> },
    { path: '/early-warning', element: <EarlyWarning /> },
    { path: '/laporan', element: <Laporan /> },
    { path: '/manajemen-user', element: <ManajemenUser /> },
    { path: '/settings', element: <Settings /> },
    { path: '/settings/edit/:settingsKey', element: <Settings /> },
    { path: '/profile', element: <Profile /> },
    { path: '*', element: <NotFound /> },
  ],
};

export default routes;
