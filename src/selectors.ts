import type { Category, CategoryId, EnergyLevel, ProjectLane, Task, TaskStatus, WeekDay } from './types';

export const toMap = <T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>;

export const getCategoryMap = (categories: Category[]) =>
  Object.fromEntries(categories.map((category) => [category.id, category])) as Record<string, Category>;

export const getTasksForDate = (tasks: Task[], date: string) => tasks.filter((task) => task.date === date);

export const getTasksByCategory = (tasks: Task[], category: CategoryId) =>
  tasks.filter((task) => task.category === category);

export const getTasksForProject = (tasks: Task[], projectId: string) =>
  tasks.filter((task) => task.projectId === projectId);

export const getTodayMetrics = (tasks: Task[], date: string) => {
  const todayTasks = getTasksForDate(tasks, date);
  const deepWorkMinutes = todayTasks
    .filter((task) => task.energy === '高')
    .reduce((total, task) => total + task.duration, 0);
  const plannedMinutes = todayTasks.reduce((total, task) => total + task.duration, 0);
  const loadPercent = Math.min(100, Math.round((plannedMinutes / 360) * 100));

  return {
    taskCount: todayTasks.length,
    deepWorkHours: `${(deepWorkMinutes / 60).toFixed(1)}h`,
    loadPercent,
    highEnergyCount: todayTasks.filter((task) => task.energy === '高').length,
  };
};

export const getEnergySummary = (tasks: Task[]) => {
  const energyLevels: EnergyLevel[] = ['高', '中', '低'];
  return energyLevels.map((energy) => ({
    label: `${energy}脑力`,
    value: tasks.filter((task) => task.energy === energy).length,
  }));
};

export const getWeeklyLoads = (tasks: Task[], weekDays: WeekDay[]) =>
  weekDays.map((day) => {
    const dayTasks = getTasksForDate(tasks, day.date);
    const minutes = dayTasks.reduce((total, task) => total + task.duration, 0);
    const highEnergy = dayTasks.filter((task) => task.energy === '高').length;
    return {
      label: day.label,
      value: Math.min(100, Math.round((minutes / 360) * 100) + highEnergy * 8),
    };
  });

export const getHighEnergyLoads = (tasks: Task[], weekDays: WeekDay[]) =>
  weekDays.map((day) => {
    const dayTasks = getTasksForDate(tasks, day.date);
    const highEnergyTasks = dayTasks.filter((task) => task.energy === '高');
    return {
      label: day.label,
      value: highEnergyTasks.length,
      minutes: highEnergyTasks.reduce((total, task) => total + task.duration, 0),
      hasExperiment: dayTasks.some((task) => task.category === 'experiment'),
      hasWriting: dayTasks.some((task) => task.category === 'writing'),
    };
  });

export const getProjectRuntimeState = (project: ProjectLane, tasks: Task[]) => {
  const projectTasks = getTasksForProject(tasks, project.id);
  const blockedTasks = projectTasks.filter((task) => task.status === 'blocked' || task.status === 'delayed');
  const nextTask = projectTasks.find((task) => task.status === 'active') ?? projectTasks.find((task) => task.status === 'planned');

  return {
    taskCount: projectTasks.length,
    blockedCount: blockedTasks.length,
    nextTask,
    blocker: blockedTasks[0]?.delayReason ?? project.blocker,
  };
};

export const getReviewStats = (tasks: Task[], categories: Category[]) => {
  const completed = tasks.filter((task) => task.status === 'done').length;
  const delayed = tasks.filter((task) => task.status === 'delayed' || task.status === 'blocked').length;
  const completionRate = Math.round((completed / Math.max(tasks.length, 1)) * 100);
  const delayRate = Math.round((delayed / Math.max(tasks.length, 1)) * 100);

  const delayedTasks = tasks.filter((task) => task.delayReason);
  const reasonCounts = delayedTasks.reduce<Record<string, number>>((acc, task) => {
    const reason = task.delayReason ?? '未记录';
    acc[reason] = (acc[reason] ?? 0) + 1;
    return acc;
  }, {});
  const reasons = Object.entries(reasonCounts).map(([label, count]) => ({
    label,
    value: Math.round((count / Math.max(delayedTasks.length, 1)) * 100),
  }));

  const categoryMinutes = categories.map((category) => ({
    category,
    minutes: tasks
      .filter((task) => task.category === category.id)
      .reduce((total, task) => total + task.duration, 0),
  }));
  const totalMinutes = Math.max(
    1,
    categoryMinutes.reduce((total, item) => total + item.minutes, 0),
  );

  return {
    completionRate,
    delayRate,
    reasons,
    categoryDistribution: categoryMinutes.map((item) => ({
      ...item,
      percent: Math.max(6, Math.round((item.minutes / totalMinutes) * 100)),
    })),
    writingHours: (
      tasks
        .filter((task) => task.category === 'writing')
        .reduce((total, task) => total + task.duration, 0) / 60
    ).toFixed(1),
  };
};

export const getReviewSuggestions = (tasks: Task[], weekDays: WeekDay[]) => {
  const highEnergyLoads = getHighEnergyLoads(tasks, weekDays);
  const delayedTasks = tasks.filter((task) => task.status === 'delayed' || task.status === 'blocked');
  const totalMinutes = Math.max(
    1,
    tasks.reduce((total, task) => total + task.duration, 0),
  );
  const lifeMinutes = tasks
    .filter((task) => task.category === 'life' || task.category === 'recovery')
    .reduce((total, task) => total + task.duration, 0);

  const suggestions: Array<{ type: 'writing' | 'experiment' | 'life'; title: string; text: string }> = [];
  const overloadedMixedDay = highEnergyLoads.find((day) => day.value >= 2 && day.hasExperiment && day.hasWriting);
  if (overloadedMixedDay) {
    suggestions.push({
      type: 'writing',
      title: '拆开高脑力和实验日',
      text: `${overloadedMixedDay.label} 同时叠加写作和实验，下周把重写作块前移或后移半天。`,
    });
  }

  if (delayedTasks.some((task) => task.delayReason?.includes('数据') || task.delayReason?.includes('结果'))) {
    suggestions.push({
      type: 'experiment',
      title: '给数据回收留缓冲',
      text: '延期原因集中在数据或结果回收，下轮实验后预留半天整理窗口。',
    });
  }

  if (lifeMinutes / totalMinutes < 0.18) {
    suggestions.push({
      type: 'life',
      title: '恢复时间偏少',
      text: '生活和恢复任务占比偏低，至少锁定两个晚间低负荷保护时段。',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: 'life',
      title: '维持当前节奏',
      text: '本周负荷分布可控，下周继续保留写作块、实验窗口和恢复时段的边界。',
    });
  }

  return suggestions.slice(0, 3);
};

export const statusLabel: Record<TaskStatus, string> = {
  planned: '已计划',
  active: '进行中',
  done: '已完成',
  delayed: '延期',
  blocked: '阻塞',
  cancelled: '取消',
};
