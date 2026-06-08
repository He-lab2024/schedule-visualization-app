import { describe, expect, it } from 'vitest';
import { categories, projects, tasks, weekDays } from '../src/mockData';
import {
  getReviewStats,
  getTodayMetrics,
  getWeeklyWorkloadAlerts,
  sortTasksForToday,
} from '../src/selectors';

describe('dashboard selectors', () => {
  it('prioritizes risk and high priority tasks for today', () => {
    const sorted = sortTasksForToday(tasks.filter((task) => task.date === '2026-06-08'));

    expect(sorted.map((task) => task.id)).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('calculates today metrics from task data', () => {
    const metrics = getTodayMetrics(tasks, '2026-06-08');

    expect(metrics.taskCount).toBe(4);
    expect(metrics.doneCount).toBe(0);
    expect(metrics.riskCount).toBe(0);
    expect(metrics.highEnergyCount).toBe(2);
  });

  it('builds review stats across categories and projects', () => {
    const stats = getReviewStats(tasks, categories, projects);

    expect(stats.taskCount).toBe(tasks.length);
    expect(stats.blocked).toBeGreaterThan(0);
    expect(stats.categoryDistribution).toHaveLength(categories.length);
    expect(stats.projectDistribution).toHaveLength(projects.length);
    expect(stats.blockedByProject[0].label).toBe('底物谱实验');
  });

  it('emits workload alerts when risky work piles up', () => {
    const alerts = getWeeklyWorkloadAlerts(tasks, weekDays);

    expect(alerts.some((alert) => alert.title.includes('堆积') || alert.title.includes('集中'))).toBe(true);
  });
});
