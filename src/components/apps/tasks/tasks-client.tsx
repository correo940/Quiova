'use client';

import React, { useState, useMemo } from 'react';
import { useTasks, Task } from '@/context/TasksContext';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

export default function TasksClient() {
  const { 
    tasks, 
    magicPoints, 
    currentStreak, 
    addTask, 
    toggleTaskCompletion, 
    deleteTask, 
    categories, 
    priorities 
  } = useTasks();
  
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  
  // State for the form
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof categories>('personal');
  const [selectedPriority, setSelectedPriority] = useState<keyof typeof priorities>('medium');

  // --- Logic Handlers --- //
  const handleAddTask = () => {
    if (inputValue.trim() === '') return;

    addTask({
      text: inputValue.trim(),
      category: selectedCategory,
      priority: selectedPriority,
    });

    resetForm();
  };

  const resetForm = () => {
    setInputValue('');
    setSelectedCategory('personal');
    setSelectedPriority('medium');
    setShowForm(false);
  };

  // --- Memoized Calculations --- //
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'all' || 
                           (filter === 'active' && !task.completed) || 
                           (filter === 'completed' && task.completed);
      return matchesSearch && matchesFilter;
    });
  }, [tasks, searchTerm, filter]);

  const completedTasksCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const progressPercentage = tasks.length > 0 ? (completedTasksCount / tasks.length) * 100 : 0;

  // --- Render --- //
  return (
    <div className="bg-gray-50/50 min-h-screen">
      <header className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-md">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center mb-6">
              <h1 className="text-4xl font-bold tracking-tight">Gestor de Tareas</h1>
              <p className="text-lg opacity-90">Organiza tu día y alcanza tus objetivos</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                    <Star className="mx-auto h-6 w-6 mb-1"/>
                    <div className="text-2xl font-bold">{magicPoints}</div>
                    <div className="text-sm opacity-90">Puntos</div>
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
                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                    <CheckCircle2 className="mx-auto h-6 w-6 mb-1"/>
                    <div className="text-2xl font-bold">{completedTasksCount}</div>
                    <div className="text-sm opacity-90">Hechas</div>
                </div>
            </div>
          </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar tareas..."
                className="pl-10"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todas</Button>
              <Button variant={filter === 'active' ? 'default' : 'outline'} onClick={() => setFilter('active')}>Activas</Button>
              <Button variant={filter === 'completed' ? 'default' : 'outline'} onClick={() => setFilter('completed')}>Completas</Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
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

        {/* Tasks Grid */}
        <div className="grid gap-4">
          {filteredTasks.length > 0 ? filteredTasks.map(task => (
            <Card key={task.id} className={`transition-all ${task.completed ? 'bg-muted/50' : 'bg-background'}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <button onClick={() => toggleTaskCompletion(task.id)} className="flex-shrink-0">
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
                <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-5 w-5" />
                </Button>
              </CardContent>
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

        {/* FAB and Dialog for adding tasks */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
                <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-lg" size="icon">
                    <Plus className="h-8 w-8" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Tarea</DialogTitle>
                    <DialogDescription>¿Qué necesitas hacer para conquistar tu día?</DialogDescription>
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
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                    <Button onClick={handleAddTask}>Añadir Tarea</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
