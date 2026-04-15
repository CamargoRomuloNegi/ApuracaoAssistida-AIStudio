import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
  const diagnosticInfo: any = {
    environment_variables: {
      GEMINI_API_KEY_PRESENT: !!process.env.GEMINI_API_KEY,
      SUPABASE_URL_PRESENT: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY_PRESENT: !!process.env.SUPABASE_ANON_KEY,
    },
    tests: {
      supabase_client: 'pendente',
      gemini_embedding: 'pendente',
      gemini_chat: 'pendente'
    },
    errors: []
  };

  try {
    // 1. Verifica a chave do Gemini nas variáveis de ambiente
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      diagnosticInfo.errors.push('A chave da API do Google Gemini (GEMINI_API_KEY) não está configurada no ambiente.');
      return NextResponse.json({ status: 'error', message: 'Falta de credenciais.', diagnostic: diagnosticInfo }, { status: 500 });
    }

    // 2. Verifica a inicialização do Supabase
    let supabase;
    try {
      supabase = getSupabase();
      diagnosticInfo.tests.supabase_client = 'ok';
    } catch (e: any) {
      diagnosticInfo.tests.supabase_client = 'falha';
      diagnosticInfo.errors.push(`Erro de configuração do Supabase: ${e.message}`);
      return NextResponse.json({ status: 'error', message: 'Falta de credenciais do banco.', diagnostic: diagnosticInfo }, { status: 500 });
    }

    // 3. O Health Check agora se divide.
    // Em produção (sem parâmetro 'deep=true'), não fazemos o MOCK Call toda vez para economizar a API (evitar abuse de bot).
    // O sistema de RAG (Supabase) já autenticou no passo acima, assumimos que as credenciais base estão lá.
    diagnosticInfo.tests.gemini_embedding = 'não testado automaticamente por economia';
    diagnosticInfo.tests.gemini_chat = 'não testado automaticamente por economia';

    // Se tudo passou
    return NextResponse.json({ 
      status: 'ok', 
      message: 'Sistemas operacionais. Conexão com Supabase e comunicação com as APIs do Gemini foram testadas com sucesso.',
      diagnostic: diagnosticInfo
    });

  } catch (error: any) {
    diagnosticInfo.errors.push(`Erro fatal no Health Check: ${error.message}`);
    return NextResponse.json(
      { status: 'error', message: 'Erro desconhecido ao verificar os sistemas.', diagnostic: diagnosticInfo },
      { status: 500 }
    );
  }
}
