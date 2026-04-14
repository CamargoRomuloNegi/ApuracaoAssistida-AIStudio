import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Verifica a chave do Gemini explicitamente nas variáveis de ambiente
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'A chave da API do Google Gemini (GEMINI_API_KEY) não está configurada no ambiente.'
        },
        { status: 500 }
      );
    }

    // 2. Verifica as chaves e a inicialização do Supabase
    let supabase;
    try {
      supabase = getSupabase();
    } catch (e: any) {
      return NextResponse.json(
        { status: 'error', message: e.message || 'Erro de configuração do Supabase.' },
        { status: 500 }
      );
    }

    // Como as chaves estão instanciadas corretamente, confirmamos o health check
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Sistemas operacionais. Conexão com Supabase configurada e Gemini API Key presente.'
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message || 'Erro desconhecido ao verificar os sistemas.' },
      { status: 500 }
    );
  }
}
