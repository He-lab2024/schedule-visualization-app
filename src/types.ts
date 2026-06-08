export type CategoryId = string;
export type TaskStatus = 'planned' | 'active' | 'done' | 'delayed' | 'blocked' | 'cancelled';
export type ProjectStatus = 'not-started' | 'active' | 'risk' | 'paused' | 'done';
export type ViewId = 'today' | 'week' | 'projects' | 'workbench' | 'review' | 'settings';
export type EnergyLevel = '低' | '中' | '高';

export type Category = {
  id: CategoryId;
  name: string;
  color: string;
  soft: string;
};

export type Task = {
  id: string;
  title: string;
  category: CategoryId;
  projectId: string;
  date: string;
  start: string;
  duration: number;
  actualDuration?: number;
  energy: EnergyLevel;
  location: string;
  status: TaskStatus;
  standard: string;
  dependency: string;
  delayReason?: string;
  notes?: string;
  detail: string;
  priority?: 1 | 2 | 3;
  paperFields?: {
    chapter: string;
    figure: string;
    version: string;
    feedback: string;
  };
  experimentFields?: {
    sample: string;
    instrument: string;
    condition: string;
    waiting: string;
    reservation: string;
  };
};

export type ProjectLane = {
  id: string;
  name: string;
  category: CategoryId;
  stage: string;
  status: ProjectStatus;
  archived?: boolean;
  deadline: string;
  progress: number;
  next: string;
  blocker: string;
  cadence: string;
  milestones: ProjectMilestone[];
  trend: number[];
};

export type ProjectMilestone = {
  id: string;
  title: string;
  date: string;
  done: boolean;
};

export type WeekDay = {
  date: string;
  label: string;
  short: string;
};

export type Widget = {
  id: string;
  name: string;
  visible: boolean;
};

export type ViewPreset = {
  id: string;
  name: string;
  widgetIds: string[];
  focusCategories: CategoryId[];
};

export type FieldTemplate = {
  id: string;
  name: string;
  fields: string[];
};

export type PersistedState = {
  schemaVersion: number;
  version: number;
  taskList: Task[];
  categoryList: Category[];
  projectList: ProjectLane[];
  widgetList: Widget[];
  reviewMetricList: Widget[];
  templateList: FieldTemplate[];
  activePresetId: string;
  customPresetList: ViewPreset[];
  displayDensity: 'comfortable' | 'compact';
  dailyReviewNote: string;
  weeklyConclusion: string;
  nextWeekAdjustment: string;
  savedAt: string;
};
