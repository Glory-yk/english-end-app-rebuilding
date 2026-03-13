export interface AgeGroupConfig {
  id: string;
  label: string;
  emoji: string;
  description: string;
  maxVideoLengthSec: number;
  fontSize: 'large' | 'xlarge' | 'xxlarge';
  buttonSize: 'large' | 'xlarge';
  hasQuiz: boolean;
  hasSrs: boolean;
  parentDashboard: boolean;
}

export const ageGroupConfigs: AgeGroupConfig[] = [
  {
    id: '1y',
    label: '1세',
    emoji: '🍼',
    description: '동요, 색상, 소리',
    maxVideoLengthSec: 120,
    fontSize: 'xxlarge',
    buttonSize: 'xlarge',
    hasQuiz: false,
    hasSrs: false,
    parentDashboard: true,
  },
  {
    id: '3y',
    label: '3세',
    emoji: '🧸',
    description: '짧은 만화, 따라하기',
    maxVideoLengthSec: 300,
    fontSize: 'xlarge',
    buttonSize: 'xlarge',
    hasQuiz: false,
    hasSrs: false,
    parentDashboard: true,
  },
  {
    id: '6y',
    label: '6세',
    emoji: '📚',
    description: '교육 만화, 간단한 퀴즈',
    maxVideoLengthSec: 600,
    fontSize: 'large',
    buttonSize: 'large',
    hasQuiz: true,
    hasSrs: false,
    parentDashboard: true,
  },
];
