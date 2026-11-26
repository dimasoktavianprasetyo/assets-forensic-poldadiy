import React from 'react';
import { Form, Input, Checkbox } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

import useLanguage from '@/locale/useLanguage';

export default function LoginForm() {
  const translate = useLanguage();
  return (
    <div>
      <Form.Item
        label="Username / Email"
        name="email"
        rules={[
          {
            required: true,
            message: 'Username / Email wajib diisi',
          },
          {
            type: 'email',
            message: 'Format email tidak valid',
          },
        ]}
      >
        <Input
          prefix={<UserOutlined className="site-form-item-icon" />}
          placeholder={'admin@admin.com'}
          type="email"
          size="large"
        />
      </Form.Item>
      <Form.Item
        label="Kata Sandi"
        name="password"
        rules={[
          {
            required: true,
            message: 'Kata sandi wajib diisi',
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined className="site-form-item-icon" />}
          placeholder={'admin123'}
          size="large"
        />
      </Form.Item>

      <Form.Item>
        <Form.Item name="remember" valuePropName="checked" noStyle>
          <Checkbox>Ingat Saya</Checkbox>
        </Form.Item>
        <a className="login-form-forgot" href="/forgetpassword" style={{ marginLeft: '0px' }}>
          Lupa Kata Sandi?
        </a>
      </Form.Item>
    </div>
  );
}
