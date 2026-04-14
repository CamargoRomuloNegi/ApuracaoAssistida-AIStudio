import { Shield, CheckSquare, Zap, Clock } from 'lucide-react';
import { UploadZone } from '@/components/UploadZone';

export default function UploadPage() {
  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Upload de Lote XML</h2>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Carregue seus arquivos de NF-e e CT-e para processamento automático. O sistema realiza validação de integridade e esquema em tempo real.
        </p>
      </section>

      {/* Interactive Upload Zone */}
      <UploadZone />

      {/* Guidelines / Tips Footer Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Shield size={18} />
            <h5 className="text-xs font-bold uppercase tracking-widest">Segurança</h5>
          </div>
          <p className="text-[11px] text-on-surface-variant">Todos os arquivos são criptografados em repouso e validados em ambiente isolado.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <CheckSquare size={18} />
            <h5 className="text-xs font-bold uppercase tracking-widest">Validação</h5>
          </div>
          <p className="text-[11px] text-on-surface-variant">Suporte total para NF-e (4.00) e CT-e (3.00a) seguindo as NT vigentes da SEFAZ.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Zap size={18} />
            <h5 className="text-xs font-bold uppercase tracking-widest">Performance</h5>
          </div>
          <p className="text-[11px] text-on-surface-variant">Processamento paralelo capaz de analisar até 5.000 documentos por minuto.</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Clock size={18} />
            <h5 className="text-xs font-bold uppercase tracking-widest">Retenção</h5>
          </div>
          <p className="text-[11px] text-on-surface-variant">Arquivos originais são mantidos por 5 anos conforme a legislação tributária brasileira.</p>
        </div>
      </section>
    </div>
  );
}
