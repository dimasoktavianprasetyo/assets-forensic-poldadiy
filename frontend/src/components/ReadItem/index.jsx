import { useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import { useSelector } from 'react-redux';

import dayjs from 'dayjs';
import { dataForRead } from '@/utils/dataStructure';

import { useCrudContext } from '@/context/crud';
import { selectCurrentItem } from '@/redux/crud/selectors';
import { valueByString } from '@/utils/helpers';

import useLanguage from '@/locale/useLanguage';
import { useDate, useMoney } from '@/settings';

export default function ReadItem({ config }) {
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();
  let { readColumns, fields } = config;
  const translate = useLanguage();
  const { result: currentResult } = useSelector(selectCurrentItem);
  const { state } = useCrudContext();
  const { isReadBoxOpen } = state;
  const [listState, setListState] = useState([]);

  if (fields) readColumns = [...dataForRead({ fields: fields, translate: translate })];
  useEffect(() => {
    const list = [];
    readColumns.map((props) => {
      const propsKey = props.dataIndex;
      const propsTitle = props.title;
      const isDate = props.isDate || false;
      const isCurrency = props.isCurrency || false;
      let value = valueByString(currentResult, propsKey);
      if (typeof props.customRender === 'function') {
        value = props.customRender(value, currentResult, dateFormat);
      } else if (isDate) {
        if (!value) {
          value = '-';
        } else {
          const d = dayjs(value);
          value = d.isValid() ? d.format(dateFormat) : '-';
        }
      } else if (isCurrency) {
        value = moneyFormatter({ amount: value });
      }
      list.push({ propsKey, label: propsTitle, value: value });
    });
    setListState(list);
  }, [currentResult]);

  const show = isReadBoxOpen ? { display: 'block', opacity: 1 } : { display: 'none', opacity: 0 };

  const itemsList = listState.map((item) => {
    return (
      <Row key={item.propsKey} gutter={12}>
        <Col className="gutter-row" span={8}>
          <p>{item.label}</p>
        </Col>
        <Col className="gutter-row" span={2}>
          <p> : </p>
        </Col>
        <Col className="gutter-row" span={14}>
          <p>{item.value}</p>
        </Col>
      </Row>
    );
  });

  return <div style={show}>{itemsList}</div>;
}
