import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing-key' });

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  const getSystemInstruction = (path: string) => {
    switch (path) {
      case '/planner':
        return "Eres un súper experto coach de productividad 🚀. Ayuda al usuario a organizar su día, priorizar tareas y gestionar su tiempo con máxima energía. Usa siempre Markdown para organizar tu respuesta (listas, negritas) y usa emojis divertidos 😊. Sé directo, juvenil y súper motivador.";
      case '/nutrition':
        return "Eres un nutricionista certificado muy amigable 🥑🔥. Ayuda al usuario a rastrear sus macros y sugiere comidas deliciosas y saludables. Explica los conceptos de forma sencilla y juvenil. Usa Markdown para que tus consejos se lean bien estructurados (viñetas, títulos cortos) y acompáñalos con emojis divertidos.";
      case '/gym':
        return "Eres un entrenador personal súper motivador 💪⚡. Ayuda al usuario a romperla en sus entrenamientos, sugiere ejercicios y dale los mejores tips de técnica. Estructura siempre tus rutinas y consejos con Markdown (listas, negritas) y usa emojis que den mucha energía 🏋️‍♀️🔥.";
      default:
        return "Eres un asistente de IA súper genial y amigable 🤖✨ para una app de planificación, nutrición y gimnasio. Tu objetivo es hacerle la vida más fácil al usuario con un tono juvenil y motivador. Usa Markdown (listas, negritas) para organizar tus respuestas visualmente y no te olvides de los emojis 🎉.";
    }
  };

  useEffect(() => {
    const initChat = async () => {
      const instruction = getSystemInstruction(location.pathname);
      try {
        const chat = ai.chats.create({
          model: "gemini-2.5-flash",
          config: {
            systemInstruction: instruction,
          }
        });
        setChatSession(chat);
        
        let greeting = "¡Hola! 👋 Soy tu asistente inteligente. ¿En qué súper misión te ayudo hoy? ✨";
        if (location.pathname === '/planner') greeting = "¡Hola! 🚀 Soy tu coach de productividad. ¿Qué vamos a conquistar hoy? 🎯";
        if (location.pathname === '/nutrition') greeting = "¡Hola! 🥗 Soy tu nutri virtual. ¿Qué delicia comimos hoy? 😋";
        if (location.pathname === '/gym') greeting = "¡Hola! 💪 Soy tu entrenador. ¿Listos para darlo todo hoy? 🔥";

        setMessages([{
          id: Date.now().toString(),
          role: 'model',
          text: greeting
        }]);
      } catch (error) {
        console.error("No se pudo inicializar el chat:", error);
      }
    };
    initChat();
  }, [location.pathname]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: userMsg.text });
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response.text };
      setMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      let errorMessage = "¡Uy! 😅 Tuve un pequeño tropiezo procesando eso. ¿Lo intentamos de nuevo?";
      if (error.status === 503 || String(error).includes('high demand')) {
        errorMessage = "¡Wow! 🤯 Mis circuitos están a mil por hora ahora mismo. Dame unos minutos y volvemos con todo. ⚡";
      }
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-fuchsia-500 text-white rounded-full shadow-[0_8px_30px_rgb(217,70,239,0.3)] hover:bg-fuchsia-600 transition-transform hover:scale-105 z-50 text-white"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[550px] bg-white rounded-3xl shadow-2xl border border-fuchsia-100 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Asistente Pro ✨</h3>
                  <p className="text-xs text-fuchsia-100">Siempre activo</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-fuchsia-100 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 flex flex-col gap-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white' : 'bg-white border border-slate-200 text-fuchsia-500'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm shadow-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white rounded-tr-none' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'}`}>
                    {msg.role === 'model' ? (
                      <div className="prose prose-sm prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:text-slate-800 break-words w-full overflow-hidden max-w-full">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="break-words">{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-fuchsia-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-4 rounded-2xl bg-white border border-slate-100 text-slate-700 rounded-tl-none flex gap-1.5 items-center shadow-sm">
                    <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu mensaje aquí..."
                className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:border-fuchsia-300 focus:ring-4 focus:ring-fuchsia-100 outline-none transition-all text-sm shadow-inner"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-12 h-12 flex flex-col justify-center items-center bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white rounded-full hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
              >
                <Send className="w-5 h-5 ml-1" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
