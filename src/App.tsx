import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  FlaskConical,
  Gauge,
  Heart,
  Kanban,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import type { CSSProperties, ComponentType, FormEvent, ReactNode } from 'react';
import { appDate, categories, fieldTemplates, projects, tasks as initialTasks, viewPresets, weekDays, widgets } from './mockData';
import {
  getCategoryMap,
  getEnergySummary,
  getProjectRuntimeState,
  getReviewStats,
  getTasksForDate,
  getTasksForProject,
  getTodayMetrics,
  getWeeklyLoads,
  statusLabel,
  toMap,
} from './selectors';
import type { CategoryId, ProjectLane, Task, TaskStatus, ViewId } from './types';
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
  const [activeView, setActiveView] = useState<ViewId>('today');
  const [taskList, setTaskList] = useState<Task[]>(initialTasks);
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [widgetList, setWidgetList] = useState<Widget[]>(widgets);
  const [templateList, setTemplateList] = useState<FieldTemplate[]>(fieldTemplates);
  const [activePresetId, setActivePresetId] = useState<ViewPreset['id']>(viewPresets[0].id);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const todayTasks = useMemo(() => getTasksForDate(taskList, appDate.today), [taskList]);

  const upsertTask = (task: Task) => {
    setTaskList((current) => {
      const exists = current.some((item) => item.id === task.id);
      return exists ? current.map((item) => (item.id === task.id ? task : item)) : [task, ...current];
    });
    setSelectedTask(task);
    setEditingTask(null);
    setIsCreatingTask(false);
  };

  const updateTaskStatus = (taskId: string, status: TaskStatus) => {
    setTaskList((current) =>
      current.map((task) => {
        if (task.id !== taskId) return task;
        const nextTask = { ...task, status };
        setSelectedTask(nextTask);
        return nextTask;
      }),
    );
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

  return (
    <AppShell activeView={activeView} setActiveView={setActiveView} taskList={taskList}>
      <TopBar activeView={activeView} onCreateTask={() => setIsCreatingTask(true)} />
      {activeView === 'today' && (
        <TodayDashboard
          allTasks={taskList}
          categoryList={categoryList}
          todayTasks={todayTasks}
          widgetList={widgetList}
          onSelectTask={setSelectedTask}
        />
      )}
      {activeView === 'week' && <WeeklyMatrix allTasks={taskList} categoryList={categoryList} onSelectTask={setSelectedTask} />}
      {activeView === 'projects' && <ProjectProgress allTasks={taskList} categoryList={categoryList} />}
      {activeView === 'workbench' && <Workbench allTasks={taskList} categoryList={categoryList} onSelectTask={setSelectedTask} />}
      {activeView === 'review' && <Review allTasks={taskList} categoryList={categoryList} />}
      {activeView === 'settings' && (
        <SettingsView
          activePresetId={activePresetId}
          categoryList={categoryList}
          templateList={templateList}
          widgetList={widgetList}
          onAddCategory={addCategory}
          onApplyPreset={applyPreset}
          onToggleWidget={toggleWidget}
          onUpdateCategoryColor={updateCategoryColor}
          onUpdateTemplateFields={updateTemplateFields}
        />
      )}
      <TaskDrawer
        categoryList={categoryList}
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={(task) => setEditingTask(task)}
        onStatusChange={updateTaskStatus}
      />
      {(editingTask || isCreatingTask) && (
        <TaskForm
          categoryList={categoryList}
          task={editingTask}
          onCancel={() => {
            setEditingTask(null);
            setIsCreatingTask(false);
          }}
          onSave={upsertTask}
        />
      )}
    </AppShell>
  );
}

function TopBar({ activeView, onCreateTask }: { activeView: ViewId; onCreateTask: () => void }) {
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
          <span>论文、实验、项目、地点</span>
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

function TodayDashboard({
  allTasks,
  categoryList,
  todayTasks,
  widgetList,
  onSelectTask,
}: {
  allTasks: Task[];
  categoryList: Category[];
  todayTasks: Task[];
  widgetList: Widget[];
  onSelectTask: (task: Task) => void;
}) {
  const todayMetrics = getTodayMetrics(allTasks, appDate.today);
  const energySummary = getEnergySummary(todayTasks);
  const activeProjects = projects.filter((project) => getTasksForProject(todayTasks, project.id).length > 0);
  const reminders = allTasks
    .filter((task) => task.status === 'blocked' || task.status === 'delayed' || task.date === appDate.today)
    .slice(0, 3);
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
          <Metric value={todayMetrics.deepWorkHours} label="深度工作" />
          <Metric value={`${todayMetrics.loadPercent}%`} label="负荷" tone="warn" />
        </div>
      </div>

      <div className="span-4 panel">
        <PanelTitle icon={ListChecks} title="今日三件事" />
        <div className="priority-list">
          {todayTasks
            .filter((task) => task.priority)
            .sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9))
            .slice(0, 3)
            .map((task, index) => (
              <button className="priority-item" key={task.id} onClick={() => onSelectTask(task)} type="button">
                <span>{index + 1}</span>
                <strong>{task.title}</strong>
                <ChevronRight size={16} />
              </button>
            ))}
        </div>
      </div>

      {isWidgetVisible('timeline') && (
        <div className="span-7 panel">
          <PanelTitle icon={Clock3} title="今日时间轴" />
          <div className="timeline">
            {todayTasks.map((task) => (
              <button
                className={`timeline-item status-${task.status}`}
                key={task.id}
                onClick={() => onSelectTask(task)}
                style={accentStyle(categoryList, task.category)}
                type="button"
              >
                <span className="time">{task.start}</span>
                <div>
                  <strong>{task.title}</strong>
                  <small>
                    {task.duration} 分钟 · {projectMap[task.projectId].name} · {statusLabel[task.status]}
                  </small>
                </div>
                <CategoryPill category={task.category} categoryList={categoryList} />
              </button>
            ))}
          </div>
        </div>
      )}

      {isWidgetVisible('project-progress') && (
        <div className="span-5 panel">
          <PanelTitle icon={Gauge} title="项目状态" />
          <div className="project-stack">
            {activeProjects.map((project) => (
              <ProjectCard key={project.id} categoryList={categoryList} project={project} taskList={allTasks} />
            ))}
          </div>
        </div>
      )}

      {isWidgetVisible('deadline-alerts') && (
        <div className="span-5 panel">
          <PanelTitle icon={AlertTriangle} title="近期提醒" />
          <div className="reminder-list">
            {reminders.map((task) => (
              <Reminder
                key={task.id}
                title={task.title}
                meta={`${task.date} ${task.start} · ${projectMap[task.projectId].name}`}
                tone={task.status === 'blocked' ? 'hot' : task.status === 'delayed' ? 'warn' : 'calm'}
              />
            ))}
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
    </section>
  );
}

function WeeklyMatrix({
  allTasks,
  categoryList,
  onSelectTask,
}: {
  allTasks: Task[];
  categoryList: Category[];
  onSelectTask: (task: Task) => void;
}) {
  const weeklyLoads = getWeeklyLoads(allTasks, weekDays);

  return (
    <section className="panel full-panel">
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
                    <button
                      className={`mini-task status-${task.status}`}
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      style={accentStyle(categoryList, task.category)}
                      type="button"
                    >
                      <strong>{task.title}</strong>
                      <span>
                        {task.start} · {statusLabel[task.status]}
                      </span>
                    </button>
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
    </section>
  );
}

function ProjectProgress({ allTasks, categoryList }: { allTasks: Task[]; categoryList: Category[] }) {
  return (
    <section className="page-grid">
      <div className="span-12 lane-board">
        {projects.map((project) => {
          const runtime = getProjectRuntimeState(project, allTasks);
          return (
            <div className="project-lane" key={project.id} style={accentStyle(categoryList, project.category)}>
              <div className="lane-head">
                <CategoryPill category={project.category} categoryList={categoryList} />
                <strong>{project.name}</strong>
                <span>{project.progress}%</span>
              </div>
              <div className="lane-progress">
                <span style={{ width: `${project.progress}%` }} />
              </div>
              <div className="lane-grid">
                <InfoCell label="阶段" value={project.stage} />
                <InfoCell label="下一步" value={runtime.nextTask?.title ?? project.next} />
                <InfoCell label="阻塞点" value={runtime.blocker} alert={runtime.blockedCount > 0} />
                <InfoCell label="任务状态" value={`${runtime.taskCount} 个任务 · ${runtime.blockedCount} 个风险`} />
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
  onSelectTask,
}: {
  allTasks: Task[];
  categoryList: Category[];
  onSelectTask: (task: Task) => void;
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
        <TaskList categoryList={categoryList} tasks={writingTasks} onSelectTask={onSelectTask} />
      </div>
      <div className="span-6 panel work-panel">
        <PanelTitle icon={Beaker} title="实验工作台" />
        <div className="work-meta-grid">
          <InfoCell label="样品" value={currentExperiment?.sample ?? '未设置'} />
          <InfoCell label="仪器" value={`${currentExperiment?.instrument ?? '未设置'} · ${currentExperiment?.reservation ?? ''}`} />
          <InfoCell label="条件" value={currentExperiment?.condition ?? '未设置'} />
          <InfoCell label="等待期" value={currentExperiment?.waiting ?? '未设置'} alert />
        </div>
        <TaskList categoryList={categoryList} tasks={experimentTasks} onSelectTask={onSelectTask} />
      </div>
    </section>
  );
}

function Review({ allTasks, categoryList }: { allTasks: Task[]; categoryList: Category[] }) {
  const stats = getReviewStats(allTasks, categoryList);

  return (
    <section className="page-grid">
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
        <PanelTitle icon={SlidersHorizontal} title="下周建议" />
        <div className="suggestion-grid">
          <Suggestion icon={PenLine} title="写作块前移" text="把高脑力写作放在周一和周三上午，避免和实验批次相邻。" />
          <Suggestion icon={Beaker} title="实验窗口锁定" text="HPLC 相关任务集中预约，给复测结果预留半天缓冲。" />
          <Suggestion icon={Heart} title="生活时段保护" text="周二和周五晚间保留低负荷安排，减少深夜补任务。" />
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
    </section>
  );
}

function TaskForm({
  categoryList,
  task,
  onCancel,
  onSave,
}: {
  categoryList: Category[];
  task: Task | null;
  onCancel: () => void;
  onSave: (task: Task) => void;
}) {
  const [draft, setDraft] = useState<Task>(
    task ?? {
      id: `t-${Date.now()}`,
      title: '',
      category: 'writing',
      projectId: projects[0].id,
      date: appDate.today,
      start: '09:00',
      duration: 60,
      energy: '中',
      location: '办公室',
      status: 'planned',
      standard: '',
      dependency: '',
      delayReason: '',
      detail: '',
    },
  );

  const updateDraft = <K extends keyof Task>(key: K, value: Task[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submitTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave({
      ...draft,
      title: draft.title.trim() || '未命名任务',
      duration: Number(draft.duration) || 30,
      delayReason: draft.delayReason?.trim() || undefined,
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
            <option value="planned">已计划</option>
            <option value="active">进行中</option>
            <option value="done">已完成</option>
            <option value="delayed">延期</option>
            <option value="blocked">阻塞</option>
            <option value="cancelled">取消</option>
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
          <span>延期原因</span>
          <input value={draft.delayReason ?? ''} onChange={(event) => updateDraft('delayReason', event.target.value)} />
        </label>
        <label className="field span-2">
          <span>任务说明</span>
          <textarea value={draft.detail} onChange={(event) => updateDraft('detail', event.target.value)} />
        </label>

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
  onEdit,
  onStatusChange,
}: {
  categoryList: Category[];
  task: Task | null;
  onClose: () => void;
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
        <button onClick={() => onStatusChange(task.id, 'done')} type="button">
          完成
        </button>
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
        <InfoCell label="精力等级" value={task.energy} />
        <InfoCell label="地点" value={task.location} />
        <InfoCell label="截止时间" value={`${task.date} ${task.start}`} />
        <InfoCell label="依赖关系" value={task.dependency} />
        <InfoCell label="完成标准" value={task.standard} />
        <InfoCell label="延期原因" value={task.delayReason ?? '无'} alert={Boolean(task.delayReason)} />
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
  tasks: taskList,
  onSelectTask,
}: {
  categoryList: Category[];
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}) {
  return (
    <div className="compact-task-list">
      {taskList.map((task) => (
        <button key={task.id} onClick={() => onSelectTask(task)} style={accentStyle(categoryList, task.category)} type="button">
          <span className={`status-dot status-${task.status}`} />
          <strong>{task.title}</strong>
          <small>
            {task.date} · {statusLabel[task.status]}
          </small>
        </button>
      ))}
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
