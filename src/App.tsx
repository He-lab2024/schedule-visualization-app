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
  Search,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import type { CSSProperties, ComponentType, ReactNode } from 'react';
import { appDate, categories, fieldTemplates, projects, tasks, viewPresets, weekDays, widgets } from './mockData';
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
import type { CategoryId, ProjectLane, Task, ViewId } from './types';

const navItems: Array<{ id: ViewId; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'today', label: '今日驾驶舱', icon: LayoutDashboard },
  { id: 'week', label: '周计划矩阵', icon: CalendarDays },
  { id: 'projects', label: '项目进度', icon: Kanban },
  { id: 'workbench', label: '论文/实验', icon: FlaskConical },
  { id: 'review', label: '复盘分析', icon: BarChart3 },
  { id: 'settings', label: '设置模板', icon: Settings },
];

const categoryMap = getCategoryMap(categories);
const projectMap = toMap(projects);

const accentStyle = (categoryId: CategoryId) =>
  ({
    '--accent': categoryMap[categoryId].color,
    '--accent-soft': categoryMap[categoryId].soft,
  }) as CSSProperties;

function AppShell({
  activeView,
  setActiveView,
  children,
}: {
  activeView: ViewId;
  setActiveView: (view: ViewId) => void;
  children: ReactNode;
}) {
  const weeklyLoads = getWeeklyLoads(tasks, weekDays);
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const todayTasks = useMemo(() => getTasksForDate(tasks, appDate.today), []);

  return (
    <AppShell activeView={activeView} setActiveView={setActiveView}>
      <TopBar activeView={activeView} />
      {activeView === 'today' && <TodayDashboard todayTasks={todayTasks} onSelectTask={setSelectedTask} />}
      {activeView === 'week' && <WeeklyMatrix onSelectTask={setSelectedTask} />}
      {activeView === 'projects' && <ProjectProgress />}
      {activeView === 'workbench' && <Workbench onSelectTask={setSelectedTask} />}
      {activeView === 'review' && <Review />}
      {activeView === 'settings' && <SettingsView />}
      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </AppShell>
  );
}

function TopBar({ activeView }: { activeView: ViewId }) {
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
        <button className="icon-button" type="button" aria-label="提醒">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}

function TodayDashboard({ todayTasks, onSelectTask }: { todayTasks: Task[]; onSelectTask: (task: Task) => void }) {
  const todayMetrics = getTodayMetrics(tasks, appDate.today);
  const energySummary = getEnergySummary(todayTasks);
  const activeProjects = projects.filter((project) => getTasksForProject(todayTasks, project.id).length > 0);
  const reminders = tasks
    .filter((task) => task.status === 'blocked' || task.status === 'delayed' || task.date === appDate.today)
    .slice(0, 3);

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

      <div className="span-7 panel">
        <PanelTitle icon={Clock3} title="今日时间轴" />
        <div className="timeline">
          {todayTasks.map((task) => (
            <button
              className={`timeline-item status-${task.status}`}
              key={task.id}
              onClick={() => onSelectTask(task)}
              style={accentStyle(task.category)}
              type="button"
            >
              <span className="time">{task.start}</span>
              <div>
                <strong>{task.title}</strong>
                <small>
                  {task.duration} 分钟 · {projectMap[task.projectId].name} · {statusLabel[task.status]}
                </small>
              </div>
              <CategoryPill category={task.category} />
            </button>
          ))}
        </div>
      </div>

      <div className="span-5 panel">
        <PanelTitle icon={Gauge} title="项目状态" />
        <div className="project-stack">
          {activeProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

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
    </section>
  );
}

function WeeklyMatrix({ onSelectTask }: { onSelectTask: (task: Task) => void }) {
  const weeklyLoads = getWeeklyLoads(tasks, weekDays);

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
        {categories.map((category) => (
          <div className="matrix-row" key={category.id}>
            <div className="matrix-type" style={accentStyle(category.id)}>
              <span />
              {category.name}
            </div>
            {weekDays.map((day) => {
              const dayTasks = tasks.filter((task) => task.date === day.date && task.category === category.id);
              return (
                <div className={`matrix-cell ${dayTasks.length > 1 ? 'is-dense' : ''}`} key={`${category.id}-${day.date}`}>
                  {dayTasks.map((task) => (
                    <button
                      className={`mini-task status-${task.status}`}
                      key={task.id}
                      onClick={() => onSelectTask(task)}
                      style={accentStyle(task.category)}
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

function ProjectProgress() {
  return (
    <section className="page-grid">
      <div className="span-12 lane-board">
        {projects.map((project) => {
          const runtime = getProjectRuntimeState(project, tasks);
          return (
            <div className="project-lane" key={project.id} style={accentStyle(project.category)}>
              <div className="lane-head">
                <CategoryPill category={project.category} />
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

function Workbench({ onSelectTask }: { onSelectTask: (task: Task) => void }) {
  const writingTasks = tasks.filter((task) => task.category === 'writing');
  const experimentTasks = tasks.filter((task) => task.category === 'experiment');
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
        <TaskList tasks={writingTasks} onSelectTask={onSelectTask} />
      </div>
      <div className="span-6 panel work-panel">
        <PanelTitle icon={Beaker} title="实验工作台" />
        <div className="work-meta-grid">
          <InfoCell label="样品" value={currentExperiment?.sample ?? '未设置'} />
          <InfoCell label="仪器" value={`${currentExperiment?.instrument ?? '未设置'} · ${currentExperiment?.reservation ?? ''}`} />
          <InfoCell label="条件" value={currentExperiment?.condition ?? '未设置'} />
          <InfoCell label="等待期" value={currentExperiment?.waiting ?? '未设置'} alert />
        </div>
        <TaskList tasks={experimentTasks} onSelectTask={onSelectTask} />
      </div>
    </section>
  );
}

function Review() {
  const stats = getReviewStats(tasks, categories);

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

function SettingsView() {
  return (
    <section className="page-grid">
      <div className="span-5 panel">
        <PanelTitle icon={SlidersHorizontal} title="任务类型颜色" />
        <div className="settings-list">
          {categories.map((category) => (
            <div className="setting-row" key={category.id}>
              <span className="swatch" style={{ background: category.color }} />
              <strong>{category.name}</strong>
              <span>{category.color}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="span-7 panel">
        <PanelTitle icon={Settings} title="字段模板" />
        <div className="template-grid">
          {fieldTemplates.map((template) => (
            <TemplateCard key={template.id} title={template.name} fields={template.fields} />
          ))}
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={LayoutDashboard} title="首页模块与预设布局" />
        <div className="preset-row">
          {viewPresets.map((preset, index) => (
            <button className={index === 0 ? 'preset is-active' : 'preset'} key={preset.id} type="button">
              {preset.name}
            </button>
          ))}
        </div>
        <div className="widget-row">
          {widgets.map((widget) => (
            <label className="widget-toggle" key={widget.id}>
              <input checked={widget.visible} readOnly type="checkbox" />
              <span>{widget.name}</span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}

function TaskDrawer({ task, onClose }: { task: Task | null; onClose: () => void }) {
  if (!task) return null;

  return (
    <aside className="task-drawer">
      <button className="drawer-close" onClick={onClose} type="button">
        ×
      </button>
      <CategoryPill category={task.category} />
      <h2>{task.title}</h2>
      <p>{task.detail}</p>
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

function CategoryPill({ category }: { category: CategoryId }) {
  const item = categoryMap[category];
  return (
    <span className="category-pill" style={accentStyle(category)}>
      {item.name}
    </span>
  );
}

function ProjectCard({ project }: { project: ProjectLane }) {
  const runtime = getProjectRuntimeState(project, tasks);
  return (
    <div className="project-card" style={accentStyle(project.category)}>
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

function TaskList({ tasks: taskList, onSelectTask }: { tasks: Task[]; onSelectTask: (task: Task) => void }) {
  return (
    <div className="compact-task-list">
      {taskList.map((task) => (
        <button key={task.id} onClick={() => onSelectTask(task)} style={accentStyle(task.category)} type="button">
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

function TemplateCard({ title, fields }: { title: string; fields: string[] }) {
  return (
    <div className="template-card">
      <strong>{title}</strong>
      <div>
        {fields.map((field) => (
          <span key={field}>{field}</span>
        ))}
      </div>
    </div>
  );
}

export { App };
