'use client';

import React, { useMemo } from 'react';
import { useFiscalStore } from '@/application/store/useFiscalStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, TrendingDown, Scale, Building2 } from 'lucide-react';

export default function RtcAnalysisPage() {
  const { documents, analyzedCnpjRoot } = useFiscalStore();

  const {
    totalCredits,
    totalDebits,
    balance,
    cfopData,
    cstData,
  } = useMemo(() => {
    let credits = 0;
    let debits = 0;
    
    const cfopMap: Record<string, { cfop: string; credit: number; debit: number }> = {};
    const cstMap: Record<string, { cst: string; credit: number; debit: number }> = {};

    documents.forEach(doc => {
      doc.items.forEach(item => {
        const itemTotalIbsCbs = (item.rtc.vIBS || 0) + (item.rtc.vCBS || 0);
        
        if (itemTotalIbsCbs > 0) {
          if (item.rtc_impact === 'CREDIT') {
            credits += itemTotalIbsCbs;
          } else if (item.rtc_impact === 'DEBIT') {
            debits += itemTotalIbsCbs;
          }

          // Aggregate by CFOP
          if (!cfopMap[item.cfop]) {
            cfopMap[item.cfop] = { cfop: item.cfop, credit: 0, debit: 0 };
          }
          if (item.rtc_impact === 'CREDIT') cfopMap[item.cfop].credit += itemTotalIbsCbs;
          if (item.rtc_impact === 'DEBIT') cfopMap[item.cfop].debit += itemTotalIbsCbs;

          // Aggregate by CST
          const cst = item.rtc.cst || 'N/A';
          if (!cstMap[cst]) {
            cstMap[cst] = { cst, credit: 0, debit: 0 };
          }
          if (item.rtc_impact === 'CREDIT') cstMap[cst].credit += itemTotalIbsCbs;
          if (item.rtc_impact === 'DEBIT') cstMap[cst].debit += itemTotalIbsCbs;
        }
      });
    });

    const cfopData = Object.values(cfopMap).sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit)).slice(0, 10);
    const cstData = Object.values(cstMap).sort((a, b) => (b.credit + b.debit) - (a.credit + a.debit));

    return {
      totalCredits: credits,
      totalDebits: debits,
      balance: credits - debits,
      cfopData,
      cstData,
    };
  }, [documents]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const pieData = [
    { name: 'Créditos', value: totalCredits, color: '#10b981' }, // Emerald 500
    { name: 'Débitos', value: totalDebits, color: '#ef4444' }, // Red 500
  ];

  if (documents.length === 0) {
    return (
      <div className="max-w-7xl mx-auto w-full space-y-8">
        <section className="flex flex-col gap-2">
          <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Análise RTC</h2>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Visão consolidada de apuração de Créditos e Débitos da Reforma Tributária do Consumo (IBS/CBS).
          </p>
        </section>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-12 text-center text-on-surface-variant">
          <div className="flex flex-col items-center gap-3">
            <FileText size={48} className="opacity-20" />
            <p className="text-lg font-medium">Nenhum documento processado.</p>
            <p className="text-sm opacity-60">Faça o upload de XMLs para visualizar a análise da RTC.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 pb-12">
      {/* Page Header */}
      <section className="flex flex-col gap-2">
        <h2 className="text-3xl font-headline font-extrabold text-on-surface tracking-tight">Análise RTC</h2>
        <p className="text-on-surface-variant text-sm max-w-2xl">
          Visão consolidada de apuração de Créditos e Débitos da Reforma Tributária do Consumo (IBS/CBS).
        </p>
      </section>

      {/* Context Bar */}
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 p-4 rounded-xl shadow-sm">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Building2 size={20} />
        </div>
        <div>
          <div className="text-xs font-bold text-primary uppercase tracking-wider">Empresa Analisada (Raiz CNPJ)</div>
          <div className="text-sm font-mono font-bold text-on-surface">
            {analyzedCnpjRoot || 'Não detectada'}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-tertiary">
            <TrendingUp size={64} />
          </div>
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total de Créditos</h3>
          <p className="text-3xl font-mono font-black text-tertiary">{formatCurrency(totalCredits)}</p>
          <p className="text-xs text-on-surface-variant mt-2">Soma de IBS/CBS com impacto de crédito.</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-error">
            <TrendingDown size={64} />
          </div>
          <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Total de Débitos</h3>
          <p className="text-3xl font-mono font-black text-error">{formatCurrency(totalDebits)}</p>
          <p className="text-xs text-on-surface-variant mt-2">Soma de IBS/CBS com impacto de débito.</p>
        </div>

        <div className={`p-6 rounded-xl border shadow-sm flex flex-col gap-2 relative overflow-hidden ${balance >= 0 ? 'bg-tertiary/10 border-tertiary/30' : 'bg-error/10 border-error/30'}`}>
          <div className={`absolute top-0 right-0 p-6 opacity-10 ${balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
            <Scale size={64} />
          </div>
          <h3 className={`text-xs font-bold uppercase tracking-widest ${balance >= 0 ? 'text-tertiary' : 'text-error'}`}>Saldo Apurado</h3>
          <p className={`text-3xl font-mono font-black ${balance >= 0 ? 'text-tertiary' : 'text-error'}`}>
            {formatCurrency(Math.abs(balance))}
            <span className="text-sm ml-2 font-body font-medium">{balance >= 0 ? '(Credor)' : '(Devedor)'}</span>
          </p>
          <p className={`text-xs mt-2 ${balance >= 0 ? 'text-tertiary/80' : 'text-error/80'}`}>Diferença entre créditos e débitos.</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proporção Crédito x Débito */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Proporção Crédito x Débito</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top CFOPs */}
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/10 shadow-sm flex flex-col gap-4">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Top 10 CFOPs por Impacto</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cfopData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                <XAxis dataKey="cfop" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis tickFormatter={(value) => `R$ ${value / 1000}k`} tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip 
                  formatter={(value: any) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px', color: '#fff' }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Legend />
                <Bar dataKey="credit" name="Crédito" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="debit" name="Débito" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CST Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest">Detalhamento por CST (RTC)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">
              <tr>
                <th className="px-6 py-4 font-medium">CST</th>
                <th className="px-6 py-4 font-medium text-right">Créditos Gerados</th>
                <th className="px-6 py-4 font-medium text-right">Débitos Gerados</th>
                <th className="px-6 py-4 font-medium text-right">Saldo Líquido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {cstData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                    Nenhum dado de CST encontrado com valores de IBS/CBS.
                  </td>
                </tr>
              ) : (
                cstData.map((row, idx) => {
                  const net = row.credit - row.debit;
                  return (
                    <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-on-surface">{row.cst}</td>
                      <td className="px-6 py-4 font-mono text-right text-tertiary">{formatCurrency(row.credit)}</td>
                      <td className="px-6 py-4 font-mono text-right text-error">{formatCurrency(row.debit)}</td>
                      <td className={`px-6 py-4 font-mono text-right font-bold ${net > 0 ? 'text-tertiary' : net < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                        {formatCurrency(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
