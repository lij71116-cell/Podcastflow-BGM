import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'
import './StepCard.css'

interface StepCardProps {
  step: number
  title: string
  done?: boolean
  accent?: boolean
  accentColor?: string
  extra?: ReactNode
  children: ReactNode
}

export function StepCard({
  step,
  title,
  done = false,
  accent = false,
  accentColor = '#2D6A4F',
  extra,
  children,
}: StepCardProps) {
  return (
    <Card
      className={`step-card ${accent ? 'step-card-accent' : ''}`}
      style={accent ? { borderLeftColor: accentColor } : undefined}
    >
      <div className="step-card-header">
        <span
          className={`step-badge ${done ? 'done' : ''}`}
          style={done ? { background: accentColor } : undefined}
        >
          {step}
        </span>
        <Typography.Text strong>{title}</Typography.Text>
        {extra}
      </div>
      {children}
    </Card>
  )
}
