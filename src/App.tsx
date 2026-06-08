import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  Copy,
  Download,
  FlaskConical,
  Gauge,
  HardDrive,
  Heart,
  Kanban,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Tags,
  Trash2,
  Upload,
} from 'lucide-react';
import type { CSSProperties, ComponentType, FormEvent, ReactNode } from 'react';
import { appDate, categories, fieldTemplates, projects, tasks as initialTasks, viewPresets, weekDays, widgets } from './mockData';
import {
  getCategoryMap,
  getEnergySummary,
  getHighEnergyLoads,
  getProjectRuntimeState,
  getReviewStats,
  getReviewSuggestions,
  getTodayTimeBlocks,
  getTasksForDate,
  getTasksForProject,
  getTodayMetrics,
  getWeeklyWorkloadAlerts,
  getWeeklyWorkloadDetails,
  getWeeklyLoads,
  sortTasksForToday,
  statusLabel,
  toMap,
} from './selectors';
import type { CategoryId, ProjectLane, ProjectStatus, Task, TaskStatus, ViewId } from './types';
import type { Category, FieldTemplate, ViewPreset, Widget } from './types';

const navItems: Array<{ id: ViewId; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'today', label: '今日驾驶舱', icon: LayoutDashboard },
  { id: 'week', label: '周计划矩阵', icon: CalendarDays },
  { id: 'projects', label: '项目进度', icon: Kanban },
  { id: 'workbench', label: '论文/实验', icon: FlaskConical },
  { id: 'review', label: '复盘分析', icon: BarChart3 },
  { id: 'settings', label: '设置模板', icon: Settings },
];

const projectMap = toMap(projects);

const fallbackCategory: Category = { id: 'custom', name: '自定义', color: '#607d8b', soft: '#edf2f4' };

const getCategory = (categoryList: Category[], categoryId: CategoryId) =>
  getCategoryMap(categoryList)[categoryId] ?? fallbackCategory;

const accentStyle = (categoryList: Category[], categoryId: CategoryId) => {
  const category = getCategory(categoryList, categoryId);
  return {
    '--accent': category.color,
    '--accent-soft': category.soft,
  } as CSSProperties;
};

const makeSoftColor = (hex: string) => `${hex}1a`;

type PersistedState = {
  version: 1;
  taskList: Task[];
  categoryList: Category[];
  widgetList: Widget[];
  templateList: FieldTemplate[];
  activePresetId: string;
  savedAt: string;
};

type TaskFilter = 'all' | 'active' | 'risk' | 'done';

const storageKey = 'research-schedule-dashboard-state-v1';

const taskStatuses: Array<{ id: TaskStatus; label: string }> = [
  { id: 'planned', label: '已计划' },
  { id: 'active', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'delayed', label: '延期' },
  { id: 'blocked', label: '阻塞' },
  { id: 'cancelled', label: '取消' },
];

const taskFilters: Array<{ id: TaskFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'risk', label: '风险' },
  { id: 'done', label: '已完成' },
];

const projectStatusLabel: Record<ProjectStatus, string> = {
  'not-started': '未开始',
  active: '进行中',
  risk: '风险',
  paused: '暂停',
  done: '完成',
};

const defaultPersistedState = (): PersistedState => ({
  version: 1,
  taskList: initialTasks,
  categoryList: categories,
  widgetList: widgets,
  templateList: fieldTemplates,
  activePresetId: viewPresets[0].id,
  savedAt: new Date().toISOString(),
});

const loadPersistedState = (): PersistedState => {
  if (typeof window === 'undefined') return defaultPersistedState();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return defaultPersistedState();

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      ...defaultPersistedState(),
      ...parsed,
      taskList: Array.isArray(parsed.taskList) ? parsed.taskList : initialTasks,
      categoryList: Array.isArray(parsed.categoryList) ? parsed.categoryList : categories,
      widgetList: Array.isArray(parsed.widgetList) ? parsed.widgetList : widgets,
      templateList: Array.isArray(parsed.templateList) ? parsed.templateList : fieldTemplates,
      activePresetId: parsed.activePresetId ?? viewPresets[0].id,
      version: 1,
    };
  } catch {
    return defaultPersistedState();
  }
};

const matchesTaskFilter = (task: Task, filter: TaskFilter) => {
  if (filter === 'all') return true;
  if (filter === 'active') return task.status === 'active' || task.status === 'planned';
  if (filter === 'risk') return task.status === 'blocked' || task.status === 'delayed';
  return task.status === 'done';
};

const matchesSearch = (task: Task, query: string, categoryList: Category[]) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const categoryName = getCategory(categoryList, task.category).name;
  const projectName = projectMap[task.projectId]?.name ?? '';
  return [task.title, task.location, task.detail, task.standard, task.dependency, categoryName, projectName]
    .join(' ')
    .toLowerCase()
    .includes(normalized);
};

function AppShell({
  activeView,
  setActiveView,
  taskList,
  children,
}: {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
  taskList: Task[];
  children: ReactNode;
}) {
  const weeklyLoads = getWeeklyLoads(taskList, weekDays);
  const peakLoad = weeklyLoads.reduce((max, item) => Math.max(max, item.value), 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">研</div>
          <div>
            <strong>科研日程驾驶舱</strong>
            <span>Research OS</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeView === item.id ? 'is-active' : ''}`}
                key={item.id}
                onClick={() => setActiveView(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-panel">
          <span className="panel-kicker">本周状态</span>
          <strong>{peakLoad >= 70 ? '负荷偏高' : '节奏可控'}</strong>
          <div className="load-meter">
            <span style={{ width: `${peakLoad}%` }} />
          </div>
          <p>高脑力任务、实验预约和生活恢复共同进入周负荷计算。</p>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}

function App() {
  const [initialState] = useState<PersistedState>(() => loadPersistedState());
  const [activeView, setActiveView] = useState<ViewId>('today');
  const [taskList, setTaskList] = useState<Task[]>(initialState.taskList);
  const [categoryList, setCategoryList] = useState<Category[]>(initialState.categoryList);
  const [widgetList, setWidgetList] = useState<Widget[]>(initialState.widgetList);
  const [templateList, setTemplateList] = useState<FieldTemplate[]>(initialState.templateList);
  const [activePresetId, setActivePresetId] = useState<ViewPreset['id']>(initialState.activePresetId);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectLane | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [creatingTaskDraft, setCreatingTaskDraft] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());

  const filteredTasks = useMemo(
    () =>
      taskList.filter(
        (task) => matchesTaskFilter(task, taskFilter) && matchesSearch(task, searchQuery, categoryList),
      ),
    [categoryList, searchQuery, taskFilter, taskList],
  );
  const todayTasks = useMemo(() => getTasksForDate(filteredTasks, appDate.today), [filteredTasks]);

  useEffect(() => {
    setSelectedTaskIds((current) => {
      const existingIds = new Set(taskList.map((task) => task.id));
      const next = new Set(Array.from(current).filter((taskId) => existingIds.has(taskId)));
      return next.size === current.size ? current : next;
    });
  }, [taskList]);

  useEffect(() => {
    const state: PersistedState = {
      version: 1,
      taskList,
      categoryList,
      widgetList,
      templateList,
      activePresetId,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [activePresetId, categoryList, taskList, templateList, widgetList]);

  const upsertTask = (task: Task) => {
    setTaskList((current) => {
      const exists = current.some((item) => item.id === task.id);
      return exists ? current.map((item) => (item.id === task.id ? task : item)) : [task, ...current];
    });
    setSelectedTask(task);
    setEditingTask(null);
    setIsCreatingTask(false);
    setCreatingTaskDraft(null);
  };

  const makeDefaultTask = (project?: ProjectLane): Task => ({
    id: `t-${Date.now()}`,
    title: '',
    category: project?.category ?? 'writing',
    projectId: project?.id ?? projects[0].id,
    date: appDate.today,
    start: '09:00',
    duration: 60,
    actualDuration: undefined,
    energy: '中',
    location: '办公室',
    status: 'planned',
    standard: '',
    dependency: '',
    delayReason: '',
    notes: project ? `来自项目「${project.name}」的下一步任务。` : '',
    detail: project ? project.next : '',
  });

  const startCreateTask = (project?: ProjectLane) => {
    setCreatingTaskDraft(project ? makeDefaultTask(project) : null);
    setEditingTask(null);
    setIsCreatingTask(true);
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTaskList((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const needsReason = (status === 'delayed' || status === 'blocked') && !task.delayReason?.trim();
        const delayReason = needsReason
          ? window.prompt(status === 'blocked' ? '请填写阻塞原因' : '请填写延期原因')?.trim()
          : task.delayReason;
        if (needsReason && !delayReason) return task;
        const nextTask = { ...task, status, delayReason };
        setSelectedTask(nextTask);
        return nextTask;
      }),
    );
  };

  const deleteTask = (taskId: string) => {
    const task = taskList.find((item) => item.id === taskId);
    if (!task) return;
    if (!window.confirm(`确认删除任务“${task.title}”？此操作会从当前数据中移除它。`)) return;
    setTaskList((current) => current.filter((item) => item.id !== taskId));
    setSelectedTask(null);
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      next.delete(taskId);
      return next;
    });
  };

  const duplicateTask = (task: Task) => {
    const nextTask: Task = {
      ...task,
      id: `t-${Date.now()}`,
      title: `${task.title} 副本`,
      status: task.status === 'done' || task.status === 'cancelled' ? 'planned' : task.status,
    };
    setTaskList((current) => [nextTask, ...current]);
    setSelectedTask(nextTask);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectFilteredTasks = () => {
    setSelectedTaskIds(new Set(filteredTasks.map((task) => task.id)));
  };

  const clearSelectedTasks = () => {
    setSelectedTaskIds(new Set());
  };

  const batchCompleteTasks = () => {
    if (selectedTaskIds.size === 0) return;
    setTaskList((current) =>
      current.map((task) => (selectedTaskIds.has(task.id) ? { ...task, status: 'done' } : task)),
    );
    setSelectedTask((current) => (current && selectedTaskIds.has(current.id) ? { ...current, status: 'done' } : current));
  };

  const batchUpdateDate = (date: string) => {
    if (!date || selectedTaskIds.size === 0) return;
    setTaskList((current) => current.map((task) => (selectedTaskIds.has(task.id) ? { ...task, date } : task)));
    setSelectedTask((current) => (current && selectedTaskIds.has(current.id) ? { ...current, date } : current));
  };

  const updateTaskDate = (taskId: string, date: string) => {
    if (!date) return;
    setTaskList((current) => current.map((task) => (task.id === taskId ? { ...task, date } : task)));
    setSelectedTask((current) => (current?.id === taskId ? { ...current, date } : current));
  };

  const batchUpdateCategory = (category: CategoryId) => {
    if (!category || selectedTaskIds.size === 0) return;
    setTaskList((current) => current.map((task) => (selectedTaskIds.has(task.id) ? { ...task, category } : task)));
    setSelectedTask((current) => (current && selectedTaskIds.has(current.id) ? { ...current, category } : current));
  };

  const batchDeleteTasks = () => {
    if (selectedTaskIds.size === 0) return;
    if (!window.confirm(`确认删除已选择的 ${selectedTaskIds.size} 个任务？此操作会从当前数据中移除它们。`)) return;
    setTaskList((current) => current.filter((task) => !selectedTaskIds.has(task.id)));
    setSelectedTask((current) => (current && selectedTaskIds.has(current.id) ? null : current));
    clearSelectedTasks();
  };

  const addCategory = (name: string, color: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setCategoryList((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        name: trimmedName,
        color,
        soft: makeSoftColor(color),
      },
    ]);
  };

  const updateCategoryColor = (categoryId: string, color: string) => {
    setCategoryList((current) =>
      current.map((category) => (category.id === categoryId ? { ...category, color, soft: makeSoftColor(color) } : category)),
    );
  };

  const toggleWidget = (widgetId: string) => {
    setWidgetList((current) =>
      current.map((widget) => (widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget)),
    );
  };

  const updateTemplateFields = (templateId: string, fields: string[]) => {
    setTemplateList((current) =>
      current.map((template) => (template.id === templateId ? { ...template, fields } : template)),
    );
  };

  const applyPreset = (preset: ViewPreset) => {
    setActivePresetId(preset.id);
    setWidgetList((current) =>
      current.map((widget) => ({
        ...widget,
        visible: preset.widgetIds.includes(widget.id),
      })),
    );
  };

  const exportData = () => {
    const state: PersistedState = {
      version: 1,
      taskList,
      categoryList,
      widgetList,
      templateList,
      activePresetId,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research-schedule-backup-${appDate.today}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<PersistedState>;
        setTaskList(Array.isArray(parsed.taskList) ? parsed.taskList : initialTasks);
        setCategoryList(Array.isArray(parsed.categoryList) ? parsed.categoryList : categories);
        setWidgetList(Array.isArray(parsed.widgetList) ? parsed.widgetList : widgets);
        setTemplateList(Array.isArray(parsed.templateList) ? parsed.templateList : fieldTemplates);
        setActivePresetId(parsed.activePresetId ?? viewPresets[0].id);
        setSelectedTask(null);
      } catch {
        window.alert('导入失败：JSON 结构无法识别。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AppShell activeView={activeView} setActiveView={setActiveView} taskList={taskList}>
      <TopBar
        activeView={activeView}
        searchQuery={searchQuery}
        taskFilter={taskFilter}
        onCreateTask={() => startCreateTask()}
        onJumpToday={() => setActiveView('today')}
        onJumpWeek={() => setActiveView('week')}
        onSearchChange={setSearchQuery}
        onTaskFilterChange={setTaskFilter}
      />
      {activeView !== 'settings' && (
        <BatchToolbar
          categoryList={categoryList}
          filteredCount={filteredTasks.length}
          selectedCount={selectedTaskIds.size}
          onBatchCategoryChange={batchUpdateCategory}
          onBatchComplete={batchCompleteTasks}
          onBatchDateChange={batchUpdateDate}
          onBatchDelete={batchDeleteTasks}
          onClearSelection={clearSelectedTasks}
          onSelectFiltered={selectFilteredTasks}
        />
      )}
      {activeView === 'today' && (
        <TodayDashboard
          allTasks={filteredTasks}
          categoryList={categoryList}
          selectedTaskIds={selectedTaskIds}
          todayTasks={todayTasks}
          widgetList={widgetList}
          onTaskDateChange={updateTaskDate}
          onSelectTask={setSelectedTask}
          onToggleTaskSelection={toggleTaskSelection}
        />
      )}
      {activeView === 'week' && (
        <WeeklyMatrix
          allTasks={filteredTasks}
          categoryList={categoryList}
          selectedTaskIds={selectedTaskIds}
          onTaskDateChange={updateTaskDate}
          onSelectTask={setSelectedTask}
          onToggleTaskSelection={toggleTaskSelection}
        />
      )}
      {activeView === 'projects' && (
        <ProjectProgress
          allTasks={filteredTasks}
          categoryList={categoryList}
          onCreateProjectTask={startCreateTask}
          onSelectProject={setSelectedProject}
        />
      )}
      {activeView === 'workbench' && (
        <Workbench
          allTasks={filteredTasks}
          categoryList={categoryList}
          selectedTaskIds={selectedTaskIds}
          onTaskDateChange={updateTaskDate}
          onSelectTask={setSelectedTask}
          onToggleTaskSelection={toggleTaskSelection}
        />
      )}
      {activeView === 'review' && <Review allTasks={filteredTasks} categoryList={categoryList} />}
      {activeView === 'settings' && (
        <SettingsView
          activePresetId={activePresetId}
          categoryList={categoryList}
          templateList={templateList}
          widgetList={widgetList}
          onAddCategory={addCategory}
          onApplyPreset={applyPreset}
          onExportData={exportData}
          onImportData={importData}
          onToggleWidget={toggleWidget}
          onUpdateCategoryColor={updateCategoryColor}
          onUpdateTemplateFields={updateTemplateFields}
        />
      )}
      <TaskDrawer
        categoryList={categoryList}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onDelete={deleteTask}
        onDuplicate={duplicateTask}
        onEdit={(task) => setEditingTask(task)}
        onStatusChange={updateTaskStatus}
      />
      <ProjectDrawer
        categoryList={categoryList}
        project={selectedProject}
        taskList={filteredTasks}
        onClose={() => setSelectedProject(null)}
        onCreateTask={startCreateTask}
      />
      {(editingTask || isCreatingTask) && (
        <TaskForm
          categoryList={categoryList}
          initialTask={creatingTaskDraft}
          task={editingTask}
          onCancel={() => {
            setEditingTask(null);
            setIsCreatingTask(false);
            setCreatingTaskDraft(null);
          }}
          onSave={upsertTask}
        />
      )}
    </AppShell>
  );
}

function TopBar({
  activeView,
  searchQuery,
  taskFilter,
  onCreateTask,
  onJumpToday,
  onJumpWeek,
  onSearchChange,
  onTaskFilterChange,
}: {
  activeView: ViewId;
  searchQuery: string;
  taskFilter: TaskFilter;
  onCreateTask: () => void;
  onJumpToday: () => void;
  onJumpWeek: () => void;
  onSearchChange: (query: string) => void;
  onTaskFilterChange: (filter: TaskFilter) => void;
}) {
  const current = navItems.find((item) => item.id === activeView);
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">
          {appDate.today} · {appDate.weekLabel}
        </span>
        <h1>{current?.label}</h1>
      </div>
      <div className="top-actions">
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label="搜索任务"
            placeholder="论文、实验、项目、地点"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="quick-jumps">
          <button onClick={onJumpToday} type="button">
            今日
          </button>
          <button onClick={onJumpWeek} type="button">
            本周
          </button>
        </div>
        <div className="filter-tabs">
          {taskFilters.map((filter) => (
            <button
              className={taskFilter === filter.id ? 'is-active' : ''}
              key={filter.id}
              onClick={() => onTaskFilterChange(filter.id)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button className="primary-action" onClick={onCreateTask} type="button">
          <Plus size={16} />
          <span>新建任务</span>
        </button>
        <button className="icon-button" type="button" aria-label="提醒">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}

function BatchToolbar({
  categoryList,
  filteredCount,
  selectedCount,
  onBatchCategoryChange,
  onBatchComplete,
  onBatchDateChange,
  onBatchDelete,
  onClearSelection,
  onSelectFiltered,
}: {
  categoryList: Category[];
  filteredCount: number;
  selectedCount: number;
  onBatchCategoryChange: (category: CategoryId) => void;
  onBatchComplete: () => void;
  onBatchDateChange: (date: string) => void;
  onBatchDelete: () => void;
  onClearSelection: () => void;
  onSelectFiltered: () => void;
}) {
  const hasSelection = selectedCount > 0;

  return (
    <section className="batch-toolbar" aria-label="批量任务操作">
      <div>
        <strong>{hasSelection ? `已选择 ${selectedCount} 个任务` : `${filteredCount} 个筛选结果`}</strong>
        <span>可批量完成、改日期、改分类或删除</span>
      </div>
      <div className="batch-actions">
        <button className="secondary-action" disabled={filteredCount === 0} onClick={onSelectFiltered} type="button">
          全选结果
        </button>
        <button className="secondary-action" disabled={!hasSelection} onClick={onClearSelection} type="button">
          清空
        </button>
        <button className="secondary-action" disabled={!hasSelection} onClick={onBatchComplete} type="button">
          <CheckCircle2 size={16} />
          <span>批量完成</span>
        </button>
        <label className={`batch-field ${!hasSelection ? 'is-disabled' : ''}`}>
          <CalendarCheck size={16} />
          <input disabled={!hasSelection} onChange={(event) => onBatchDateChange(event.target.value)} type="date" />
        </label>
        <label className={`batch-field ${!hasSelection ? 'is-disabled' : ''}`}>
          <Tags size={16} />
          <select
            disabled={!hasSelection}
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) {
                onBatchCategoryChange(event.target.value);
                event.currentTarget.value = '';
              }
            }}
          >
            <option value="">改分类</option>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <button className="danger-action" disabled={!hasSelection} onClick={onBatchDelete} type="button">
          <Trash2 size={16} />
          <span>批量删除</span>
        </button>
      </div>
    </section>
  );
}

function TodayDashboard({
  allTasks,
  categoryList,
  selectedTaskIds,
  todayTasks,
  widgetList,
  onTaskDateChange,
  onSelectTask,
  onToggleTaskSelection,
}: {
  allTasks: Task[];
  categoryList: Category[];
  selectedTaskIds: Set<string>;
  todayTasks: Task[];
  widgetList: Widget[];
  onTaskDateChange: (taskId: string, date: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskSelection: (taskId: string) => void;
}) {
  const todayMetrics = getTodayMetrics(allTasks, appDate.today);
  const energySummary = getEnergySummary(todayTasks);
  const activeProjects = projects.filter((project) => getTasksForProject(todayTasks, project.id).length > 0);
  const reminders = allTasks
    .filter((task) => task.status === 'blocked' || task.status === 'delayed' || task.date === appDate.today)
    .slice(0, 3);
  const recommendedTasks = sortTasksForToday(todayTasks);
  const timeBlocks = getTodayTimeBlocks(todayTasks);
  const isWidgetVisible = (widgetId: string) => widgetList.find((widget) => widget.id === widgetId)?.visible;

  return (
    <section className="page-grid today-grid">
      <div className="span-8 hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">今日关键推进点</span>
          <h2>上午锁定引言逻辑，下午用复测数据收束图 3。</h2>
          <p>今日最重要的不是塞满任务，而是保住两个高脑力块和一个实验窗口。</p>
        </div>
        <div className="hero-metrics">
          <Metric value={String(todayMetrics.taskCount)} label="今日任务" />
          <Metric value={String(todayMetrics.doneCount)} label="已完成" />
          <Metric value={String(todayMetrics.riskCount)} label="风险任务" tone={todayMetrics.riskCount > 0 ? 'warn' : undefined} />
          <Metric value={String(todayMetrics.highEnergyCount)} label="高能量" />
        </div>
      </div>

      <div className="span-4 panel">
        <PanelTitle icon={ListChecks} title="今日推荐顺序" />
        <div className="priority-list">
          {recommendedTasks.length === 0 ? (
            <EmptyState title="没有匹配的今日重点" text="调整搜索或状态筛选后，这里会重新显示优先级最高的任务。" />
          ) : (
            recommendedTasks.slice(0, 5).map((task, index) => (
              <div className="selectable-task" key={task.id}>
                <input
                  aria-label={`选择${task.title}`}
                  checked={selectedTaskIds.has(task.id)}
                  onChange={() => onToggleTaskSelection(task.id)}
                  type="checkbox"
                />
                <button className="priority-item" onClick={() => onSelectTask(task)} type="button">
                  <span>{index + 1}</span>
                  <strong>{task.title}</strong>
                  <ChevronRight size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {isWidgetVisible('timeline') && (
        <div className="span-7 panel">
          <PanelTitle icon={Clock3} title="今日时间轴" />
          <div className="timeline">
            {recommendedTasks.length === 0 ? (
              <EmptyState title="今日没有匹配任务" text="搜索和状态筛选会同步作用到今日时间轴。" />
            ) : (
              recommendedTasks.map((task) => (
                <div className="selectable-task task-with-date" key={task.id}>
                  <input
                    aria-label={`选择${task.title}`}
                    checked={selectedTaskIds.has(task.id)}
                    onChange={() => onToggleTaskSelection(task.id)}
                    type="checkbox"
                  />
                  <button
                    className={`timeline-item status-${task.status}`}
                    onClick={() => onSelectTask(task)}
                    style={accentStyle(categoryList, task.category)}
                    type="button"
                  >
                    <span className="time">{task.start}</span>
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        {task.duration} 分钟 · {projectMap[task.projectId].name} · {statusLabel[task.status]} · 优先级
                        {task.priority ?? '未设'}
                      </small>
                    </div>
                    <CategoryPill category={task.category} categoryList={categoryList} />
                  </button>
                  <input
                    aria-label={`调整${task.title}日期`}
                    className="quick-date-input"
                    onChange={(event) => onTaskDateChange(task.id, event.target.value)}
                    type="date"
                    value={task.date}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {isWidgetVisible('project-progress') && (
        <div className="span-5 panel">
          <PanelTitle icon={Gauge} title="项目状态" />
          <div className="project-stack">
            {activeProjects.length === 0 ? (
              <EmptyState title="没有匹配项目" text="当前筛选下，今日没有项目任务需要推进。" />
            ) : (
              activeProjects.map((project) => (
                <ProjectCard key={project.id} categoryList={categoryList} project={project} taskList={allTasks} />
              ))
            )}
          </div>
        </div>
      )}

      {isWidgetVisible('deadline-alerts') && (
        <div className="span-5 panel">
          <PanelTitle icon={AlertTriangle} title="近期提醒" />
          <div className="reminder-list">
            {reminders.length === 0 ? (
              <EmptyState title="没有匹配提醒" text="风险、延期和今日任务会在这里优先出现。" />
            ) : (
              reminders.map((task) => (
                <Reminder
                  key={task.id}
                  title={task.title}
                  meta={`${task.date} ${task.start} · ${projectMap[task.projectId].name}`}
                  tone={task.status === 'blocked' ? 'hot' : task.status === 'delayed' ? 'warn' : 'calm'}
                />
              ))
            )}
          </div>
        </div>
      )}

      {isWidgetVisible('energy-load') && (
        <div className="span-7 panel">
          <PanelTitle icon={Brain} title="精力负荷" />
          <div className="energy-board">
            {energySummary.map((item) => (
              <EnergyBlock
                key={item.label}
                label={item.label}
                value={item.value}
                color={item.label.startsWith('高') ? '#5b6ee1' : item.label.startsWith('中') ? '#d4554f' : '#4f7b62'}
              />
            ))}
            <EnergyBlock label="项目数" value={activeProjects.length} color="#7a5c98" />
          </div>
        </div>
      )}

      <div className="span-12 panel">
        <PanelTitle icon={CalendarCheck} title="今日时间块" />
        <div className="time-block-grid">
          {timeBlocks.map((block) => (
            <div className="time-block" key={block.label}>
              <strong>{block.label}</strong>
              {block.tasks.length === 0 ? (
                <span>暂无安排</span>
              ) : (
                block.tasks.map((task) => (
                  <button key={task.id} onClick={() => onSelectTask(task)} type="button">
                    <span className={`status-dot status-${task.status}`} />
                    <small>{task.start}</small>
                    <b>{task.title}</b>
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WeeklyMatrix({
  allTasks,
  categoryList,
  selectedTaskIds,
  onTaskDateChange,
  onSelectTask,
  onToggleTaskSelection,
}: {
  allTasks: Task[];
  categoryList: Category[];
  selectedTaskIds: Set<string>;
  onTaskDateChange: (taskId: string, date: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskSelection: (taskId: string) => void;
}) {
  const weeklyLoads = getWeeklyLoads(allTasks, weekDays);
  const workloadDetails = getWeeklyWorkloadDetails(allTasks, weekDays);
  const workloadAlerts = getWeeklyWorkloadAlerts(allTasks, weekDays);

  return (
    <section className="page-grid">
      <div className="span-12 panel">
        <PanelTitle icon={Gauge} title="每日负载" />
        <div className="weekly-load-grid">
          {workloadDetails.map((detail) => (
            <WeeklyLoadCard key={detail.date} detail={detail} />
          ))}
        </div>
      </div>

      <div className="span-12 panel">
        <PanelTitle icon={AlertTriangle} title="超载提醒" />
        <div className="workload-alert-grid">
          {workloadAlerts.map((alert) => (
            <WorkloadAlert key={`${alert.day}-${alert.title}`} title={alert.title} text={alert.text} tone={alert.tone} />
          ))}
        </div>
      </div>

      <div className="span-12 panel full-panel">
        <PanelTitle icon={CalendarDays} title="日期 × 任务类型" />
        <div className="week-matrix">
          <div className="matrix-corner">类型</div>
          {weekDays.map((day) => (
            <div className="matrix-day" key={day.date}>
              <strong>{day.label}</strong>
              <span>{day.short}</span>
            </div>
          ))}
          {categoryList.map((category) => (
            <div className="matrix-row" key={category.id}>
              <div className="matrix-type" style={accentStyle(categoryList, category.id)}>
                <span />
                {category.name}
              </div>
              {weekDays.map((day) => {
                const dayTasks = allTasks.filter((task) => task.date === day.date && task.category === category.id);
                return (
                  <div className={`matrix-cell ${dayTasks.length > 1 ? 'is-dense' : ''}`} key={`${category.id}-${day.date}`}>
                    {dayTasks.map((task) => (
                      <div className="mini-task-wrap" key={task.id}>
                        <input
                          aria-label={`选择${task.title}`}
                          checked={selectedTaskIds.has(task.id)}
                          onChange={() => onToggleTaskSelection(task.id)}
                          type="checkbox"
                        />
                        <button
                          className={`mini-task status-${task.status}`}
                          onClick={() => onSelectTask(task)}
                          style={accentStyle(categoryList, task.category)}
                          type="button"
                        >
                          <strong>{task.title}</strong>
                          <span>
                            {task.start} · {statusLabel[task.status]}
                          </span>
                        </button>
                        <input
                          aria-label={`调整${task.title}日期`}
                          className="quick-date-input"
                          onChange={(event) => onTaskDateChange(task.id, event.target.value)}
                          type="date"
                          value={task.date}
                        />
                      </div>
                    ))}
                    {dayTasks.length === 0 && <span className="empty-slot" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="matrix-footer">
          {weeklyLoads.map((item) => (
            <LoadChip key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectProgress({
  allTasks,
  categoryList,
  onCreateProjectTask,
  onSelectProject,
}: {
  allTasks: Task[];
  categoryList: Category[];
  onCreateProjectTask: (project: ProjectLane) => void;
  onSelectProject: (project: ProjectLane) => void;
}) {
  const visibleProjects = projects.filter((project) => getTasksForProject(allTasks, project.id).length > 0);

  return (
    <section className="page-grid">
      <div className="span-12 lane-board">
        {visibleProjects.length === 0 && (
          <EmptyState title="没有匹配的项目任务" text="项目页会跟随顶部搜索和状态筛选，只展示命中的项目线。" />
        )}
        {visibleProjects.map((project) => {
          const runtime = getProjectRuntimeState(project, allTasks);
          return (
            <div className="project-lane" key={project.id} style={accentStyle(categoryList, project.category)}>
              <div className="lane-head">
                <CategoryPill category={project.category} categoryList={categoryList} />
                <strong>{project.name}</strong>
                <span>{projectStatusLabel[runtime.status as ProjectStatus]}</span>
              </div>
              <div className="lane-progress">
                <span style={{ width: `${project.progress}%` }} />
              </div>
              <div className="project-trend" aria-label={`${project.name}进度趋势`}>
                {runtime.progressTrend.map((value, index) => (
                  <i key={`${project.id}-${index}`} style={{ height: `${Math.max(14, value)}%` }} />
                ))}
              </div>
              <div className="lane-grid">
                <InfoCell label="进度" value={`${project.progress}%`} />
                <InfoCell label="阶段" value={project.stage} />
                <InfoCell label="截止日期" value={project.deadline} alert={runtime.status === 'risk'} />
                <InfoCell label="任务统计" value={`${runtime.taskCount} 总 · ${runtime.doneCount} 完成 · ${runtime.riskCount} 风险`} alert={runtime.riskCount > 0} />
                <InfoCell label="下一步" value={runtime.nextTask?.title ?? project.next} />
                <InfoCell label="风险提示" value={runtime.blocker} alert={runtime.riskCount > 0} />
                <InfoCell label="当前节奏" value={project.cadence} />
                <InfoCell label="里程碑" value={`${project.milestones.filter((milestone) => milestone.done).length}/${project.milestones.length} 完成`} />
              </div>
              <div className="project-actions">
                <button className="secondary-action" onClick={() => onSelectProject(project)} type="button">
                  查看详情
                </button>
                <button className="primary-action" onClick={() => onCreateProjectTask(project)} type="button">
                  <Plus size={16} />
                  <span>新建任务</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Workbench({
  allTasks,
  categoryList,
  selectedTaskIds,
  onTaskDateChange,
  onSelectTask,
  onToggleTaskSelection,
}: {
  allTasks: Task[];
  categoryList: Category[];
  selectedTaskIds: Set<string>;
  onTaskDateChange: (taskId: string, date: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskSelection: (taskId: string) => void;
}) {
  const writingTasks = allTasks.filter((task) => task.category === 'writing');
  const experimentTasks = allTasks.filter((task) => task.category === 'experiment');
  const currentPaper = writingTasks.find((task) => task.paperFields)?.paperFields;
  const currentExperiment = experimentTasks.find((task) => task.experimentFields)?.experimentFields;

  return (
    <section className="page-grid">
      <div className="span-6 panel work-panel">
        <PanelTitle icon={BookOpen} title="论文工作台" />
        <div className="work-meta-grid">
          <InfoCell label="章节" value={currentPaper?.chapter ?? '未设置'} />
          <InfoCell label="图表" value={currentPaper?.figure ?? '未设置'} />
          <InfoCell label="版本" value={currentPaper?.version ?? '未设置'} />
          <InfoCell label="反馈" value={currentPaper?.feedback ?? '未设置'} alert />
        </div>
        <TaskList
          categoryList={categoryList}
          selectedTaskIds={selectedTaskIds}
          tasks={writingTasks}
          onTaskDateChange={onTaskDateChange}
          onSelectTask={onSelectTask}
          onToggleTaskSelection={onToggleTaskSelection}
        />
      </div>
      <div className="span-6 panel work-panel">
        <PanelTitle icon={Beaker} title="实验工作台" />
        <div className="work-meta-grid">
          <InfoCell label="样品" value={currentExperiment?.sample ?? '未设置'} />
          <InfoCell label="仪器" value={`${currentExperiment?.instrument ?? '未设置'} · ${currentExperiment?.reservation ?? ''}`} />
          <InfoCell label="条件" value={currentExperiment?.condition ?? '未设置'} />
          <InfoCell label="等待期" value={currentExperiment?.waiting ?? '未设置'} alert />
        </div>
        <TaskList
          categoryList={categoryList}
          selectedTaskIds={selectedTaskIds}
          tasks={experimentTasks}
          onTaskDateChange={onTaskDateChange}
          onSelectTask={onSelectTask}
          onToggleTaskSelection={onToggleTaskSelection}
        />
      </div>
    </section>
  );
}

function Review({ allTasks, categoryList }: { allTasks: Task[]; categoryList: Category[] }) {
  const stats = getReviewStats(allTasks, categoryList);
  const highEnergyLoads = getHighEnergyLoads(allTasks, weekDays);
  const suggestions = getReviewSuggestions(allTasks, weekDays);
  const suggestionIcons = {
    writing: PenLine,
    experiment: Beaker,
    life: Heart,
  };

  return (
    <section className="page-grid">
      {allTasks.length === 0 && (
        <div className="span-12 panel">
          <EmptyState title="没有可复盘的匹配任务" text="当前复盘指标基于顶部搜索和状态筛选计算。" />
        </div>
      )}
      <div className="span-4 panel stat-panel">
        <Metric value={`${stats.completionRate}%`} label="完成率" />
        <div className="donut" style={{ '--value': `${stats.completionRate}%` } as CSSProperties}>
          <span>{stats.completionRate}</span>
        </div>
      </div>
      <div className="span-4 panel stat-panel">
        <Metric value={`${stats.delayRate}%`} label="延期率" tone="warn" />
        <div className="reason-bars">
          {(stats.reasons.length ? stats.reasons : [{ label: '暂无延期', value: 0 }]).map((reason) => (
            <ReasonBar key={reason.label} label={reason.label} value={reason.value} />
          ))}
        </div>
      </div>
      <div className="span-4 panel stat-panel">
        <Metric value={`${stats.writingHours}h`} label="论文投入" />
        <div className="distribution">
          {stats.categoryDistribution.map((item) => (
            <span
              key={item.category.id}
              title={`${item.category.name} ${item.minutes} 分钟`}
              style={{
                background: item.category.color,
                width: `${item.percent}%`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={Brain} title="高脑力任务负荷" />
        <div className="matrix-footer">
          {highEnergyLoads.map((item) => (
            <LoadChip key={item.label} label={item.label} value={Math.min(100, item.value * 34)} />
          ))}
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={SlidersHorizontal} title="下周建议" />
        <div className="suggestion-grid">
          {suggestions.map((suggestion) => (
            <Suggestion
              key={suggestion.title}
              icon={suggestionIcons[suggestion.type]}
              title={suggestion.title}
              text={suggestion.text}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function SettingsView({
  activePresetId,
  categoryList,
  templateList,
  widgetList,
  onAddCategory,
  onApplyPreset,
  onExportData,
  onImportData,
  onToggleWidget,
  onUpdateCategoryColor,
  onUpdateTemplateFields,
}: {
  activePresetId: string;
  categoryList: Category[];
  templateList: FieldTemplate[];
  widgetList: Widget[];
  onAddCategory: (name: string, color: string) => void;
  onApplyPreset: (preset: ViewPreset) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  onToggleWidget: (widgetId: string) => void;
  onUpdateCategoryColor: (categoryId: string, color: string) => void;
  onUpdateTemplateFields: (templateId: string, fields: string[]) => void;
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3f6f8f');

  const submitCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAddCategory(newCategoryName, newCategoryColor);
    setNewCategoryName('');
  };

  return (
    <section className="page-grid">
      <div className="span-5 panel">
        <PanelTitle icon={SlidersHorizontal} title="任务类型颜色" />
        <div className="settings-list">
          {categoryList.map((category) => (
            <div className="setting-row" key={category.id}>
              <input
                aria-label={`${category.name}颜色`}
                className="color-input"
                type="color"
                value={category.color}
                onChange={(event) => onUpdateCategoryColor(category.id, event.target.value)}
              />
              <strong>{category.name}</strong>
              <span>{category.color}</span>
            </div>
          ))}
        </div>
        <form className="inline-form" onSubmit={submitCategory}>
          <input
            placeholder="新增类型名称"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
          />
          <input
            aria-label="新增类型颜色"
            className="color-input"
            type="color"
            value={newCategoryColor}
            onChange={(event) => setNewCategoryColor(event.target.value)}
          />
          <button className="secondary-action" type="submit">
            新增类型
          </button>
        </form>
      </div>
      <div className="span-7 panel">
        <PanelTitle icon={Settings} title="字段模板" />
        <div className="template-grid">
          {templateList.map((template) => (
            <TemplateCard
              key={template.id}
              title={template.name}
              fields={template.fields}
              onChange={(fields) => onUpdateTemplateFields(template.id, fields)}
            />
          ))}
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={LayoutDashboard} title="首页模块与预设布局" />
        <div className="preset-row">
          {viewPresets.map((preset) => (
            <button
              className={activePresetId === preset.id ? 'preset is-active' : 'preset'}
              key={preset.id}
              onClick={() => onApplyPreset(preset)}
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>
        <div className="widget-row">
          {widgetList.map((widget) => (
            <label className="widget-toggle" key={widget.id}>
              <input checked={widget.visible} onChange={() => onToggleWidget(widget.id)} type="checkbox" />
              <span>{widget.name}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={HardDrive} title="本地备份与桌面化" />
        <div className="backup-grid">
          <div className="backup-actions">
            <button className="primary-action" onClick={onExportData} type="button">
              <Download size={16} />
              <span>导出 JSON</span>
            </button>
            <label className="secondary-action import-button">
              <Upload size={16} />
              <span>导入 JSON</span>
              <input
                accept="application/json"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportData(file);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          <div className="desktop-plan">
            <InfoCell label="当前存储" value="localStorage 自动保存，刷新页面不丢数据" />
            <InfoCell label="备份方式" value="导出/导入同一份 JSON 状态" />
            <InfoCell label="桌面方案" value="优先 Tauri：体积小、离线友好；Electron 作为兼容备选" />
          </div>
        </div>
      </div>
    </section>
  );
}

function TaskForm({
  categoryList,
  initialTask,
  task,
  onCancel,
  onSave,
}: {
  categoryList: Category[];
  initialTask: Task | null;
  task: Task | null;
  onCancel: () => void;
  onSave: (task: Task) => void;
}) {
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState<Task>(
    task ?? initialTask ?? {
      id: `t-${Date.now()}`,
      title: '',
      category: 'writing',
      projectId: projects[0].id,
      date: appDate.today,
      start: '09:00',
      duration: 60,
      actualDuration: undefined,
      energy: '中',
      location: '办公室',
      status: 'planned',
      standard: '',
      dependency: '',
      delayReason: '',
      notes: '',
      detail: '',
    },
  );

  const updateDraft = <K extends keyof Task>(key: K, value: Task[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = draft.title.trim();
    const duration = Number(draft.duration);
    const actualDuration = draft.actualDuration === undefined ? undefined : Number(draft.actualDuration);
    const delayReason = draft.delayReason?.trim() || undefined;

    if (!title) {
      setFormError('请填写任务标题。');
      return;
    }
    if (!Number.isFinite(duration) || duration < 15) {
      setFormError('预计时长至少为 15 分钟。');
      return;
    }
    if (actualDuration !== undefined && (!Number.isFinite(actualDuration) || actualDuration < 0)) {
      setFormError('实际耗时不能小于 0。');
      return;
    }
    if ((draft.status === 'delayed' || draft.status === 'blocked') && !delayReason) {
      setFormError('延期或阻塞任务需要填写原因。');
      return;
    }

    onSave({
      ...draft,
      title,
      duration,
      actualDuration,
      delayReason,
      notes: draft.notes?.trim() || undefined,
      detail: draft.detail.trim() || draft.standard.trim() || '待补充任务说明。',
    });
  };

  return (
    <div className="modal-backdrop">
      <form className="task-form" onSubmit={submitTask}>
        <div className="form-head">
          <div>
            <span className="eyebrow">{task ? '编辑任务' : '新建任务'}</span>
            <h2>{task ? task.title : '添加一个真实执行任务'}</h2>
          </div>
          <button className="drawer-close" onClick={onCancel} type="button">
            ×
          </button>
        </div>

        <label className="field span-2">
          <span>标题</span>
          <input value={draft.title} onChange={(event) => updateDraft('title', event.target.value)} />
        </label>
        <label className="field">
          <span>类别</span>
          <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value as CategoryId)}>
            {categoryList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>所属项目</span>
          <select value={draft.projectId} onChange={(event) => updateDraft('projectId', event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>日期</span>
          <input value={draft.date} onChange={(event) => updateDraft('date', event.target.value)} type="date" />
        </label>
        <label className="field">
          <span>开始时间</span>
          <input value={draft.start} onChange={(event) => updateDraft('start', event.target.value)} type="time" />
        </label>
        <label className="field">
          <span>预计时长</span>
          <input
            min={15}
            step={15}
            type="number"
            value={draft.duration}
            onChange={(event) => updateDraft('duration', Number(event.target.value))}
          />
        </label>
        <label className="field">
          <span>实际耗时</span>
          <input
            min={0}
            step={15}
            type="number"
            value={draft.actualDuration ?? ''}
            onChange={(event) =>
              updateDraft('actualDuration', event.target.value === '' ? undefined : Number(event.target.value))
            }
          />
        </label>
        <label className="field">
          <span>精力等级</span>
          <select value={draft.energy} onChange={(event) => updateDraft('energy', event.target.value as Task['energy'])}>
            <option value="低">低</option>
            <option value="中">中</option>
            <option value="高">高</option>
          </select>
        </label>
        <label className="field">
          <span>状态</span>
          <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value as TaskStatus)}>
            {taskStatuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>优先级</span>
          <select
            value={draft.priority ?? ''}
            onChange={(event) =>
              updateDraft('priority', event.target.value === '' ? undefined : (Number(event.target.value) as Task['priority']))
            }
          >
            <option value="">未设置</option>
            <option value="1">高</option>
            <option value="2">中</option>
            <option value="3">低</option>
          </select>
        </label>
        <label className="field">
          <span>地点</span>
          <input value={draft.location} onChange={(event) => updateDraft('location', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>依赖关系</span>
          <input value={draft.dependency} onChange={(event) => updateDraft('dependency', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>完成标准</span>
          <input value={draft.standard} onChange={(event) => updateDraft('standard', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>延期/阻塞原因</span>
          <input value={draft.delayReason ?? ''} onChange={(event) => updateDraft('delayReason', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>备注</span>
          <textarea value={draft.notes ?? ''} onChange={(event) => updateDraft('notes', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>任务说明</span>
          <textarea value={draft.detail} onChange={(event) => updateDraft('detail', event.target.value)} />
        </label>

        {formError && <div className="form-error">{formError}</div>}
        <div className="form-actions">
          <button className="secondary-action" onClick={onCancel} type="button">
            取消
          </button>
          <button className="primary-action" type="submit">
            保存任务
          </button>
        </div>
      </form>
    </div>
  );
}

function TaskDrawer({
  categoryList,
  task,
  onClose,
  onDelete,
  onDuplicate,
  onEdit,
  onStatusChange,
}: {
  categoryList: Category[];
  task: Task | null;
  onClose: () => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: Task) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  if (!task) return null;

  return (
    <aside className="task-drawer">
      <button className="drawer-close" onClick={onClose} type="button">
        ×
      </button>
      <CategoryPill category={task.category} categoryList={categoryList} />
      <h2>{task.title}</h2>
      <p>{task.detail}</p>
      <div className="drawer-actions">
        <button onClick={() => onEdit(task)} type="button">
          编辑
        </button>
        <button onClick={() => onDuplicate(task)} type="button">
          <Copy size={15} />
          复制
        </button>
        {task.status === 'done' ? (
          <button onClick={() => onStatusChange(task.id, 'active')} type="button">
            <RotateCcw size={15} />
            恢复
          </button>
        ) : (
          <button onClick={() => onStatusChange(task.id, 'done')} type="button">
            <CheckCircle2 size={15} />
            完成
          </button>
        )}
        <button className="danger-action" onClick={() => onDelete(task.id)} type="button">
          <Trash2 size={15} />
          删除
        </button>
      </div>
      <div className="status-switcher">
        {taskStatuses.map((status) => (
          <button
            className={task.status === status.id ? 'is-active' : ''}
            key={status.id}
            onClick={() => onStatusChange(task.id, status.id)}
            type="button"
          >
            {status.label}
          </button>
        ))}
      </div>
      <div className="drawer-actions">
        <button onClick={() => onStatusChange(task.id, 'delayed')} type="button">
          延期
        </button>
        <button onClick={() => onStatusChange(task.id, 'cancelled')} type="button">
          取消
        </button>
      </div>
      <div className="drawer-grid">
        <InfoCell label="所属项目" value={projectMap[task.projectId].name} />
        <InfoCell label="任务状态" value={statusLabel[task.status]} alert={task.status === 'blocked' || task.status === 'delayed'} />
        <InfoCell label="预计时长" value={`${task.duration} 分钟`} />
        <InfoCell label="实际耗时" value={task.actualDuration ? `${task.actualDuration} 分钟` : '未记录'} />
        <InfoCell label="精力等级" value={task.energy} />
        <InfoCell label="地点" value={task.location} />
        <InfoCell label="截止时间" value={`${task.date} ${task.start}`} />
        <InfoCell label="依赖关系" value={task.dependency} />
        <InfoCell label="完成标准" value={task.standard} />
        <InfoCell label="延期/阻塞原因" value={task.delayReason ?? '无'} alert={Boolean(task.delayReason)} />
        <InfoCell label="备注" value={task.notes ?? '无'} />
      </div>
    </aside>
  );
}

function ProjectDrawer({
  categoryList,
  project,
  taskList,
  onClose,
  onCreateTask,
}: {
  categoryList: Category[];
  project: ProjectLane | null;
  taskList: Task[];
  onClose: () => void;
  onCreateTask: (project: ProjectLane) => void;
}) {
  if (!project) return null;

  const runtime = getProjectRuntimeState(project, taskList);
  const projectTasks = getTasksForProject(taskList, project.id);

  return (
    <aside className="task-drawer project-drawer">
      <button className="drawer-close" onClick={onClose} type="button">
        ×
      </button>
      <CategoryPill category={project.category} categoryList={categoryList} />
      <h2>{project.name}</h2>
      <p>{project.stage}</p>
      <div className="drawer-actions">
        <button className="primary-action" onClick={() => onCreateTask(project)} type="button">
          <Plus size={16} />
          <span>从项目创建任务</span>
        </button>
      </div>
      <div className="drawer-grid">
        <InfoCell label="项目状态" value={projectStatusLabel[runtime.status as ProjectStatus]} alert={runtime.status === 'risk'} />
        <InfoCell label="截止日期" value={project.deadline} />
        <InfoCell label="当前阶段" value={project.stage} />
        <InfoCell label="下一个关键动作" value={runtime.nextTask?.title ?? project.next} />
        <InfoCell label="总任务" value={`${runtime.taskCount} 个`} />
        <InfoCell label="已完成" value={`${runtime.doneCount} 个`} />
        <InfoCell label="延期" value={`${runtime.delayedCount} 个`} alert={runtime.delayedCount > 0} />
        <InfoCell label="阻塞" value={`${runtime.blockedCount} 个`} alert={runtime.blockedCount > 0} />
      </div>
      <div className="project-detail-section">
        <PanelTitle icon={CalendarCheck} title="里程碑" />
        <div className="milestone-list">
          {project.milestones.map((milestone) => (
            <div className={milestone.done ? 'milestone is-done' : 'milestone'} key={milestone.id}>
              <span>{milestone.done ? '完成' : '待办'}</span>
              <strong>{milestone.title}</strong>
              <small>{milestone.date}</small>
            </div>
          ))}
        </div>
      </div>
      <div className="project-detail-section">
        <PanelTitle icon={BarChart3} title="进度趋势" />
        <div className="project-trend project-trend-large">
          {runtime.progressTrend.map((value, index) => (
            <i key={`${project.id}-drawer-${index}`} style={{ height: `${Math.max(14, value)}%` }} />
          ))}
        </div>
      </div>
      <div className="project-detail-section">
        <PanelTitle icon={AlertTriangle} title="项目风险" />
        <div className="risk-list">
          {runtime.riskTips.map((tip) => (
            <span key={tip}>{tip}</span>
          ))}
        </div>
      </div>
      <div className="project-detail-section">
        <PanelTitle icon={ListChecks} title="项目任务" />
        <div className="compact-task-list">
          {projectTasks.length === 0 ? (
            <EmptyState title="没有匹配任务" text="当前搜索或状态筛选下，这个项目没有可显示任务。" />
          ) : (
            projectTasks.map((task) => (
              <button key={task.id} style={accentStyle(categoryList, task.category)} type="button">
                <span className={`status-dot status-${task.status}`} />
                <strong>{task.title}</strong>
                <small>
                  {task.date} · {statusLabel[task.status]}
                </small>
              </button>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

function PanelTitle({ icon: Icon, title }: { icon: ComponentType<{ size?: number }>; title: string }) {
  return (
    <div className="panel-title">
      <Icon size={18} />
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ value, label, tone }: { value: string; label: string; tone?: 'warn' }) {
  return (
    <div className={`metric ${tone === 'warn' ? 'metric-warn' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function CategoryPill({ category, categoryList }: { category: CategoryId; categoryList: Category[] }) {
  const item = getCategory(categoryList, category);
  return (
    <span className="category-pill" style={accentStyle(categoryList, category)}>
      {item.name}
    </span>
  );
}

function ProjectCard({ categoryList, project, taskList }: { categoryList: Category[]; project: ProjectLane; taskList: Task[] }) {
  const runtime = getProjectRuntimeState(project, taskList);
  return (
    <div className="project-card" style={accentStyle(categoryList, project.category)}>
      <div>
        <strong>{project.name}</strong>
        <span>{runtime.nextTask?.title ?? project.stage}</span>
      </div>
      <div className="tiny-progress">
        <span style={{ width: `${project.progress}%` }} />
      </div>
    </div>
  );
}

function Reminder({ title, meta, tone }: { title: string; meta: string; tone: 'hot' | 'warn' | 'calm' }) {
  return (
    <div className={`reminder reminder-${tone}`}>
      <CircleDot size={16} />
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
      </div>
    </div>
  );
}

function EnergyBlock({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="energy-block">
      <span style={{ background: color }} />
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function WeeklyLoadCard({
  detail,
}: {
  detail: {
    label: string;
    short: string;
    taskCount: number;
    doneCount: number;
    riskCount: number;
    highEnergyCount: number;
    minutes: number;
    loadPercent: number;
    warnings: string[];
  };
}) {
  return (
    <div className={`weekly-load-card ${detail.warnings.length > 0 ? 'is-warning' : ''}`}>
      <div>
        <strong>{detail.label}</strong>
        <span>{detail.short}</span>
      </div>
      <div className="tiny-progress">
        <span style={{ width: `${detail.loadPercent}%` }} />
      </div>
      <div className="load-stats">
        <span>{detail.taskCount} 任务</span>
        <span>{detail.doneCount} 完成</span>
        <span>{detail.highEnergyCount} 高能量</span>
        <span>{detail.riskCount} 风险</span>
      </div>
      <small>{detail.warnings.length ? detail.warnings.join(' / ') : `${Math.round(detail.minutes / 60 * 10) / 10}h 可控`}</small>
    </div>
  );
}

function WorkloadAlert({ title, text, tone }: { title: string; text: string; tone: 'hot' | 'warn' | 'calm' }) {
  return (
    <div className={`workload-alert workload-alert-${tone}`}>
      <AlertTriangle size={17} />
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function LoadChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="load-chip">
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

function InfoCell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`info-cell ${alert ? 'is-alert' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskList({
  categoryList,
  selectedTaskIds,
  tasks: taskList,
  onTaskDateChange,
  onSelectTask,
  onToggleTaskSelection,
}: {
  categoryList: Category[];
  selectedTaskIds: Set<string>;
  tasks: Task[];
  onTaskDateChange: (taskId: string, date: string) => void;
  onSelectTask: (task: Task) => void;
  onToggleTaskSelection: (taskId: string) => void;
}) {
  return (
    <div className="compact-task-list">
      {taskList.length === 0 ? (
        <EmptyState title="没有匹配任务" text="这里的任务列表会跟随顶部搜索和状态筛选更新。" />
      ) : (
        taskList.map((task) => (
          <div className="selectable-task task-with-date" key={task.id}>
            <input
              aria-label={`选择${task.title}`}
              checked={selectedTaskIds.has(task.id)}
              onChange={() => onToggleTaskSelection(task.id)}
              type="checkbox"
            />
            <button onClick={() => onSelectTask(task)} style={accentStyle(categoryList, task.category)} type="button">
              <span className={`status-dot status-${task.status}`} />
              <strong>{task.title}</strong>
              <small>
                {task.date} · {statusLabel[task.status]}
              </small>
            </button>
            <input
              aria-label={`调整${task.title}日期`}
              className="quick-date-input"
              onChange={(event) => onTaskDateChange(task.id, event.target.value)}
              type="date"
              value={task.date}
            />
          </div>
        ))
      )}
    </div>
  );
}

function ReasonBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="reason-bar">
      <span>{label}</span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

function Suggestion({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  text: string;
}) {
  return (
    <div className="suggestion">
      <Icon size={19} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function TemplateCard({ title, fields, onChange }: { title: string; fields: string[]; onChange: (fields: string[]) => void }) {
  return (
    <div className="template-card">
      <strong>{title}</strong>
      <div>
        {fields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
      <input
        value={fields.join('、')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(/[、,，]/)
              .map((field) => field.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}

export { App };
