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
  const riskCount = todayTasks.filter((task) => task.status === 'blocked' || task.status === 'delayed').length;
  const doneCount = todayTasks.filter((task) => task.status === 'done').length;

  return {
    taskCount: todayTasks.length,
    doneCount,
    riskCount,
    deepWorkHours: `${(deepWorkMinutes / 60).toFixed(1)}h`,
    loadPercent,
    highEnergyCount: todayTasks.filter((task) => task.energy === '高').length,
  };
};

const statusWeight: Record<TaskStatus, number> = {
  blocked: 0,
  delayed: 1,
  active: 2,
  planned: 3,
  done: 4,
  cancelled: 5,
};

export const sortTasksForToday = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    const riskDiff = statusWeight[a.status] - statusWeight[b.status];
    if (riskDiff !== 0) return riskDiff;
    const priorityDiff = (a.priority ?? 9) - (b.priority ?? 9);
    if (priorityDiff !== 0) return priorityDiff;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.energy !== b.energy) return a.energy === '高' ? -1 : b.energy === '高' ? 1 : 0;
    return a.start.localeCompare(b.start);
  });

export const getTimeBlock = (start: string) => {
  const hour = Number(start.slice(0, 2));
  if (hour < 12) return '上午';
  if (hour < 18) return '下午';
  return '晚上';
};

export const getTodayTimeBlocks = (tasks: Task[]) =>
  ['上午', '下午', '晚上'].map((label) => ({
    label,
    tasks: sortTasksForToday(tasks.filter((task) => getTimeBlock(task.start) === label)),
  }));

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

export const getWeeklyWorkloadDetails = (tasks: Task[], weekDays: WeekDay[]) =>
  weekDays.map((day) => {
    const dayTasks = getTasksForDate(tasks, day.date);
    const minutes = dayTasks.reduce((total, task) => total + task.duration, 0);
    const highEnergyCount = dayTasks.filter((task) => task.energy === '高').length;
    const riskCount = dayTasks.filter((task) => task.status === 'blocked' || task.status === 'delayed').length;
    const doneCount = dayTasks.filter((task) => task.status === 'done').length;
    const loadPercent = Math.min(100, Math.round((minutes / 360) * 100) + highEnergyCount * 8);
    const warnings: string[] = [];
    if (dayTasks.length >= 4) warnings.push('任务偏多');
    if (highEnergyCount >= 2) warnings.push('高脑力集中');
    if (riskCount >= 2) warnings.push('延期/阻塞堆积');

    return {
      ...day,
      taskCount: dayTasks.length,
      doneCount,
      riskCount,
      highEnergyCount,
      minutes,
      loadPercent,
      warnings,
    };
  });

export const getWeeklyWorkloadAlerts = (
  tasks: Task[],
  weekDays: WeekDay[],
): Array<{ day: string; title: string; text: string; tone: 'hot' | 'warn' | 'calm' }> => {
  const details = getWeeklyWorkloadDetails(tasks, weekDays);
  const alerts: Array<{ day: string; title: string; text: string; tone: 'hot' | 'warn' | 'calm' }> = details.flatMap((day) =>
    day.warnings.map((warning) => ({
      day: day.label,
      title: `${day.label}${warning}`,
      text: `${day.taskCount} 个任务，${day.highEnergyCount} 个高脑力，${day.riskCount} 个风险任务。`,
      tone: warning.includes('堆积') ? 'hot' : 'warn',
    })),
  );

  if (alerts.length > 0) return alerts.slice(0, 4);

  return [
    {
      day: '本周',
      title: '本周负载可控',
      text: '任务数量、高脑力分布和风险堆积都在可处理范围内。',
      tone: 'calm',
    },
  ];
};

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
