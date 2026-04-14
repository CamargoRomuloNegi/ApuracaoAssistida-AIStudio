import { XMLParser } from 'fast-xml-parser';
import { FiscalDocument, ParseResult, ProcessingLog, TaxRegime, Participant, DocumentTotals, ItemTaxesCurrent } from '@/domain/models/FiscalDocument';

export interface IXmlParser {
  parse(xmlString: string): ParseResult;
}

export class ParserNFe implements IXmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      isArray: (name, jpath, isLeafNode, isAttribute) => {
        // Force 'det' (items) to always be an array even if there is only 1 item
        if (name === 'det') return true;
        return false;
      }
    });
  }

  private extractParticipant(node: any): Participant {
    if (!node) return { cnpj_cpf: 'UNKNOWN', name: 'UNKNOWN' };
    return {
      cnpj_cpf: String(node.CNPJ || node.CPF || 'UNKNOWN'),
      name: String(node.xNome || 'UNKNOWN'),
      ie: node.IE ? String(node.IE) : undefined,
      uf: node.enderEmit?.UF || node.enderDest?.UF || undefined
    };
  }

  parse(xmlString: string): ParseResult {
    const logs: ProcessingLog[] = [];
    
    try {
      const jsonObj = this.parser.parse(xmlString);
      
      // Navigate to the core NFe node (handle both nfeProc and raw NFe)
      const nfeNode = jsonObj.nfeProc ? jsonObj.nfeProc.NFe : jsonObj.NFe;
      
      if (!nfeNode || !nfeNode.infNFe) {
        logs.push({ level: 'FATAL', category: 'SCHEMA', message: 'Nó principal infNFe não encontrado.' });
        return { document: null, logs, success: false };
      }

      const infNFe = nfeNode.infNFe;
      
      // 1. Extract Header Data
      const accessKey = infNFe['@_Id'] ? String(infNFe['@_Id']).replace('NFe', '') : 'UNKNOWN';
      const version = infNFe['@_versao'] || 'UNKNOWN';
      const issueDate = infNFe.ide?.dhEmi || infNFe.ide?.dEmi || new Date().toISOString();
      
      const finNFe = infNFe.ide?.finNFe;
      let purpose: 'NORMAL' | 'COMPLEMENTAR' | 'AJUSTE' | 'DEVOLUCAO' | 'UNKNOWN' = 'UNKNOWN';
      if (finNFe === 1) purpose = 'NORMAL';
      else if (finNFe === 2) purpose = 'COMPLEMENTAR';
      else if (finNFe === 3) purpose = 'AJUSTE';
      else if (finNFe === 4) purpose = 'DEVOLUCAO';

      const issuer = this.extractParticipant(infNFe.emit);
      const receiver = this.extractParticipant(infNFe.dest);
      
      const totalNode = infNFe.total?.ICMSTot || {};
      const totalValue = parseFloat(totalNode.vNF || '0');
      
      // Extract RTC Totals
      const rtcTotalNode = infNFe.total?.IBSCBSTot || {};
      const gIBS = rtcTotalNode.gIBS || {};
      const gCBS = rtcTotalNode.gCBS || {};
      
      const totals: DocumentTotals = {
        vProd: parseFloat(totalNode.vProd || '0'),
        vDesc: parseFloat(totalNode.vDesc || '0'),
        vFrete: parseFloat(totalNode.vFrete || '0'),
        vSeg: parseFloat(totalNode.vSeg || '0'),
        vOutro: parseFloat(totalNode.vOutro || '0'),
        vTotTrib: parseFloat(totalNode.vTotTrib || '0'),
        vICMS: parseFloat(totalNode.vICMS || '0'),
        vPIS: parseFloat(totalNode.vPIS || '0'),
        vCOFINS: parseFloat(totalNode.vCOFINS || '0'),
        vBCIBSCBS: rtcTotalNode.vBCIBSCBS ? parseFloat(rtcTotalNode.vBCIBSCBS) : undefined,
        vIBS: gIBS.vIBS ? parseFloat(gIBS.vIBS) : undefined,
        vCBS: gCBS.vCBS ? parseFloat(gCBS.vCBS) : undefined,
      };
      
      // Tax Regime (CRT: 1 = Simples Nacional, 2 = Simples excesso, 3 = Regime Normal)
      const crt = infNFe.emit?.CRT;
      let taxRegime: TaxRegime = 'UNKNOWN';
      if (crt === 1 || crt === 2) taxRegime = 'SIMPLES_NACIONAL';
      else if (crt === 3) taxRegime = 'RPA'; // Simplified assumption for prototype

      // 2. Extract Items
      const items = [];
      const detArray = infNFe.det || [];
      
      for (const det of detArray) {
        const prod = det.prod || {};
        const imposto = det.imposto || {};
        
        // Extract basic product info
        const itemNumber = parseInt(det['@_nItem'] || '0', 10);
        const description = prod.xProd || 'Sem descrição';
        const cfop = String(prod.CFOP || '');
        const ncm = String(prod.NCM || '');
        const grossValue = parseFloat(prod.vProd || '0');
        const discountValue = parseFloat(prod.vDesc || '0');
        const netValue = grossValue - discountValue;

        // Extract Current Taxes (ICMS, PIS, COFINS, IPI)
        const icmsNode = imposto.ICMS ? Object.values(imposto.ICMS)[0] as any : {};
        const pisNode = imposto.PIS ? Object.values(imposto.PIS)[0] as any : {};
        const cofinsNode = imposto.COFINS ? Object.values(imposto.COFINS)[0] as any : {};
        const ipiNode = imposto.IPI ? (imposto.IPI.IPITrib || imposto.IPI.IPINT || {}) : {};

        const taxes_current: ItemTaxesCurrent = {
          icms_cst: String(icmsNode.CST || icmsNode.CSOSN || ''),
          icms_base: parseFloat(icmsNode.vBC || '0'),
          icms_rate: parseFloat(icmsNode.pICMS || '0'),
          icms_value: parseFloat(icmsNode.vICMS || '0'),
          
          pis_cst: String(pisNode.CST || ''),
          pis_base: parseFloat(pisNode.vBC || '0'),
          pis_rate: parseFloat(pisNode.pPIS || '0'),
          pis_value: parseFloat(pisNode.vPIS || '0'),
          
          cofins_cst: String(cofinsNode.CST || ''),
          cofins_base: parseFloat(cofinsNode.vBC || '0'),
          cofins_rate: parseFloat(cofinsNode.pCOFINS || '0'),
          cofins_value: parseFloat(cofinsNode.vCOFINS || '0'),
          
          ipi_cst: String(ipiNode.CST || ''),
          ipi_base: parseFloat(ipiNode.vBC || '0'),
          ipi_rate: parseFloat(ipiNode.pIPI || '0'),
          ipi_value: parseFloat(ipiNode.vIPI || '0')
        };

        // 3. Extract RTC (IBS/CBS) - Based on the exact XML structure provided for IBSCBS
        const rtcNode = imposto.IBSCBS || {};
        const gIBSCBS = rtcNode.gIBSCBS || {};
        const gIBSUF = gIBSCBS.gIBSUF || {};
        const gIBSMun = gIBSCBS.gIBSMun || {};
        const gCBS = gIBSCBS.gCBS || {};

        const rtc = {
          cst: rtcNode.CST !== undefined ? String(rtcNode.CST).padStart(3, '0') : undefined,
          c_class_trib: rtcNode.cClassTrib !== undefined ? String(rtcNode.cClassTrib).padStart(6, '0') : undefined,
          vBC: parseFloat(gIBSCBS.vBC || '0'),
          pIBSUF: parseFloat(gIBSUF.pIBSUF || '0'),
          vIBSUF: parseFloat(gIBSUF.vIBSUF || '0'),
          pIBSMun: parseFloat(gIBSMun.pIBSMun || '0'),
          vIBSMun: parseFloat(gIBSMun.vIBSMun || '0'),
          vIBS: parseFloat(gIBSCBS.vIBS || '0'),
          pCBS: parseFloat(gCBS.pCBS || '0'),
          vCBS: parseFloat(gCBS.vCBS || '0'),
        };

        // Business Rule Validation (RF05)
        if (taxRegime !== 'SIMPLES_NACIONAL' && (!rtc.cst && rtc.vIBS === 0 && rtc.vCBS === 0)) {
          logs.push({ 
            level: 'WARN', 
            category: 'BUSINESS_RULE', 
            message: `Item ${itemNumber}: Ausência de campos IBS/CBS em regime normal.` 
          });
        }

        items.push({
          item_number: itemNumber,
          description,
          cfop,
          ncm,
          gross_value: grossValue,
          discount_value: discountValue,
          net_value: netValue,
          taxes_current,
          rtc
        });
      }

      const document: FiscalDocument = {
        access_key: accessKey,
        document_type: 'NFE',
        version,
        issue_date: issueDate,
        purpose,
        issuer,
        receiver,
        tax_regime: taxRegime,
        total_value: totalValue,
        totals,
        status: logs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? 'SCHEMA_ERROR' : 'VALID',
        items,
        raw_xml: xmlString // Keep original for audit
      };

      return { document, logs, success: true };

    } catch (error: any) {
      logs.push({ level: 'FATAL', category: 'PARSE', message: `Erro crítico ao fazer parse do XML: ${error.message}` });
      return { document: null, logs, success: false };
    }
  }
}
