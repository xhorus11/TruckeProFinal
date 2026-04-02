import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Activity, Flame, CheckCircle2, Target, Sparkles, ArrowRight, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    totalTasks: 0,
    calories: 0,
    protein: 0,
    workouts: 0,
    reminders: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const userId = auth.currentUser.uid;

    // Listen to Tasks
    const qTasks = query(collection(db, 'tasks'), where('userId', '==', userId), where('date', '==', today));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      let completed = 0;
      snapshot.forEach(doc => {
        if (doc.data().completed) completed++;
      });
      setStats(s => ({ ...s, tasksCompleted: completed, totalTasks: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'tasks'));

    // Listen to Meals
    const qMeals = query(collection(db, 'meals'), where('userId', '==', userId), where('date', '==', today));
    const unsubMeals = onSnapshot(qMeals, (snapshot) => {
      let cals = 0;
      let prot = 0;
      snapshot.forEach(doc => {
        cals += doc.data().calories || 0;
        prot += doc.data().protein || 0;
      });
      setStats(s => ({ ...s, calories: cals, protein: prot }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'meals'));

    // Listen to Workouts
    const qWorkouts = query(collection(db, 'workouts'), where('userId', '==', userId), where('date', '==', today));
    const unsubWorkouts = onSnapshot(qWorkouts, (snapshot) => {
      setStats(s => ({ ...s, workouts: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'workouts'));

    // Listen to Reminders
    const qReminders = query(collection(db, 'reminders'), where('userId', '==', userId), where('completed', '==', false));
    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      setStats(s => ({ ...s, reminders: snapshot.size }));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'reminders'));

    return () => {
      unsubTasks();
      unsubMeals();
      unsubWorkouts();
      unsubReminders();
    };
  }, []);

  const cards = [
    { title: 'Tareas Hoy', value: `${stats.tasksCompleted}/${stats.totalTasks}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', link: '/planner' },
    { title: 'Calorías', value: `${Math.round(stats.calories)} kcal`, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', link: '/nutrition' },
    { title: 'Proteínas', value: `${Math.round(stats.protein)}g`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', link: '/nutrition' },
    { title: 'Entrenamiento', value: `${stats.workouts} ejercicios`, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', link: '/gym' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            ¡Hola, {auth.currentUser?.displayName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Hoy es {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}. Tienes {stats.reminders} recordatorios pendientes.
          </p>
        </div>
        <Link to="/reminders" className="btn-secondary flex items-center gap-2 group">
          Ver Recordatorios
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white p-6 rounded-3xl shadow-sm border ${card.border} flex items-center gap-5 card-hover cursor-pointer`}
            >
              <div className={`w-14 h-14 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-sm`}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{card.title}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{card.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="w-4 h-4 text-yellow-300" />
              Metas de Abril
            </div>
            <h2 className="text-4xl font-black mb-6 leading-tight">Optimiza tu rendimiento diario con TrackerPro.</h2>
            <p className="text-indigo-100 text-lg mb-8 leading-relaxed opacity-90">
              Estás gestionando tus estudios, entrenamientos y nutrición de manera excelente. ¡Sigue así para alcanzar tus objetivos de este mes!
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/planner" className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl active:scale-95">
                Planificar Mañana
              </Link>
              <Link to="/gym" className="bg-indigo-500/30 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all active:scale-95">
                Ver Rutinas
              </Link>
            </div>
          </div>
          
          <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
          <div className="absolute left-1/2 top-0 w-40 h-40 bg-indigo-400/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between card-hover">
          <div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">Análisis Semanal</h3>
            <p className="text-slate-500 leading-relaxed">
              Tu consistencia en el gimnasio ha mejorado un <span className="text-emerald-600 font-bold">15%</span> respecto a la semana pasada. ¡Excelente trabajo!
            </p>
          </div>
          
          <div className="mt-8 pt-8 border-t border-slate-50">
            <div className="flex items-center gap-3 text-indigo-600 font-bold group cursor-pointer">
              <Sparkles className="w-5 h-5" />
              <span>Ver consejos de IA</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
