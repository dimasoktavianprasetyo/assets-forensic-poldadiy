import currency from 'currency.js';

import { useSelector } from 'react-redux';
import storePersist from '@/redux/storePersist';

import { selectMoneyFormat } from '@/redux/settings/selectors';

const useMoney = () => {
  const money_format_settings = useSelector(selectMoneyFormat);

  const money_format_state = money_format_settings
    ? money_format_settings
    : storePersist.get('settings')?.money_format_settings;

  function currencyFormat({ amount, currency_code = money_format_state?.currency_code }) {
    const numericAmount = Number(amount || 0);
    const separator = money_format_state?.thousand_sep || '.';
    const decimal = money_format_state?.decimal_sep || ',';
    const precision = money_format_state?.cent_precision ?? 0;
    return currency(numericAmount).dollars() > 0 || !money_format_state?.zero_format
      ? currency(numericAmount, {
          separator,
          decimal,
          symbol: '',
          precision,
        }).format()
      : 0 +
          currency(numericAmount, {
            separator,
            decimal,
            symbol: '',
            precision,
          }).format();
  }

  function moneyFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    const symbol = money_format_state?.currency_symbol || 'Rp';
    return (money_format_state?.currency_position || 'before') === 'before'
      ? symbol + ' ' + currencyFormat({ amount, currency_code })
      : currencyFormat({ amount, currency_code }) + ' ' + symbol;
  }

  function amountFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    return currencyFormat({ amount: amount, currency_code });
  }

  function moneyRowFormatter({ amount = 0, currency_code = money_format_state?.currency_code }) {
    return {
      props: {
        style: {
          textAlign: 'right',
          whiteSpace: 'nowrap',
          direction: 'ltr',
        },
      },
      children: (
        <>
          {money_format_state?.currency_position === 'before'
            ? money_format_state?.currency_symbol + ' ' + currencyFormat({ amount, currency_code })
            : currencyFormat({ amount, currency_code }) + ' ' + money_format_state?.currency_symbol}
        </>
      ),
    };
  }

  return {
    moneyRowFormatter,
    moneyFormatter,
    amountFormatter,
    currency_symbol: money_format_state?.currency_symbol,
    currency_code: money_format_state?.currency_code,
    currency_position: money_format_state?.currency_position,
    decimal_sep: money_format_state?.decimal_sep,
    thousand_sep: money_format_state?.thousand_sep,
    cent_precision: money_format_state?.cent_precision,
    zero_format: money_format_state?.zero_format,
  };
};

export default useMoney;
