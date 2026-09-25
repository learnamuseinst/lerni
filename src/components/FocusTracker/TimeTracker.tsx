import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Square,
  Plus,
  Clock,
  Briefcase,
  BookOpen,
  Palette,
  CheckSquare,
  Layers,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  Tag,
  Heart,
  Coffee,
  Code,
  Folder,
  ChevronDown,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Project, ProjectTask, TimeLog, ActiveTimeTrackerState } from '../../types';
import { storage, getTodayDateString, getPastDateString } from '../../utils/storage';
import { soundEngine } from '../../utils/audioSynth';
import { useI18n, toPersianDigits } from '../../utils/i18n';

const PROJECT_COLORS = [
  '#80D141', // Lerni Green
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#10B981', // Emerald
];

const PROJECT_ICONS: { id: string; icon: any; label: string }[] = [
  { id: 'Briefcase', icon: Briefcase, label: 'Work' },
  { id: 'BookOpen', icon: BookOpen, label: 'Study' },
  { id: 'Palette', icon: Palette, label: 'Creative' },
  { id: 'Code', icon: Code, label: 'Code' },
  { id: 'CheckSquare', icon: CheckSquare, label: 'Tasks' },
  { id: 'Heart', icon: Heart, label: 'Health' },
  { id: 'Coffee', icon: Coffee, label: 'Personal' },
  { id: 'Folder', icon: Folder, label: 'General' },
];

const getProjectIconComponent = (iconName?: string) => {
  const found = PROJECT_ICONS.find((i) => i.id === iconName);
  return found ? found.icon : Folder;
};

interface TimeTrackerProps {
  setIsRunningToNav?: (isRunning: boolean) => void;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ setIsRunningToNav }) => {
  const { t, language } = useI18n();

  // Data states
  const [projects, setProjects] = useState<Project[]>(() => storage.getProjects());
  const [tasks, setTasks] = useState<ProjectTask[]>(() => storage.getProjectTasks());
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(() => storage.getTimeLogs());

  // Active Timer state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    const saved = storage.getActiveTimeTracker();
    if (saved && saved.projectId) return saved.projectId;
    const initialProjects = storage.getProjects();
    return initialProjects[0]?.id || '';
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    const saved = storage.getActiveTimeTracker();
    return saved?.taskId || '';
  });
  const [customTaskTitle, setCustomTaskTitle] = useState<string>(() => {
    const saved = storage.getActiveTimeTracker();
    return saved?.taskTitle || '';
  });
  const [memoNote, setMemoNote] = useState<string>(() => {
    const saved = storage.getActiveTimeTracker();
    return saved?.description || '';
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    const saved = storage.getActiveTimeTracker();
    return saved ? saved.isRunning : false;
  });
  const [startTime, setStartTime] = useState<number>(() => {
    const saved = storage.getActiveTimeTracker();
    return saved ? saved.startTime : Date.now();
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Filter states
  const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'thisWeek' | 'allTime'>('today');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [activeModalProjectId, setActiveModalProjectId] = useState<string>('');
  const [projectNameInput, setProjectNameInput] = useState('');
  const [projectColorInput, setProjectColorInput] = useState(PROJECT_COLORS[0]);
  const [projectIconInput, setProjectIconInput] = useState('Briefcase');

  // Task management inside Project modal
  const [modalNewTaskInput, setModalNewTaskInput] = useState('');
  const [modalEditingTaskId, setModalEditingTaskId] = useState<string | null>(null);
  const [modalEditingTaskTitle, setModalEditingTaskTitle] = useState('');

  // Manual entry modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualProjectId, setManualProjectId] = useState('');
  const [manualTaskId, setManualTaskId] = useState('');
  const [manualDate, setManualDate] = useState(getTodayDateString());
  const [manualMinutes, setManualMinutes] = useState(30);
  const [manualDescription, setManualDescription] = useState('');

  // Edit Log modal
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [editLogProjectId, setEditLogProjectId] = useState('');
  const [editLogTaskId, setEditLogTaskId] = useState('');
  const [editLogDurationMins, setEditLogDurationMins] = useState(30);
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogDesc, setEditLogDesc] = useState('');

  // Delete confirmation modals
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [logToDelete, setLogToDelete] = useState<TimeLog | null>(null);

  // Sync project modal state with app for FAB animation
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('app:modal-state-change', { detail: { isOpen: isProjectModalOpen } })
    );
  }, [isProjectModalOpen]);

  // Sync Timer interval
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      // Calculate immediate elapsed
      const initialElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(initialElapsed);

      interval = setInterval(() => {
        const sec = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
        setElapsedSeconds(sec);
      }, 1000);
    } else {
      if (startTime > 0 && elapsedSeconds === 0) {
        // preserve stopped state
      }
    }

    if (setIsRunningToNav) {
      setIsRunningToNav(isRunning);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, startTime]);

  // Persist active tracker state on change
  useEffect(() => {
    if (isRunning) {
      const activeState: ActiveTimeTrackerState = {
        projectId: selectedProjectId,
        taskId: selectedTaskId || undefined,
        taskTitle: customTaskTitle || undefined,
        description: memoNote || undefined,
        startTime,
        isRunning: true,
      };
      storage.saveActiveTimeTracker(activeState);
    } else {
      storage.saveActiveTimeTracker(null);
    }
  }, [isRunning, selectedProjectId, selectedTaskId, customTaskTitle, memoNote, startTime]);

  // Helper to persist projects
  const handleUpdateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    storage.saveProjects(newProjects);
  };

  // Helper to persist tasks
  const handleUpdateTasks = (newTasks: ProjectTask[]) => {
    setTasks(newTasks);
    storage.saveProjectTasks(newTasks);
  };

  // Helper to persist logs
  const handleUpdateLogs = (newLogs: TimeLog[]) => {
    setTimeLogs(newLogs);
    storage.saveTimeLogs(newLogs);
  };

  // Start Tracker
  const handleStartTimer = () => {
    soundEngine.playPop();
    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  // Stop and Save Tracker Entry
  const handleStopAndSave = () => {
    soundEngine.playGentleChime();
    const finalElapsed = elapsedSeconds > 0 ? elapsedSeconds : Math.max(1, Math.floor((Date.now() - startTime) / 1000));
    setIsRunning(false);

    if (finalElapsed >= 5) {
      const activeProj = projects.find((p) => p.id === selectedProjectId) || projects[0];
      const activeTask = tasks.find((t) => t.id === selectedTaskId);
      const effectiveTaskTitle = activeTask ? activeTask.title : customTaskTitle.trim() || undefined;

      const newLog: TimeLog = {
        id: `tlog-${Date.now()}`,
        projectId: activeProj?.id || 'proj-default',
        taskId: selectedTaskId || undefined,
        taskTitle: effectiveTaskTitle,
        description: memoNote.trim() || undefined,
        startTime: startTime,
        endTime: Date.now(),
        durationSeconds: finalElapsed,
        date: getTodayDateString(),
        createdAt: Date.now(),
      };

      const updated = [newLog, ...timeLogs];
      handleUpdateLogs(updated);
    }

    setElapsedSeconds(0);
    setMemoNote('');
    setCustomTaskTitle('');
    storage.saveActiveTimeTracker(null);
  };

  // Discard running timer
  const handleDiscard = () => {
    soundEngine.playPop();
    setIsRunning(false);
    setElapsedSeconds(0);
    storage.saveActiveTimeTracker(null);
  };

  // Quick Start Timer for a specific task
  const handleStartForTask = (project: Project, task: ProjectTask) => {
    soundEngine.playPop();
    setSelectedProjectId(project.id);
    setSelectedTaskId(task.id);
    setCustomTaskTitle(task.title);
    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  // Resume a past log
  const handleResumeLog = (log: TimeLog) => {
    soundEngine.playPop();
    setSelectedProjectId(log.projectId);
    setSelectedTaskId(log.taskId || '');
    setCustomTaskTitle(log.taskTitle || '');
    setMemoNote(log.description || '');
    const now = Date.now();
    setStartTime(now);
    setElapsedSeconds(0);
    setIsRunning(true);
  };

  // Open modal to create a new project
  const handleOpenNewProjectModal = () => {
    soundEngine.playPop();
    const newId = `proj-${Date.now()}`;
    setEditingProject(null);
    setActiveModalProjectId(newId);
    setProjectNameInput('');
    setProjectColorInput(PROJECT_COLORS[0]);
    setProjectIconInput('Briefcase');
    setModalNewTaskInput('');
    setModalEditingTaskId(null);
    setModalEditingTaskTitle('');
    setIsProjectModalOpen(true);
  };

  // Open modal to edit an existing project (optionally focusing a specific task)
  const handleOpenEditProjectModal = (proj: Project, focusTaskId?: string) => {
    soundEngine.playPop();
    setEditingProject(proj);
    setActiveModalProjectId(proj.id);
    setProjectNameInput(proj.name);
    setProjectColorInput(proj.color);
    setProjectIconInput(proj.iconName || 'Briefcase');
    setModalNewTaskInput('');
    if (focusTaskId) {
      const t = tasks.find((item) => item.id === focusTaskId);
      if (t) {
        setModalEditingTaskId(focusTaskId);
        setModalEditingTaskTitle(t.title);
      } else {
        setModalEditingTaskId(null);
        setModalEditingTaskTitle('');
      }
    } else {
      setModalEditingTaskId(null);
      setModalEditingTaskTitle('');
    }
    setIsProjectModalOpen(true);
  };

  // Close/cancel project modal
  const handleCloseProjectModal = () => {
    soundEngine.playPop();
    // If it was a new project that got cancelled, remove any staged tasks created under activeModalProjectId
    if (!editingProject && activeModalProjectId) {
      const cleaned = tasks.filter((t) => t.projectId !== activeModalProjectId);
      if (cleaned.length !== tasks.length) {
        handleUpdateTasks(cleaned);
      }
    }
    setIsProjectModalOpen(false);
    setEditingProject(null);
    setActiveModalProjectId('');
    setProjectNameInput('');
    setModalNewTaskInput('');
    setModalEditingTaskId(null);
    setModalEditingTaskTitle('');
  };

  // Add or update a project
  const handleSaveProject = () => {
    if (!projectNameInput.trim()) return;
    soundEngine.playPop();

    if (editingProject) {
      const updated = projects.map((p) =>
        p.id === editingProject.id
          ? {
              ...p,
              name: projectNameInput.trim(),
              color: projectColorInput,
              iconName: projectIconInput,
            }
          : p
      );
      handleUpdateProjects(updated);
    } else {
      const newProjId = activeModalProjectId || `proj-${Date.now()}`;
      const newProj: Project = {
        id: newProjId,
        name: projectNameInput.trim(),
        color: projectColorInput,
        iconName: projectIconInput,
        createdAt: Date.now(),
      };
      const updated = [...projects, newProj];
      handleUpdateProjects(updated);
      setSelectedProjectId(newProj.id);
    }

    setIsProjectModalOpen(false);
    setEditingProject(null);
    setActiveModalProjectId('');
    setProjectNameInput('');
    setModalNewTaskInput('');
    setModalEditingTaskId(null);
    setModalEditingTaskTitle('');
  };

  // Delete project prompt & confirm
  const handlePromptDeleteProject = (proj: Project) => {
    setProjectToDelete(proj);
  };

  const handleConfirmDeleteProject = (projectId: string) => {
    soundEngine.playPop();
    let updatedProjects = projects.filter((p) => p.id !== projectId);
    const updatedTasks = tasks.filter((t) => t.projectId !== projectId);

    // If last project was removed, create a fresh default project
    if (updatedProjects.length === 0) {
      const newDefault: Project = {
        id: `proj-${Date.now()}`,
        name: language === 'fa' ? 'پروژه عمومی' : 'General Work',
        color: '#80D141',
        iconName: 'Briefcase',
        createdAt: Date.now(),
      };
      updatedProjects = [newDefault];
    }

    handleUpdateProjects(updatedProjects);
    handleUpdateTasks(updatedTasks);

    if (selectedProjectId === projectId) {
      setSelectedProjectId(updatedProjects[0]?.id || '');
      setSelectedTaskId('');
      if (isRunning) {
        setIsRunning(false);
        setElapsedSeconds(0);
        storage.saveActiveTimeTracker(null);
      }
    }

    if (projectFilter === projectId) {
      setProjectFilter('all');
    }

    setProjectToDelete(null);

    // If project edit modal was open for this project, close it
    if (isProjectModalOpen && activeModalProjectId === projectId) {
      handleCloseProjectModal();
    }
  };

  // Add Task to project (modal window)
  const handleModalAddTask = () => {
    const text = modalNewTaskInput.trim();
    if (!text || !activeModalProjectId) return;
    soundEngine.playPop();

    const newTask: ProjectTask = {
      id: `ptask-${Date.now()}`,
      projectId: activeModalProjectId,
      title: text,
      createdAt: Date.now(),
    };

    handleUpdateTasks([...tasks, newTask]);
    setModalNewTaskInput('');
  };

  // Start editing a task inside the project modal
  const handleStartEditTask = (task: ProjectTask) => {
    soundEngine.playPop();
    setModalEditingTaskId(task.id);
    setModalEditingTaskTitle(task.title);
  };

  // Save edited task inside the project modal
  const handleSaveEditTask = () => {
    if (!modalEditingTaskId) return;
    const trimmed = modalEditingTaskTitle.trim();
    if (!trimmed) return;
    soundEngine.playGentleChime();

    const updatedTasks = tasks.map((t) => (t.id === modalEditingTaskId ? { ...t, title: trimmed } : t));
    handleUpdateTasks(updatedTasks);

    if (selectedTaskId === modalEditingTaskId) {
      setCustomTaskTitle(trimmed);
    }

    setModalEditingTaskId(null);
    setModalEditingTaskTitle('');
  };

  // Cancel editing a task
  const handleCancelEditTask = () => {
    soundEngine.playPop();
    setModalEditingTaskId(null);
    setModalEditingTaskTitle('');
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    soundEngine.playPop();
    const updated = tasks.filter((t) => t.id !== taskId);
    handleUpdateTasks(updated);
    if (selectedTaskId === taskId) {
      setSelectedTaskId('');
      setCustomTaskTitle('');
    }
    if (modalEditingTaskId === taskId) {
      setModalEditingTaskId(null);
      setModalEditingTaskTitle('');
    }
  };

  // Manual Log Save
  const handleSaveManualLog = () => {
    if (!manualProjectId || manualMinutes <= 0) return;
    soundEngine.playGentleChime();

    const proj = projects.find((p) => p.id === manualProjectId) || projects[0];
    const task = tasks.find((t) => t.id === manualTaskId);

    const now = Date.now();
    const durSec = manualMinutes * 60;
    const newLog: TimeLog = {
      id: `tlog-${Date.now()}`,
      projectId: proj.id,
      taskId: manualTaskId || undefined,
      taskTitle: task ? task.title : undefined,
      description: manualDescription.trim() || undefined,
      startTime: now - durSec * 1000,
      endTime: now,
      durationSeconds: durSec,
      date: manualDate || getTodayDateString(),
      createdAt: now,
    };

    handleUpdateLogs([newLog, ...timeLogs]);
    setIsManualModalOpen(false);
    setManualDescription('');
    setManualMinutes(30);
  };

  // Edit Log Save
  const handleSaveEditLog = () => {
    if (!editingLog || editLogDurationMins <= 0) return;
    soundEngine.playGentleChime();

    const proj = projects.find((p) => p.id === editLogProjectId) || projects[0];
    const task = tasks.find((t) => t.id === editLogTaskId);

    const updatedLogs = timeLogs.map((l) =>
      l.id === editingLog.id
        ? {
            ...l,
            projectId: proj.id,
            taskId: editLogTaskId || undefined,
            taskTitle: task ? task.title : undefined,
            description: editLogDesc.trim() || undefined,
            durationSeconds: editLogDurationMins * 60,
            date: editLogDate || l.date,
          }
        : l
    );

    handleUpdateLogs(updatedLogs);
    setEditingLog(null);
  };

  // Delete Log with confirmation modal
  const handlePromptDeleteLog = (log: TimeLog) => {
    setLogToDelete(log);
  };

  const handleConfirmDeleteLog = (logId: string) => {
    soundEngine.playPop();
    const updated = timeLogs.filter((l) => l.id !== logId);
    handleUpdateLogs(updated);
    setLogToDelete(null);
  };

  // Format Seconds to HH:MM:SS
  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hrs > 0) {
      const str = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      return language === 'fa' ? toPersianDigits(str) : str;
    }
    const str = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return language === 'fa' ? toPersianDigits(str) : str;
  };

  // Format Duration into readable string (e.g. 1h 25m)
  const formatDurationReadable = (durationSec: number) => {
    const hrs = Math.floor(durationSec / 3600);
    const mins = Math.round((durationSec % 3600) / 60);

    if (hrs > 0) {
      const hStr = language === 'fa' ? toPersianDigits(hrs) : String(hrs);
      const mStr = language === 'fa' ? toPersianDigits(mins) : String(mins);
      return `${hStr} ${t('tracker.hoursUnit')} ${mStr} ${t('tracker.minsUnit')}`;
    }
    const mStr = language === 'fa' ? toPersianDigits(mins) : String(mins);
    return `${mStr} ${t('tracker.minsUnit')}`;
  };

  // Calculated Stats
  const today = getTodayDateString();
  const yesterday = getPastDateString(1);
  const sevenDaysAgo = getPastDateString(7);

  const todayLogs = timeLogs.filter((l) => l.date === today);
  const totalTodaySeconds = todayLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

  const weekLogs = timeLogs.filter((l) => l.date >= sevenDaysAgo && l.date <= today);
  const totalWeekSeconds = weekLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

  // Filtered logs for history section
  const filteredLogs = timeLogs.filter((l) => {
    if (projectFilter !== 'all' && l.projectId !== projectFilter) return false;
    if (historyFilter === 'today') return l.date === today;
    if (historyFilter === 'yesterday') return l.date === yesterday;
    if (historyFilter === 'thisWeek') return l.date >= sevenDaysAgo;
    return true;
  });

  const activeFilteredTotalSeconds = filteredLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

  // Project distribution for the filtered logs
  const projectDistribution = projects.map((p) => {
    const pLogs = filteredLogs.filter((l) => l.projectId === p.id);
    const pSecs = pLogs.reduce((acc, l) => acc + l.durationSeconds, 0);
    const percentage = activeFilteredTotalSeconds > 0 ? (pSecs / activeFilteredTotalSeconds) * 100 : 0;
    return {
      project: p,
      seconds: pSecs,
      percentage,
    };
  }).filter((item) => item.seconds > 0);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const projectTasks = tasks.filter((t) => t.projectId === selectedProjectId);
  const modalProjectTasks = tasks.filter((t) => t.projectId === activeModalProjectId);

  return (
    <div className="w-full space-y-6">
      
      {/* 1. Hero Stopwatch Card */}
      <div className="p-6 sm:p-8 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-xs relative overflow-hidden">
        
        {/* Ambient subtle glow when timer is running */}
        {isRunning && (
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.12, 0.28, 0.12] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none -z-0"
            style={{ backgroundColor: selectedProject?.color || '#80D141' }}
          />
        )}

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          
          {/* Project & Task Selector Pill Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl w-full">
            
            {/* Project Picker Dropdown */}
            <div className="relative inline-block">
              <select
                value={selectedProjectId}
                disabled={isRunning}
                onChange={(e) => {
                  soundEngine.playPop();
                  setSelectedProjectId(e.target.value);
                  setSelectedTaskId('');
                }}
                className={`text-xs font-bold px-4 py-2 rounded-full border transition-all cursor-pointer appearance-none pr-8 pl-4 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#80D141] ${
                  isRunning
                    ? 'opacity-85 cursor-not-allowed'
                    : 'hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E]'
                }`}
                style={{
                  backgroundColor: `${selectedProject?.color || '#80D141'}15`,
                  borderColor: selectedProject?.color || '#80D141',
                  color: selectedProject?.color || '#80D141',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="text-[#151E14] dark:text-[#E8F2E4] bg-[#F8FAF5] dark:bg-[#182316]">
                    ● {p.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: selectedProject?.color || '#80D141' }}>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Task Picker Dropdown (If project has tasks) */}
            {projectTasks.length > 0 && (
              <div className="relative inline-block max-w-xs sm:max-w-md">
                <select
                  value={selectedTaskId}
                  disabled={isRunning}
                  onChange={(e) => {
                    soundEngine.playPop();
                    setSelectedTaskId(e.target.value);
                    const matched = projectTasks.find((t) => t.id === e.target.value);
                    if (matched) setCustomTaskTitle(matched.title);
                  }}
                  className={`text-xs font-medium px-4 py-2 rounded-full border transition-all cursor-pointer appearance-none pr-8 pl-3 bg-white dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722] text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141] truncate max-w-full ${
                    isRunning ? 'opacity-85 cursor-not-allowed' : 'hover:bg-[#EDF6E8]'
                  }`}
                >
                  <option value="">{t('tracker.selectTask')}</option>
                  {projectTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#79747E]">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Running Digital Counter Display */}
          <div className="space-y-1">
            <div className="font-display font-black text-5xl sm:text-6xl md:text-7xl text-[#151E14] dark:text-[#E8F2E4] tracking-tight">
              {formatSeconds(elapsedSeconds)}
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#485B44] dark:text-[#9EB598]">
              {isRunning ? (
                <span className="inline-flex items-center gap-1.5 text-[#3B7E10] dark:text-[#80D141]">
                  <span className="w-2 h-2 rounded-full bg-[#80D141] animate-ping" />
                  {t('tracker.runningNow')}
                </span>
              ) : (
                <span>{t('focus.paused')}</span>
              )}
              {selectedProject && (
                <>
                  <span>•</span>
                  <span style={{ color: selectedProject.color }}>
                    {selectedProject.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Primary Tracker Controls */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            
            {isRunning ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStopAndSave}
                  className="px-8 py-3.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-display font-bold text-base sm:text-lg shadow-md flex items-center gap-2.5"
                >
                  <Square className="w-5 h-5 fill-current" />
                  <span>{t('tracker.stopTracking')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDiscard}
                  className="w-12 h-12 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-[#485B44] dark:text-[#9EB598] hover:bg-[#FEE2E2] hover:text-[#EF4444] border border-[#DCEAD4] dark:border-[#263722] flex items-center justify-center transition-colors"
                  title="Discard timer"
                >
                  <RotateCcw className="w-5 h-5" />
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartTimer}
                  className="px-9 py-3.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] font-display font-bold text-base sm:text-lg shadow-md flex items-center gap-2.5"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{t('tracker.startTracking')}</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    soundEngine.playPop();
                    setManualProjectId(selectedProjectId);
                    setManualDate(getTodayDateString());
                    setIsManualModalOpen(true);
                  }}
                  className="px-5 py-3 rounded-full bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] flex items-center gap-2 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('tracker.manualEntry')}</span>
                </motion.button>
              </>
            )}

          </div>

        </div>

      </div>

      {/* 2. Overview Stats (Today & This Week) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Tracked Today */}
        <div className="p-4 rounded-2xl bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F8D8] dark:bg-[#1E3800] text-[#1C3700] dark:text-[#80D141] flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('tracker.trackedToday')}
            </div>
            <div className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {formatDurationReadable(totalTodaySeconds)}
            </div>
          </div>
        </div>

        {/* Tracked This Week */}
        <div className="p-4 rounded-2xl bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E0E7FF] dark:bg-[#1E1B4B] text-[#3B82F6] dark:text-[#93C5FD] flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('tracker.trackedThisWeek')}
            </div>
            <div className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {formatDurationReadable(totalWeekSeconds)}
            </div>
          </div>
        </div>

        {/* Active Projects Count */}
        <div className="p-4 rounded-2xl bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FCE7F3] dark:bg-[#500724] text-[#EC4899] dark:text-[#F472B6] flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium">
              {t('tracker.projects')}
            </div>
            <div className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {language === 'fa' ? toPersianDigits(projects.length) : projects.length}
            </div>
          </div>
        </div>

      </div>

      {/* 3. Time Breakdown & History Section */}
      <div className="p-5 sm:p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] space-y-5">
        
        {/* Header & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#80D141]" />
            <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('tracker.timeLogs')}
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Period Filters */}
            <div className="flex items-center bg-[#EDF6E8] dark:bg-[#1C281A] p-1 rounded-2xl border border-[#DCEAD4] dark:border-[#263722]">
              {(['today', 'yesterday', 'thisWeek', 'allTime'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => {
                    soundEngine.playPop();
                    setHistoryFilter(filterKey);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    historyFilter === filterKey
                      ? 'bg-[#80D141] text-[#0F2600] shadow-xs'
                      : 'text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14]'
                  }`}
                >
                  {t(`tracker.${filterKey}`)}
                </button>
              ))}
            </div>

            {/* Project Filter */}
            <select
              value={projectFilter}
              onChange={(e) => {
                soundEngine.playPop();
                setProjectFilter(e.target.value);
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
            >
              <option value="all">{t('tracker.allProjects')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Distribution Bar (if time logged) */}
        {projectDistribution.length > 0 && (
          <div className="space-y-2 p-3 rounded-2xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722]">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#485B44] dark:text-[#9EB598]">
              <span>{t('tracker.timeDistribution')}</span>
              <span>{formatDurationReadable(activeFilteredTotalSeconds)}</span>
            </div>

            {/* Multi-segment Bar */}
            <div className="h-3.5 w-full rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] flex overflow-hidden">
              {projectDistribution.map((item) => (
                <div
                  key={item.project.id}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.project.color,
                  }}
                  title={`${item.project.name}: ${formatDurationReadable(item.seconds)} (${Math.round(item.percentage)}%)`}
                  className="h-full transition-all"
                />
              ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {projectDistribution.map((item) => (
                <div key={item.project.id} className="flex items-center gap-1.5 text-xs font-medium text-[#151E14] dark:text-[#E8F2E4]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.project.color }} />
                  <span>{item.project.name}</span>
                  <span className="text-[10px] text-[#79747E] font-bold">
                    ({Math.round(item.percentage)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Log Entries List */}
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 space-y-1">
            <div className="text-2xl">⏳</div>
            <div className="text-sm font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('tracker.noLogs')}
            </div>
            <div className="text-xs text-[#79747E] dark:text-[#9EB598]">
              {t('tracker.noLogsDesc')}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => {
              const proj = projects.find((p) => p.id === log.projectId) || {
                name: 'General',
                color: '#80D141',
              };

              return (
                <div
                  key={log.id}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all hover:border-[#80D141]/50"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* Project Tag */}
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0"
                      style={{
                        backgroundColor: `${proj.color}15`,
                        color: proj.color,
                        border: `1px solid ${proj.color}40`,
                      }}
                    >
                      ● {proj.name}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] break-words">
                        {log.taskTitle || log.description || t('tracker.activeTimer')}
                      </div>
                      {log.taskTitle && log.description && (
                        <div className="text-[11px] text-[#79747E] dark:text-[#9EB598] break-words mt-0.5">
                          {log.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Duration & Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DCEAD4]/50 dark:border-[#263722]/50">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                        {formatDurationReadable(log.durationSeconds)}
                      </div>
                      <div className="text-[10px] text-[#79747E] dark:text-[#9EB598]">
                        {language === 'fa' ? toPersianDigits(log.date) : log.date}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleResumeLog(log)}
                        className="p-1.5 rounded-xl bg-[#EDF6E8] dark:bg-[#202E1E] text-[#3B7E10] dark:text-[#80D141] hover:bg-[#80D141] hover:text-[#0F2600] transition-colors"
                        title={t('tracker.continueTask')}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>

                      <button
                        onClick={() => {
                          soundEngine.playPop();
                          setEditingLog(log);
                          setEditLogProjectId(log.projectId);
                          setEditLogTaskId(log.taskId || '');
                          setEditLogDurationMins(Math.round(log.durationSeconds / 60));
                          setEditLogDate(log.date);
                          setEditLogDesc(log.description || '');
                        }}
                        className="p-1.5 rounded-xl hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#79747E] hover:text-[#151E14]"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handlePromptDeleteLog(log)}
                        className="p-1.5 rounded-xl hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] text-[#79747E] hover:text-[#EF4444] transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* 4. Projects Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#80D141]" />
            <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
              {t('tracker.projects')}
            </h3>
          </div>

          <button
            onClick={handleOpenNewProjectModal}
            className="px-3.5 py-1.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('tracker.newProject')}</span>
          </button>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const pTasks = tasks.filter((t) => t.projectId === proj.id);
            const pLogs = timeLogs.filter((l) => l.projectId === proj.id);
            const pTotalSecs = pLogs.reduce((acc, l) => acc + l.durationSeconds, 0);
            const IconComponent = getProjectIconComponent(proj.iconName);

            return (
              <div
                key={proj.id}
                className="p-5 rounded-[24px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] space-y-4 flex flex-col justify-between"
              >
                {/* Project Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: proj.color }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#151E14] dark:text-[#E8F2E4] leading-tight">
                        {proj.name}
                      </h4>
                      <div className="text-[11px] text-[#485B44] dark:text-[#9EB598] mt-0.5">
                        {t('tracker.totalTracked')}: <span className="font-bold text-[#151E14] dark:text-[#E8F2E4]">{formatDurationReadable(pTotalSecs)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditProjectModal(proj)}
                      className="p-1.5 rounded-xl hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] transition-colors"
                      title={t('common.edit')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePromptDeleteProject(proj)}
                      className="p-1.5 rounded-xl hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] text-[#485B44] dark:text-[#9EB598] hover:text-[#EF4444] transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598]">
                    {t('tracker.tasks')} ({pTasks.length})
                  </div>

                  {pTasks.length === 0 ? (
                    <div className="text-xs text-[#79747E] dark:text-[#9EB598] italic py-1">
                      {t('tracker.noTasks')}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {pTasks.map((task) => {
                        const taskLogs = timeLogs.filter((l) => l.taskId === task.id);
                        const taskSecs = taskLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

                        return (
                          <div
                            key={task.id}
                            className="p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all bg-white dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722] hover:border-[#80D141]/50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: proj.color }}
                              />
                              <span className="text-xs font-medium text-[#151E14] dark:text-[#E8F2E4] break-words leading-relaxed flex-1">
                                {task.title}
                              </span>
                            </div>

                            {/* Time & Start Timer on Task Button */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {taskSecs > 0 && (
                                <span className="text-[10px] font-bold text-[#485B44] dark:text-[#9EB598] px-1.5 py-0.5 rounded-md bg-[#EDF6E8] dark:bg-[#202E1E] whitespace-nowrap">
                                  {formatDurationReadable(taskSecs)}
                                </span>
                              )}

                              <button
                                onClick={() => handleStartForTask(proj, task)}
                                className="px-2.5 py-1 rounded-lg bg-[#80D141]/20 hover:bg-[#80D141] text-[#245408] dark:text-[#80D141] hover:text-[#0F2600] text-[11px] font-bold flex items-center gap-1 transition-all whitespace-nowrap"
                                title={t('tracker.startForTask')}
                              >
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>{t('tracker.startForTask')}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: New / Edit Project (Full Screen) */}
      <AnimatePresence>
        {isProjectModalOpen && (
          <motion.div
            id="project-modal-fullscreen"
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-50 w-full h-full bg-[#F7FAF4] dark:bg-[#121B11] text-[#151E14] dark:text-[#E8F2E4] flex flex-col overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label={editingProject ? t('tracker.editProject') : t('tracker.newProject')}
          >
            {/* Header */}
            <div className="shrink-0 sticky top-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseProjectModal}
                  className="p-2 -ml-2 rounded-xl text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors flex items-center gap-1.5 font-medium text-sm cursor-pointer"
                  aria-label={t('common.close', 'Close')}
                >
                  <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
                  <span className="hidden sm:inline">{t('common.back', 'Back')}</span>
                </button>
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs transition-colors"
                    style={{ backgroundColor: projectColorInput }}
                  >
                    {React.createElement(getProjectIconComponent(projectIconInput), { className: 'w-5 h-5 text-white' })}
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-[#151E14] dark:text-[#E8F2E4] leading-tight">
                      {editingProject ? t('tracker.editProject') : t('tracker.newProject')}
                    </h2>
                    <p className="text-xs text-[#485B44] dark:text-[#9EB598] font-medium hidden sm:block">
                      {editingProject ? t('tracker.editProjectSub') : t('tracker.newProjectSub')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingProject && (
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteProject(editingProject)}
                    className="hidden sm:flex px-3.5 py-2 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] items-center gap-1.5 transition-colors cursor-pointer"
                    title={t('tracker.deleteProject')}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden md:inline">{t('tracker.deleteProject')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseProjectModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#EAEFE6] dark:hover:bg-[#1C281A] transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={!projectNameInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProject ? t('tracker.saveProject') : t('tracker.createProject')}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8 py-6">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Project Name Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#162114] border border-[#DCEAD4] dark:border-[#22301F] shadow-xs space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598] block">
                    {t('tracker.projectName')} *
                  </label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-colors"
                      style={{ backgroundColor: projectColorInput }}
                    >
                      {React.createElement(getProjectIconComponent(projectIconInput), { className: 'w-6 h-6 text-white' })}
                    </div>
                    <input
                      type="text"
                      value={projectNameInput}
                      onChange={(e) => setProjectNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveProject();
                        }
                      }}
                      placeholder={t('tracker.enterProjectName')}
                      autoFocus
                      className="flex-1 px-4 py-3 rounded-xl bg-[#F8FAF5] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-sm font-semibold text-[#151E14] dark:text-[#E8F2E4] placeholder:text-[#79747E] focus:outline-none focus:ring-2 focus:ring-[#80D141] transition-all"
                    />
                  </div>
                </div>

                {/* Color Presets Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#162114] border border-[#DCEAD4] dark:border-[#22301F] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598]">
                      {t('tracker.projectColor')}
                    </label>
                    <span className="text-[11px] font-mono font-medium text-[#485B44] dark:text-[#9EB598]">
                      {projectColorInput}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {PROJECT_COLORS.map((col) => {
                      const isSelected = projectColorInput === col;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            soundEngine.playPop();
                            setProjectColorInput(col);
                          }}
                          className={`w-10 h-10 rounded-2xl transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? 'scale-110 ring-2 ring-offset-2 ring-[#80D141] dark:ring-offset-[#162114] shadow-sm'
                              : 'hover:scale-105 opacity-85 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col }}
                          aria-label={`Color ${col}`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Icon Picker Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#162114] border border-[#DCEAD4] dark:border-[#22301F] shadow-xs space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598] block">
                    {t('tracker.projectIcon')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {PROJECT_ICONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = projectIconInput === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playPop();
                            setProjectIconInput(item.id);
                          }}
                          className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#80D141]/20 dark:bg-[#80D141]/25 border-[#80D141] text-[#0F2600] dark:text-[#A2EB68] shadow-xs'
                              : 'bg-[#F8FAF5] dark:bg-[#1C281A] border-[#DCEAD4] dark:border-[#263722] text-[#485B44] dark:text-[#9EB598] hover:bg-[#EDF6E8] dark:hover:bg-[#22301F]'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-[#80D141] text-[#0F2600]'
                                : 'bg-white dark:bg-[#162114] text-[#485B44] dark:text-[#9EB598]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Project Tasks Management Section */}
                <div className="p-5 rounded-2xl bg-white dark:bg-[#162114] border border-[#DCEAD4] dark:border-[#22301F] shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#80D141]" />
                      <label className="text-xs font-bold uppercase tracking-wider text-[#485B44] dark:text-[#9EB598]">
                        {t('tracker.projectTasks')}
                      </label>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598]">
                        {language === 'fa' ? toPersianDigits(modalProjectTasks.length) : modalProjectTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Add Task Input Row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={modalNewTaskInput}
                      onChange={(e) => setModalNewTaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleModalAddTask();
                        }
                      }}
                      placeholder={t('tracker.taskName')}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-[#F8FAF5] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs font-medium text-[#151E14] dark:text-[#E8F2E4] placeholder:text-[#79747E] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                    />
                    <button
                      type="button"
                      onClick={handleModalAddTask}
                      disabled={!modalNewTaskInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{t('tracker.addTask')}</span>
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {modalProjectTasks.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#79747E] dark:text-[#9EB598] rounded-xl bg-[#F8FAF5] dark:bg-[#1C281A]/50 border border-dashed border-[#DCEAD4] dark:border-[#263722]">
                        {t('tracker.noTasksInProject')}
                      </div>
                    ) : (
                      modalProjectTasks.map((task) => {
                        const isEditingThisTask = modalEditingTaskId === task.id;
                        const taskLogs = timeLogs.filter((l) => l.taskId === task.id);
                        const taskSecs = taskLogs.reduce((acc, l) => acc + l.durationSeconds, 0);

                        if (isEditingThisTask) {
                          return (
                            <div
                              key={task.id}
                              className="p-2.5 rounded-xl bg-[#F8FAF5] dark:bg-[#1C281A] border-2 border-[#80D141] flex items-center gap-2"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={modalEditingTaskTitle}
                                onChange={(e) => setModalEditingTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditTask();
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditTask();
                                  }
                                }}
                                className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#182316] text-[#151E14] dark:text-[#E8F2E4] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleSaveEditTask}
                                disabled={!modalEditingTaskTitle.trim()}
                                className="p-2 rounded-lg bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] disabled:opacity-50 transition-colors cursor-pointer"
                                title={t('tracker.saveTask')}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditTask}
                                className="p-2 rounded-lg bg-[#EDF6E8] dark:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] transition-colors cursor-pointer"
                                title={t('tracker.cancelTask')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={task.id}
                            className="p-3 rounded-xl bg-[#F8FAF5] dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between gap-3 hover:border-[#80D141]/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: projectColorInput }}
                              />
                              <span className="text-xs font-semibold text-[#151E14] dark:text-[#E8F2E4] truncate">
                                {task.title}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {taskSecs > 0 && (
                                <span className="text-[11px] font-bold text-[#485B44] dark:text-[#9EB598] px-2 py-0.5 rounded-md bg-[#EDF6E8] dark:bg-[#202E1E] whitespace-nowrap">
                                  {formatDurationReadable(taskSecs)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStartEditTask(task)}
                                className="p-1.5 rounded-lg hover:bg-[#EDF6E8] dark:hover:bg-[#202E1E] text-[#485B44] dark:text-[#9EB598] hover:text-[#151E14] transition-colors cursor-pointer"
                                title={t('tracker.editTask')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1.5 rounded-lg hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] text-[#79747E] hover:text-[#EF4444] transition-colors cursor-pointer"
                                title={t('tracker.deleteTask')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action Bar */}
            <div className="shrink-0 sticky bottom-0 z-20 bg-[#F7FAF4]/95 dark:bg-[#121B11]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-t border-[#DCEAD4] dark:border-[#22301F] flex items-center justify-between gap-3">
              <div>
                {editingProject && (
                  <button
                    type="button"
                    onClick={() => handlePromptDeleteProject(editingProject)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#EF4444] hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('tracker.deleteProject')}</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseProjectModal}
                  className="px-5 py-2.5 rounded-xl bg-[#F2F8EE] dark:bg-[#1A2617] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#E2F5D1] dark:hover:bg-[#243520] transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveProject}
                  disabled={!projectNameInput.trim()}
                  className="px-6 py-2.5 rounded-xl bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-40 text-[#0F2600] text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProject ? t('tracker.saveProject') : t('tracker.createProject')}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Manual Time Entry */}
      <AnimatePresence>
        {isManualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.manualEntry')}
                </h3>
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Project Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.selectProject')}
                </label>
                <select
                  value={manualProjectId}
                  onChange={(e) => setManualProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Select */}
              {tasks.filter((t) => t.projectId === manualProjectId).length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.taskOptional')}
                  </label>
                  <select
                    value={manualTaskId}
                    onChange={(e) => setManualTaskId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  >
                    <option value="">{t('tracker.noProject')}</option>
                    {tasks
                      .filter((t) => t.projectId === manualProjectId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Date & Duration (Mins) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.date')}
                  </label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.durationMinutes')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  />
                </div>
              </div>

              {/* Note / Memo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.description')}
                </label>
                <input
                  type="text"
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="e.g. Reviewed user feedback notes"
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-2 focus:ring-[#80D141]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveManualLog}
                  disabled={manualMinutes <= 0}
                  className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] disabled:opacity-50 text-[#0F2600] text-xs font-bold shadow-md"
                >
                  {t('tracker.saveEntry')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Edit Time Log */}
      <AnimatePresence>
        {editingLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.editLog')}
                </h3>
                <button
                  onClick={() => setEditingLog(null)}
                  className="w-8 h-8 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Project Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.selectProject')}
                </label>
                <select
                  value={editLogProjectId}
                  onChange={(e) => setEditLogProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.date')}
                  </label>
                  <input
                    type="date"
                    value={editLogDate}
                    onChange={(e) => setEditLogDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.durationMinutes')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={editLogDurationMins}
                    onChange={(e) => setEditLogDurationMins(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4]">
                  {t('tracker.description')}
                </label>
                <input
                  type="text"
                  value={editLogDesc}
                  onChange={(e) => setEditLogDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] text-xs text-[#151E14] dark:text-[#E8F2E4] focus:outline-none focus:ring-1 focus:ring-[#80D141]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598]"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveEditLog}
                  className="px-6 py-2.5 rounded-full bg-[#80D141] hover:bg-[#72BF36] text-[#0F2600] text-xs font-bold shadow-md"
                >
                  {t('common.save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Confirm Project Deletion */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FEE2E2] dark:bg-[#451A1A] text-[#EF4444] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('tracker.deleteProject')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed">
                    {t('tracker.deleteProjectConfirm')}
                  </p>
                </div>
              </div>

              {/* Project preview pill */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1C281A] border border-[#DCEAD4] dark:border-[#263722] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: projectToDelete.color }}
                  />
                  <span className="text-xs font-bold text-[#151E14] dark:text-[#E8F2E4] truncate">
                    {projectToDelete.name}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#79747E] dark:text-[#9EB598] shrink-0 px-2 py-0.5 rounded-md bg-[#EDF6E8] dark:bg-[#202E1E]">
                  {language === 'fa'
                    ? toPersianDigits(tasks.filter((tk) => tk.projectId === projectToDelete.id).length)
                    : tasks.filter((tk) => tk.projectId === projectToDelete.id).length}{' '}
                  {t('tracker.tasks')}
                </span>
              </div>

              {projects.length === 1 && (
                <div className="text-[11px] text-[#79747E] dark:text-[#9EB598] bg-[#EDF6E8]/60 dark:bg-[#1C281A] p-2.5 rounded-xl border border-[#DCEAD4]/60 dark:border-[#263722]">
                  {language === 'fa'
                    ? 'توجه: از آنجا که این تنها پروژه شماست، یک پروژه پیش‌فرض جدید جایگزین آن خواهد شد.'
                    : 'Note: Since this is your only project, a clean default project will be created to replace it.'}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteProject(projectToDelete.id)}
                  className="px-5 py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Confirm Log Deletion */}
      <AnimatePresence>
        {logToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-[28px] bg-[#F8FAF5] dark:bg-[#182316] border border-[#DCEAD4] dark:border-[#263722] shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FEE2E2] dark:bg-[#451A1A] text-[#EF4444] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-[#151E14] dark:text-[#E8F2E4]">
                    {t('common.delete')}
                  </h3>
                  <p className="text-xs text-[#485B44] dark:text-[#9EB598] leading-relaxed">
                    {t('tracker.deleteLogConfirm')}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLogToDelete(null)}
                  className="px-4 py-2.5 rounded-full bg-[#EDF6E8] dark:bg-[#1C281A] text-xs font-bold text-[#485B44] dark:text-[#9EB598] hover:bg-[#DCEAD4] dark:hover:bg-[#263722] transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDeleteLog(logToDelete.id)}
                  className="px-5 py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('common.delete')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
