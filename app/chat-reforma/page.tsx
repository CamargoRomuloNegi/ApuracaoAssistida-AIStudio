'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatReformaPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Olá! Sou seu assistente especializado na Reforma Tributária (LC 214/2025). Como posso ajudar com suas dúvidas fiscais hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Verificando conexão com o banco de dados...');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Rotina de Inicialização (Health Check)
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        
        if (res.ok && data.status === 'ok') {
          setSystemStatus('ok');
          setStatusMessage('Sistemas online. Conectado ao Supabase e Gemini.');
        } else {
          setSystemStatus('error');
          setStatusMessage(data.message || 'Erro ao conectar com os serviços.');
        }
      } catch (error) {
        setSystemStatus('error');
        setStatusMessage('Falha de rede ao tentar verificar os sistemas.');
      }
    };

    checkSystemHealth();
  }, []);

  // 2. Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Envio da Mensagem
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || systemStatus !== 'ok') return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMessageId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Adiciona uma mensagem vazia do assistente que será preenchida via streaming
    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar a requisição.');
      }

      // Processamento do Streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          assistantText += decoder.decode(value, { stream: true });
          
          // Atualiza a mensagem do assistente em tempo real
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId ? { ...msg, content: assistantText } : msg
            )
          );
        }
      }
    } catch (error: any) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: `**Erro:** ${error.message}` } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-[calc(100vh-8rem)] flex flex-col bg-surface-container-low rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
      
      {/* Header do Chat & Status do Sistema */}
      <div className="p-4 border-b border-outline-variant/20 bg-surface flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface font-headline">Consultor LC 214/2025</h2>
            <p className="text-xs text-on-surface-variant">Inteligência Artificial com RAG Tributário</p>
          </div>
        </div>

        {/* Indicador de Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
          systemStatus === 'ok' ? 'bg-green-500/10 text-green-600 border-green-500/20' :
          systemStatus === 'error' ? 'bg-error/10 text-error border-error/20' :
          'bg-orange-500/10 text-orange-600 border-orange-500/20'
        }`}>
          {systemStatus === 'ok' && <CheckCircle2 size={14} />}
          {systemStatus === 'error' && <AlertCircle size={14} />}
          {systemStatus === 'loading' && <Loader2 size={14} className="animate-spin" />}
          <span className="hidden sm:inline">{statusMessage}</span>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {systemStatus === 'error' && (
          <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-start gap-3 text-error">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm">
              <p className="font-bold mb-1">Atenção: Sistema Indisponível</p>
              <p>{statusMessage}</p>
              <p className="mt-2 text-xs opacity-80">Verifique se as variáveis de ambiente (GEMINI_API_KEY, SUPABASE_URL e SUPABASE_ANON_KEY) foram configuradas corretamente.</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-container-highest text-on-surface'
            }`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-surface border border-outline-variant/20 text-on-surface rounded-tl-none'
            }`}>
              {msg.content === '' ? (
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Consultando a legislação...</span>
                </div>
              ) : (
                <div className={`text-sm prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-p:leading-relaxed'}`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-outline-variant/20">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || systemStatus !== 'ok'}
            placeholder={systemStatus === 'ok' ? "Faça uma pergunta sobre a Reforma Tributária..." : "Sistema indisponível no momento..."}
            className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-4 pr-12 py-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || systemStatus !== 'ok'}
            className="absolute right-2 p-2 bg-primary text-white rounded-lg hover:bg-primary-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </form>
        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-on-surface-variant">
          <Info size={12} />
          <span>As respostas são geradas por IA baseadas na LC 214/2025 e devem ser validadas por um profissional.</span>
        </div>
      </div>
    </div>
  );
}
