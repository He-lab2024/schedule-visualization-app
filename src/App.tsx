import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
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

type CategoryId = 'writing' | 'experiment' | 'data' | 'learning' | 'life' | 'recovery';
type TaskStatus = 'planned' | 'active' | 'done' | 'delayed' | 'blocked';
type ViewId = 'today' | 'week' | 'projects' | 'workbench' | 'review' | 'settings';

type Category = {
  id: CategoryId;
  name: string;
  color: string;
  soft: string;
};

type Task = {
  id: string;
  title: string;
  category: CategoryId;
  project: string;
  date: string;
  start: string;
  duration: number;
  energy: '低' | '中' | '高';
  location: string;
  status: TaskStatus;
  standard: string;
  dependency: string;
  delayReason?: string;
  detail: string;
};

type ProjectLane = {
  id: string;
  name: string;
  category: CategoryId;
  stage: string;
  progress: number;
  next: string;
  blocker: string;
  cadence: string;
};

const categories: Category[] = [
  { id: 'writing', name: '论文', color: '#5b6ee1', soft: '#e8ebff' },
  { id: 'experiment', name: '实验', color: '#d4554f', soft: '#ffe9e6' },
  { id: 'data', name: '数据', color: '#2f8b83', soft: '#dff5f1' },
  { id: 'learning', name: '学习', color: '#b7791f', soft: '#fff1d8' },
  { id: 'life', name: '生活', color: '#7a5c98', soft: '#f1e8fb' },
  { id: 'recovery', name: '恢复', color: '#4f7b62', soft: '#e4f2e8' },
];

const tasks: Task[] = [
  {
    id: 't1',
    title: '转氨酶论文引言重写',
    category: 'writing',
    project: 'TA 论文',
    date: '2026-06-08',
    start: '08:40',
    duration: 110,
    energy: '高',
    location: '办公室',
    status: 'active',
    standard: '完成引言第二版并标出缺口句',
    dependency: '参考文献筛选完成',
    detail: '围绕胺供体优化、平衡推动和工艺适配重新组织段落。',
  },
  {
    id: 't2',
    title: 'HPLC 样品复测',
    category: 'experiment',
    project: '底物谱实验',
    date: '2026-06-08',
    start: '10:50',
    duration: 75,
    energy: '中',
    location: '分析室',
    status: 'planned',
    standard: '完成 6 个异常峰样品复测',
    dependency: '仪器预约 10:30 可用',
    detail: '记录柱温、流动相批号和样品放置时间。',
  },
  {
    id: 't3',
    title: '图 3 数据清洗',
    category: 'data',
    project: 'TA 论文',
    date: '2026-06-08',
    start: '14:00',
    duration: 95,
    energy: '高',
    location: '办公室',
    status: 'planned',
    standard: '输出可复现脚本和新版图表草稿',
    dependency: '复测数据导出',
    detail: '统一重复实验命名，检查空白扣除和归一化逻辑。',
  },
  {
    id: 't4',
    title: '晚间散步和家务整理',
    category: 'life',
    project: '生活维护',
    date: '2026-06-08',
    start: '20:10',
    duration: 55,
    energy: '低',
    location: '家',
    status: 'planned',
    standard: '完成厨房整理并留出无屏幕休息',
    dependency: '晚饭后',
    detail: '生活约束作为正式日程，不挤压到深夜写作。',
  },
  {
    id: 't5',
    title: '实验方案下一轮条件表',
    category: 'experiment',
    project: '底物谱实验',
    date: '2026-06-09',
    start: '09:20',
    duration: 100,
    energy: '高',
    location: '实验室',
    status: 'blocked',
    standard: '确认 pH、温度、胺供体浓度三因素组合',
    dependency: '等待上轮 LC 结果',
    delayReason: '关键复测结果未回收',
    detail: '先列候选矩阵，等数据后锁定正式批次。',
  },
  {
    id: 't6',
    title: '机器学习建模教程',
    category: 'learning',
    project: '新技术学习',
    date: '2026-06-10',
    start: '15:00',
    duration: 80,
    energy: '中',
    location: '办公室',
    status: 'planned',
    standard: '复现一个小型回归 notebook',
    dependency: '安装环境已验证',
    detail: '只保留和实验数据分析相关的部分。',
  },
  {
    id: 't7',
    title: '共同作者反馈整合',
    category: 'writing',
    project: 'TA 论文',
    date: '2026-06-11',
    start: '09:00',
    duration: 130,
    energy: '高',
    location: '办公室',
    status: 'delayed',
    standard: '回复 12 条批注并更新版本号',
    dependency: '导师批注',
    delayReason: '实验数据确认推迟',
    detail: '将语言问题和科学解释问题拆开处理。',
  },
  {
    id: 't8',
    title: '周复盘和下周排程',
    category: 'recovery',
    project: '生活维护',
    date: '2026-06-14',
    start: '16:30',
    duration: 70,
    energy: '低',
    location: '家',
    status: 'planned',
    standard: '确定下周 3 个推进点和 2 个保护时段',
    dependency: '本周任务状态更新',
    detail: '复盘延期原因、脑力负荷和生活时间是否被侵占。',
  },
];

const projects: ProjectLane[] = [
  {
    id: 'p1',
    name: 'TA 论文',
    category: 'writing',
    stage: '重写引言和图表',
    progress: 62,
    next: '锁定图 3 数据和引言逻辑',
    blocker: '复测数据影响结果段落措辞',
    cadence: '每日 2 个深度写作块',
  },
  {
    id: 'p2',
    name: '底物谱实验',
    category: 'experiment',
    stage: '异常点复测',
    progress: 44,
    next: '完成 HPLC 复测并确认条件表',
    blocker: '仪器预约窗口紧张',
    cadence: '隔日实验批次',
  },
  {
    id: 'p3',
    name: '新技术学习',
    category: 'learning',
    stage: '可复现实例',
    progress: 28,
    next: '完成小型 notebook',
    blocker: '不与论文高脑力时段叠加',
    cadence: '每周 2 次 80 分钟',
  },
  {
    id: 'p4',
    name: '生活维护',
    category: 'life',
    stage: '节奏保护',
    progress: 71,
    next: '固定晚间恢复和伴侣沟通时间',
    blocker: '深夜临时补写作',
    cadence: '每日轻量维护',
  },
];

const weekDays = [
  { date: '2026-06-08', label: '周一', short: '6/8' },
  { date: '2026-06-09', label: '周二', short: '6/9' },
  { date: '2026-06-10', label: '周三', short: '6/10' },
  { date: '2026-06-11', label: '周四', short: '6/11' },
  { date: '2026-06-12', label: '周五', short: '6/12' },
  { date: '2026-06-13', label: '周六', short: '6/13' },
  { date: '2026-06-14', label: '周日', short: '6/14' },
];

const navItems: Array<{ id: ViewId; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'today', label: '今日驾驶舱', icon: LayoutDashboard },
  { id: 'week', label: '周计划矩阵', icon: CalendarDays },
  { id: 'projects', label: '项目进度', icon: Kanban },
  { id: 'workbench', label: '论文/实验', icon: FlaskConical },
  { id: 'review', label: '复盘分析', icon: BarChart3 },
  { id: 'settings', label: '设置模板', icon: Settings },
];

const categoryMap = Object.fromEntries(categories.map((category) => [category.id, category])) as Record<
  CategoryId,
  Category
>;

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
          <strong>负荷偏高</strong>
          <div className="load-meter">
            <span style={{ width: '76%' }} />
          </div>
          <p>高脑力任务集中在周一到周四，实验窗口需要保护。</p>
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ViewId>('today');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const todayTasks = useMemo(() => tasks.filter((task) => task.date === '2026-06-08'), []);

  return (
    <AppShell activeView={activeView} setActiveView={setActiveView}>
      <TopBar activeView={activeView} />
      {activeView === 'today' && <TodayDashboard tasks={todayTasks} onSelectTask={setSelectedTask} />}
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
        <span className="eyebrow">2026-06-08 · 第 24 周</span>
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

function TodayDashboard({ tasks: todayTasks, onSelectTask }: { tasks: Task[]; onSelectTask: (task: Task) => void }) {
  const activeProjects = projects.filter((project) => ['p1', 'p2', 'p4'].includes(project.id));
  return (
    <section className="page-grid today-grid">
      <div className="span-8 hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">今日关键推进点</span>
          <h2>上午锁定引言逻辑，下午用复测数据收束图 3。</h2>
          <p>今日最重要的不是塞满任务，而是保住两个高脑力块和一个实验窗口。</p>
        </div>
        <div className="hero-metrics">
          <Metric value="4" label="今日任务" />
          <Metric value="3.9h" label="深度工作" />
          <Metric value="76%" label="负荷" tone="warn" />
        </div>
      </div>

      <div className="span-4 panel">
        <PanelTitle icon={ListChecks} title="今日三件事" />
        <div className="priority-list">
          {todayTasks.slice(0, 3).map((task, index) => (
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
                  {task.duration} 分钟 · {task.location} · {task.energy}脑力
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
          <Reminder title="HPLC 预约窗口" meta="今天 10:30 · 分析室" tone="hot" />
          <Reminder title="共同作者反馈整合延期" meta="周四上午 · 等数据确认" tone="warn" />
          <Reminder title="周复盘保护时段" meta="周日 16:30 · 家" tone="calm" />
        </div>
      </div>

      <div className="span-7 panel">
        <PanelTitle icon={Brain} title="精力负荷" />
        <div className="energy-board">
          <EnergyBlock label="高脑力" value={3} color="#5b6ee1" />
          <EnergyBlock label="中脑力" value={1} color="#d4554f" />
          <EnergyBlock label="低脑力" value={1} color="#4f7b62" />
          <EnergyBlock label="恢复保护" value={2} color="#7a5c98" />
        </div>
      </div>
    </section>
  );
}

function WeeklyMatrix({ onSelectTask }: { onSelectTask: (task: Task) => void }) {
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
                        {task.start} · {task.duration}m
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
        <LoadChip label="周一" value={76} />
        <LoadChip label="周二" value={68} />
        <LoadChip label="周三" value={51} />
        <LoadChip label="周四" value={72} />
        <LoadChip label="周五" value={38} />
        <LoadChip label="周末" value={32} />
      </div>
    </section>
  );
}

function ProjectProgress() {
  return (
    <section className="page-grid">
      <div className="span-12 lane-board">
        {projects.map((project) => (
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
              <InfoCell label="下一步" value={project.next} />
              <InfoCell label="阻塞点" value={project.blocker} alert />
              <InfoCell label="节奏" value={project.cadence} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Workbench({ onSelectTask }: { onSelectTask: (task: Task) => void }) {
  const writingTasks = tasks.filter((task) => task.category === 'writing');
  const experimentTasks = tasks.filter((task) => task.category === 'experiment');

  return (
    <section className="page-grid">
      <div className="span-6 panel work-panel">
        <PanelTitle icon={BookOpen} title="论文工作台" />
        <div className="work-meta-grid">
          <InfoCell label="章节" value="引言 / 结果 / 图表说明" />
          <InfoCell label="图表" value="图 3 数据清洗中" />
          <InfoCell label="版本" value="v0.7.2 author comments" />
          <InfoCell label="反馈" value="12 条批注待整合" alert />
        </div>
        <TaskList tasks={writingTasks} onSelectTask={onSelectTask} />
      </div>
      <div className="span-6 panel work-panel">
        <PanelTitle icon={Beaker} title="实验工作台" />
        <div className="work-meta-grid">
          <InfoCell label="样品" value="6 个异常峰复测" />
          <InfoCell label="仪器" value="HPLC · 10:30 预约" />
          <InfoCell label="条件" value="pH / 温度 / 胺供体浓度" />
          <InfoCell label="等待期" value="LC 结果回收前阻塞" alert />
        </div>
        <TaskList tasks={experimentTasks} onSelectTask={onSelectTask} />
      </div>
    </section>
  );
}

function Review() {
  return (
    <section className="page-grid">
      <div className="span-4 panel stat-panel">
        <Metric value="58%" label="完成率" />
        <div className="donut" style={{ '--value': '58%' } as CSSProperties}>
          <span>58</span>
        </div>
      </div>
      <div className="span-4 panel stat-panel">
        <Metric value="21%" label="延期率" tone="warn" />
        <div className="reason-bars">
          <ReasonBar label="等数据" value={46} />
          <ReasonBar label="仪器窗口" value={31} />
          <ReasonBar label="脑力过载" value={23} />
        </div>
      </div>
      <div className="span-4 panel stat-panel">
        <Metric value="9.5h" label="论文投入" />
        <div className="distribution">
          {categories.slice(0, 5).map((category, index) => (
            <span
              key={category.id}
              style={{
                background: category.color,
                width: `${[34, 24, 18, 10, 14][index]}%`,
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
          <TemplateCard title="论文任务" fields={['章节', '图表', '版本', '共同作者反馈', '完成标准']} />
          <TemplateCard title="实验任务" fields={['样品', '仪器', '条件', '等待期', '预约状态']} />
          <TemplateCard title="生活维护" fields={['地点', '对象', '时段', '恢复等级', '边界说明']} />
        </div>
      </div>
      <div className="span-12 panel">
        <PanelTitle icon={LayoutDashboard} title="首页模块与预设布局" />
        <div className="preset-row">
          {['今日执行', '论文冲刺', '实验周期', '周复盘', '生活平衡'].map((preset, index) => (
            <button className={index === 0 ? 'preset is-active' : 'preset'} key={preset} type="button">
              {preset}
            </button>
          ))}
        </div>
        <div className="widget-row">
          {['今日时间轴', '项目进度', '截止提醒', '精力负荷', '家庭生活', '收件箱'].map((widget, index) => (
            <label className="widget-toggle" key={widget}>
              <input checked={index < 5} readOnly type="checkbox" />
              <span>{widget}</span>
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
        <InfoCell label="所属项目" value={task.project} />
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
  return (
    <div className="project-card" style={accentStyle(project.category)}>
      <div>
        <strong>{project.name}</strong>
        <span>{project.stage}</span>
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
            {task.date} · {task.start}
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
