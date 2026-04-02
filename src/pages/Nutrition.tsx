import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType, ai } from '../firebase';
import { Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Utensils, 
  Plus, 
  Trash2, 
  Flame, 
  Target, 
  Wheat, 
  Droplets, 
  Sparkles,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  GlassWater,
  Camera
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function Nutrition() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodInput, setFoodInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', auth.currentUser.uid),
      where('date', '==', dateStr)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Meal[];
      setMeals(mealsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'meals');
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const analyzeAndAddMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodInput.trim() || !auth.currentUser) return;

    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza este alimento y proporciona estimaciones nutricionales: "${foodInput}". Devuelve un JSON con name (string, nombre en español), calories (number), protein (number en gramos), carbs (number en gramos), fat (number en gramos).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["name", "calories", "protein", "carbs", "fat"]
          }
        },
      });

      const result = JSON.parse(response.text);
      
      await addDoc(collection(db, 'meals'), {
        userId: auth.currentUser.uid,
        ...result,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdAt: new Date().toISOString()
      });

      setFoodInput('');
    } catch (err) {
      console.error("AI Analysis failed:", err);
      alert("Fallo al analizar el alimento. Por favor, inténtalo de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType: file.type } },
              { text: "Analiza esta comida en la imagen y estima sus valores nutricionales. Devuelve un JSON con name (string, nombre en español), calories (number), protein (number en gramos), carbs (number en gramos), fat (number en gramos)." }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER }
              },
              required: ["name", "calories", "protein", "carbs", "fat"]
            }
          },
        });

        const result = JSON.parse(response.text);
        
        await addDoc(collection(db, 'meals'), {
          userId: auth.currentUser.uid,
          ...result,
          date: format(selectedDate, 'yyyy-MM-dd'),
          createdAt: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("AI Image Analysis failed:", err);
      alert("Fallo al analizar la imagen. Por favor, inténtalo de nuevo.");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMeal = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'meals', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `meals/${id}`);
    }
  };

  const totals = meals.reduce((acc, meal) => ({
    calories: acc.calories + meal.calories,
    protein: acc.protein + meal.protein,
    carbs: acc.carbs + meal.carbs,
    fat: acc.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const getSuggestions = async () => {
    setIsSuggesting(true);
    try {
      const prompt = `
        El usuario ha consumido hoy:
        Calorías: ${Math.round(totals.calories)} / 2000 kcal
        Proteínas: ${Math.round(totals.protein)}g / 150g
        Carbohidratos: ${Math.round(totals.carbs)}g / 200g
        Grasas: ${Math.round(totals.fat)}g / 65g
        
        Alimentos consumidos hoy: ${meals.map(m => m.name).join(', ') || 'Ninguno'}.
        
        Sugiere 3 opciones de comidas saludables que le ayuden a alcanzar sus objetivos diarios (2000 kcal, 150g proteína, 200g carbos, 65g grasa), considerando lo que ya ha comido. 
        Devuelve un JSON con un array 'suggestions' que contenga objetos con 'name' (string), 'description' (string, breve descripción), 'calories' (number), 'protein' (number), 'carbs' (number), 'fat' (number).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER }
                  },
                  required: ["name", "description", "calories", "protein", "carbs", "fat"]
                }
              }
            },
            required: ["suggestions"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error("AI Suggestions failed:", err);
      alert("Fallo al obtener sugerencias. Por favor, inténtalo de nuevo.");
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="section-title">Nutrición & Macros</h1>
          <p className="section-subtitle">Registra tus comidas con IA y haz seguimiento de tus macros.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2 px-4 font-bold text-slate-700 min-w-[180px] justify-center">
            <CalendarIcon className="w-5 h-5 text-emerald-500" />
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-3">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Calorías</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{Math.round(totals.calories)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Proteínas</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{Math.round(totals.protein)}<span className="text-sm font-bold text-slate-400 ml-1">g</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3">
            <Wheat className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Carbos</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{Math.round(totals.carbs)}<span className="text-sm font-bold text-slate-400 ml-1">g</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-yellow-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center mb-3">
            <Droplets className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Grasas</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{Math.round(totals.fat)}<span className="text-sm font-bold text-slate-400 ml-1">g</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={analyzeAndAddMeal} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                <input
                  type="text"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  placeholder="¿Qué comiste? (ej. '2 huevos revueltos y una tostada')"
                  className="input-field py-5 pl-14 pr-4 text-lg w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary px-6 shrink-0 flex items-center justify-center"
                title="Subir imagen de comida"
              >
                <Camera className="w-6 h-6" />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
            <button
              type="submit"
              disabled={!foodInput.trim() || isAnalyzing}
              className="btn-primary w-full py-5 text-lg font-bold flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles className="w-6 h-6" /> Analizar con IA</>
              )}
            </button>
          </form>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Comidas Registradas</h2>
            </div>
            <ul className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {meals.length === 0 ? (
                  <motion.li
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-12 text-center text-slate-400"
                  >
                    <Utensils className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No hay comidas hoy. ¡Usa la IA para registrar tus alimentos!</p>
                  </motion.li>
                ) : (
                  meals.map((meal) => (
                    <motion.li
                      key={meal.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-6 flex items-center justify-between group hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                          <Utensils className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-800">{meal.name}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">{meal.calories} kcal</span>
                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">P: {meal.protein}g</span>
                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">C: {meal.carbs}g</span>
                            <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg">G: {meal.fat}g</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id)}
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
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-blue-100 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <GlassWater className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Hidratación</h2>
              <p className="text-sm text-slate-500 mt-1">Meta: 8 vasos al día</p>
            </div>
            
            <div className="flex justify-center gap-2 flex-wrap">
              {[...Array(8)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWaterGlasses(i + 1)}
                  className={cn(
                    "w-10 h-12 rounded-xl border-2 transition-all flex items-center justify-center",
                    i < waterGlasses 
                      ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-100 scale-110" 
                      : "bg-white border-slate-100 text-slate-200 hover:border-blue-200"
                  )}
                >
                  <GlassWater className="w-5 h-5" />
                </button>
              ))}
            </div>
            
            <p className="text-2xl font-black text-blue-600">{waterGlasses} / 8 <span className="text-sm font-bold text-slate-400">Vasos</span></p>
          </div>

          <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-emerald-900 font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Sugerencias IA
              </h3>
              <button 
                onClick={getSuggestions}
                disabled={isSuggesting}
                className="text-xs font-bold bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg hover:bg-emerald-300 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSuggesting ? (
                  <><div className="w-3 h-3 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin" /> Generando...</>
                ) : 'Obtener'}
              </button>
            </div>
            
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((sug, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100/50">
                    <h4 className="font-bold text-slate-800 text-sm">{sug.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-2">{sug.description}</p>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">{sug.calories} kcal</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">P: {sug.protein}g</span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">C: {sug.carbs}g</span>
                      <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-md">G: {sug.fat}g</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-emerald-700 text-sm leading-relaxed">
                Pulsa "Obtener" para recibir sugerencias de comidas basadas en tus macros actuales y lo que ya has comido hoy.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
