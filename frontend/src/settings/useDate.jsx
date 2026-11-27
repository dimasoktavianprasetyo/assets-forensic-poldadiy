import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { selectAppSettings } from '@/redux/settings/selectors';

const STORAGE_KEY = 'sim_aset_bid_tik_settings';

const TZ_OFFSET = {
  WIB: 7,
  WITA: 8,
  WIT: 9,
};

const useDate = () => {
  const app_settings = useSelector(selectAppSettings);
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    saved = {};
  }
  const dateFormat = saved.format_tanggal || app_settings?.idurar_app_date_format || 'DD/MM/YYYY';
  const timeZone = saved.zona_waktu || 'WIB';

  const formatDateTime = (tsOrDate) => {
    if (!tsOrDate) return '-';
    const base = dayjs(tsOrDate);
    if (!base.isValid()) return '-';
    const targetOffsetMin = (TZ_OFFSET[timeZone] ?? 7) * 60;
    const localOffsetMin = new Date().getTimezoneOffset() * -1;
    const shifted = base.add(targetOffsetMin - localOffsetMin, 'minute').locale('id');
    return `${shifted.format(dateFormat)} ${shifted.format('HH:mm')} ${timeZone}`;
  };

  return {
    dateFormat,
    timeZone,
    formatDateTime,
  };
};

export default useDate;
