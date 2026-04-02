import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw,
  ExternalLink,
  CheckSquare,
  Clock,
  Sparkles,
  LayoutGrid,
  List
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { useGoogleCalendar } from '../contexts/GoogleCalendarContext';
import { cn } from '../lib/utils';

interface Task {
  id: string;
  title: string;
  category: 'study' | 'work' | 'free_time' | 'other';
  completed: boolean;
  date: string;
}

const categories = [
  { id: 'study', label: 'Estudio', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'work', label: 'Trabajo', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { id: 'free_time', label: 'Tiempo Libre', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'other', label: 'Otro', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

export default function Planner() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [category, setCategory] = useState<Task['category']>('other');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
  const [isSyncing, setIsSyncing] = useState(false);

  
  const { accessToken, fetchEvents, createEvent } = useGoogleCalendar();

  useEffect(() => {
    if (!auth.currentUser) return;

    const startDate = viewMode === 'weekly' ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
    const endDate = viewMode === 'weekly' ? endOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '>=', format(startDate, 'yyyy-MM-dd')),
      where('date', '<=', format(endDate, 'yyyy-MM-dd'))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];
      setTasks(tasksData.sort((a, b) => a.title.localeCompare(b.title)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubscribe();
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (accessToken) {
      syncGoogleCalendar();
    }
  }, [selectedDate, accessToken, viewMode]);

  const syncGoogleCalendar = async () => {
    setIsSyncing(true);
    const events = await fetchEvents();
    
    const startDate = viewMode === 'weekly' ? startOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
    const endDate = viewMode === 'weekly' ? endOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
    
    const filteredEvents = events.filter((event: any) => {
      const eventDate = event.start?.date || event.start?.dateTime;
      if (!eventDate) return false;
      const d = new Date(eventDate);
      return d >= startDate && d <= endDate;
    });
    setGoogleEvents(filteredEvents);
    setIsSyncing(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !auth.currentUser) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const taskData = {
        userId: auth.currentUser.uid,
        title: newTask,
        category,
        completed: false,
        date: dateStr,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'tasks'), taskData);
      
      if (accessToken) {
        await createEvent({
          summary: newTask,
          description: `Categoría: ${category} (Sincronizado desde TrackerPro)`,
          start: {
            date: dateStr,
          },
          end: {
            date: dateStr,
          },
        });
      }
      
      setNewTask('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'tasks', id), {
        completed: !completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tasks/${id}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="section-title">Planificador Diario</h1>
          <p className="section-subtitle">Organiza tu día y sincroniza con Google Calendar.</p>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-end">
            <button
              onClick={() => setViewMode('daily')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                viewMode === 'daily' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Diaria
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                viewMode === 'weekly' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <List className="w-4 h-4" /> Semanal
            </button>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <button 
              onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'weekly' ? 7 : 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="flex items-center gap-2 px-4 font-bold text-slate-700 min-w-[180px] justify-center text-center">
              <CalendarIcon className="w-5 h-5 text-indigo-500 shrink-0" />
              {viewMode === 'weekly' 
                ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: es })} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "d MMM", { locale: es })}`
                : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </div>
            <button 
              onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'weekly' ? 7 : 1))}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {viewMode === 'daily' && (
            <form onSubmit={addTask} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="¿Qué tienes planeado para hoy?"
                  className="input-field text-lg py-4 pl-4 pr-12"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  <Plus className="w-6 h-6" />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as Task['category'])}
                    className={cn(
                      "px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2",
                      category === cat.id 
                        ? `${cat.color} ring-2 ring-indigo-500 ring-offset-2 scale-105` 
                        : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                    )}
                  >
                    <Tag className="w-4 h-4" />
                    {cat.label}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newTask.trim()}
                className="btn-primary w-full py-4 text-lg font-bold"
              >
                Añadir Tarea
              </button>
            </form>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Tus Tareas</h2>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                {tasks.length} {tasks.length === 1 ? 'Tarea' : 'Tareas'}
              </span>
            </div>
            
            {viewMode === 'weekly' ? (
              <div className="divide-y divide-slate-100">
                {eachDayOfInterval({
                  start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                  end: endOfWeek(selectedDate, { weekStartsOn: 1 })
                }).map(day => {
                  const dayTasks = tasks.filter(t => t.date === format(day, 'yyyy-MM-dd'));
                  return (
                    <div key={day.toISOString()} className="p-6">
                      <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                          {format(day, 'd')}
                        </span>
                        {format(day, 'EEEE', { locale: es })}
                      </h3>
                      {dayTasks.length === 0 ? (
                        <p className="text-sm text-slate-400 italic pl-10">Sin tareas</p>
                      ) : (
                        <ul className="space-y-3 pl-10">
                          {dayTasks.map(task => (
                            <li key={task.id} className="flex items-center gap-3">
                              <button onClick={() => toggleTask(task.id, task.completed)}>
                                {task.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                ) : (
                                  <Circle className="w-5 h-5 text-slate-300" />
                                )}
                              </button>
                              <span className={cn(
                                "text-sm font-medium",
                                task.completed ? "text-slate-400 line-through" : "text-slate-700"
                              )}>
                                {task.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                <AnimatePresence mode="popLayout">
                  {tasks.length === 0 ? (
                    <motion.li
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 text-center text-slate-400"
                    >
                      <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No hay tareas para este día.</p>
                    </motion.li>
                  ) : (
                    tasks.map((task) => (
                      <motion.li
                        key={task.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-5 flex items-center gap-4 group hover:bg-slate-50 transition-colors"
                    >
                      <button
                        onClick={() => toggleTask(task.id, task.completed)}
                        className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                      >
                        {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-lg font-semibold transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {task.title}
                        </p>
                        <span className={cn(
                          "inline-block px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-1 border",
                          categories.find(c => c.id === task.category)?.color || 'bg-slate-100 text-slate-600 border-slate-200'
                        )}>
                          {categories.find(c => c.id === task.category)?.label}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                <h2 className="font-bold">Google Calendar</h2>
              </div>
              <button 
                onClick={syncGoogleCalendar}
                disabled={isSyncing || !accessToken}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              </button>
            </div>
            
            <div className="p-6">
              {!accessToken ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-slate-500">Conecta tu cuenta para ver tus eventos de Google Calendar.</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="btn-secondary w-full text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Conectar Google
                  </button>
                </div>
              ) : (
                <ul className="space-y-4">
                  {googleEvents.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No hay eventos para hoy.</p>
                  ) : (
                    googleEvents.map((event) => (
                      <li key={event.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors">
                        <p className="text-sm font-bold text-slate-800">{event.summary}</p>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.start?.dateTime 
                            ? format(new Date(event.start.dateTime), 'HH:mm') 
                            : 'Todo el día'}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
          
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
            <h3 className="text-indigo-900 font-bold mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Tip de IA
            </h3>
            <p className="text-indigo-700 text-sm leading-relaxed">
              He notado que sueles tener más tareas de "Estudio" los lunes. ¡Intenta bloquear tiempo en tu calendario para concentrarte!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
