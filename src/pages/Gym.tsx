import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dumbbell, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  History,
  ClipboardList,
  Play
} from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface Workout {
  id: string;
  exercise: string;
  sets: number;
  reps: number;
  weight: number;
  date: string;
}

interface Routine {
  id: string;
  name: string;
  exercises: string[];
}

export default function Gym() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineExercises, setNewRoutineExercises] = useState('');
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [workoutHistory, setWorkoutHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '==', dateStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Workout[];
      setWorkouts(workoutsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workouts');
    });

    return () => unsubscribe();
  }, [selectedDate]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'routines'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const routinesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Routine[];
      setRoutines(routinesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'routines');
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '>=', format(start, 'yyyy-MM-dd')),
      where('date', '<=', format(end, 'yyyy-MM-dd'))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dates = snapshot.docs.map(doc => doc.data().date);
      setWorkoutHistory([...new Set(dates)]);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const addWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exercise.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        exercise,
        sets,
        reps,
        weight,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdAt: new Date().toISOString()
      });
      setExercise('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'workouts');
    }
  };

  const addRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim() || !newRoutineExercises.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'routines'), {
        userId: auth.currentUser.uid,
        name: newRoutineName,
        exercises: newRoutineExercises.split(',').map(e => e.trim()),
        createdAt: new Date().toISOString()
      });
      setNewRoutineName('');
      setNewRoutineExercises('');
      setShowRoutineForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'routines');
    }
  };

  const deleteWorkout = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workouts', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workouts/${id}`);
    }
  };

  const deleteRoutine = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'routines', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `routines/${id}`);
    }
  };

  const startRoutine = (routine: Routine) => {
    if (routine.exercises.length > 0) {
      setExercise(routine.exercises[0]);
    }
  };

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="section-title">Gimnasio & Rutinas</h1>
          <p className="section-subtitle">Registra tus progresos y gestiona tus rutinas de entrenamiento.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2 px-4 font-bold text-slate-700 min-w-[180px] justify-center">
            <CalendarIcon className="w-5 h-5 text-orange-500" />
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
          <button 
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={addWorkout} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-4 lg:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ejercicio</label>
              <div className="relative">
                <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  placeholder="ej. Press de Banca"
                  className="input-field pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Series</label>
              <input
                type="number"
                min="1"
                value={sets}
                onChange={(e) => setSets(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Reps</label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Peso (kg)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="input-field"
              />
            </div>
            <button
              type="submit"
              disabled={!exercise.trim()}
              className="md:col-span-4 btn-primary py-4 text-lg font-bold flex items-center justify-center gap-2"
            >
              <Plus className="w-6 h-6" /> Registrar Ejercicio
            </button>
          </form>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800">Entrenamiento de Hoy</h2>
              </div>
            </div>
            <ul className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {workouts.length === 0 ? (
                  <motion.li
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center text-slate-400"
                  >
                    <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No hay ejercicios registrados hoy. ¡A darle!</p>
                  </motion.li>
                ) : (
                  workouts.map((workout) => (
                    <motion.li
                      key={workout.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                          <Dumbbell className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">{workout.exercise}</p>
                          <p className="text-sm text-slate-500">
                            {workout.sets} series × {workout.reps} reps • <span className="font-bold text-slate-700">{workout.weight} kg</span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWorkout(workout.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </motion.li>
                  ))
                )}
              </AnimatePresence>
            </ul>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-500" />
              Actividad Mensual
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400 py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasWorkout = workoutHistory.includes(dateStr);
                const isSelected = isSameDay(day, selectedDate);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "aspect-square rounded-lg flex items-center justify-center text-xs transition-all relative",
                      isSelected ? "bg-indigo-600 text-white font-bold" : "hover:bg-slate-50 text-slate-600",
                      hasWorkout && !isSelected && "bg-orange-50 text-orange-600 font-bold"
                    )}
                  >
                    {format(day, 'd')}
                    {hasWorkout && (
                      <div className={cn(
                        "absolute bottom-1 w-1 h-1 rounded-full",
                        isSelected ? "bg-white" : "bg-orange-500"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-800">Mis Rutinas</h2>
              </div>
              <button 
                onClick={() => setShowRoutineForm(!showRoutineForm)}
                className="p-2 hover:bg-white rounded-xl transition-colors text-indigo-600"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {showRoutineForm && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={addRoutine}
                  className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                >
                  <input
                    type="text"
                    value={newRoutineName}
                    onChange={(e) => setNewRoutineName(e.target.value)}
                    placeholder="Nombre de la rutina"
                    className="input-field text-sm"
                  />
                  <textarea
                    value={newRoutineExercises}
                    onChange={(e) => setNewRoutineExercises(e.target.value)}
                    placeholder="Ejercicios (separados por coma)"
                    className="input-field text-sm h-20 resize-none"
                  />
                  <button type="submit" className="btn-primary w-full text-sm">Guardar Rutina</button>
                </motion.form>
              )}

              <ul className="space-y-3">
                {routines.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4">No tienes rutinas creadas.</p>
                ) : (
                  routines.map((routine) => (
                    <li key={routine.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-800">{routine.name}</h3>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startRoutine(routine)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <Play className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteRoutine(routine.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {routine.exercises.map((ex, i) => (
                          <span key={i} className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
