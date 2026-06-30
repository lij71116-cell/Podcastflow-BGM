import { CheckOutlined } from '@ant-design/icons'
import { CREATE_FLOW_STEPS, type CreateFlowStep } from './createFlowSteps'
import './CreateEventAxis.css'

interface CreateEventAxisProps {
  activeStep: CreateFlowStep
  maxReachedStep: CreateFlowStep
  onStepClick: (step: CreateFlowStep) => void
}

function nodeState(
  stepId: CreateFlowStep,
  activeStep: CreateFlowStep,
  maxReachedStep: CreateFlowStep,
): 'done' | 'active' | 'pending' {
  if (stepId === activeStep) return 'active'
  if (stepId < activeStep || stepId < maxReachedStep) return 'done'
  if (stepId <= maxReachedStep && stepId !== activeStep) return 'done'
  return 'pending'
}

function fillClass(activeStep: CreateFlowStep): string {
  if (activeStep === 1) return 'create-stepper__fill--0'
  if (activeStep === 2) return 'create-stepper__fill--50'
  return 'create-stepper__fill--100'
}

export function CreateEventAxis({ activeStep, maxReachedStep, onStepClick }: CreateEventAxisProps) {
  return (
    <div className="create-stepper" role="navigation" aria-label="创建流程">
      <div className="create-stepper__track" aria-hidden="true" />
      <div className={`create-stepper__fill ${fillClass(activeStep)}`} aria-hidden="true" />
      {CREATE_FLOW_STEPS.map((step) => {
        const state = nodeState(step.id, activeStep, maxReachedStep)
        const clickable = step.id <= maxReachedStep
        return (
          <button
            key={step.id}
            type="button"
            className={`step-node step-node--${state}${clickable ? ' step-node--clickable' : ''}`}
            disabled={!clickable}
            onClick={() => clickable && onStepClick(step.id)}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <div className="step-node__circle">
              {state === 'done' ? <CheckOutlined style={{ fontSize: 14 }} /> : step.id}
            </div>
            <div className="step-node__text">
              <div className="step-node__title">{step.title}</div>
              <div className="step-node__sub">{step.subtitle}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
