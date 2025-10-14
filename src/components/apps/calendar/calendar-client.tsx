'use client';

import React, { useState, useMemo } from 'react';
import { useTasks, Task } from '@/context/TasksContext';
import { ChevronLeft, ChevronRight, Calendar, Plus, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { categories, priorities } from '@/context/TasksContext';

const categoryIcons = {
  personal: '⭐',
  work: '💼',
  health: '❤️',
  home: '🏠',
  learning: '📚',
  fun: '🎉',
};

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default function CalendarClient() {
  const { tasks, addTask, toggleTaskCompletion, categories: taskCategories } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isDayViewOpen, setIsDayViewOpen] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<keyof typeof categories>('personal');
  const [newTaskPriority, setNewTaskPriority] = useState<keyof typeof priorities>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Generar calendario del mes
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({ date: day, isCurrentMonth: false, isToday: false });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      days.push({ date, isCurrentMonth: true, isToday });
    }
    
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({ date, isCurrentMonth: false, isToday: false });
    }
    
    return days;
  }, [currentDate]);

  const getTasksForDate = (date: Date) => {
    const dateString = date.toDateString();
    return tasks.filter(task => {
      const source = task.dueDate || task.createdAt;
      if (!source) return false;
      const taskDate = new Date(source).toDateString();
      return taskDate === dateString;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleAddTask = () => {
    if (newTaskText.trim() && selectedDate) {
      addTask({
        text: newTaskText.trim(),
        category: newTaskCategory,
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : selectedDate.toISOString(),
      });
      setNewTaskText('');
      setNewTaskDueDate('');
      setIsAddTaskOpen(false);
    }
  };

  const openAddTaskDialog = (date: Date) => {
    setSelectedDate(date);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0);
    setNewTaskDueDate(dayStart.toISOString().slice(0,16));
    setIsAddTaskOpen(true);
  };
  
  const handleDayClick = (date: Date) => {
    const tasks = getTasksForDate(date);
    setSelectedDate(date);
    setSelectedDayTasks(tasks);
    setIsDayViewOpen(true);
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="bg-gray-50/50 min-h-screen p-4">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Calendario de Tareas</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={goToToday}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => {
              const dayTasks = getTasksForDate(day.date);
              const completedTasks = dayTasks.filter(task => task.completed).length;
              const totalTasks = dayTasks.length;

              return (
                <div
                  key={index}
                  className={`
                    min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors
                    ${day.isCurrentMonth ? 'bg-background hover:bg-muted/50' : 'bg-muted/30 text-muted-foreground'}
                    ${day.isToday ? 'ring-2 ring-primary bg-primary/5' : ''}
                  `}
                  onClick={() => handleDayClick(day.date)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${day.isToday ? 'text-primary font-bold' : ''}`}>
                      {day.date.getDate()}
                    </span>
                    {totalTasks > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {completedTasks}/{totalTasks}
                        </span>
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="flex items-center gap-1 p-1 rounded text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskCompletion(task.id);
                        }}
                      >
                        <button className="flex-shrink-0">
                          {task.completed ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <span className={`truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.text}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`ml-auto ${priorityColors[task.priority]} text-xs px-1 py-0`}
                        >
                          {task.priority === 'high' ? '!' : task.priority === 'medium' ? '!!' : '!!!'}
                        </Badge>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayTasks.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Tarea</DialogTitle>
            <DialogDescription>
              Crear una nueva tarea para {selectedDate?.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Describe tu tarea..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Select value={newTaskCategory} onValueChange={(v: any) => setNewTaskCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(taskCategories).map(key => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span>{categoryIcons[key as keyof typeof categoryIcons]}</span>
                        {taskCategories[key as keyof typeof taskCategories].name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(priorities).map(key => (
                    <SelectItem key={key} value={key}>
                      {priorities[key as keyof typeof priorities].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm text-muted-foreground">Fecha y hora</label>
              <input
                type="datetime-local"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="w-full rounded border p-2 bg-transparent"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTask} disabled={!newTaskText.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Tarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDayViewOpen} onOpenChange={setIsDayViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Tareas para {selectedDate?.toLocaleDateString('es-ES', { 
                weekday: 'long', 
                day: 'numeric',
                month: 'long', 
              })}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50"
                >
                  <button onClick={() => toggleTaskCompletion(task.id)}>
                    {task.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-grow">
                    <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.text}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                       <span>{categoryIcons[task.category]} {taskCategories[task.category].name}</span>
                       <Badge variant="outline" className={`${priorityColors[task.priority]} text-xs px-1.5 py-0.5`}>
                         {priorities[task.priority].name}
                       </Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay tareas para este día.</p>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between">
             <Button 
              variant="outline"
              onClick={() => {
                setIsDayViewOpen(false);
                if (selectedDate) {
                    openAddTaskDialog(selectedDate);
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Tarea
            </Button>
            <Button variant="ghost" onClick={() => setIsDayViewOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
