import { Bell, HelpCircle } from 'lucide-react';
import Image from 'next/image';

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-outline-variant/20 flex justify-between items-center w-full px-8 py-3 h-16">
      <div className="flex items-center gap-8">
        <div className="text-xl font-bold text-primary font-headline tracking-tight">Auditor Precision</div>
        <nav className="hidden md:flex items-center gap-6">
          <span className="text-primary border-b-2 border-primary font-headline text-sm font-semibold tracking-tight py-4 cursor-pointer">Dashboard</span>
          <span className="text-on-surface-variant font-headline text-sm font-semibold tracking-tight hover:text-primary transition-colors py-4 cursor-pointer">Relatórios</span>
          <span className="text-on-surface-variant font-headline text-sm font-semibold tracking-tight hover:text-primary transition-colors py-4 cursor-pointer">Configurações</span>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
        </button>
        <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="h-8 w-[1px] bg-outline-variant/30 mx-2"></div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface leading-none">R2C - IA Master</p>
            <p className="text-[10px] text-on-surface-variant">Auditor Sênior</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-surface-container-lowest shadow-sm overflow-hidden bg-surface-container">
            <Image 
              src="https://picsum.photos/seed/auditor/100/100" 
              alt="Avatar" 
              width={40} 
              height={40} 
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
