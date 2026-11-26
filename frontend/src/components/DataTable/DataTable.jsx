import { useCallback, useEffect, useState } from 'react';

import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  RedoOutlined,
  ArrowLeftOutlined,
  FilterOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import { Dropdown, Table, Button, Input, Select, Space } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { selectListItems } from '@/redux/crud/selectors';
import useLanguage from '@/locale/useLanguage';
import { dataForTable } from '@/utils/dataStructure';
import { useMoney, useDate } from '@/settings';

import { generate as uniqueId } from 'shortid';

import { useCrudContext } from '@/context/crud';

function AddNewItem({ config }) {
  const { crudContextAction } = useCrudContext();
  const { collapsedBox, panel } = crudContextAction;
  const { ADD_NEW_ENTITY } = config;

  const handelClick = () => {
    panel.open();
    collapsedBox.close();
  };

  return (
    <Button onClick={handelClick} type="primary">
      {ADD_NEW_ENTITY}
    </Button>
  );
}
export default function DataTable({ config, extra = [] }) {
  let { entity, dataTableColumns, DATATABLE_TITLE, fields, searchConfig, filterFields = [] } = config;
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, modal, readBox, editBox, advancedBox } = crudContextAction;
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const items = [
    {
      label: translate('Show'),
      key: 'read',
      icon: <EyeOutlined />,
    },
    {
      label: translate('Edit'),
      key: 'edit',
      icon: <EditOutlined />,
    },
    ...extra,
    {
      type: 'divider',
    },

    {
      label: translate('Delete'),
      key: 'delete',
      icon: <DeleteOutlined />,
    },
  ];

  const handleRead = (record) => {
    dispatch(crud.currentItem({ data: record }));
    panel.open();
    collapsedBox.open();
    readBox.open();
  };
  function handleEdit(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    editBox.open();
    panel.open();
    collapsedBox.open();
  }
  function handleDelete(record) {
    dispatch(crud.currentAction({ actionType: 'delete', data: record }));
    modal.open();
  }

  function handleUpdatePassword(record) {
    dispatch(crud.currentItem({ data: record }));
    dispatch(crud.currentAction({ actionType: 'update', data: record }));
    advancedBox.open();
    panel.open();
    collapsedBox.open();
  }

  let dispatchColumns = [];
  if (fields) {
    dispatchColumns = [...dataForTable({ fields, translate, moneyFormatter, dateFormat })];
  } else {
    dispatchColumns = [...dataTableColumns];
  }

  dataTableColumns = [
    ...dispatchColumns,
    {
      title: '',
      key: 'action',
      fixed: 'right',
      render: (_, record) => (
        <Dropdown
          menu={{
            items,
            onClick: ({ key }) => {
              switch (key) {
                case 'read':
                  handleRead(record);
                  break;
                case 'edit':
                  handleEdit(record);
                  break;

                case 'delete':
                  handleDelete(record);
                  break;
                case 'updatePassword':
                  handleUpdatePassword(record);
                  break;

                default:
                  break;
              }
              // else if (key === '2')handleCloseTask
            },
          }}
          trigger={['click']}
        >
          <EllipsisOutlined
            style={{ cursor: 'pointer', fontSize: '24px' }}
            onClick={(e) => e.preventDefault()}
          />
        </Dropdown>
      ),
    },
  ];

  const { result: listResult, isLoading: listIsLoading } = useSelector(selectListItems);

  const { pagination, items: dataSource } = listResult;

  const dispatch = useDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({});
  const [dynamicOptions, setDynamicOptions] = useState({});

  const staticFilterFields = fields
    ? Object.entries(fields)
        .filter(([, cfg]) => Array.isArray(cfg?.options) && cfg.options.length > 0)
        .map(([key, cfg]) => ({ key, label: cfg.label || key, options: cfg.options }))
    : [];

  const allFilterFields = [
    ...staticFilterFields,
    ...filterFields
      .filter((ff) => !staticFilterFields.some((sf) => sf.key === ff.key))
      .map((ff) => ({
        key: ff.key,
        label: ff.label || fields?.[ff.key]?.label || ff.key,
        options: ff.options || dynamicOptions[ff.key] || [],
      })),
  ];

  useEffect(() => {
    if (!Array.isArray(dataSource) || filterFields.length === 0) return;
    setDynamicOptions((prev) => {
      const next = { ...prev };
      filterFields.forEach((ff) => {
        if (ff.options) return;
        const existing = new Set((prev[ff.key] || []).map((o) => o.value));
        dataSource.forEach((row) => {
          const val = row?.[ff.key];
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            existing.add(val);
          }
        });
        next[ff.key] = Array.from(existing).map((v) => ({ value: v, label: String(v) }));
      });
      return next;
    });
  }, [dataSource, entity]);

  const fetchList = useCallback(
    (extraOpts = {}) => {
      const cleanFilters = {};
      const merged = { ...activeFilters, ...(extraOpts.filters || {}) };
      Object.entries(merged).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          cleanFilters[k] = v;
        }
      });
      const qVal = extraOpts.q !== undefined ? extraOpts.q : searchQuery;
      const options = {
        page: extraOpts.page || 1,
        items: extraOpts.items || 10,
        ...(qVal ? { q: qVal, fields: searchConfig?.searchFields || '' } : {}),
        ...cleanFilters,
      };
      dispatch(crud.list({ entity, options }));
    },
    [dispatch, entity, searchConfig?.searchFields, searchQuery, activeFilters]
  );

  const handelDataTableLoad = useCallback(
    (pag) => {
      fetchList({ page: pag?.current || 1, items: pag?.pageSize || 10 });
    },
    [fetchList]
  );

  const filterTable = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    fetchList({ q: value, page: 1 });
  };

  const handleFilterChange = (fieldKey, val) => {
    const nextFilters = { ...activeFilters, [fieldKey]: val };
    setActiveFilters(nextFilters);
    fetchList({ filters: nextFilters, page: 1 });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
    dispatch(crud.list({ entity, options: { page: 1, items: 10 } }));
  };

  const hasActiveFilter =
    Boolean(searchQuery) ||
    Object.values(activeFilters).some((v) => v !== undefined && v !== null && v !== '');

  useEffect(() => {
    setSearchQuery('');
    setActiveFilters({});
    setDynamicOptions({});
    dispatch(crud.list({ entity }));
  }, [entity]);

  return (
    <>
      <PageHeader
        onBack={() => window.history.back()}
        backIcon={<ArrowLeftOutlined />}
        title={DATATABLE_TITLE}
        ghost={false}
        extra={[
          <Input
            key={`searchFilterDataTable}`}
            value={searchQuery}
            onChange={filterTable}
            placeholder={translate('search')}
            allowClear
          />,
          <Button onClick={() => fetchList({ page: pagination?.current || 1 })} key={`${uniqueId()}`} icon={<RedoOutlined />}>
            {translate('Refresh')}
          </Button>,

          <AddNewItem key={`${uniqueId()}`} config={config} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>

      {allFilterFields.length > 0 && (
        <Space wrap style={{ marginBottom: 14, width: '100%' }}>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            <FilterOutlined style={{ marginRight: 6 }} />
            Filter:
          </span>
          {allFilterFields.map((f) => (
            <Select
              key={f.key}
              allowClear
              showSearch
              placeholder={f.label || f.key}
              value={activeFilters[f.key]}
              onChange={(val) => handleFilterChange(f.key, val)}
              style={{ minWidth: 175 }}
              options={f.options.map((o) => ({ value: o.value, label: o.label }))}
            />
          ))}
          {hasActiveFilter && (
            <Button icon={<ClearOutlined />} onClick={handleResetFilters}>
              Reset Filter
            </Button>
          )}
        </Space>
      )}

      <Table
        columns={dataTableColumns}
        rowKey={(item) => item._id}
        dataSource={dataSource}
        pagination={pagination}
        loading={listIsLoading}
        onChange={handelDataTableLoad}
        scroll={{ x: 'max-content' }}
      />
    </>
  );
}
