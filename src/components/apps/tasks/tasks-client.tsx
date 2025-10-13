'use client';

import React, { useState, useMemo } from 'react';
import { useTasks, Task, Subtask } from '@/context/TasksContext';
import {
  Plus,
  Search,
  Star,
  Flame,
  ClipboardList,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  Briefcase,
  Heart,
  Home,
  Book,
  PartyPopper,
  Pencil,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  X,
  Save,
  ArrowDownUp,
  Filter,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"


// --- Constants --- //
const categoryIcons = {
  personal: <Star className="h-4 w-4" />,
  work: <Briefcase className="h-4 w-4" />,
  health: <Heart className="h-4 w-4" />,
  home: <Home className="h-4 w-4" />,
  learning: <Book className="h-4 w-4" />,
  fun: <PartyPopper className="h-4 w-4" />,
};

const priorityIcons = {
  low: <Circle className="h-4 w-4 text-green-500" />,
  medium: <Circle className="h-4 w-4 text-yellow-500" />,
  high: <Circle className="h-4 w-4 text-red-500" />,
};

const categoryStyles: { [key: string]: { color: string, bgColor: string } } = {
  personal: { color: 'text-green-500', bgColor: 'bg-green-100' },
  work: { color: 'text-sky-500', bgColor: 'bg-sky-100' },
  health: { color: 'text-rose-500', bgColor: 'bg-rose-100' },
  home: { color: 'text-orange-500', bgColor: 'bg-orange-100' },
  learning: { color: 'text-indigo-500', bgColor: 'bg-indigo-100' },
  fun: { color: 'text-yellow-500', bgColor: 'bg-yellow-100' },
};

const priorityValues = {
    high: 3,
    medium: 2,
    low: 1,
};

// --- Sub-components --- //

const SubtaskItem = ({ subtask, taskId }: { subtask: Subtask, taskId: number }) => {
    const { toggleSubtaskCompletion, deleteSubtask, updateSubtask } = useTasks();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(subtask.text);

    const handleSave = () => {
        if (editText.trim()) {
            updateSubtask(taskId, subtask.id, editText.trim());
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-center gap-2 group">
            <button onClick={() => toggleSubtaskCompletion(taskId, subtask.id)} className="flex-shrink-0">
                {subtask.completed ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
            </button>
            {isEditing ? (
                <Input 
                    value={editText} 
                    onChange={(e) => setEditText(e.target.value)} 
                    className="h-8 flex-grow"
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
            ) : (
                <p className={`flex-grow text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                    {subtask.text}
                </p>
            )}
            {isEditing ? (
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleSave} className="h-7 w-7"><Save className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)} className="h-7 w-7"><X className="h-4 w-4" /></Button>
                </div>
            ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="h-7 w-7"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteSubtask(taskId, subtask.id)} className="h-7 w-7 text-muted-foreground hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
            )}
        </div>
    );
};

const SubtaskList = ({ task }: { task: Task }) => {
    const { addSubtask } = useTasks();
    const [newSubtaskText, setNewSubtaskText] = useState('');

    const handleAddSubtask = () => {
        if (newSubtaskText.trim()) {
            addSubtask(task.id, newSubtaskText.trim());
            setNewSubtaskText('');
        }
    };

    const subtaskProgress = task.subtasks && task.subtasks.length > 0 
        ? (task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100 
        : 0;

    return (
        <div className="pl-10 pr-4 pb-4 pt-2 border-t border-dashed mt-4">
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-medium text-muted-foreground">Progreso de Subtareas</p>
                        <p className="text-xs font-bold text-primary">{Math.round(subtaskProgress)}%</p>
                    </div>
                    <Progress value={subtaskProgress} className="h-1" />
                </div>
            )}

            <div className="space-y-2 mb-4">
                {task.subtasks?.map(subtask => <SubtaskItem key={subtask.id} subtask={subtask} taskId={task.id} />)}
            </div>

            <div className="flex items-center gap-2">
                <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Añadir subtarea..."
                    value={newSubtaskText}
                    onChange={e => setNewSubtaskText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSubtask()}
                    className="h-8"
                />
                <Button size="sm" onClick={handleAddSubtask}>Añadir</Button>
            </div>
        </div>
    );
};


// --- Main Component --- //

export default function TasksClient() {
  const {
    tasks,
    magicPoints,
    currentStreak,
    currentLevel,
    nextLevel,
    progressToNextLevel,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    categories,
    priorities,
  } = useTasks();

  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('createdAt-desc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof categories>('personal');
  const [selectedPriority, setSelectedPriority] = useState<keyof typeof priorities>('medium');
  const [dueDateLocal, setDueDateLocal] = useState('');

  const handleFormSubmit = () => {
    if (inputValue.trim() === '') return;

    if (editingTask) {
      updateTask(editingTask.id, {
        text: inputValue.trim(),
        category: selectedCategory,
        priority: selectedPriority,
        dueDate: dueDateLocal ? new Date(dueDateLocal).toISOString() : undefined,
      });
    } else {
      addTask({
        text: inputValue.trim(),
        category: selectedCategory,
        priority: selectedPriority,
        dueDate: dueDateLocal ? new Date(dueDateLocal).toISOString() : undefined,
      });
    }
    resetForm();
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setInputValue(task.text);
    setSelectedCategory(task.category);
    setSelectedPriority(task.priority);
    setDueDateLocal(task.dueDate ? new Date(task.dueDate).toISOString().slice(0,16) : '');
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setInputValue('');
    setSelectedCategory('personal');
    setSelectedPriority('medium');
    setEditingTask(null);
    setDueDateLocal('');
    setIsFormOpen(false);
  };

  const handleToggleExpand = (taskId: number) => {
    setExpandedTasks(prev => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
            newSet.delete(taskId);
        } else {
            newSet.add(taskId);
        }
        return newSet;
    });
  };

  const handleToggleCompletion = (task: Task) => {
      if (task.subtasks && task.subtasks.some(st => !st.completed) && !task.completed) {
          alert('¡No puedes completar una tarea hasta que todas sus subtareas estén terminadas!');
          return;
      }
      toggleTaskCompletion(task.id);
  }

  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filter === 'all' || (filter === 'active' && !task.completed) || (filter === 'completed' && task.completed);
      const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });

    return filtered.sort((a, b) => {
        switch (sortOrder) {
            case 'createdAt-desc':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'createdAt-asc':
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'priority-desc':
                return priorityValues[b.priority] - priorityValues[a.priority];
            case 'priority-asc':
                return priorityValues[a.priority] - priorityValues[b.priority];
            case 'category-asc':
                return categories[a.category].name.localeCompare(categories[b.category].name);
            default:
                return 0;
        }
    });

  }, [tasks, searchTerm, filter, sortOrder, filterCategory, filterPriority, categories]);

  const completedTasksCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const progressPercentage = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  return (
    <div className="bg-gray-50/50 min-h-screen">
      <header className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
         <div className="container mx-auto px-4 py-6">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold tracking-tight">Gestor de Tareas</h1>
              <p className="text-lg opacity-90">Organiza tu día y alcanza tus objetivos</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20 col-span-2 md:col-span-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full flex items-center gap-4">
                                    {currentLevel.icon}
                                    <div className="w-full text-left">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-lg">{currentLevel.name}</p>
                                            {nextLevel && <p className="text-xs opacity-80">Sgte: {nextLevel.name}</p>}
                                        </div>
                                        <Progress value={progressToNextLevel} className="h-2 bg-white/20" />
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {nextLevel ? (
                                    <p>{magicPoints} / {nextLevel.minPoints} puntos para el siguiente nivel</p>
                                ) : (
                                    <p>{magicPoints} Puntos Mágicos</p>
                                )}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                    <Flame className="mx-auto h-6 w-6 mb-1"/>
                    <div className="text-2xl font-bold">{currentStreak}</div>
                    <div className="text-sm opacity-90">Racha</div>
                </div>
                 <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                    <ClipboardList className="mx-auto h-6 w-6 mb-1"/>
                    <div className="text-2xl font-bold">{tasks.length}</div>
                    <div className="text-sm opacity-90">Total</div>
                </div>
            </div>
          </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <Card className="mb-6">
           <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
                    <div className="relative sm:col-span-2 md:col-span-4 lg:col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar tareas..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="lg:hidden md:col-span-2 flex gap-2">
                         <Button className="w-full" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todas</Button>
                         <Button className="w-full" variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Activas</Button>
                         <Button className="w-full" variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>Completas</Button>
                    </div>
                     <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full">
                           <Filter className="h-4 w-4 mr-2"/>
                           <SelectValue placeholder="Filtrar por categoría" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">Todas las categorías</SelectItem>
                           {Object.keys(categories).map(key => (
                               <SelectItem key={key} value={key}>{categories[key as keyof typeof categories].name}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                     <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger className="w-full">
                           <Filter className="h-4 w-4 mr-2"/>
                           <SelectValue placeholder="Filtrar por prioridad" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las prioridades</SelectItem>
                           {Object.keys(priorities).map(key => (
                               <SelectItem key={key} value={key}>{priorities[key as keyof typeof priorities].name}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-full">
                          <ArrowDownUp className="h-4 w-4 mr-2"/>
                          <SelectValue placeholder="Ordenar por..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="createdAt-desc">Más nuevas primero</SelectItem>
                          <SelectItem value="createdAt-asc">Más antiguas primero</SelectItem>
                          <SelectItem value="priority-desc">Prioridad (Alta a Baja)</SelectItem>
                          <SelectItem value="priority-asc">Prioridad (Baja a Alta)</SelectItem>
                          <SelectItem value="category-asc">Categoría (A-Z)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="hidden lg:flex justify-center gap-2 pt-4 border-t mt-4">
                    <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todas</Button>
                    <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Activas</Button>
                    <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>Completas</Button>
                </div>
            </CardContent>
        </Card>

        {tasks.length > 0 && (
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium text-muted-foreground">Progreso General</p>
                        <p className="text-sm font-bold text-primary">{Math.round(progressPercentage)}%</p>
                    </div>
                    <Progress value={progressPercentage} />
                </CardContent>
            </Card>
        )}

        <div className="grid gap-4">
          {filteredAndSortedTasks.length > 0 ? filteredAndSortedTasks.map(task => (
            <Card key={task.id} className={`transition-all ${task.completed ? 'bg-muted/50' : 'bg-background'}`}>
              <CardContent className="p-4 flex items-start gap-4">
                <button onClick={() => handleToggleCompletion(task)} className="flex-shrink-0 mt-1">
                  {task.completed ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                </button>
                <div className="flex-grow">
                  <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.text}</p>
                   <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className={`${categoryStyles[task.category].bgColor} ${categoryStyles[task.category].color}`}>
                            {categoryIcons[task.category]}
                            <span className="ml-1">{categories[task.category].name}</span>
                        </Badge>
                        <div className="flex items-center gap-1">
                            {priorityIcons[task.priority]}
                            <span>{priorities[task.priority].name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {task.subtasks && (
                     <Button variant="ghost" size="icon" onClick={() => handleToggleExpand(task.id)} className="text-muted-foreground">
                        {expandedTasks.has(task.id) ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                     </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(task)} className="text-muted-foreground hover:text-blue-500">
                    <Pencil className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
              {task.dueDate && (
              <div className="px-4 pb-3 text-sm text-muted-foreground">
                <strong>Vence:</strong> {new Date(task.dueDate).toLocaleString('es-ES')}
              </div>
            )}
             {expandedTasks.has(task.id) && <SubtaskList task={task} />}
           </Card>
          )) : (
            <Card className="col-span-full">
                 <CardContent className="p-12 text-center text-muted-foreground">
                    <ListTodo className="h-12 w-12 mx-auto mb-4"/>
                    <h3 className="text-lg font-semibold">No hay tareas aquí</h3>
                    <p>¡Añade una nueva tarea para empezar a organizarte!</p>
                </CardContent>
            </Card>
          )}
        </div>
      </main>

       <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg" size="icon" onClick={handleAddNewClick}>
          <Plus className="h-8 w-8" />
      </Button>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent onEscapeKeyDown={resetForm}>
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Modifica los detalles de tu tarea.' : '¿Qué necesitas hacer para conquistar tu día?'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Ej: Terminar el informe para el viernes..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={selectedCategory} onValueChange={(v: any) => setSelectedCategory(v)}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(categories).map(key => (
                    <SelectItem key={key} value={key}>{categories[key as keyof typeof categories].name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPriority} onValueChange={(v: any) => setSelectedPriority(v)}>
                <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                <SelectContent>
                  {Object.keys(priorities).map(key => (
                    <SelectItem key={key} value={key}>{priorities[key as keyof typeof priorities].name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm text-muted-foreground">Fecha y hora de vencimiento</label>
              <input
                type="datetime-local"
                value={dueDateLocal}
                onChange={(e) => setDueDateLocal(e.target.value)}
                className="w-full rounded border p-2 bg-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleFormSubmit}>{editingTask ? 'Guardar Cambios' : 'Añadir Tarea'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
