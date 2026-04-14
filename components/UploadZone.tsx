'use client';

import { useState, useCallback } from 'react';
import { UploadCloud, FolderOpen, FileCheck2, AlertCircle, Clock, FileText, RefreshCw, Shield, CheckSquare, Zap, Database } from 'lucide-react';
import JSZip from 'jszip';
import { DocumentDetector } from '@/infrastructure/parsers/DocumentDetector';
import { ParserFactory } from '@/infrastructure/parsers/ParserFactory';
import { FiscalDocument, ParseResult } from '@/domain/models/FiscalDocument';
import { useFiscalStore } from '@/application/store/useFiscalStore';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'PENDING' | 'PROCESSING' | 'VALID' | 'ERROR';
  type: 'XML' | 'ZIP';
  date: Date;
  result?: ParseResult;
  errorMessage?: string;
}

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [stats, setStats] = useState({ valid: 0, error: 0, processing: 0 });
  
  // Zustand Store Actions
  const addDocument = useFiscalStore(state => state.addDocument);
  const addLogs = useFiscalStore(state => state.addLogs);

  const processXml = async (xmlString: string, fileName: string): Promise<ParseResult> => {
    try {
      const type = DocumentDetector.detectType(xmlString);
      
      if (type === 'UNKNOWN') {
        return { document: null, logs: [{ level: 'ERROR', category: 'SCHEMA', message: 'Tipo de documento não reconhecido.' }], success: false };
      }

      const result = ParserFactory.parse(xmlString, type, fileName);
      
      // Save to in-memory store if successful
      if (result.document) {
        addDocument(result.document);
      }
      if (result.logs && result.logs.length > 0) {
        addLogs(result.logs);
      }
      
      return result;
    } catch (error: any) {
      return { document: null, logs: [{ level: 'FATAL', category: 'PARSE', message: error.message }], success: false };
    }
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: UploadedFile[] = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: f.size,
      status: 'PENDING',
      type: f.name.endsWith('.zip') ? 'ZIP' : 'XML',
      date: new Date()
    }));

    setFiles(prev => [...newFiles, ...prev]);
    setStats(s => ({ ...s, processing: s.processing + newFiles.length }));

    for (const fileObj of newFiles) {
      const file = Array.from(fileList).find(f => f.name === fileObj.name);
      if (!file) continue;

      updateFileStatus(fileObj.id, 'PROCESSING');

      try {
        if (fileObj.type === 'ZIP') {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          let zipValid = 0;
          let zipError = 0;

          // Process each XML inside ZIP
          const xmlFiles = Object.values(zipContent.files).filter(f => f.name.endsWith('.xml'));
          
          for (const zipFile of xmlFiles) {
            const xmlString = await zipFile.async('string');
            const result = await processXml(xmlString, zipFile.name);
            if (result.success) zipValid++;
            else zipError++;
          }

          updateFileStatus(fileObj.id, zipError === 0 ? 'VALID' : 'ERROR', undefined, `${zipValid} válidos, ${zipError} erros`);
          setStats(s => ({ ...s, valid: s.valid + zipValid, error: s.error + zipError, processing: s.processing - 1 }));

        } else {
          // Process single XML
          const text = await file.text();
          const result = await processXml(text, file.name);
          
          if (result.success) {
            updateFileStatus(fileObj.id, 'VALID', result);
            setStats(s => ({ ...s, valid: s.valid + 1, processing: s.processing - 1 }));
          } else {
            updateFileStatus(fileObj.id, 'ERROR', result, result.logs[0]?.message);
            setStats(s => ({ ...s, error: s.error + 1, processing: s.processing - 1 }));
          }
        }
      } catch (error: any) {
        updateFileStatus(fileObj.id, 'ERROR', undefined, error.message);
        setStats(s => ({ ...s, error: s.error + 1, processing: s.processing - 1 }));
      }
    }
  };

  const updateFileStatus = (id: string, status: UploadedFile['status'], result?: ParseResult, errorMessage?: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status, result, errorMessage: errorMessage || f.errorMessage } : f));
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
      {/* Dropzone Area */}
      <div className="xl:col-span-2 space-y-6">
        <label 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`group relative bg-surface-container-lowest border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[400px] ${isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-outline-variant/30 hover:border-primary/40 hover:bg-primary/5'}`}
        >
          <input type="file" multiple accept=".xml,.zip" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 ${isDragging ? 'bg-primary text-white scale-110' : 'bg-surface-container text-primary group-hover:scale-110'}`}>
            <UploadCloud size={40} />
          </div>
          <h3 className="text-xl font-headline font-bold text-on-surface mb-2">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste seus arquivos XML aqui'}
          </h3>
          <p className="text-on-surface-variant text-sm mb-8">
            Ou clique para navegar em seus arquivos locais<br/>
            <span className="text-[10px] font-medium opacity-60">Suporta múltiplos arquivos .xml ou .zip</span>
          </p>
          <div className="flex gap-4">
            <div className="px-6 py-2.5 bg-gradient-to-b from-primary to-primary-dim text-white rounded-md font-bold text-sm shadow-sm flex items-center gap-2 hover:shadow-md transition-all pointer-events-none">
              <FolderOpen size={18} />
              Selecionar Arquivos
            </div>
          </div>
        </label>

        {/* Batch Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-tertiary/10 flex items-center justify-center text-tertiary">
              <FileCheck2 size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Válidos</p>
              <p className="text-xl font-headline font-black text-on-surface">{stats.valid}</p>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 shadow-sm flex items-center gap-4 border-l-4 border-l-error">
            <div className="w-10 h-10 rounded-md bg-error/10 flex items-center justify-center text-error">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Erros de Esquema</p>
              <p className="text-xl font-headline font-black text-on-surface">{stats.error}</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-lg border border-outline-variant/10 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">Em Fila</p>
              <p className="text-xl font-headline font-black text-on-surface">{stats.processing}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Sidebar */}
      <div className="bg-surface-container-low rounded-xl p-6 h-full flex flex-col gap-6 border border-outline-variant/10">
        <div className="flex items-center justify-between">
          <h4 className="font-headline font-bold text-on-surface">Uploads Recentes</h4>
          <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline" onClick={() => { setFiles([]); setStats({valid:0, error:0, processing:0}); }}>Limpar</span>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[500px] no-scrollbar">
          {files.length === 0 && (
            <p className="text-xs text-on-surface-variant text-center py-8">Nenhum arquivo processado ainda.</p>
          )}
          
          {files.map(file => (
            <div key={file.id} className={`bg-surface-container-lowest p-4 rounded-lg border border-outline-variant/10 flex flex-col gap-3 transition-all ${file.status === 'ERROR' ? 'border-l-2 border-l-error' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {file.status === 'PROCESSING' ? (
                    <RefreshCw className="text-primary animate-spin" size={20} />
                  ) : file.status === 'ERROR' ? (
                    <AlertCircle className="text-error" size={20} />
                  ) : (
                    <FileText className="text-on-surface-variant" size={20} />
                  )}
                  <div>
                    <p className="text-xs font-bold truncate w-32 text-on-surface" title={file.name}>{file.name}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {(file.size / 1024).toFixed(1)} KB • {file.date.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {file.status === 'VALID' && <span className="px-2 py-0.5 rounded-sm bg-tertiary-container text-on-tertiary-container text-[9px] font-black uppercase tracking-tighter">Validado</span>}
                {file.status === 'ERROR' && <span className="px-2 py-0.5 rounded-sm bg-error-container text-on-error-container text-[9px] font-black uppercase tracking-tighter">Erro</span>}
                {file.status === 'PROCESSING' && <span className="text-[10px] font-black text-primary">Processando</span>}
              </div>
              
              {file.errorMessage && (
                <p className="text-[10px] text-error font-medium leading-tight bg-error/5 p-2 rounded break-words">
                  {file.errorMessage}
                </p>
              )}
              
              {file.result?.document && (
                <div className="text-[10px] text-on-surface-variant bg-surface-container-low p-2 rounded mt-1">
                  <span className="font-bold text-on-surface">{file.result.document.document_type}</span> • {file.result.document.issuer.cnpj_cpf}
                  <br/>
                  <span className="font-mono text-[9px]">{file.result.document.access_key}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-outline-variant/20">
          <div className="flex items-center gap-4 text-on-surface-variant">
            <Database size={24} />
            <div className="flex-1">
              <p className="text-xs font-bold text-on-surface">Armazenamento Local (Sessão)</p>
              <div className="w-full bg-surface-container h-1.5 rounded-full mt-1">
                <div className="bg-primary h-full w-[100%] rounded-full"></div>
              </div>
              <p className="text-[9px] mt-1">Processamento em memória do navegador</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
