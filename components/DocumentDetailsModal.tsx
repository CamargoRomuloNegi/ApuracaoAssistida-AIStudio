import React, { useState } from 'react';
import { FiscalDocument, DocumentItem } from '@/domain/models/FiscalDocument';
import { X, Building2, Receipt, Calculator, FileText, Package } from 'lucide-react';

interface DocumentDetailsModalProps {
  document: FiscalDocument;
  onClose: () => void;
}

export function DocumentDetailsModal({ document, onClose }: DocumentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'itens'>('geral');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-4xl h-full bg-surface shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant bg-surface-container-low">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
                {document.document_type}
              </span>
              <h2 className="text-xl font-bold text-on-surface">Detalhes do Documento</h2>
            </div>
            <p className="text-sm font-mono text-on-surface-variant">{document.access_key}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant px-6 bg-surface-container-lowest">
          <button
            onClick={() => setActiveTab('geral')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'geral' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Visão Geral & Totais
          </button>
          <button
            onClick={() => setActiveTab('itens')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'itens' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Itens & Tributos (RTC)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-surface-container-lowest">
          
          {activeTab === 'geral' && (
            <div className="space-y-8">
              {/* Participants */}
              <section>
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building2 size={16} /> Participantes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-outline-variant bg-surface">
                    <div className="text-xs text-on-surface-variant mb-1">Emitente</div>
                    <div className="font-bold text-on-surface truncate" title={document.issuer.name}>{document.issuer.name}</div>
                    <div className="font-mono text-sm text-on-surface-variant mt-1">{document.issuer.cnpj_cpf}</div>
                    {document.issuer.uf && <div className="text-xs text-on-surface-variant mt-1">UF: {document.issuer.uf}</div>}
                  </div>
                  <div className="p-4 rounded-lg border border-outline-variant bg-surface">
                    <div className="text-xs text-on-surface-variant mb-1">Destinatário</div>
                    <div className="font-bold text-on-surface truncate" title={document.receiver.name}>{document.receiver.name}</div>
                    <div className="font-mono text-sm text-on-surface-variant mt-1">{document.receiver.cnpj_cpf}</div>
                    {document.receiver.uf && <div className="text-xs text-on-surface-variant mt-1">UF: {document.receiver.uf}</div>}
                  </div>
                  {document.sender && document.sender.cnpj_cpf !== 'UNKNOWN' && (
                    <div className="p-4 rounded-lg border border-outline-variant bg-surface md:col-span-2">
                      <div className="text-xs text-on-surface-variant mb-1">Remetente (CT-e)</div>
                      <div className="font-bold text-on-surface truncate" title={document.sender.name}>{document.sender.name}</div>
                      <div className="font-mono text-sm text-on-surface-variant mt-1">{document.sender.cnpj_cpf}</div>
                    </div>
                  )}
                </div>
              </section>

              {/* Totals */}
              <section>
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Calculator size={16} /> Totais do Documento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-surface-container-low">
                    <div className="text-xs text-on-surface-variant mb-1">Valor Total</div>
                    <div className="font-mono font-bold text-lg text-on-surface">{formatCurrency(document.total_value)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-low">
                    <div className="text-xs text-on-surface-variant mb-1">Valor Produtos/Serviços</div>
                    <div className="font-mono font-bold text-lg text-on-surface">{formatCurrency(document.totals.vProd)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-low">
                    <div className="text-xs text-on-surface-variant mb-1">Descontos</div>
                    <div className="font-mono font-bold text-lg text-on-surface">{formatCurrency(document.totals.vDesc)}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-container-low border border-primary/20">
                    <div className="text-xs text-primary mb-1">Total Tributos (Aprox.)</div>
                    <div className="font-mono font-bold text-lg text-primary">{formatCurrency(document.totals.vTotTrib)}</div>
                  </div>
                  
                  {/* Current Taxes Totals */}
                  <div className="p-3 rounded-lg border border-outline-variant">
                    <div className="text-[10px] text-on-surface-variant uppercase">ICMS Total</div>
                    <div className="font-mono text-sm">{formatCurrency(document.totals.vICMS)}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-outline-variant">
                    <div className="text-[10px] text-on-surface-variant uppercase">PIS Total</div>
                    <div className="font-mono text-sm">{formatCurrency(document.totals.vPIS)}</div>
                  </div>
                  <div className="p-3 rounded-lg border border-outline-variant">
                    <div className="text-[10px] text-on-surface-variant uppercase">COFINS Total</div>
                    <div className="font-mono text-sm">{formatCurrency(document.totals.vCOFINS)}</div>
                  </div>

                  {/* RTC Totals */}
                  {(document.totals.vIBS !== undefined || document.totals.vCBS !== undefined) && (
                    <>
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-[10px] text-primary uppercase font-bold">Base IBS/CBS</div>
                        <div className="font-mono text-sm text-on-surface">{formatCurrency(document.totals.vBCIBSCBS || 0)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-[10px] text-primary uppercase font-bold">IBS Total</div>
                        <div className="font-mono text-sm text-on-surface">{formatCurrency(document.totals.vIBS || 0)}</div>
                      </div>
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="text-[10px] text-primary uppercase font-bold">CBS Total</div>
                        <div className="font-mono text-sm text-on-surface">{formatCurrency(document.totals.vCBS || 0)}</div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'itens' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} /> Itens ({document.items.length})
                </h3>
              </div>

              <div className="space-y-4">
                {document.items.map((item, idx) => (
                  <div key={idx} className="border border-outline-variant rounded-lg overflow-hidden bg-surface">
                    {/* Item Header */}
                    <div className="bg-surface-container-low p-3 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-surface-container-highest flex items-center justify-center text-xs font-bold text-on-surface-variant">
                          {item.item_number}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-on-surface">{item.description}</div>
                          <div className="flex gap-3 mt-1 text-[10px] font-mono text-on-surface-variant items-center">
                            <span>CFOP: {item.cfop}</span>
                            {item.cfop_category && item.cfop_category !== 'OTHER' && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-surface-container-highest text-on-surface-variant text-[9px] font-bold tracking-wider">
                                {item.cfop_category}
                              </span>
                            )}
                            {item.rtc_impact === 'CREDIT' && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-tertiary/10 text-tertiary text-[9px] font-bold tracking-wider">
                                CRÉDITO
                              </span>
                            )}
                            {item.rtc_impact === 'DEBIT' && (
                              <span className="px-1.5 py-0.5 rounded-sm bg-error/10 text-error text-[9px] font-bold tracking-wider">
                                DÉBITO
                              </span>
                            )}
                            <span>NCM: {item.ncm}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm">{formatCurrency(item.net_value)}</div>
                        {item.discount_value > 0 && (
                          <div className="text-[10px] text-error line-through">Bruto: {formatCurrency(item.gross_value)}</div>
                        )}
                      </div>
                    </div>

                    {/* Taxes Grid */}
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Current Taxes */}
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 border-b border-outline-variant pb-1">
                          Tributos Atuais (Legado)
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant">
                            <div className="text-[9px] text-on-surface-variant mb-1">ICMS (CST: {item.taxes_current.icms_cst || '-'})</div>
                            <div className="flex justify-between font-mono">
                              <span>{item.taxes_current.icms_rate}%</span>
                              <span>{formatCurrency(item.taxes_current.icms_value || 0)}</span>
                            </div>
                          </div>
                          <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant">
                            <div className="text-[9px] text-on-surface-variant mb-1">PIS (CST: {item.taxes_current.pis_cst || '-'})</div>
                            <div className="flex justify-between font-mono">
                              <span>{item.taxes_current.pis_rate}%</span>
                              <span>{formatCurrency(item.taxes_current.pis_value || 0)}</span>
                            </div>
                          </div>
                          <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant">
                            <div className="text-[9px] text-on-surface-variant mb-1">COFINS (CST: {item.taxes_current.cofins_cst || '-'})</div>
                            <div className="flex justify-between font-mono">
                              <span>{item.taxes_current.cofins_rate}%</span>
                              <span>{formatCurrency(item.taxes_current.cofins_value || 0)}</span>
                            </div>
                          </div>
                          <div className="p-2 bg-surface-container-lowest rounded border border-outline-variant">
                            <div className="text-[9px] text-on-surface-variant mb-1">IPI (CST: {item.taxes_current.ipi_cst || '-'})</div>
                            <div className="flex justify-between font-mono">
                              <span>{item.taxes_current.ipi_rate}%</span>
                              <span>{formatCurrency(item.taxes_current.ipi_value || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* RTC Taxes */}
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 border-b border-primary/20 pb-1 flex items-center gap-1">
                          <Receipt size={12} /> Reforma Tributária (IBS/CBS)
                        </h4>
                        
                        {item.rtc.vIBS !== undefined || item.rtc.vCBS !== undefined ? (
                          <div className="space-y-3 text-xs">
                            <div className="flex gap-4 text-[10px] font-mono text-on-surface-variant">
                              <span>CST: <strong className="text-on-surface">{item.rtc.cst || '-'}</strong></span>
                              <span>cClassTrib: <strong className="text-on-surface">{item.rtc.c_class_trib || '-'}</strong></span>
                              <span>vBC: <strong className="text-on-surface">{formatCurrency(item.rtc.vBC || 0)}</strong></span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 bg-surface rounded border border-primary/10">
                                <div className="text-[9px] font-bold text-primary mb-1">IBS Total</div>
                                <div className="font-mono text-sm font-bold text-on-surface">{formatCurrency(item.rtc.vIBS || 0)}</div>
                                <div className="mt-2 space-y-1 text-[9px] font-mono text-on-surface-variant">
                                  <div className="flex justify-between">
                                    <span>UF ({item.rtc.pIBSUF || 0}%):</span>
                                    <span>{formatCurrency(item.rtc.vIBSUF || 0)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Mun ({item.rtc.pIBSMun || 0}%):</span>
                                    <span>{formatCurrency(item.rtc.vIBSMun || 0)}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-2 bg-surface rounded border border-primary/10">
                                <div className="text-[9px] font-bold text-primary mb-1">CBS Total</div>
                                <div className="font-mono text-sm font-bold text-on-surface">{formatCurrency(item.rtc.vCBS || 0)}</div>
                                <div className="mt-2 space-y-1 text-[9px] font-mono text-on-surface-variant">
                                  <div className="flex justify-between">
                                    <span>Alíquota:</span>
                                    <span>{item.rtc.pCBS || 0}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-on-surface-variant italic py-4 text-center">
                            Nenhuma tag &lt;IBSCBS&gt; encontrada neste item.
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
