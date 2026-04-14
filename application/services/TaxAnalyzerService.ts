import { FiscalDocument, DocumentDirection, CfopCategory, RtcImpact, DocumentItem } from '@/domain/models/FiscalDocument';

export class TaxAnalyzerService {
  
  /**
   * Detects the most frequent CNPJ root (first 8 digits) among all issuers and receivers.
   */
  static detectMainCnpjRoot(documents: FiscalDocument[]): string | null {
    if (!documents || documents.length === 0) return null;

    const rootCounts: Record<string, number> = {};

    documents.forEach(doc => {
      const issuerRoot = this.extractRoot(doc.issuer.cnpj_cpf);
      const receiverRoot = this.extractRoot(doc.receiver.cnpj_cpf);

      if (issuerRoot && issuerRoot !== 'UNKNOWN') {
        rootCounts[issuerRoot] = (rootCounts[issuerRoot] || 0) + 1;
      }
      if (receiverRoot && receiverRoot !== 'UNKNOWN') {
        rootCounts[receiverRoot] = (rootCounts[receiverRoot] || 0) + 1;
      }
    });

    let maxCount = 0;
    let mainRoot: string | null = null;

    for (const [root, count] of Object.entries(rootCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mainRoot = root;
      }
    }

    return mainRoot;
  }

  private static extractRoot(cnpjCpf: string): string | null {
    const clean = cnpjCpf.replace(/\D/g, '');
    if (clean.length === 14) {
      return clean.substring(0, 8);
    }
    // If it's CPF (11 digits), we can use the whole CPF as root for simplicity, 
    // though usually companies are analyzed.
    if (clean.length === 11) {
      return clean;
    }
    return null;
  }

  /**
   * Enriches a list of documents based on the analyzed CNPJ root.
   */
  static enrichDocuments(documents: FiscalDocument[], analyzedCnpjRoot: string): FiscalDocument[] {
    return documents.map(doc => this.enrichDocument(doc, analyzedCnpjRoot));
  }

  static enrichDocument(doc: FiscalDocument, analyzedCnpjRoot: string): FiscalDocument {
    const issuerRoot = this.extractRoot(doc.issuer.cnpj_cpf);
    const receiverRoot = this.extractRoot(doc.receiver.cnpj_cpf);

    let direction: DocumentDirection = 'UNKNOWN';

    if (issuerRoot === analyzedCnpjRoot) {
      direction = 'OUTBOUND';
    } else if (receiverRoot === analyzedCnpjRoot) {
      direction = 'INBOUND';
    }

    const enrichedItems = doc.items.map(item => this.enrichItem(item, direction));

    return {
      ...doc,
      direction,
      items: enrichedItems
    };
  }

  private static enrichItem(item: DocumentItem, direction: DocumentDirection): DocumentItem {
    const cfopStr = item.cfop.replace(/\D/g, '');
    let cfop_category: CfopCategory = 'OTHER';

    if (cfopStr.length === 4) {
      const firstDigit = cfopStr.charAt(0);
      const suffix = cfopStr.substring(1);

      // Basic CFOP categorization logic
      if (['1', '2', '3', '5', '6', '7'].includes(firstDigit)) {
        if (suffix.startsWith('1') || suffix.startsWith('4')) {
          // .1xx usually sales/purchases, .4xx usually industrialization/sales
          cfop_category = 'SALE';
        } else if (suffix.startsWith('2')) {
          // .2xx usually returns/annulments
          cfop_category = 'RETURN';
        } else if (suffix.startsWith('5')) {
          // .5xx usually transfers
          cfop_category = 'TRANSFER';
        } else if (suffix.startsWith('9')) {
          // .9xx usually others (remittances, gifts, etc)
          cfop_category = 'OTHER';
        }
      }
    }

    let rtc_impact: RtcImpact = 'NEUTRAL';

    if (direction === 'OUTBOUND') {
      if (cfop_category === 'SALE') {
        rtc_impact = 'DEBIT'; // Selling -> Obligation to pay
      } else if (cfop_category === 'RETURN') {
        rtc_impact = 'CREDIT'; // Returning a purchase -> Reversing the debit (taking credit)
      }
    } else if (direction === 'INBOUND') {
      if (cfop_category === 'SALE') {
        rtc_impact = 'CREDIT'; // Purchasing -> Taking credit
      } else if (cfop_category === 'RETURN') {
        rtc_impact = 'DEBIT'; // Customer returning -> Reversing the credit (paying debit)
      }
    }

    return {
      ...item,
      cfop_category,
      rtc_impact
    };
  }
}
