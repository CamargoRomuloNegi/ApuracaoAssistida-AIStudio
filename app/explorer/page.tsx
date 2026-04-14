'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useFiscalStore } from '@/application/store/useFiscalStore';
import { Search, Filter, Download, FileText, AlertCircle, CheckSquare, SlidersHorizontal, Building2, Check, Edit2 } from 'lucide-react';
import { FiscalDocument } from '@/domain/models/FiscalDocument';
import { DocumentDetailsModal } from '@/components/DocumentDetailsModal';
import { TaxAnalyzerService } from '@/application/services/TaxAnalyzerService';
import { ExportService } from '@/application/services/ExportService';

export default function ExplorerPage() {
  const { documents, analyzedCnpjRoot, setAnalyzedCnpjRoot } = useFiscalStore();
  const [selectedDoc, setSelectedDoc] = useState<FiscalDocument | null>(null);

  // CNPJ Root Edit State
  const [isEditingCnpj, setIsEditingCnpj] = useState(false);
  const [tempCnpj, setTempCnpj] = useState('');

  // Auto-detect CNPJ Root if not set
  useEffect(() => {
    if (documents.length > 0 && !analyzedCnpjRoot) {
      const detectedRoot = TaxAnalyzerService.detectMainCnpjRoot(documents);
      if (detectedRoot) {
        setAnalyzedCnpjRoot(detectedRoot);
      }
    }
  }, [documents, analyzedCnpjRoot, setAnalyzedCnpjRoot]);

  const handleSaveCnpj = () => {
    const clean = tempCnpj.replace(/\D/g, '');
    if (clean.length >= 8) {
      setAnalyzedCnpjRoot(clean.substring(0, 8));
      setIsEditingCnpj(false);
    }
  };

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [directionFilter, setDirectionFilter] = useState<string>('ALL');
  const [purposeFilter, setPurposeFilter] = useState<string>('ALL');
  const [regimeFilter, setRegimeFilter] = useState<string>('ALL');
  const [rtcFilter, setRtcFilter] = useState<boolean>(false);

  // Derived state
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search term (Access Key or Issuer Name/CNPJ)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        doc.access_key.toLowerCase().includes(searchLower) ||
        doc.issuer.name.toLowerCase().includes(searchLower) ||
        doc.issuer.cnpj_cpf.includes(searchLower);
      
      if (!matchesSearch) return false;

      // Type Filter
      if (typeFilter !== 'ALL' && doc.document_type !== typeFilter) return false;

      // Direction Filter
      if (directionFilter !== 'ALL' && doc.direction !== directionFilter) return false;

      // Purpose Filter
      if (purposeFilter !== 'ALL' && doc.purpose !== purposeFilter) return false;

      // Regime Filter
      if (regimeFilter !== 'ALL' && doc.tax_regime !== regimeFilter) return false;

      // RTC Filter (Has IBS/CBS tags)
      if (rtcFilter) {
        const hasRTC = doc.items.some(item => 
          (item.rtc.vIBS !== undefined && item.rtc.vIBS > 0) || 
          (item.rtc.vCBS !== undefined && item.rtc.vCBS > 0) ||
          item.rtc.cst !== undefined
        );
        if (!hasRTC) return false;
      }

      return true;
    });
  }, [documents, searchTerm, typeFilter, directionFilter, purposeFilter, regimeFilter, rtcFilter]);

  const handleExportExcel = () => {
    ExportService.exportToExcel(filteredDocuments, 'extracao_fiscal_rtc.xlsx');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Explorador de Documentos</h2>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Busque, filtre e inspecione os documentos processados. Os dados abaixo estão temporariamente armazenados na memória do seu navegador.
        </p>
      </section>

      {/* CNPJ Root Analyzer Bar */}
      {documents.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider">Empresa Analisada (Raiz CNPJ)</div>
              <div className="text-sm text-on-surface-variant">
                O sistema usa esta raiz para determinar se a operação é de Entrada (Crédito) ou Saída (Débito).
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isEditingCnpj ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={tempCnpj}
                  onChange={(e) => setTempCnpj(e.target.value)}
                  placeholder="Ex: 12345678"
                  className="font-mono text-sm px-3 py-1.5 border border-primary/30 rounded-md bg-surface focus:outline-none focus:border-primary w-32"
                  maxLength={8}
                />
                <button 
                  onClick={handleSaveCnpj}
                  className="p-1.5 bg-primary text-on-primary rounded-md hover:bg-primary/90 transition-colors"
                  title="Salvar"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-surface px-4 py-2 rounded-lg border border-outline-variant/20 shadow-sm">
                <span className="font-mono font-bold text-lg text-on-surface">
                  {analyzedCnpjRoot || 'Detectando...'}
                </span>
                <button 
                  onClick={() => {
                    setTempCnpj(analyzedCnpjRoot || '');
                    setIsEditingCnpj(true);
                  }}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  title="Alterar CNPJ Raiz"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters Bar (Ghost Borders) */}
      <div className="flex flex-col gap-4 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por Chave de Acesso, CNPJ ou Razão Social..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-b border-outline-variant/30 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportExcel}
              disabled={filteredDocuments.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              <Download size={16} />
              Exportar Excel
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary text-on-surface"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="NFE">NF-e</option>
            <option value="CTE">CT-e</option>
            <option value="NFSE">NFS-e</option>
          </select>

          <select 
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary text-on-surface"
          >
            <option value="ALL">Todas as Direções</option>
            <option value="INBOUND">Entrada</option>
            <option value="OUTBOUND">Saída</option>
          </select>

          <select 
            value={purposeFilter}
            onChange={(e) => setPurposeFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary text-on-surface"
          >
            <option value="ALL">Todas as Finalidades</option>
            <option value="NORMAL">Normal</option>
            <option value="COMPLEMENTAR">Complementar</option>
            <option value="AJUSTE">Ajuste</option>
            <option value="DEVOLUCAO">Devolução</option>
          </select>

          <select 
            value={regimeFilter}
            onChange={(e) => setRegimeFilter(e.target.value)}
            className="py-2 px-3 text-sm bg-surface-container border border-outline-variant/20 rounded-md focus:outline-none focus:border-primary text-on-surface"
          >
            <option value="ALL">Todos os Regimes</option>
            <option value="SIMPLES_NACIONAL">Simples Nacional</option>
            <option value="RPA">Regime Normal</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer select-none px-3 py-2 bg-surface-container border border-outline-variant/20 rounded-md">
            <input 
              type="checkbox" 
              checked={rtcFilter}
              onChange={(e) => setRtcFilter(e.target.checked)}
              className="rounded border-outline-variant text-primary focus:ring-primary"
            />
            <span className="flex items-center gap-1"><SlidersHorizontal size={14} className="text-primary"/> Com tags IBS/CBS</span>
          </label>
        </div>
      </div>

      {/* High Density Data Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-medium">Tipo</th>
                <th className="px-6 py-4 font-medium">Direção</th>
                <th className="px-6 py-4 font-medium">Chave de Acesso</th>
                <th className="px-6 py-4 font-medium">Data Emissão</th>
                <th className="px-6 py-4 font-medium">Emitente</th>
                <th className="px-6 py-4 font-medium">Regime</th>
                <th className="px-6 py-4 font-medium text-right">Valor Total</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <FileText size={32} className="opacity-20" />
                      <p>Nenhum documento processado na sessão atual.</p>
                      <p className="text-xs opacity-60">Faça o upload de XMLs na tela inicial para visualizá-los aqui.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center gap-3">
                      <Search size={32} className="opacity-20" />
                      <p>Nenhum documento encontrado para os filtros atuais.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedDoc(doc)}
                    className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-surface-container text-[10px] font-black tracking-wider text-on-surface">
                        {doc.document_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {doc.direction === 'INBOUND' && <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 px-2 py-1 rounded">ENTRADA</span>}
                      {doc.direction === 'OUTBOUND' && <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-1 rounded">SAÍDA</span>}
                      {doc.direction === 'UNKNOWN' && <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-1 rounded">TERCEIROS</span>}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant group-hover:text-primary transition-colors">
                      {doc.access_key}
                      {doc.purpose && doc.purpose !== 'UNKNOWN' && (
                        <div className="text-[9px] uppercase tracking-wider text-primary mt-1">{doc.purpose}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">
                      {formatDate(doc.issue_date)}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-on-surface-variant">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface truncate max-w-[200px]" title={doc.issuer.name}>{doc.issuer.name}</span>
                        <span>{doc.issuer.cnpj_cpf}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${doc.tax_regime === 'SIMPLES_NACIONAL' ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                        {doc.tax_regime.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-right text-on-surface font-medium">
                      {formatCurrency(doc.total_value)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {doc.status === 'VALID' ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-tertiary-container text-tertiary" title="Válido">
                          <CheckSquare size={14} />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-error-container text-error" title="Erro de Esquema/Regra">
                          <AlertCircle size={14} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer KPI */}
        <div className="bg-surface-container-low px-6 py-3 border-t border-outline-variant/10 flex items-center justify-between text-xs">
          <span className="text-on-surface-variant font-medium">
            Mostrando <strong className="text-on-surface">{filteredDocuments.length}</strong> de {documents.length} documentos
          </span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-on-surface-variant">Total Transacionado:</span>
              <span className="font-mono font-bold text-on-surface">
                {formatCurrency(filteredDocuments.reduce((acc, doc) => acc + doc.total_value, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedDoc && (
        <DocumentDetailsModal 
          document={selectedDoc} 
          onClose={() => setSelectedDoc(null)} 
        />
      )}
    </div>
  );
}
