import { Form, Input, Modal, message } from 'antd'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

interface ChangePasswordFormValues {
  current_password: string
  new_password: string
  new_password_confirm: string
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const changePassword = useAuthStore((s) => s.changePassword)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<ChangePasswordFormValues>()

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    if (values.new_password !== values.new_password_confirm) {
      message.error('两次输入的新密码不一致')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(values)
      message.success('密码已更新')
      handleClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改密码失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="修改密码"
      open={open}
      onCancel={handleClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      destroyOnClose
      okText="确认修改"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item
          label="当前密码"
          name="current_password"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="new_password"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, message: '密码至少 8 位' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="new_password_confirm"
          rules={[{ required: true, message: '请再次输入新密码' }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
