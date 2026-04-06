import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

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
        return "Eres un experto coach de productividad. Ayuda al usuario a organizar su día, priorizar tareas y gestionar su tiempo de forma efectiva. Responde siempre en español.";
      case '/nutrition':
        return "Eres un nutricionista certificado. Ayuda al usuario a rastrear sus macros, sugiere comidas saludables y responde preguntas sobre calorías, proteínas, carbohidratos y grasas. Responde siempre en español.";
      case '/gym':
        return "Eres un entrenador personal profesional. Ayuda al usuario a planificar sus entrenamientos, sugiere ejercicios y ofrece consejos sobre series, repeticiones y técnica. Responde siempre en español.";
      default:
        return "Eres un asistente de IA útil para una aplicación de planificación diaria, nutrición y seguimiento de gimnasio. Ayuda al usuario a gestionar su vida de forma efectiva. Responde siempre en español.";
    }
  };

  useEffect(() => {
    // Reset chat when route changes to give context-specific advice
    const initChat = async () => {
      const instruction = getSystemInstruction(location.pathname);
      const chat = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: instruction,
        }
      });
      setChatSession(chat);
      
      let greeting = "¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?";
      if (location.pathname === '/planner') greeting = "¡Hola! Soy tu coach de productividad. ¿Qué planeamos para hoy?";
      if (location.pathname === '/nutrition') greeting = "¡Hola! Soy tu nutricionista virtual. ¿Qué comiste hoy?";
      if (location.pathname === '/gym') greeting = "¡Hola! Soy tu entrenador personal. ¿Listos para entrenar?";

      setMessages([{
        id: Date.now().toString(),
        role: 'model',
        text: greeting
      }]);
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
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Lo siento, encontré un error. Por favor, inténtalo de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-transform hover:scale-105 z-50"
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
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-semibold">Asistente de IA</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-indigo-100 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-600' : 'bg-white border border-gray-200 text-gray-600'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-800 rounded-tl-none flex gap-1 items-center">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pregúntame lo que sea..."
                className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
