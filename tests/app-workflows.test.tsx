import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, storageKey } from '../src/App';

describe('App core workflows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('focuses global search with Ctrl+K', () => {
    render(<App />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByLabelText('搜索任务')).toHaveFocus();
  });

  it('opens the task form with dynamic research fields', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '新建任务' }));

    expect(screen.getByRole('heading', { name: '添加一个真实执行任务' })).toBeInTheDocument();
    expect(screen.getByLabelText('日期')).toHaveValue('2026-06-08');
    expect(screen.getByRole('combobox', { name: '所属课题/项目' })).toHaveTextContent('TA 论文');
    expect(screen.queryByLabelText('实际耗时')).not.toBeInTheDocument();
    expect(screen.getByText('已按“论文任务”显示专属字段。')).toBeInTheDocument();
    expect(screen.queryByLabelText('章节')).not.toBeInTheDocument();
    expect(screen.getByLabelText('前置条件/等待事项')).toBeInTheDocument();
    expect(screen.getByLabelText('补充记录')).toBeInTheDocument();
    expect(screen.queryByLabelText('地点')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: '任务类型' }), 'experiment');

    expect(screen.getByLabelText('样品')).toBeInTheDocument();
    expect(screen.getByLabelText('仪器')).toBeInTheDocument();
    expect(screen.getByLabelText('地点')).toBeInTheDocument();
    expect(screen.queryByLabelText('章节')).not.toBeInTheDocument();
  });

  it('creates a project from the task form and selects it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '新建任务' }));
    await user.click(screen.getByRole('button', { name: '快速新建课题/项目' }));
    await user.type(screen.getByLabelText('新项目名称'), '临时投稿项目');
    await user.click(screen.getByRole('button', { name: '创建并选中' }));

    expect(screen.getByRole('combobox', { name: '所属课题/项目' })).toHaveTextContent('临时投稿项目');
  });

  it('moves tasks to unassigned project when deleting a project with tasks', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockReturnValue('1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: '设置' }));
    await user.click(screen.getAllByLabelText('删除项目')[0]);

    expect(window.prompt).toHaveBeenCalled();
    expect(screen.getByText('项目已删除')).toBeInTheDocument();
    expect(screen.getByDisplayValue('未归属项目')).toBeInTheDocument();
  });

  it('shows local folder storage controls in settings', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: '设置' }));

    expect(screen.getByText('本地数据文件夹')).toBeInTheDocument();
    expect(screen.getByText('浏览器缓存模式')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '选择数据文件夹' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存到硬盘' })).toBeDisabled();
  });

  it('deletes a project directly from the projects page', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'prompt').mockReturnValue('1');
    render(<App />);

    await user.click(screen.getByRole('button', { name: '课题/项目' }));
    await user.click(screen.getAllByRole('button', { name: '删除项目' })[0]);

    expect(window.prompt).toHaveBeenCalled();
    expect(screen.getByText('项目已删除')).toBeInTheDocument();
  });

  it('closes detail drawers with an explicit exit button', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /1\s*转氨酶论文引言重写/ }));
    expect(screen.getByRole('heading', { name: '转氨酶论文引言重写' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '关闭' }));

    expect(screen.queryByRole('heading', { name: '转氨酶论文引言重写' })).not.toBeInTheDocument();
  });

  it('undoes batch completion from the action notice', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByLabelText('选择转氨酶论文引言重写')[0]);
    await user.click(screen.getByRole('button', { name: '批量完成' }));

    expect(screen.getByText('批量完成已应用')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /08:40 转氨酶论文引言重写.*已完成/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '撤销' }));

    expect(screen.queryByText('批量完成已应用')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /08:40 转氨酶论文引言重写.*进行中/ })).toBeInTheDocument();
  });

  it('confirms task deletion and restores it through undo', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /1\s*转氨酶论文引言重写/ }));
    await user.click(screen.getByRole('button', { name: '删除' }));

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByText('任务已删除')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /1\s*转氨酶论文引言重写/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '撤销' }));

    expect(screen.getByRole('button', { name: /1\s*转氨酶论文引言重写/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(storageKey)).toContain('转氨酶论文引言重写');
  });
});
