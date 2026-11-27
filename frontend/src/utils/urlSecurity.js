import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/redux/auth/selectors';

// Utilitas Verifikasi Hash SHA-256 per Rute & Sesi (Web Crypto API)
export async function computeRouteHash(sessionSecret, pathname) {
  const secret = sessionSecret || 'sim-aset-default-session';
  const raw = `${secret}::${pathname || '/'}`;
  if (window.crypto?.subtle) {
    const buf = new TextEncoder().encode(raw);
    const digest = await window.crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hex.slice(0, 40);
  }
  let h = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h).toString(16).padStart(16, '0');
}

export function useSecureNavigate() {
  const navigate = useNavigate();
  const currentAdmin = useSelector(selectCurrentAdmin);

  return async (path, options) => {
    const cleanPath = String(path || '/').split('?')[0];
    const secret = currentAdmin?.sessionKey || currentAdmin?.token;
    const hash = await computeRouteHash(secret, cleanPath);
    navigate(`${cleanPath}?k=${hash}`, options);
  };
}

