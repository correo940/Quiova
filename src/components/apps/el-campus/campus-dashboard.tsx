'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';

const {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  GraduationCap,
  Home,
  Layers,
  LineChart,
  ListChecks,
  MessageSquare,
  NotebookTabs,
  Pause,
  Play,
  Plus,
  RotateCcw,
  School,
  Settings2,
  Sparkles,
  Target,
  TimerReset,
  Trash2,
  TrendingUp,
  UserRound,
  UsersRound,
  Wallet,
} = LucideIcons;

type ProfileMode = 'alumno' | 'familia' | 'universidad';
type TaskType = 'tarea' | 'examen' | 'proyecto' | 'lectura';
type Priority = 'alta' | 'media' | 'baja';
type TaskStatus = 'pendiente' | 'en-progreso' | 'hecho';

type Subject = {
  id: string;
  name: string;
  teacher: string;
  color: string;
  currentGrade: number;
  goal: number;
  attendance: number;
  credits: number;
  room: string;
};

type CampusTask = {
  id: string;
  title: string;
  subjectId: string;
  type: TaskType;
  dueDate: string;
  estimatedMinutes: number;
  priority: Priority;
  status: TaskStatus;
  weight: number;
};

type ScheduleBlock = {
  id: string;
  day: WeekDay;
  start: string;
  end: string;
  subjectId: string;
  location: string;
};

type StudyTopic = {
  id: string;
  subjectId: string;
  title: string;
  difficulty: number;
  completed: boolean;
};

type CampusMessage = {
  id: string;
  from: string;
  message: string;
  date: string;
  tone: 'info' | 'riesgo' | 'positivo';
};

type Resource = {
  id: string;
  title: string;
  subjectId: string;
  kind: 'PDF' | 'Apunte' | 'Práctica' | 'Enlace';
  updatedAt: string;
};

type CampusSettings = {
  profileMode: ProfileMode;
  schoolName: string;
  studentName: string;
  courseName: string;
  dailyStudyMinutes: number;
  notifications: boolean;
  guardianView: boolean;
};

type CampusData = {
  settings: CampusSettings;
  subjects: Subject[];
  tasks: CampusTask[];
  schedule: ScheduleBlock[];
  topics: StudyTopic[];
  messages: CampusMessage[];
  resources: Resource[];
};

type StudySession = {
  id: string;
  date: string;
  title: string;
  subject: Subject;
  minutes: number;
  reason: string;
  priority: Priority;
};

type WeekDay = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
type TabKey =
  | 'inicio'
  | 'calendario'
  | 'asignaturas'
  | 'tareas'
  | 'estudio'
  | 'notas'
  | 'familia'
  | 'ajustes';

const STORAGE_KEY = 'quioba_el_campus_v1';

const CAMPUS_COLORS = {
  cuerpo: '#1a5c2e',
  mente: '#1558a8',
  finanzas: '#b87514',
};

const SUBJECT_PALETTE = ['#1a5c2e', '#1558a8', '#b87514', '#7c3aed', '#dc2626', '#0891b2'];

const WEEK_DAYS: WeekDay[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const EMPTY_DATA: CampusData = {
  settings: {
    profileMode: 'alumno',
    schoolName: 'Quioba Colegio',
    studentName: 'Alumno',
    courseName: '2 Bachillerato / Universidad',
    dailyStudyMinutes: 90,
    notifications: true,
    guardianView: true,
  },
  subjects: [],
  tasks: [],
  schedule: [],
  topics: [],
  messages: [],
  resources: [],
};

const TASK_TYPE_LABEL: Record<TaskType, string> = {
  tarea: 'Tarea',
  examen: 'Examen',
  proyecto: 'Proyecto',
  lectura: 'Lectura',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  'en-progreso': 'En progreso',
  hecho: 'Hecho',
};

const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'inicio', label: 'Inicio', icon: Home },
  { key: 'calendario', label: 'Calendario', icon: CalendarDays },
  { key: 'asignaturas', label: 'Asignaturas', icon: BookOpen },
  { key: 'tareas', label: 'Tareas', icon: ListChecks },
  { key: 'estudio', label: 'Estudio', icon: Brain },
  { key: 'notas', label: 'Notas', icon: BarChart3 },
  { key: 'familia', label: 'Familia', icon: UsersRound },
  { key: 'ajustes', label: 'Ajustes', icon: Settings2 },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(from: string, to: string) {
  const start = parseISODate(from);
  const end = parseISODate(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / 86400000);
}

function getWeekDay(date: Date): WeekDay {
  const index = date.getDay();
  return WEEK_DAYS[index === 0 ? 6 : index - 1];
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
  }).format(parseISODate(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(parseISODate(value));
}

function createInitialData(): CampusData {
  const today = new Date();
  const iso = (offset: number) => toISODate(addDays(today, offset));

  const subjects: Subject[] = [
    {
      id: 'matematicas',
      name: 'Matemáticas',
      teacher: 'M. Alvarez',
      color: CAMPUS_COLORS.mente,
      currentGrade: 7.1,
      goal: 8,
      attendance: 96,
      credits: 6,
      room: 'Aula 2.4',
    },
    {
      id: 'historia',
      name: 'Historia',
      teacher: 'L. Martin',
      color: CAMPUS_COLORS.finanzas,
      currentGrade: 6.2,
      goal: 7,
      attendance: 90,
      credits: 5,
      room: 'Aula 1.2',
    },
    {
      id: 'ingles',
      name: 'Inglés',
      teacher: 'S. Brown',
      color: '#0891b2',
      currentGrade: 8.4,
      goal: 8,
      attendance: 98,
      credits: 4,
      room: 'Lab Idiomas',
    },
    {
      id: 'biologia',
      name: 'Biología',
      teacher: 'R. Navarro',
      color: CAMPUS_COLORS.cuerpo,
      currentGrade: 5.8,
      goal: 7,
      attendance: 82,
      credits: 6,
      room: 'Lab 3',
    },
    {
      id: 'economia',
      name: 'Economia',
      teacher: 'D. Vega',
      color: '#b87514',
      currentGrade: 7.6,
      goal: 8,
      attendance: 94,
      credits: 5,
      room: 'Aula 0.7',
    },
  ];

  return {
    settings: {
      profileMode: 'alumno',
      schoolName: 'Quioba Campus',
      studentName: 'Alex',
      courseName: 'Curso 2025/26',
      dailyStudyMinutes: 100,
      notifications: true,
      guardianView: true,
    },
    subjects,
    tasks: [
      {
        id: 'task_algebra',
        title: 'Entrega de álgebra',
        subjectId: 'matematicas',
        type: 'tarea',
        dueDate: iso(1),
        estimatedMinutes: 70,
        priority: 'alta',
        status: 'en-progreso',
        weight: 10,
      },
      {
        id: 'exam_historia',
        title: 'Examen Revolución Industrial',
        subjectId: 'historia',
        type: 'examen',
        dueDate: iso(4),
        estimatedMinutes: 180,
        priority: 'alta',
        status: 'pendiente',
        weight: 35,
      },
      {
        id: 'task_ingles',
        title: 'Speaking practice',
        subjectId: 'ingles',
        type: 'lectura',
        dueDate: iso(2),
        estimatedMinutes: 35,
        priority: 'media',
        status: 'pendiente',
        weight: 8,
      },
      {
        id: 'project_bio',
        title: 'Informe de laboratorio',
        subjectId: 'biologia',
        type: 'proyecto',
        dueDate: iso(7),
        estimatedMinutes: 160,
        priority: 'alta',
        status: 'pendiente',
        weight: 25,
      },
      {
        id: 'exam_economia',
        title: 'Control de presupuestos',
        subjectId: 'economia',
        type: 'examen',
        dueDate: iso(10),
        estimatedMinutes: 120,
        priority: 'media',
        status: 'pendiente',
        weight: 30,
      },
    ],
    schedule: [
      { id: 's1', day: 'Lunes', start: '08:30', end: '09:25', subjectId: 'matematicas', location: 'Aula 2.4' },
      { id: 's2', day: 'Lunes', start: '09:30', end: '10:25', subjectId: 'historia', location: 'Aula 1.2' },
      { id: 's3', day: 'Martes', start: '10:45', end: '11:40', subjectId: 'biologia', location: 'Lab 3' },
      { id: 's4', day: 'Martes', start: '11:45', end: '12:40', subjectId: 'ingles', location: 'Lab Idiomas' },
      { id: 's5', day: 'Miércoles', start: '08:30', end: '09:25', subjectId: 'economia', location: 'Aula 0.7' },
      { id: 's6', day: 'Miércoles', start: '09:30', end: '10:25', subjectId: 'matematicas', location: 'Aula 2.4' },
      { id: 's7', day: 'Jueves', start: '10:45', end: '11:40', subjectId: 'historia', location: 'Aula 1.2' },
      { id: 's8', day: 'Viernes', start: '08:30', end: '09:25', subjectId: 'biologia', location: 'Lab 3' },
      { id: 's9', day: 'Viernes', start: '09:30', end: '10:25', subjectId: 'economia', location: 'Aula 0.7' },
    ],
    topics: [
      { id: 'topic_1', subjectId: 'historia', title: 'Causas y consecuencias', difficulty: 4, completed: false },
      { id: 'topic_2', subjectId: 'historia', title: 'Eje cronologico', difficulty: 3, completed: true },
      { id: 'topic_3', subjectId: 'matematicas', title: 'Sistemas de ecuaciones', difficulty: 5, completed: false },
      { id: 'topic_4', subjectId: 'biologia', title: 'Fotosíntesis y respiración', difficulty: 4, completed: false },
      { id: 'topic_5', subjectId: 'economia', title: 'Presupuesto personal', difficulty: 2, completed: true },
    ],
    messages: [
      {
        id: 'msg_1',
        from: 'Tutor',
        message: 'Biología necesita dos sesiones esta semana para recuperar margen.',
        date: iso(0),
        tone: 'riesgo',
      },
      {
        id: 'msg_2',
        from: 'Familia',
        message: 'El bloque de matemáticas de hoy queda confirmado.',
        date: iso(-1),
        tone: 'info',
      },
      {
        id: 'msg_3',
        from: 'El Campus',
        message: 'Inglés va por encima del objetivo y no requiere refuerzo urgente.',
        date: iso(-2),
        tone: 'positivo',
      },
    ],
    resources: [
      { id: 'res_1', title: 'Resumen Revolución Industrial', subjectId: 'historia', kind: 'PDF', updatedAt: iso(-1) },
      { id: 'res_2', title: 'Ejercicios de álgebra resueltos', subjectId: 'matematicas', kind: 'Práctica', updatedAt: iso(-3) },
      { id: 'res_3', title: 'Plantilla informe laboratorio', subjectId: 'biologia', kind: 'Apunte', updatedAt: iso(-4) },
    ],
  };
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function getPriorityRank(priority: Priority) {
  if (priority === 'alta') return 3;
  if (priority === 'media') return 2;
  return 1;
}

function priorityClass(priority: Priority) {
  if (priority === 'alta') return 'bg-red-50 text-red-700 border-red-200';
  if (priority === 'media') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function statusClass(status: TaskStatus) {
  if (status === 'hecho') return 'bg-green-50 text-green-800 border-green-200';
  if (status === 'en-progreso') return 'bg-blue-50 text-blue-800 border-blue-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

function getSubject(subjects: Subject[], subjectId: string) {
  return subjects.find((subject) => subject.id === subjectId) ?? subjects[0];
}

function buildStudyPlan(data: CampusData, todayISO: string): StudySession[] {
  const pending = data.tasks
    .filter((task) => task.status !== 'hecho')
    .filter((task) => !!getSubject(data.subjects, task.subjectId))
    .sort((a, b) => {
      const byDate = parseISODate(a.dueDate).getTime() - parseISODate(b.dueDate).getTime();
      if (byDate !== 0) return byDate;
      return getPriorityRank(b.priority) - getPriorityRank(a.priority);
    });

  const sessions: StudySession[] = [];

  pending.forEach((task) => {
    const subject = getSubject(data.subjects, task.subjectId);
    if (!subject) return;

    const daysLeft = clampNumber(daysBetween(todayISO, task.dueDate), 0, 30);
    const topicPenalty = data.topics
      .filter((topic) => topic.subjectId === task.subjectId && !topic.completed)
      .reduce((total, topic) => total + topic.difficulty * 5, 0);
    const minutes = task.type === 'examen'
      ? task.estimatedMinutes + topicPenalty
      : task.estimatedMinutes;
    const sessionCount = clampNumber(Math.ceil(minutes / 40), 1, Math.min(8, daysLeft + 1 || 1));
    const chunk = Math.max(25, Math.ceil(minutes / sessionCount));

    for (let index = 0; index < sessionCount; index += 1) {
      const offset = daysLeft === 0 ? 0 : Math.min(daysLeft, index);
      const date = toISODate(addDays(parseISODate(todayISO), offset));
      sessions.push({
        id: `${task.id}_${index}`,
        date,
        title: task.type === 'examen' ? `Repaso: ${task.title}` : task.title,
        subject,
        minutes: chunk,
        reason: task.type === 'examen' ? 'Examen próximo' : TASK_TYPE_LABEL[task.type],
        priority: task.priority,
      });
    }
  });

  return sessions
    .sort((a, b) => {
      const byDate = parseISODate(a.date).getTime() - parseISODate(b.date).getTime();
      if (byDate !== 0) return byDate;
      return getPriorityRank(b.priority) - getPriorityRank(a.priority);
    })
    .slice(0, 18);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function ProgressLine({ value, color = CAMPUS_COLORS.cuerpo }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clampNumber(value, 0, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold', className)}>
      {children}
    </span>
  );
}

function IconButton({
  title,
  children,
  onClick,
  className,
  type = 'button',
}: {
  title: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-95',
        className
      )}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{children}</label>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
        props.className
      )}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
        props.className
      )}
    />
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}18`, color }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-600">{detail}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center">
      <div className="space-y-2 text-slate-500">
        <Icon className="mx-auto h-6 w-6" />
        <p className="text-sm font-semibold">{title}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-slate-700" />
        <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function TaskCard({
  task,
  subject,
  todayISO,
  onStatus,
  onDelete,
}: {
  task: CampusTask;
  subject: Subject;
  todayISO: string;
  onStatus: (status: TaskStatus) => void;
  onDelete: () => void;
}) {
  const daysLeft = daysBetween(todayISO, task.dueDate);
  const isLate = daysLeft < 0 && task.status !== 'hecho';

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill className={priorityClass(task.priority)}>{PRIORITY_LABEL[task.priority]}</Pill>
            <Pill className={statusClass(task.status)}>{STATUS_LABEL[task.status]}</Pill>
            {isLate && <Pill className="border-red-200 bg-red-50 text-red-700">Retrasado</Pill>}
          </div>
          <h3 className="truncate text-base font-black text-slate-950">{task.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </span>
            <span>{TASK_TYPE_LABEL[task.type]}</span>
            <span>{formatLongDate(task.dueDate)}</span>
          </div>
        </div>
        <IconButton title="Eliminar" onClick={onDelete} className="text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Tiempo</p>
          <p className="mt-1 font-black text-slate-900">{task.estimatedMinutes} min</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Peso</p>
          <p className="mt-1 font-black text-slate-900">{task.weight}%</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase text-slate-500">Faltan</p>
          <p className="mt-1 font-black text-slate-900">{Math.max(daysLeft, 0)} d</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onStatus('pendiente')}
          className={cn(
            'h-9 rounded-lg border px-3 text-sm font-bold transition',
            task.status === 'pendiente' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
          )}
        >
          Pendiente
        </button>
        <button
          type="button"
          onClick={() => onStatus('en-progreso')}
          className={cn(
            'h-9 rounded-lg border px-3 text-sm font-bold transition',
            task.status === 'en-progreso' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'
          )}
        >
          En progreso
        </button>
        <button
          type="button"
          onClick={() => onStatus('hecho')}
          className={cn(
            'h-9 rounded-lg border px-3 text-sm font-bold transition',
            task.status === 'hecho' ? 'border-green-800 bg-green-800 text-white' : 'border-slate-200 bg-white text-slate-700'
          )}
        >
          Hecho
        </button>
      </div>
    </div>
  );
}

function CampusDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('inicio');
  const [data, setData] = useState<CampusData>(EMPTY_DATA);
  const [newSubject, setNewSubject] = useState({
    name: '',
    teacher: '',
    color: SUBJECT_PALETTE[0],
    currentGrade: 6,
    goal: 7,
    attendance: 95,
    credits: 6,
    room: '',
  });
  const [newTask, setNewTask] = useState({
    title: '',
    subjectId: '',
    type: 'tarea' as TaskType,
    dueDate: toISODate(addDays(new Date(), 3)),
    estimatedMinutes: 45,
    priority: 'media' as Priority,
    status: 'pendiente' as TaskStatus,
    weight: 10,
  });
  const [newBlock, setNewBlock] = useState({
    day: 'Lunes' as WeekDay,
    start: '08:30',
    end: '09:25',
    subjectId: '',
    location: '',
  });
  const [newTopic, setNewTopic] = useState({
    title: '',
    subjectId: '',
    difficulty: 3,
  });
  const [newMessage, setNewMessage] = useState('');
  const [gradeSimulator, setGradeSimulator] = useState({
    subjectId: '',
    currentGrade: 6.5,
    targetGrade: 7.5,
    nextWeight: 30,
  });
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const todayISO = useMemo(() => toISODate(new Date()), []);
  const todayDay = useMemo(() => getWeekDay(new Date()), []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CampusData;
        setData({
          ...createInitialData(),
          ...parsed,
          settings: { ...createInitialData().settings, ...parsed.settings },
        });
      } else {
        setData(createInitialData());
      }
    } catch {
      setData(createInitialData());
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, mounted]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval);
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (!newTask.subjectId && data.subjects[0]) {
      setNewTask((task) => ({ ...task, subjectId: data.subjects[0].id }));
    }
    if (!newBlock.subjectId && data.subjects[0]) {
      setNewBlock((block) => ({ ...block, subjectId: data.subjects[0].id }));
    }
    if (!newTopic.subjectId && data.subjects[0]) {
      setNewTopic((topic) => ({ ...topic, subjectId: data.subjects[0].id }));
    }
    if (!gradeSimulator.subjectId && data.subjects[0]) {
      setGradeSimulator((simulator) => ({
        ...simulator,
        subjectId: data.subjects[0].id,
        currentGrade: data.subjects[0].currentGrade,
        targetGrade: data.subjects[0].goal,
      }));
    }
  }, [data.subjects, gradeSimulator.subjectId, newBlock.subjectId, newTask.subjectId, newTopic.subjectId]);

  const subjectById = useMemo(
    () => new Map(data.subjects.map((subject) => [subject.id, subject])),
    [data.subjects]
  );

  const pendingTasks = useMemo(() => data.tasks.filter((task) => task.status !== 'hecho'), [data.tasks]);
  const completedTasks = data.tasks.length - pendingTasks.length;
  const averageGrade = average(data.subjects.map((subject) => subject.currentGrade));
  const averageAttendance = average(data.subjects.map((subject) => subject.attendance));
  const studyPlan = useMemo(() => buildStudyPlan(data, todayISO), [data, todayISO]);
  const todaySessions = studyPlan.filter((session) => session.date === todayISO);
  const weekStudyMinutes = studyPlan
    .filter((session) => daysBetween(todayISO, session.date) <= 6)
    .reduce((total, session) => total + session.minutes, 0);
  const todaySchedule = data.schedule
    .filter((block) => block.day === todayDay)
    .sort((a, b) => a.start.localeCompare(b.start));
  const dueThisWeek = pendingTasks
    .filter((task) => daysBetween(todayISO, task.dueDate) <= 7)
    .sort((a, b) => parseISODate(a.dueDate).getTime() - parseISODate(b.dueDate).getTime());
  const overdueTasks = pendingTasks.filter((task) => daysBetween(todayISO, task.dueDate) < 0);
  const riskSubjects = data.subjects.filter((subject) => {
    const subjectPending = pendingTasks.filter((task) => task.subjectId === subject.id);
    const urgentCount = subjectPending.filter((task) => daysBetween(todayISO, task.dueDate) <= 3).length;
    return subject.currentGrade < subject.goal - 0.6 || subject.attendance < 85 || urgentCount >= 2;
  });
  const totalCredits = data.subjects.reduce((total, subject) => total + subject.credits, 0);
  const completedTopics = data.topics.filter((topic) => topic.completed).length;
  const requiredNextGrade = useMemo(() => {
    const weight = clampNumber(gradeSimulator.nextWeight, 1, 100) / 100;
    return clampNumber((gradeSimulator.targetGrade - gradeSimulator.currentGrade * (1 - weight)) / weight, 0, 10);
  }, [gradeSimulator]);

  const weeklyDigest = useMemo(() => {
    const topRisk = riskSubjects[0]?.name ?? 'sin riesgo crítico';
    return [
      `${data.settings.studentName}: ${pendingTasks.length} pendientes activos.`,
      `Nota media ${averageGrade.toFixed(1)} y asistencia ${averageAttendance.toFixed(0)}%.`,
      `Foco de la semana: ${topRisk}.`,
      `Plan propuesto: ${Math.round(weekStudyMinutes / 60)} h ${weekStudyMinutes % 60} min.`,
    ].join('\n');
  }, [averageAttendance, averageGrade, data.settings.studentName, pendingTasks.length, riskSubjects, weekStudyMinutes]);

  const updateSettings = (patch: Partial<CampusSettings>) => {
    setData((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }));
  };

  const addSubject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newSubject.name.trim()) return;

    const subject: Subject = {
      id: createId('subject'),
      name: newSubject.name.trim(),
      teacher: newSubject.teacher.trim() || 'Sin profesor',
      color: newSubject.color,
      currentGrade: clampNumber(Number(newSubject.currentGrade), 0, 10),
      goal: clampNumber(Number(newSubject.goal), 0, 10),
      attendance: clampNumber(Number(newSubject.attendance), 0, 100),
      credits: clampNumber(Number(newSubject.credits), 0, 30),
      room: newSubject.room.trim() || 'Sin aula',
    };

    setData((current) => ({
      ...current,
      subjects: [...current.subjects, subject],
    }));
    setNewSubject({
      name: '',
      teacher: '',
      color: SUBJECT_PALETTE[data.subjects.length % SUBJECT_PALETTE.length],
      currentGrade: 6,
      goal: 7,
      attendance: 95,
      credits: 6,
      room: '',
    });
  };

  const updateSubject = (subjectId: string, patch: Partial<Subject>) => {
    setData((current) => ({
      ...current,
      subjects: current.subjects.map((subject) =>
        subject.id === subjectId ? { ...subject, ...patch } : subject
      ),
    }));
  };

  const deleteSubject = (subjectId: string) => {
    setData((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== subjectId),
      tasks: current.tasks.filter((task) => task.subjectId !== subjectId),
      schedule: current.schedule.filter((block) => block.subjectId !== subjectId),
      topics: current.topics.filter((topic) => topic.subjectId !== subjectId),
      resources: current.resources.filter((resource) => resource.subjectId !== subjectId),
    }));
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTask.title.trim() || !newTask.subjectId) return;

    const task: CampusTask = {
      id: createId('task'),
      title: newTask.title.trim(),
      subjectId: newTask.subjectId,
      type: newTask.type,
      dueDate: newTask.dueDate,
      estimatedMinutes: clampNumber(Number(newTask.estimatedMinutes), 5, 1200),
      priority: newTask.priority,
      status: newTask.status,
      weight: clampNumber(Number(newTask.weight), 0, 100),
    };

    setData((current) => ({
      ...current,
      tasks: [...current.tasks, task],
    }));
    setNewTask((taskState) => ({
      ...taskState,
      title: '',
      estimatedMinutes: 45,
      priority: 'media',
      status: 'pendiente',
      weight: 10,
    }));
  };

  const updateTask = (taskId: string, patch: Partial<CampusTask>) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
    }));
  };

  const deleteTask = (taskId: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const addScheduleBlock = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newBlock.subjectId) return;
    setData((current) => ({
      ...current,
      schedule: [
        ...current.schedule,
        {
          id: createId('schedule'),
          day: newBlock.day,
          start: newBlock.start,
          end: newBlock.end,
          subjectId: newBlock.subjectId,
          location: newBlock.location.trim() || getSubject(current.subjects, newBlock.subjectId)?.room || 'Aula',
        },
      ],
    }));
  };

  const deleteScheduleBlock = (blockId: string) => {
    setData((current) => ({
      ...current,
      schedule: current.schedule.filter((block) => block.id !== blockId),
    }));
  };

  const addTopic = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newTopic.title.trim() || !newTopic.subjectId) return;
    setData((current) => ({
      ...current,
      topics: [
        ...current.topics,
        {
          id: createId('topic'),
          subjectId: newTopic.subjectId,
          title: newTopic.title.trim(),
          difficulty: clampNumber(Number(newTopic.difficulty), 1, 5),
          completed: false,
        },
      ],
    }));
    setNewTopic((topic) => ({ ...topic, title: '', difficulty: 3 }));
  };

  const updateTopic = (topicId: string, completed: boolean) => {
    setData((current) => ({
      ...current,
      topics: current.topics.map((topic) => (topic.id === topicId ? { ...topic, completed } : topic)),
    }));
  };

  const deleteTopic = (topicId: string) => {
    setData((current) => ({
      ...current,
      topics: current.topics.filter((topic) => topic.id !== topicId),
    }));
  };

  const addFamilyMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newMessage.trim()) return;
    setData((current) => ({
      ...current,
      messages: [
        {
          id: createId('msg'),
          from: 'Familia',
          message: newMessage.trim(),
          date: todayISO,
          tone: 'info',
        },
        ...current.messages,
      ],
    }));
    setNewMessage('');
  };

  const copyDigest = async () => {
    await navigator.clipboard?.writeText(weeklyDigest);
  };

  const resetDemoData = () => {
    setData(createInitialData());
    setTimerSeconds(25 * 60);
    setTimerRunning(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="h-32 rounded-lg bg-white shadow-sm" />
          <div className="grid gap-4 md:grid-cols-4">
            <div className="h-32 rounded-lg bg-white shadow-sm" />
            <div className="h-32 rounded-lg bg-white shadow-sm" />
            <div className="h-32 rounded-lg bg-white shadow-sm" />
            <div className="h-32 rounded-lg bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  const activeSubjectForSimulator = subjectById.get(gradeSimulator.subjectId);

  return (
    <div className="min-h-screen bg-[#f6f8f7] pb-24 text-slate-950">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:px-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: CAMPUS_COLORS.cuerpo }}>
                <GraduationCap className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">El Campus</h1>
                  <Pill className="border-green-200 bg-green-50 text-green-800">Quioba.com</Pill>
                </div>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {data.settings.studentName} · {data.settings.schoolName} · {data.settings.courseName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'alumno' as ProfileMode, label: 'Alumno', icon: UserRound, color: CAMPUS_COLORS.cuerpo },
                { key: 'familia' as ProfileMode, label: 'Familia', icon: UsersRound, color: CAMPUS_COLORS.mente },
                { key: 'universidad' as ProfileMode, label: 'Universidad', icon: School, color: CAMPUS_COLORS.finanzas },
              ].map((mode) => {
                const Icon = mode.icon;
                const isActive = data.settings.profileMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => updateSettings({ profileMode: mode.key })}
                    className={cn(
                      'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-black transition',
                      isActive ? 'text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                    style={isActive ? { backgroundColor: mode.color, borderColor: mode.color } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 lg:w-[510px]">
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-black uppercase text-green-800">Cuerpo</p>
                <p className="text-xs text-slate-600">rutina y asistencia</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-black uppercase text-blue-800">Mente</p>
                <p className="text-xs text-slate-600">foco y estudio</p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-black uppercase text-amber-700">Finanzas</p>
                <p className="text-xs text-slate-600">objetivos y becas</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('estudio')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-700 bg-blue-700 px-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
              >
                <TimerReset className="h-4 w-4" />
                Estudiar ahora
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tareas')}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Añadir pendiente
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <nav className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4 lg:grid-cols-1">
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'flex h-11 items-center justify-start gap-2 rounded-lg px-3 text-sm font-black transition',
                    isActive ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">Carga semanal</p>
              <Activity className="h-4 w-4 text-green-800" />
            </div>
            <p className="mt-2 text-3xl font-black">{Math.round(weekStudyMinutes / 60)}h</p>
            <ProgressLine value={(weekStudyMinutes / Math.max(data.settings.dailyStudyMinutes * 7, 1)) * 100} color={CAMPUS_COLORS.mente} />
            <p className="mt-2 text-xs text-slate-500">Objetivo: {data.settings.dailyStudyMinutes} min/día</p>
          </div>
        </aside>

        <main className="min-w-0">
          {activeTab === 'inicio' && (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  icon={ListChecks}
                  label="Pendientes"
                  value={String(pendingTasks.length)}
                  detail={`${completedTasks} terminados en el tablero`}
                  color={CAMPUS_COLORS.cuerpo}
                />
                <MetricCard
                  icon={BarChart3}
                  label="Nota media"
                  value={averageGrade.toFixed(1)}
                  detail={`Objetivo medio ${average(data.subjects.map((subject) => subject.goal)).toFixed(1)}`}
                  color={CAMPUS_COLORS.mente}
                />
                <MetricCard
                  icon={Clock3}
                  label="Plan semanal"
                  value={`${Math.round(weekStudyMinutes / 60)}h`}
                  detail={`${todaySessions.reduce((total, session) => total + session.minutes, 0)} min hoy`}
                  color={CAMPUS_COLORS.finanzas}
                />
                <MetricCard
                  icon={AlertTriangle}
                  label="Riesgos"
                  value={String(riskSubjects.length + overdueTasks.length)}
                  detail={overdueTasks.length ? `${overdueTasks.length} retrasados` : 'Sin retrasos activos'}
                  color="#dc2626"
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={Sparkles} title="Hoy" />
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Clases</h3>
                      {todaySchedule.length ? (
                        <div className="space-y-2">
                          {todaySchedule.map((block) => {
                            const subject = subjectById.get(block.subjectId);
                            if (!subject) return null;
                            return (
                              <div key={block.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                                <div className="h-10 w-1.5 rounded-full" style={{ backgroundColor: subject.color }} />
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-slate-950">{subject.name}</p>
                                  <p className="text-sm text-slate-600">{block.start}-{block.end} · {block.location}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <EmptyState icon={CalendarDays} title="Sin clases programadas hoy" />
                      )}
                    </div>

                    <div>
                      <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-slate-500">Estudio</h3>
                      {todaySessions.length ? (
                        <div className="space-y-2">
                          {todaySessions.map((session) => (
                            <div key={session.id} className="rounded-lg border border-slate-200 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-950">{session.title}</p>
                                  <p className="text-sm text-slate-600">{session.subject.name} · {session.reason}</p>
                                </div>
                                <Pill className="border-blue-200 bg-blue-50 text-blue-800">{session.minutes} min</Pill>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState icon={Brain} title="Plan limpio para hoy" />
                      )}
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={AlertTriangle} title="Prioridad" />
                  {riskSubjects.length ? (
                    <div className="space-y-3">
                      {riskSubjects.slice(0, 4).map((subject) => {
                        const gap = Math.max(subject.goal - subject.currentGrade, 0);
                        return (
                          <div key={subject.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-black text-slate-950">{subject.name}</p>
                                <p className="text-sm text-slate-600">Faltan {gap.toFixed(1)} puntos</p>
                              </div>
                              <Pill className="border-red-200 bg-red-50 text-red-700">{subject.attendance}% asistencia</Pill>
                            </div>
                            <div className="mt-3">
                              <ProgressLine value={(subject.currentGrade / Math.max(subject.goal, 1)) * 100} color={subject.color} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={CheckCircle2} title="Sin asignaturas en riesgo" />
                  )}
                </section>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={CalendarPlus} title="Próximos 7 días" />
                {dueThisWeek.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {dueThisWeek.map((task) => {
                      const subject = subjectById.get(task.subjectId);
                      if (!subject) return null;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setActiveTab('tareas')}
                          className="group rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Pill className={priorityClass(task.priority)}>{TASK_TYPE_LABEL[task.type]}</Pill>
                            <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5" />
                          </div>
                          <p className="mt-3 font-black text-slate-950">{task.title}</p>
                          <p className="mt-1 text-sm text-slate-600">{subject.name} · {formatLongDate(task.dueDate)}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={CheckCircle2} title="No hay entregas urgentes" />
                )}
              </section>
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={CalendarDays} title="Horario semanal" />
                <div className="grid gap-3 xl:grid-cols-7">
                  {WEEK_DAYS.map((day) => {
                    const blocks = data.schedule
                      .filter((block) => block.day === day)
                      .sort((a, b) => a.start.localeCompare(b.start));
                    return (
                      <div key={day} className={cn('min-h-44 rounded-lg border p-3', day === todayDay ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-white')}>
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="font-black text-slate-950">{day}</h3>
                          <span className="text-xs font-bold text-slate-500">{blocks.length}</span>
                        </div>
                        <div className="space-y-2">
                          {blocks.map((block) => {
                            const subject = subjectById.get(block.subjectId);
                            if (!subject) return null;
                            return (
                              <div key={block.id} className="rounded-lg bg-white p-2 shadow-sm ring-1 ring-slate-200">
                                <div className="flex items-start gap-2">
                                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-black">{subject.name}</p>
                                    <p className="text-xs text-slate-600">{block.start}-{block.end}</p>
                                    <p className="truncate text-xs text-slate-500">{block.location}</p>
                                  </div>
                                  <button
                                    type="button"
                                    title="Eliminar bloque"
                                    onClick={() => deleteScheduleBlock(block.id)}
                                    className="text-slate-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={Plus} title="Nuevo bloque de horario" />
                <form onSubmit={addScheduleBlock} className="grid gap-3 md:grid-cols-6">
                  <div>
                    <FieldLabel>Día</FieldLabel>
                    <SelectInput value={newBlock.day} onChange={(event) => setNewBlock({ ...newBlock, day: event.target.value as WeekDay })}>
                      {WEEK_DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Inicio</FieldLabel>
                    <TextInput type="time" value={newBlock.start} onChange={(event) => setNewBlock({ ...newBlock, start: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Fin</FieldLabel>
                    <TextInput type="time" value={newBlock.end} onChange={(event) => setNewBlock({ ...newBlock, end: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Asignatura</FieldLabel>
                    <SelectInput value={newBlock.subjectId} onChange={(event) => setNewBlock({ ...newBlock, subjectId: event.target.value })}>
                      {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Aula</FieldLabel>
                    <TextInput value={newBlock.location} onChange={(event) => setNewBlock({ ...newBlock, location: event.target.value })} placeholder="Aula" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-black text-white">
                      <Plus className="h-4 w-4" />
                      Añadir
                    </button>
                  </div>
                </form>
              </section>
            </div>
          )}

          {activeTab === 'asignaturas' && (
            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.subjects.map((subject) => {
                  const subjectTasks = data.tasks.filter((task) => task.subjectId === subject.id && task.status !== 'hecho');
                  const subjectTopics = data.topics.filter((topic) => topic.subjectId === subject.id);
                  const topicProgress = subjectTopics.length ? (subjectTopics.filter((topic) => topic.completed).length / subjectTopics.length) * 100 : 0;
                  return (
                    <div key={subject.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block h-2 w-12 rounded-full" style={{ backgroundColor: subject.color }} />
                          <h3 className="mt-3 truncate text-xl font-black text-slate-950">{subject.name}</h3>
                          <p className="text-sm text-slate-600">{subject.teacher} · {subject.room}</p>
                        </div>
                        <IconButton title="Eliminar asignatura" onClick={() => deleteSubject(subject.id)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-500">Nota</p>
                          <p className="text-2xl font-black">{subject.currentGrade.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-500">Meta</p>
                          <p className="text-2xl font-black">{subject.goal.toFixed(1)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 p-3">
                          <p className="text-xs font-bold text-slate-500">Cred.</p>
                          <p className="text-2xl font-black">{subject.credits}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold text-slate-600">Objetivo</span>
                            <span className="font-black">{Math.min((subject.currentGrade / Math.max(subject.goal, 1)) * 100, 100).toFixed(0)}%</span>
                          </div>
                          <ProgressLine value={(subject.currentGrade / Math.max(subject.goal, 1)) * 100} color={subject.color} />
                        </div>
                        <div>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold text-slate-600">Temario</span>
                            <span className="font-black">{topicProgress.toFixed(0)}%</span>
                          </div>
                          <ProgressLine value={topicProgress} color={CAMPUS_COLORS.mente} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <div>
                          <FieldLabel>Nota</FieldLabel>
                          <TextInput
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={subject.currentGrade}
                            onChange={(event) => updateSubject(subject.id, { currentGrade: clampNumber(Number(event.target.value), 0, 10) })}
                          />
                        </div>
                        <div>
                          <FieldLabel>Meta</FieldLabel>
                          <TextInput
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={subject.goal}
                            onChange={(event) => updateSubject(subject.id, { goal: clampNumber(Number(event.target.value), 0, 10) })}
                          />
                        </div>
                        <div>
                          <FieldLabel>Asistencia</FieldLabel>
                          <TextInput
                            type="number"
                            min={0}
                            max={100}
                            value={subject.attendance}
                            onChange={(event) => updateSubject(subject.id, { attendance: clampNumber(Number(event.target.value), 0, 100) })}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                        <span className="font-bold text-slate-600">{subjectTasks.length} pendientes</span>
                        <button type="button" onClick={() => setActiveTab('tareas')} className="font-black text-blue-700 hover:text-blue-900">
                          Ver tareas
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={Plus} title="Nueva asignatura" />
                <form onSubmit={addSubject} className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                  <div className="md:col-span-2">
                    <FieldLabel>Nombre</FieldLabel>
                    <TextInput value={newSubject.name} onChange={(event) => setNewSubject({ ...newSubject, name: event.target.value })} placeholder="Fisica" />
                  </div>
                  <div>
                    <FieldLabel>Profesor</FieldLabel>
                    <TextInput value={newSubject.teacher} onChange={(event) => setNewSubject({ ...newSubject, teacher: event.target.value })} placeholder="Tutor" />
                  </div>
                  <div>
                    <FieldLabel>Aula</FieldLabel>
                    <TextInput value={newSubject.room} onChange={(event) => setNewSubject({ ...newSubject, room: event.target.value })} placeholder="Aula" />
                  </div>
                  <div>
                    <FieldLabel>Nota</FieldLabel>
                    <TextInput type="number" min={0} max={10} step={0.1} value={newSubject.currentGrade} onChange={(event) => setNewSubject({ ...newSubject, currentGrade: Number(event.target.value) })} />
                  </div>
                  <div>
                    <FieldLabel>Meta</FieldLabel>
                    <TextInput type="number" min={0} max={10} step={0.1} value={newSubject.goal} onChange={(event) => setNewSubject({ ...newSubject, goal: Number(event.target.value) })} />
                  </div>
                  <div>
                    <FieldLabel>Créditos</FieldLabel>
                    <TextInput type="number" min={0} max={30} value={newSubject.credits} onChange={(event) => setNewSubject({ ...newSubject, credits: Number(event.target.value) })} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-green-800 px-3 text-sm font-black text-white">
                      <Plus className="h-4 w-4" />
                      Crear
                    </button>
                  </div>
                  <div className="md:col-span-4 xl:col-span-8">
                    <FieldLabel>Color</FieldLabel>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {SUBJECT_PALETTE.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          onClick={() => setNewSubject({ ...newSubject, color })}
                          className={cn('h-9 w-9 rounded-lg border-2', newSubject.color === color ? 'border-slate-950' : 'border-white')}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </form>
              </section>
            </div>
          )}

          {activeTab === 'tareas' && (
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={Plus} title="Nuevo pendiente" />
                <form onSubmit={addTask} className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                  <div className="md:col-span-2 xl:col-span-2">
                    <FieldLabel>Titulo</FieldLabel>
                    <TextInput value={newTask.title} onChange={(event) => setNewTask({ ...newTask, title: event.target.value })} placeholder="Examen, entrega o proyecto" />
                  </div>
                  <div>
                    <FieldLabel>Asignatura</FieldLabel>
                    <SelectInput value={newTask.subjectId} onChange={(event) => setNewTask({ ...newTask, subjectId: event.target.value })}>
                      {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Tipo</FieldLabel>
                    <SelectInput value={newTask.type} onChange={(event) => setNewTask({ ...newTask, type: event.target.value as TaskType })}>
                      {Object.keys(TASK_TYPE_LABEL).map((type) => <option key={type} value={type}>{TASK_TYPE_LABEL[type as TaskType]}</option>)}
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Fecha</FieldLabel>
                    <TextInput type="date" value={newTask.dueDate} onChange={(event) => setNewTask({ ...newTask, dueDate: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Minutos</FieldLabel>
                    <TextInput type="number" min={5} value={newTask.estimatedMinutes} onChange={(event) => setNewTask({ ...newTask, estimatedMinutes: Number(event.target.value) })} />
                  </div>
                  <div>
                    <FieldLabel>Prioridad</FieldLabel>
                    <SelectInput value={newTask.priority} onChange={(event) => setNewTask({ ...newTask, priority: event.target.value as Priority })}>
                      <option value="alta">Alta</option>
                      <option value="media">Media</option>
                      <option value="baja">Baja</option>
                    </SelectInput>
                  </div>
                  <div>
                    <FieldLabel>Peso %</FieldLabel>
                    <TextInput type="number" min={0} max={100} value={newTask.weight} onChange={(event) => setNewTask({ ...newTask, weight: Number(event.target.value) })} />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-black text-white">
                      <Plus className="h-4 w-4" />
                      Guardar
                    </button>
                  </div>
                </form>
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                {data.tasks
                  .slice()
                  .sort((a, b) => {
                    if (a.status === 'hecho' && b.status !== 'hecho') return 1;
                    if (a.status !== 'hecho' && b.status === 'hecho') return -1;
                    return parseISODate(a.dueDate).getTime() - parseISODate(b.dueDate).getTime();
                  })
                  .map((task) => {
                    const subject = subjectById.get(task.subjectId);
                    if (!subject) return null;
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        subject={subject}
                        todayISO={todayISO}
                        onStatus={(status) => updateTask(task.id, { status })}
                        onDelete={() => deleteTask(task.id)}
                      />
                    );
                  })}
              </section>
            </div>
          )}

          {activeTab === 'estudio' && (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={TimerReset} title="Foco" />
                  <div className="rounded-lg bg-slate-950 p-5 text-white">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-200">Sesión Pomodoro</p>
                    <p className="mt-3 text-center text-6xl font-black tabular-nums">
                      {String(Math.floor(timerSeconds / 60)).padStart(2, '0')}:{String(timerSeconds % 60).padStart(2, '0')}
                    </p>
                    <div className="mt-5 flex justify-center gap-2">
                      <IconButton
                        title={timerRunning ? 'Pausar' : 'Iniciar'}
                        onClick={() => setTimerRunning((running) => !running)}
                        className="border-white/20 bg-white text-slate-950 hover:bg-white/90"
                      >
                        {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </IconButton>
                      <IconButton
                        title="Reiniciar"
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(25 * 60);
                        }}
                        className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[15, 25, 50].map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => {
                          setTimerRunning(false);
                          setTimerSeconds(minutes * 60);
                        }}
                        className="h-10 rounded-lg border border-slate-200 bg-white text-sm font-black hover:bg-slate-50"
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={Brain} title="Plan inteligente" />
                  {studyPlan.length ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      {studyPlan.slice(0, 10).map((session) => (
                        <div key={session.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-950">{session.title}</p>
                              <p className="text-sm text-slate-600">{session.subject.name} · {formatLongDate(session.date)}</p>
                            </div>
                            <Pill className="border-blue-200 bg-blue-50 text-blue-800">{session.minutes} min</Pill>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-slate-500">{session.reason}</span>
                            <span className="h-2 w-16 rounded-full" style={{ backgroundColor: session.subject.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState icon={CheckCircle2} title="No hay sesiones pendientes" />
                  )}
                </section>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={NotebookTabs} title="Temario" />
                  <div className="mb-4 grid gap-3 md:grid-cols-5">
                    <form onSubmit={addTopic} className="grid gap-3 md:col-span-5 md:grid-cols-5">
                      <div className="md:col-span-2">
                        <FieldLabel>Tema</FieldLabel>
                        <TextInput value={newTopic.title} onChange={(event) => setNewTopic({ ...newTopic, title: event.target.value })} placeholder="Tema a estudiar" />
                      </div>
                      <div>
                        <FieldLabel>Asignatura</FieldLabel>
                        <SelectInput value={newTopic.subjectId} onChange={(event) => setNewTopic({ ...newTopic, subjectId: event.target.value })}>
                          {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                        </SelectInput>
                      </div>
                      <div>
                        <FieldLabel>Dificultad</FieldLabel>
                        <TextInput type="number" min={1} max={5} value={newTopic.difficulty} onChange={(event) => setNewTopic({ ...newTopic, difficulty: Number(event.target.value) })} />
                      </div>
                      <div className="flex items-end">
                        <button type="submit" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-black text-white">
                          <Plus className="h-4 w-4" />
                          Añadir
                        </button>
                      </div>
                    </form>
                  </div>

                  {data.topics.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {data.topics.map((topic) => {
                        const subject = subjectById.get(topic.subjectId);
                        if (!subject) return null;
                        return (
                          <div key={topic.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                            <button
                              type="button"
                              title={topic.completed ? 'Marcar pendiente' : 'Marcar completado'}
                              onClick={() => updateTopic(topic.id, !topic.completed)}
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                                topic.completed ? 'border-green-800 bg-green-800 text-white' : 'border-slate-200 bg-white text-slate-400'
                              )}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={cn('truncate font-black', topic.completed && 'text-slate-400 line-through')}>{topic.title}</p>
                              <p className="text-sm text-slate-600">{subject.name} · dificultad {topic.difficulty}/5</p>
                            </div>
                            <IconButton title="Eliminar tema" onClick={() => deleteTopic(topic.id)} className="h-8 w-8 text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </IconButton>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState icon={NotebookTabs} title="Sin temario registrado" />
                  )}
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={FileText} title="Materiales" />
                  <div className="space-y-2">
                    {data.resources.map((resource) => {
                      const subject = subjectById.get(resource.subjectId);
                      if (!subject) return null;
                      return (
                        <div key={resource.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-black text-slate-950">{resource.title}</p>
                              <p className="text-sm text-slate-600">{subject.name} · {resource.kind} · {formatShortDate(resource.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'notas' && (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={LineChart} title="Notas y objetivos" />
                  <div className="space-y-3">
                    {data.subjects.map((subject) => (
                      <div key={subject.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-slate-950">{subject.name}</p>
                            <p className="text-sm text-slate-600">Actual {subject.currentGrade.toFixed(1)} · meta {subject.goal.toFixed(1)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Pill className={subject.currentGrade >= subject.goal ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                              {subject.currentGrade >= subject.goal ? 'En objetivo' : `-${(subject.goal - subject.currentGrade).toFixed(1)}`}
                            </Pill>
                            <Pill className="border-slate-200 bg-slate-50 text-slate-600">{subject.credits} créditos</Pill>
                          </div>
                        </div>
                        <div className="mt-3">
                          <ProgressLine value={(subject.currentGrade / 10) * 100} color={subject.color} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={Target} title="Simulador" />
                  <div className="space-y-3">
                    <div>
                      <FieldLabel>Asignatura</FieldLabel>
                      <SelectInput
                        value={gradeSimulator.subjectId}
                        onChange={(event) => {
                          const subject = subjectById.get(event.target.value);
                          setGradeSimulator({
                            ...gradeSimulator,
                            subjectId: event.target.value,
                            currentGrade: subject?.currentGrade ?? gradeSimulator.currentGrade,
                            targetGrade: subject?.goal ?? gradeSimulator.targetGrade,
                          });
                        }}
                      >
                        {data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                      </SelectInput>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Actual</FieldLabel>
                        <TextInput type="number" min={0} max={10} step={0.1} value={gradeSimulator.currentGrade} onChange={(event) => setGradeSimulator({ ...gradeSimulator, currentGrade: Number(event.target.value) })} />
                      </div>
                      <div>
                        <FieldLabel>Objetivo</FieldLabel>
                        <TextInput type="number" min={0} max={10} step={0.1} value={gradeSimulator.targetGrade} onChange={(event) => setGradeSimulator({ ...gradeSimulator, targetGrade: Number(event.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Peso del siguiente examen</FieldLabel>
                      <TextInput type="number" min={1} max={100} value={gradeSimulator.nextWeight} onChange={(event) => setGradeSimulator({ ...gradeSimulator, nextWeight: Number(event.target.value) })} />
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">Necesitas sacar</p>
                      <p className="mt-2 text-5xl font-black text-slate-950">{requiredNextGrade.toFixed(1)}</p>
                      <p className="mt-2 text-sm text-slate-700">{activeSubjectForSimulator?.name ?? 'Asignatura'} · siguiente prueba</p>
                    </div>
                  </div>
                </section>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={GraduationCap} title="Universidad" />
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard icon={Layers} label="Créditos" value={String(totalCredits)} detail="Carga registrada" color={CAMPUS_COLORS.finanzas} />
                  <MetricCard icon={NotebookTabs} label="Temas" value={`${completedTopics}/${data.topics.length}`} detail="Temario completado" color={CAMPUS_COLORS.mente} />
                  <MetricCard icon={TrendingUp} label="Convocatorias" value={String(data.tasks.filter((task) => task.type === 'examen').length)} detail="Exámenes activos" color={CAMPUS_COLORS.cuerpo} />
                </div>
              </section>
            </div>
          )}

          {activeTab === 'familia' && (
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle
                    icon={UsersRound}
                    title="Resumen familiar"
                    action={
                      <button type="button" onClick={copyDigest} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                        <FileText className="h-4 w-4" />
                        Copiar
                      </button>
                    }
                  />
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-lg bg-green-50 p-4">
                      <p className="text-xs font-black uppercase text-green-800">Seguimiento</p>
                      <p className="mt-2 text-3xl font-black text-slate-950">{completedTasks}/{data.tasks.length}</p>
                      <p className="text-sm text-slate-600">tareas completadas</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 p-4">
                      <p className="text-xs font-black uppercase text-blue-800">Estudio</p>
                      <p className="mt-2 text-3xl font-black text-slate-950">{Math.round(weekStudyMinutes / 60)}h</p>
                      <p className="text-sm text-slate-600">programadas</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-4">
                      <p className="text-xs font-black uppercase text-amber-700">Alertas</p>
                      <p className="mt-2 text-3xl font-black text-slate-950">{riskSubjects.length}</p>
                      <p className="text-sm text-slate-600">materias a vigilar</p>
                    </div>
                  </div>

                  <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                    {weeklyDigest}
                  </pre>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionTitle icon={Bell} title="Avisos" />
                  <div className="space-y-3">
                    {riskSubjects.map((subject) => (
                      <div key={subject.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="font-black text-red-900">{subject.name}</p>
                        <p className="text-sm text-red-800">Nota {subject.currentGrade.toFixed(1)}, asistencia {subject.attendance}%.</p>
                      </div>
                    ))}
                    {!riskSubjects.length && <EmptyState icon={CheckCircle2} title="Sin avisos académicos" />}
                  </div>
                </section>
              </div>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={MessageSquare} title="Comunicación" />
                <form onSubmit={addFamilyMessage} className="mb-4 flex flex-col gap-2 md:flex-row">
                  <TextInput value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Nota familiar o comentario del tutor" />
                  <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-black text-white">
                    <Plus className="h-4 w-4" />
                    Añadir
                  </button>
                </form>
                <div className="grid gap-3 md:grid-cols-2">
                  {data.messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'rounded-lg border p-4',
                        message.tone === 'riesgo' && 'border-red-200 bg-red-50',
                        message.tone === 'positivo' && 'border-green-200 bg-green-50',
                        message.tone === 'info' && 'border-slate-200 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-black text-slate-950">{message.from}</p>
                        <span className="text-xs font-bold text-slate-500">{formatShortDate(message.date)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{message.message}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'ajustes' && (
            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={Settings2} title="Curso" />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <FieldLabel>Alumno</FieldLabel>
                    <TextInput value={data.settings.studentName} onChange={(event) => updateSettings({ studentName: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Centro</FieldLabel>
                    <TextInput value={data.settings.schoolName} onChange={(event) => updateSettings({ schoolName: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Curso</FieldLabel>
                    <TextInput value={data.settings.courseName} onChange={(event) => updateSettings({ courseName: event.target.value })} />
                  </div>
                  <div>
                    <FieldLabel>Minutos diarios</FieldLabel>
                    <TextInput type="number" min={10} value={data.settings.dailyStudyMinutes} onChange={(event) => updateSettings({ dailyStudyMinutes: clampNumber(Number(event.target.value), 10, 600) })} />
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => updateSettings({ notifications: !data.settings.notifications })}
                  className={cn(
                    'rounded-lg border p-4 text-left transition',
                    data.settings.notifications ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'
                  )}
                >
                  <Bell className="h-5 w-5 text-green-800" />
                  <p className="mt-3 font-black">Notificaciones</p>
                  <p className="text-sm text-slate-600">{data.settings.notifications ? 'Activas' : 'Pausadas'}</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateSettings({ guardianView: !data.settings.guardianView })}
                  className={cn(
                    'rounded-lg border p-4 text-left transition',
                    data.settings.guardianView ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                  )}
                >
                  <UsersRound className="h-5 w-5 text-blue-800" />
                  <p className="mt-3 font-black">Vista familiar</p>
                  <p className="text-sm text-slate-600">{data.settings.guardianView ? 'Disponible' : 'Oculta'}</p>
                </button>
                <button type="button" onClick={resetDemoData} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100">
                  <RotateCcw className="h-5 w-5 text-amber-700" />
                  <p className="mt-3 font-black">Datos demo</p>
                  <p className="text-sm text-slate-600">Restaurar tablero inicial</p>
                </button>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <SectionTitle icon={Wallet} title="Finanzas académicas" />
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <CircleDollarSign className="h-5 w-5 text-amber-700" />
                    <p className="mt-3 font-black">Becas y tasas</p>
                    <p className="text-sm text-slate-700">Objetivos, créditos y carga del curso en una vista.</p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <Activity className="h-5 w-5 text-green-800" />
                    <p className="mt-3 font-black">Energia semanal</p>
                    <p className="text-sm text-slate-700">Asistencia y rutina conectadas con el rendimiento.</p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <Brain className="h-5 w-5 text-blue-800" />
                    <p className="mt-3 font-black">Carga mental</p>
                    <p className="text-sm text-slate-700">Plan de estudio segun fechas, peso y dificultad.</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CampusDashboard;
