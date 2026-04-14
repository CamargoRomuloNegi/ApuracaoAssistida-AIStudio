import { XMLParser } from 'fast-xml-parser';
import { FiscalDocument, ParseResult, ProcessingLog, TaxRegime, Participant, DocumentTotals, ItemTaxesCurrent } from '@/domain/models/FiscalDocument';
import { IXmlParser } from './ParserNFe';

export class ParserCTe implements IXmlParser {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      isArray: (name) => {
        // Force 'Comp' (components of the service value) and 'infNFe' (referenced keys) to be arrays
        if (name === 'Comp' || name === 'infNFe') return true;
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
      uf: node.enderEmit?.UF || node.enderDest?.UF || node.enderReme?.UF || undefined
    };
  }

  parse(xmlString: string): ParseResult {
    const logs: ProcessingLog[] = [];
    
    try {
      const jsonObj = this.parser.parse(xmlString);
      
      // Navigate to the core CTe node
      const cteNode = jsonObj.cteProc ? jsonObj.cteProc.CTe : jsonObj.CTe;
      
      if (!cteNode || !cteNode.infCte) {
        logs.push({ level: 'FATAL', category: 'SCHEMA', message: 'Nó principal infCte não encontrado.' });
        return { document: null, logs, success: false };
      }

      const infCte = cteNode.infCte;
      
      // 1. Extract Header Data
      const accessKey = infCte['@_Id'] ? String(infCte['@_Id']).replace('CTe', '') : 'UNKNOWN';
      const version = infCte['@_versao'] || 'UNKNOWN';
      const issueDate = infCte.ide?.dhEmi || new Date().toISOString();
      
      const finCTe = infCte.ide?.finCTe;
      let purpose: 'NORMAL' | 'COMPLEMENTAR' | 'AJUSTE' | 'DEVOLUCAO' | 'UNKNOWN' = 'UNKNOWN';
      if (finCTe === 0) purpose = 'NORMAL';
      else if (finCTe === 1) purpose = 'COMPLEMENTAR';
      else if (finCTe === 2) purpose = 'AJUSTE'; // Anulação mapped to Ajuste for simplicity
      else if (finCTe === 3) purpose = 'NORMAL'; // Substituto mapped to Normal

      const issuer = this.extractParticipant(infCte.emit);
      const receiver = this.extractParticipant(infCte.dest);
      const sender = this.extractParticipant(infCte.rem);
      
      const totalValue = parseFloat(infCte.vPrest?.vTPrest || '0');
      
      // Extract Document-Level Taxes (CTe usually has taxes at the document level, not per component)
      const imp = infCte.imp || {};
      const icmsNode = imp.ICMS ? Object.values(imp.ICMS)[0] as any : {};
      
      const documentIcmsValue = parseFloat(icmsNode.vICMS || '0');
      const documentIcmsBase = parseFloat(icmsNode.vBC || '0');
      const documentIcmsRate = parseFloat(icmsNode.pICMS || '0');
      const documentIcmsCst = String(icmsNode.CST || icmsNode.CSOSN || '');
      
      // Extract RTC (IBS/CBS) for CTe (usually at document level under imp)
      const rtcNode = imp.IBSCBS || {};
      const gIBSCBS = rtcNode.gIBSCBS || {};
      const gIBSUF = gIBSCBS.gIBSUF || {};
      const gIBSMun = gIBSCBS.gIBSMun || {};
      const gCBS = gIBSCBS.gCBS || {};

      const documentRtc = {
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

      const totals: DocumentTotals = {
        vProd: totalValue, // In CTe, the service value is the main value
        vDesc: 0, // CTe doesn't typically have a global discount field in the same way
        vFrete: totalValue, // The whole document is freight
        vSeg: 0,
        vOutro: 0,
        vTotTrib: parseFloat(imp.vTotTrib || '0'),
        vICMS: documentIcmsValue,
        vPIS: 0, // PIS/COFINS are often not detailed in the CTe XML in the same way as NFe, unless specific groups are used
        vCOFINS: 0,
        vBCIBSCBS: documentRtc.vBC,
        vIBS: documentRtc.vIBS,
        vCBS: documentRtc.vCBS,
      };
      
      // Tax Regime (CRT: 1 = Simples Nacional, 2 = Simples excesso, 3 = Regime Normal)
      const crt = infCte.emit?.CRT;
      let taxRegime: TaxRegime = 'UNKNOWN';
      if (crt === 1 || crt === 2) taxRegime = 'SIMPLES_NACIONAL';
      else if (crt === 3) taxRegime = 'RPA';

      // 2. Extract Items (Service Components for CTe)
      const items = [];
      const compArray = infCte.vPrest?.Comp || [];
      
      // If there are no components, we create a generic one to hold the total value and taxes
      if (compArray.length === 0) {
        compArray.push({
          xNome: 'Frete',
          vComp: totalValue
        });
      }
      
      let itemNumber = 1;
      for (const comp of compArray) {
        const description = comp.xNome || 'Componente do Frete';
        const grossValue = parseFloat(comp.vComp || '0');
        
        // CTe doesn't have NCM/CFOP per component usually, they are at the document level
        const cfop = String(infCte.ide?.CFOP || '');
        
        // We map the document-level ICMS to the first component to avoid losing the data, 
        // or distribute it. For simplicity in this prototype, we attach it to the first item.
        const taxes_current: ItemTaxesCurrent = itemNumber === 1 ? {
          icms_cst: documentIcmsCst,
          icms_base: documentIcmsBase,
          icms_rate: documentIcmsRate,
          icms_value: documentIcmsValue,
        } : {};
        
        // Similarly, we map the document-level RTC to the first component
        const rtc = itemNumber === 1 ? documentRtc : {};

        items.push({
          item_number: itemNumber++,
          description,
          cfop,
          ncm: 'N/A', // CTe is a service, NCM doesn't apply directly to the freight component
          gross_value: grossValue,
          discount_value: 0,
          net_value: grossValue,
          taxes_current,
          rtc
        });
      }

      // 3. Extract Referenced Keys (NFe)
      const referenced_keys: string[] = [];
      const infDoc = infCte.infCTeNorm?.infDoc;
      if (infDoc && infDoc.infNFe) {
        for (const nfe of infDoc.infNFe) {
          if (nfe.chave) referenced_keys.push(String(nfe.chave));
        }
      }

      const document: FiscalDocument = {
        access_key: accessKey,
        document_type: 'CTE',
        version,
        issue_date: issueDate,
        purpose,
        issuer,
        receiver,
        sender,
        tax_regime: taxRegime,
        total_value: totalValue,
        totals,
        status: logs.some(l => l.level === 'ERROR' || l.level === 'FATAL') ? 'SCHEMA_ERROR' : 'VALID',
        items,
        referenced_keys,
        raw_xml: xmlString
      };

      return { document, logs, success: true };

    } catch (error: any) {
      logs.push({ level: 'FATAL', category: 'PARSE', message: `Erro crítico ao fazer parse do CT-e: ${error.message}` });
      return { document: null, logs, success: false };
    }
  }
}
