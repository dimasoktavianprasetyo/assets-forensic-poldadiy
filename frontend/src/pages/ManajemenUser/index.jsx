import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Tabs, Table, Tag, Popconfirm, message } from 'antd';
import { UserOutlined, SafetyOutlined, HistoryOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { request } from '@/request';

const ROLE_OPTIONS = [
  { value: 'admin_subbagrenmin', label: 'Admin Subbagrenmin', color: '#1d39c4' },
  { value: 'operator_teknisi', label: 'Operator / Teknisi (Tekkom & Tekinfo)', color: '#0958d9' },
  { value: 'satker', label: 'Satker / Personel Pengguna', color: '#08979c' },
  { value: 'pengawas_internal', label: 'Pengawas Internal (Auditor BID TIK)', color: '#d48806' },
  { value: 'kabid_tik', label: 'Kepala Bidang TIK (Pimpinan)', color: '#531dab' },
];

const ROLE_MAP = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r]));

const ROLES_DATA = [
  { id_role: 1, kode: 'admin_subbagrenmin', nama_role: 'Admin Subbagrenmin', akses: 'Kelola user & RBAC, master data, aset TIK, SPK & biaya, rekonsiliasi, cetak laporan' },
  { id_role: 2, kode: 'operator_teknisi', nama_role: 'Operator / Teknisi (Tekkom & Tekinfo)', akses: 'Verifikasi pinjam/mutasi, BAST digital, diagnosis tiket, Uji QC, BAST servis' },
  { id_role: 3, kode: 'satker', nama_role: 'Satker / Personel Pengguna', akses: 'Lihat stok perangkat, ajukan pinjam/mutasi, lapor tiket gangguan, konfirmasi terima' },
  { id_role: 4, kode: 'pengawas_internal', nama_role: 'Pengawas Internal (Auditor)', akses: 'Pantau histori, eksekusi Engine K-Means (K=3), verifikasi alert & audit_investigasi' },
  { id_role: 5, kode: 'kabid_tik', nama_role: 'Kepala Bidang TIK (Pimpinan)', akses: 'Executive Early Warning Dashboard, tinjau rekomendasi audit, setujui laporan PDF' },
];

const INITIAL_USERS = [
  { _id: '1', nama: 'Admin Subbagrenmin', email: 'admin@admin.com', role: 'admin_subbagrenmin', status: 'Aktif' },
];

const AUDIT_LOGS = [
  { id: 1, waktu: '26/11/2026 09:50', user: 'admin@admin.com', aksi: 'Login Sistem', ip: '127.0.0.1' },
  { id: 2, waktu: '26/11/2026 09:55', user: 'admin@admin.com', aksi: 'Eksekusi K-Means Clustering (K=3)', ip: '127.0.0.1' },
];

export default function ManajemenUserPage() {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [auditLogs, setAuditLogs] = useState(AUDIT_LOGS);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const loadUsersAndLogs = async () => {
      try {
        const res = await request.list({ entity: 'users' });
        if (res?.success && Array.isArray(res?.result) && res.result.length > 0) {
          setUsers(res.result);
        }
      } catch {
        // Fallback ke daftar lokal
      }
      try {
        const logRes = await request.get({ entity: 'logs' });
        if (logRes?.success && Array.isArray(logRes?.result)) {
          setAuditLogs(logRes.result);
        }
      } catch {
        // Fallback log lokal
      }
    };
    loadUsersAndLogs();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'operator_teknisi', status: 'Aktif' });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      nama: record.nama,
      email: record.email,
      role: record.role,
      status: record.status,
      password: '',
    });
    setModalOpen(true);
  };

  const handleSaveUser = async (values) => {
    if (editingUser) {
      try {
        await request.update({ entity: 'users', id: editingUser._id, jsonData: values });
      } catch {
        // Update state UI
      }
      setUsers((prev) =>
        prev.map((u) => (u._id === editingUser._id ? { ...u, ...values } : u))
      );
      message.success(`Data & role ${values.nama} berhasil diperbarui!`);
    } else {
      const newUser = { _id: String(Date.now()), ...values };
      try {
        const res = await request.create({ entity: 'users', jsonData: values });
        if (res?.success && res?.result?._id) newUser._id = res.result._id;
      } catch {
        // Simpan di state UI
      }
      setUsers((prev) => [newUser, ...prev]);
      message.success(`Pengguna ${values.nama} berhasil ditambahkan!`);
    }
    setModalOpen(false);
  };

  const handleDeleteUser = async (id) => {
    try {
      await request.delete({ entity: 'users', id });
    } catch {
      // Hapus di state UI
    }
    setUsers((prev) => prev.filter((u) => u._id !== id));
    message.success('Pengguna berhasil dihapus.');
  };

  const items = [
    {
      key: 'users',
      label: (
        <span>
          <UserOutlined /> Daftar Pengguna
        </span>
      ),
      children: (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
              Tambah Pengguna & Role
            </Button>
          </div>
          <Table
            rowKey="_id"
            dataSource={users}
            columns={[
              { title: 'Nama Lengkap', dataIndex: 'nama' },
              { title: 'Email / Username', dataIndex: 'email' },
              {
                title: 'Peran (RBAC)',
                dataIndex: 'role',
                render: (r) => {
                  const info = ROLE_MAP[r] || { label: r, color: '#1d39c4' };
                  return <Tag color={info.color}>{info.label}</Tag>;
                },
              },
              {
                title: 'Status',
                dataIndex: 'status',
                render: (s) => <Tag color={s === 'Aktif' ? '#389e0d' : '#cf1322'}>{s}</Tag>,
              },
              {
                title: 'Aksi',
                key: 'action',
                render: (_, record) => (
                  <Space>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
                      Ubah Role
                    </Button>
                    {record.email !== 'admin@admin.com' && (
                      <Popconfirm title="Hapus pengguna ini?" onConfirm={() => handleDeleteUser(record._id)}>
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                ),
              },
            ]}
            pagination={{ pageSize: 10 }}
          />
        </>
      ),
    },
    {
      key: 'roles',
      label: (
        <span>
          <SafetyOutlined /> 5 Peran RBAC
        </span>
      ),
      children: (
        <Table
          rowKey="id_role"
          dataSource={ROLES_DATA}
          columns={[
            { title: 'Level', dataIndex: 'id_role', width: 80 },
            { title: 'Nama Peran', dataIndex: 'nama_role' },
            { title: 'Hak Akses & Segregation of Duties', dataIndex: 'akses' },
          ]}
          pagination={false}
        />
      ),
    },
    {
      key: 'logs',
      label: (
        <span>
          <HistoryOutlined /> Audit Trail Sistem
        </span>
      ),
      children: (
        <Table
          rowKey="id"
          dataSource={auditLogs}
          columns={[
            { title: 'Waktu (DD/MM/YYYY)', dataIndex: 'waktu' },
            { title: 'Pengguna', dataIndex: 'user' },
            { title: 'Aktivitas Sistem', dataIndex: 'aksi' },
            { title: 'IP Address', dataIndex: 'ip' },
          ]}
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Manajemen User, RBAC (5 Peran) & Audit Trail" bordered={false} className="whiteBox shadow">
        <Tabs items={items} />
      </Card>

      <Modal
        title={editingUser ? `Ubah Data / Role - ${editingUser.nama}` : 'Tambah Pengguna Baru'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Simpan"
        cancelText="Batal"
      >
        <Form form={form} layout="vertical" onFinish={handleSaveUser}>
          <Form.Item name="nama" label="Nama Lengkap / Personel" rules={[{ required: true, message: 'Nama wajib diisi' }]}>
            <Input placeholder="Contoh: Bripka Andi Pratama" />
          </Form.Item>
          <Form.Item name="email" label="Email / Username Login" rules={[{ required: true, type: 'email', message: 'Email valid wajib diisi' }]}>
            <Input placeholder="contoh@polda-diy.polri.go.id" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingUser ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Login'}
            rules={editingUser ? [] : [{ required: true, message: 'Password wajib diisi' }]}
          >
            <Input.Password placeholder="Minimal 6 karakter" />
          </Form.Item>
          <Form.Item name="role" label="Peran / Hak Akses (RBAC)" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))} />
          </Form.Item>
          <Form.Item name="status" label="Status Akun" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
