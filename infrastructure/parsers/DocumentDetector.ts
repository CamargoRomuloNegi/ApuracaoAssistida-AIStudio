import { XMLParser } from 'fast-xml-parser';

export class DocumentDetector {
  private static parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  /**
   * Detects the type of fiscal document from its XML content.
   * Returns 'NFE', 'CTE', 'NFSE', or 'UNKNOWN'.
   */
  static detectType(xmlContent: string): 'NFE' | 'CTE' | 'NFSE' | 'UNKNOWN' {
    try {
      // Fast check using regex for common root tags before full parsing
      if (/<nfeProc/i.test(xmlContent) || /<NFe/i.test(xmlContent)) {
        return 'NFE';
      }
      if (/<cteProc/i.test(xmlContent) || /<CTe/i.test(xmlContent)) {
        return 'CTE';
      }
      if (/<CompNfse/i.test(xmlContent) || /<ConsultarNfseResposta/i.test(xmlContent) || /<Nfse/i.test(xmlContent)) {
        return 'NFSE';
      }

      // Fallback to full parsing if regex fails
      const jsonObj = this.parser.parse(xmlContent);
      
      if (jsonObj.nfeProc || jsonObj.NFe) return 'NFE';
      if (jsonObj.cteProc || jsonObj.CTe) return 'CTE';
      if (jsonObj.CompNfse || jsonObj.ConsultarNfseResposta || jsonObj.Nfse) return 'NFSE';

      return 'UNKNOWN';
    } catch (error) {
      console.error('Error detecting document type:', error);
      return 'UNKNOWN';
    }
  }
}
