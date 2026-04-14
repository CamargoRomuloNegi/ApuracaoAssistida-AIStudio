import * as XLSX from 'xlsx';
import { FiscalDocument } from '@/domain/models/FiscalDocument';

export class ExportService {
  /**
   * Exports a list of FiscalDocuments to an Excel file with two sheets:
   * 1. Documentos (Header level data)
   * 2. Itens Analítico (Item level data, denormalized for Pivot Tables)
   */
  static exportToExcel(documents: FiscalDocument[], filename: string = 'extracao_fiscal.xlsx') {
    if (!documents || documents.length === 0) return;

    // Sheet 1: Documentos (Header level)
    const docsData = documents.map(doc => ({
      'Chave de Acesso': doc.access_key,
      'Tipo': doc.document_type,
      'Direção': doc.direction || 'UNKNOWN',
      'Finalidade': doc.purpose || 'UNKNOWN',
      'Data Emissão': this.formatDate(doc.issue_date),
      'Emitente CNPJ': doc.issuer.cnpj_cpf,
      'Emitente Nome': doc.issuer.name,
      'Destinatário CNPJ': doc.receiver.cnpj_cpf,
      'Destinatário Nome': doc.receiver.name,
      'Regime Tributário': doc.tax_regime,
      'Valor Total': doc.total_value,
      'Status': doc.status,
      'Total Base IBS/CBS': doc.totals.vBCIBSCBS || 0,
      'Total IBS': doc.totals.vIBS || 0,
      'Total CBS': doc.totals.vCBS || 0,
    }));

    // Sheet 2: Itens (Denormalized for Pivot Tables)
    const itemsData = documents.flatMap(doc => 
      doc.items.map(item => ({
        'Chave de Acesso': doc.access_key,
        'Tipo': doc.document_type,
        'Direção': doc.direction || 'UNKNOWN',
        'Finalidade': doc.purpose || 'UNKNOWN',
        'Data Emissão': this.formatDate(doc.issue_date),
        'Emitente CNPJ': doc.issuer.cnpj_cpf,
        'Destinatário CNPJ': doc.receiver.cnpj_cpf,
        'Item': item.item_number,
        'Descrição': item.description,
        'CFOP': item.cfop,
        'Categoria CFOP': item.cfop_category || 'OTHER',
        'Impacto RTC': item.rtc_impact || 'NEUTRAL',
        'NCM': item.ncm,
        'Valor Bruto': item.gross_value,
        'Desconto': item.discount_value,
        'Valor Líquido': item.net_value,
        'CST RTC': item.rtc.cst || '',
        'Base IBS/CBS': item.rtc.vBC || 0,
        'Alíq IBS UF': item.rtc.pIBSUF || 0,
        'Valor IBS UF': item.rtc.vIBSUF || 0,
        'Alíq IBS Mun': item.rtc.pIBSMun || 0,
        'Valor IBS Mun': item.rtc.vIBSMun || 0,
        'Valor IBS Total': item.rtc.vIBS || 0,
        'Alíq CBS': item.rtc.pCBS || 0,
        'Valor CBS': item.rtc.vCBS || 0,
      }))
    );

    const wb = XLSX.utils.book_new();
    
    // Create and append Documentos sheet
    const wsDocs = XLSX.utils.json_to_sheet(docsData);
    XLSX.utils.book_append_sheet(wb, wsDocs, 'Documentos');

    // Create and append Itens sheet
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(wb, wsItems, 'Itens (Analítico)');

    // Trigger download
    XLSX.writeFile(wb, filename);
  }

  private static formatDate(dateString: string): string {
    try {
      return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  }
}
