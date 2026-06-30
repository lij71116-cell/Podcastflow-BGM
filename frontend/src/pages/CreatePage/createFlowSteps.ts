export type CreateFlowStep = 1 | 2 | 3

export const CREATE_FLOW_STEPS: {
  id: CreateFlowStep
  title: string
  subtitle: string
}[] = [
  { id: 1, title: '内容上传', subtitle: '播客 + BGM' },
  { id: 2, title: '混音配置', subtitle: '音量与效果' },
  { id: 3, title: '确认与生成', subtitle: '合成并保存' },
]
