import { FiscalDocument, ParseResult } from '@/domain/models/FiscalDocument';
import { ParserNFe } from './ParserNFe';
import { ParserCTe } from './ParserCTe';

export class ParserFactory {
  /**
   * Parses the XML content based on the detected document type.
   */
  static parse(xmlContent: string, type: 'NFE' | 'CTE' | 'NFSE' | 'UNKNOWN', filename: string): ParseResult {
    try {
      switch (type) {
        case 'NFE': {
          const parser = new ParserNFe();
          return parser.parse(xmlContent);
        }
        case 'CTE': {
          const parser = new ParserCTe();
          return parser.parse(xmlContent);
        }
        case 'NFSE':
          // Placeholder for NFSe parser
          return {
            document: null,
            success: false,
            logs: [{ level: 'ERROR', category: 'PARSE', message: `Parser para NFS-e ainda não implementado. Arquivo: ${filename}` }],
          };
        case 'UNKNOWN':
        default:
          return {
            document: null,
            success: false,
            logs: [{ level: 'ERROR', category: 'PARSE', message: `Tipo de documento desconhecido ou não suportado. Arquivo: ${filename}` }],
          };
      }
    } catch (error) {
      console.error(`Error parsing document ${filename}:`, error);
      return {
        document: null,
        success: false,
        logs: [{ level: 'FATAL', category: 'PARSE', message: `Erro fatal ao processar o arquivo ${filename}: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }],
      };
    }
  }
}
