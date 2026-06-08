import { describe, expect, it } from 'vitest';
import { categories, fieldTemplates, tasks, widgets } from '../src/mockData';
import { defaultPersistedState, storageVersion, validatePersistedState } from '../src/App';

describe('persistence validation', () => {
  it('fills new persisted fields for older valid backups', () => {
    const backup = {
      version: 1,
      taskList: tasks,
      categoryList: categories,
      widgetList: widgets,
      templateList: fieldTemplates,
      activePresetId: 'today-execution',
      dailyReviewNote: '复盘',
      weeklyConclusion: '',
      nextWeekAdjustment: '',
      savedAt: '2026-06-08T00:00:00.000Z',
    };

    const result = validatePersistedState(backup);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.version).toBe(storageVersion);
    expect(result.state.projectList.length).toBeGreaterThan(0);
    expect(result.state.reviewMetricList.length).toBeGreaterThan(0);
    expect(result.state.customPresetList).toEqual([]);
    expect(result.state.displayDensity).toBe('comfortable');
  });

  it('rejects backups with invalid task shape', () => {
    const result = validatePersistedState({
      ...defaultPersistedState(),
      taskList: [{ id: 'broken' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain('任务列表结构无效');
  });
});
