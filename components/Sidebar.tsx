'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, CloudUpload, Settings2, FileText, BarChart3, Plus, HelpCircle, LogOut, MessageSquare } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Carregamento', href: '/', icon: CloudUpload },
    { name: 'Explorador de Documentos', href: '/explorer', icon: FileText },
    { name: 'Análise RTC', href: '/rtc-analysis', icon: BarChart3 },
    { name: 'Consultor LC 214', href: '/chat-reforma', icon: MessageSquare },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-outline-variant/20 flex flex-col z-50">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <Activity size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-on-surface leading-tight font-headline">Auditor Estagiário</h1>
            <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">Gestão XML</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-xs font-medium uppercase tracking-wider transition-all duration-200 ${
                isActive
                  ? 'bg-primary/10 text-primary border-r-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container hover:translate-x-1'
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button className="w-full py-3 bg-gradient-to-b from-primary to-primary-dim text-white rounded-md font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
          <Plus size={16} />
          Novo Diagnóstico
        </button>
      </div>

      <div className="border-t border-outline-variant/20 p-2 space-y-1">
        <button className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container text-xs font-medium uppercase tracking-wider transition-colors">
          <HelpCircle size={18} />
          <span>Suporte</span>
        </button>
        <button className="w-full flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container hover:text-error text-xs font-medium uppercase tracking-wider transition-colors">
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
