import { create } from 'zustand';
import { FiscalDocument, ProcessingLog } from '@/domain/models/FiscalDocument';
import { TaxAnalyzerService } from '@/application/services/TaxAnalyzerService';

interface FiscalStore {
  documents: FiscalDocument[];
  logs: ProcessingLog[];
  analyzedCnpjRoot: string | null;
  addDocument: (doc: FiscalDocument) => void;
  addLogs: (newLogs: ProcessingLog[]) => void;
  setAnalyzedCnpjRoot: (cnpjRoot: string | null) => void;
  clearAll: () => void;
}

export const useFiscalStore = create<FiscalStore>((set) => ({
  documents: [],
  logs: [],
  analyzedCnpjRoot: null,
  addDocument: (doc) => set((state) => {
    // Prevent duplicate access keys in memory
    if (state.documents.some(d => d.access_key === doc.access_key)) {
      return state;
    }
    
    // Auto-enrich if we already have a root
    let enrichedDoc = doc;
    if (state.analyzedCnpjRoot) {
      enrichedDoc = TaxAnalyzerService.enrichDocument(doc, state.analyzedCnpjRoot);
    }

    return { documents: [enrichedDoc, ...state.documents] };
  }),
  addLogs: (newLogs) => set((state) => ({ logs: [...newLogs, ...state.logs] })),
  setAnalyzedCnpjRoot: (cnpjRoot) => set((state) => {
    if (!cnpjRoot) return { analyzedCnpjRoot: null };
    
    // Re-enrich all documents with the new root
    const enrichedDocs = TaxAnalyzerService.enrichDocuments(state.documents, cnpjRoot);
    return { analyzedCnpjRoot: cnpjRoot, documents: enrichedDocs };
  }),
  clearAll: () => set({ documents: [], logs: [], analyzedCnpjRoot: null }),
}));
