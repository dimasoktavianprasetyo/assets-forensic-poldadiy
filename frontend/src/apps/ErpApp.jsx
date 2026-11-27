import { useLayoutEffect, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectAppSettings } from '@/redux/settings/selectors';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { useDispatch, useSelector } from 'react-redux';

import { Button, Layout, Result } from 'antd';
import { computeRouteHash } from '@/utils/urlSecurity';

import { useAppContext } from '@/context/appContext';

import Navigation from '@/apps/Navigation/NavigationContainer';

import HeaderContent from '@/apps/Header/HeaderContainer';
import PageLoader from '@/components/PageLoader';

import { settingsAction } from '@/redux/settings/actions';

import { selectSettings } from '@/redux/settings/selectors';

import AppRouter from '@/router/AppRouter';

import useResponsive from '@/hooks/useResponsive';

import storePersist from '@/redux/storePersist';
import WelcomeGreetingWidget from '@/components/WelcomeGreetingWidget';

export default function ErpCrmApp() {
  const { Content } = Layout;

  // const { state: stateApp, appContextAction } = useAppContext();
  // // const { app } = appContextAction;
  // const { isNavMenuClose, currentApp } = stateApp;

  const { isMobile } = useResponsive();
  const location = useLocation();
  const navigate = useNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [routeBlocked, setRouteBlocked] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    let active = true;
    const syncAndVerifyRouteHash = async () => {
      if (!currentAdmin?.token) return;
      const secret = currentAdmin?.sessionKey || currentAdmin?.token;
      const expected = await computeRouteHash(secret, location.pathname);
      if (!active) return;

      const params = new URLSearchParams(location.search);
      const currentKey = params.get('k');

      if (location.pathname === '/' || location.pathname === '/logout') {
        if (!currentKey) {
          params.set('k', expected);
          setRouteBlocked(false);
          navigate(`${location.pathname}?${params.toString()}`, { replace: true });
        } else if (currentKey !== expected) {
          setRouteBlocked(true);
        } else {
          setRouteBlocked(false);
        }
        return;
      }

      // Untuk semua sub-rute (mis. /sirkulasi): wajib punya ?k= yang cocok dengan hash sesi
      if (!currentKey || currentKey !== expected) {
        setRouteBlocked(true);
      } else {
        setRouteBlocked(false);
      }
    };
    syncAndVerifyRouteHash();
    return () => {
      active = false;
    };
  }, [location.pathname, location.search, currentAdmin?.token, currentAdmin?.sessionKey]);

  const handleBackToSafeDashboard = async () => {
    const secret = currentAdmin?.sessionKey || currentAdmin?.token;
    const dashHash = await computeRouteHash(secret, '/');
    setRouteBlocked(false);
    navigate(`/?k=${dashHash}`, { replace: true });
  };

  useLayoutEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, []);

  // const appSettings = useSelector(selectAppSettings);

  const { isSuccess: settingIsloaded } = useSelector(selectSettings);

  // useEffect(() => {
  //   const { loadDefaultLang } = storePersist.get('firstVisit');
  //   if (appSettings.idurar_app_language && !loadDefaultLang) {
  //     window.localStorage.setItem('firstVisit', JSON.stringify({ loadDefaultLang: true }));
  //   }
  // }, [appSettings]);

  if (settingIsloaded)
    return (
      <Layout hasSider>
        <Navigation />

        {isMobile ? (
          <Layout style={{ marginLeft: 0 }}>
            <HeaderContent />
            <Content
              style={{
                margin: '40px auto 30px',
                overflow: 'initial',
                width: '100%',
                padding: '0 25px',
                maxWidth: 'none',
              }}
            >
              <AppRouter />
            </Content>
          </Layout>
        ) : (
          <Layout>
            <HeaderContent />
            <Content
              style={{
                margin: '40px auto 30px',
                overflow: 'initial',
                width: '100%',
                padding: '0 50px',
                maxWidth: 1400,
              }}
            >
              {routeBlocked ? (
                <Result
                  status="403"
                  title="Akses URL Ditolak (403)"
                  subTitle={
                    <>
                      Rute &quot;{location.pathname}&quot; tidak memiliki kunci verifikasi sesi yang valid atau URL telah diubah secara langsung.
                      <br />
                      Silakan akses melalui menu navigasi resmi SIM-ASET.
                    </>
                  }
                  extra={
                    <Button type="primary" onClick={handleBackToSafeDashboard}>
                      Kembali ke Dashboard
                    </Button>
                  }
                />
              ) : (
                <AppRouter />
              )}
            </Content>
          </Layout>
        )}
        <WelcomeGreetingWidget />
      </Layout>
    );
  else return <PageLoader />;
}
