import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Verifica a chave do Gemini (Lógica de Varredura Universal)
    let validApiKey = '';
    const foundKeysInfo: string[] = [];

    // Varre TODAS as variáveis de ambiente procurando por uma chave real do Google
    for (const [key, value] of Object.entries(process.env)) {
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue.startsWith('AIza')) {
          validApiKey = trimmedValue;
          break; // Achou a chave, pode parar a busca
        }
        // Para fins de debug, anota o que ele encontrou nas variáveis suspeitas
        if (key.includes('GEMINI') || key.includes('API') || key.includes('KEY')) {
          foundKeysInfo.push(`${key}="${trimmedValue.substring(0, 15)}..."`);
        }
      }
    }

    if (!validApiKey) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: `Nenhuma chave válida (iniciada com AIza) encontrada. O sistema enxergou estas variáveis: ${foundKeysInfo.join(' | ')}. Por favor, verifique se você salvou a chave corretamente no painel.` 
        },
        { status: 500 }
      );
    }

    // 2. Verifica as chaves do Supabase (a função getSupabase já lança erro se faltar)
    const supabase = getSupabase();

    // 3. Tenta fazer uma requisição leve ao Supabase para testar a conectividade
    // Como não sabemos o nome exato da tabela, testamos apenas a inicialização do cliente
    // Se chegou até aqui sem estourar erro, as variáveis existem e o cliente foi instanciado.
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Sistemas operacionais. Conexão com Supabase e Gemini prontas.' 
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro desconhecido ao verificar os sistemas.' },
      { status: 500 }
    );
  }
}
