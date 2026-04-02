import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Reminder {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remindersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reminder[];
      setReminders(remindersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reminders');
    });

    return () => unsubscribe();
  }, []);

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminder.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, 'reminders'), {
        userId: auth.currentUser.uid,
        text: newReminder,
        completed: false,
        createdAt: new Date().toISOString()
      });
      setNewReminder('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reminders');
    }
  };

  const toggleReminder = async (id: string, completed: boolean) => {
    try {
      await updateDoc(doc(db, 'reminders', id), {
        completed: !completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reminders/${id}`);
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reminders/${id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 font-sans">
      <header>
        <h1 className="section-title">Recordatorios Rápidos</h1>
        <p className="section-subtitle">Cosas importantes que no quieres olvidar.</p>
      </header>

      <form onSubmit={addReminder} className="flex gap-3">
        <div className="relative flex-1">
          <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={newReminder}
            onChange={(e) => setNewReminder(e.target.value)}
            placeholder="ej. Beber agua, llamar a mamá..."
            className="input-field pl-12 py-4"
          />
        </div>
        <button type="submit" disabled={!newReminder.trim()} className="btn-primary px-6">
          <Plus className="w-6 h-6" />
        </button>
      </form>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <ul className="divide-y divide-slate-50">
          <AnimatePresence mode="popLayout">
            {reminders.length === 0 ? (
              <motion.li
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center text-slate-400"
              >
                <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No tienes recordatorios pendientes.</p>
              </motion.li>
            ) : (
              reminders.map((reminder) => (
                <motion.li
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-5 flex items-center gap-4 group hover:bg-slate-50 transition-colors"
                >
                  <button
                    onClick={() => toggleReminder(reminder.id, reminder.completed)}
                    className={`transition-colors ${reminder.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                  >
                    {reminder.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-lg font-medium transition-all ${reminder.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {reminder.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(reminder.createdAt), "d 'de' MMMM, HH:mm", { locale: es })}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
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
  );
}
