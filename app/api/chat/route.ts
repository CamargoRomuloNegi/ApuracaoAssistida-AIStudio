import { GoogleGenAI } from '@google/genai';
import { getSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// Controle de taxa (Rate Limiting) em memória simples para evitar abusos na camada gratuita
const rateLimit = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 15;

export async function POST(req: Request) {
  try {
    // 1. Rate Limiting Básico
    const ip = req.headers.get('x-forwarded-for') || 'anonymous_user';
    const now = Date.now();
    const userRequests = rateLimit.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < 60000); // Últimos 60 segundos
    
    if (recentRequests.length >= MAX_REQUESTS_PER_MINUTE) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Por favor, aguarde um minuto para fazer novas perguntas.' },
        { status: 429 }
      );
    }
    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);

    // 2. Validação da Mensagem
    const { message } = await req.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem inválida ou vazia.' }, { status: 400 });
    }

    // 3. Inicialização dos Clientes com a variável de ambiente correta
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('A chave da API do Google Gemini (GEMINI_API_KEY) não está configurada.');
    }
    
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Tratamos a inicialização do supabase para lidar com o erro de configuração e avisar o usuário
    let supabase;
    try {
      supabase = getSupabase();
    } catch (e: any) {
      throw new Error('Serviço de RAG indisponível temporariamente: Erro de configuração no banco de dados. Por favor, tente novamente mais tarde.');
    }

    // 4. Geração do Embedding da Pergunta
    // Fazemos um fallback de versão: tentamos a v004 (SDK moderno) e se o projeto na GCP rejeitar, caímos para a v001.
    let queryEmbedding;
    try {
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: message,
      });
      queryEmbedding = embeddingResponse.embeddings?.[0]?.values;
    } catch (e4: any) {
       console.warn('text-embedding-004 não disponível para esta chave. Tentando embedding-001...');
       try {
         const fallbackResponse = await ai.models.embedContent({
           model: 'models/embedding-001',
           contents: message,
         });
         queryEmbedding = fallbackResponse.embeddings?.[0]?.values;
       } catch (e1: any) {
          console.error('Erro no Gemini (Embedding Fallback):', e1);
          throw new Error(`Sua API Key não suporta modelos de Embedding. Erro: ${e1.message || 'Desconhecido'}.`);
       }
    }

    if (!queryEmbedding) {
      throw new Error('Falha crítica: Não foi possível gerar o vetor (embedding) da sua pergunta.');
    }

    // 5. Busca Vetorial no Supabase (RPC)
    let documents;
    try {
      const { data, error: dbError } = await supabase.rpc('buscar_artigos_reforma', {
        query_embedding: queryEmbedding,
        match_threshold: 0.6, // Nota de corte (ajuste se necessário)
        match_count: 5        // Traz os 5 artigos mais relevantes
      });

      if (dbError) {
        console.error('Erro no Supabase:', dbError);
        throw new Error('Erro ao acessar o banco de dados de legislação.');
      }
      documents = data;
    } catch (e: any) {
      console.error('Erro ao comunicar com o banco de dados:', e);
      throw new Error('Banco de dados de legislação (RAG) temporariamente indisponível. Para garantir a qualidade jurídica e evitar informações imprecisas, por favor, tente novamente mais tarde.');
    }

    // 6. Montagem do Contexto (RAG)
    let contextText = '';
    if (documents && documents.length > 0) {
      contextText = documents.map((doc: any) => 
        `[Dispositivo: ${doc.codigo_dispositivo} | Contexto: ${doc.contexto_hierarquico}]\n${doc.conteudo_original}`
      ).join('\n\n---\n\n');
    } else {
      contextText = 'Nenhum artigo relevante encontrado na base de dados para esta pergunta.';
    }

    // 7. Engenharia de Prompt Estruturado (Guardrails)
    const systemPrompt = `Você é um Auditor Fiscal Especialista na Reforma Tributária Brasileira (LC 214/2025).
Sua missão é responder às dúvidas do usuário baseando-se EXCLUSIVAMENTE no contexto legal fornecido abaixo.

REGRAS ESTRITAS DE COMPLIANCE:
1. Se a resposta não estiver no contexto fornecido, diga EXATAMENTE: "Com base na legislação fornecida (LC 214/2025), não possuo informações suficientes para responder a esta pergunta."
2. NUNCA invente, deduza ou utilize conhecimentos externos à base fornecida. O rigor técnico é inegociável.
3. Sempre cite o código do dispositivo legal (ex: Lei2142025_Art1) ao final de suas afirmações para garantir a rastreabilidade.
4. Seja claro, objetivo e profissional, utilizando formatação em Markdown para facilitar a leitura.

CONTEXTO LEGAL RECUPERADO DO BANCO DE DADOS:
${contextText}`;

    // 8. Chamada ao LLM (Gemini 2.5 Flash) com Streaming
    // Definimos maxOutputTokens para ajudar a proteger os limites do Rate Limit
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        maxOutputTokens: 1024,
      }
    });

    // 9. Retorno em Streaming para o Front-end
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            if (chunk.text) {
              controller.enqueue(new TextEncoder().encode(chunk.text));
            }
          }
          controller.close();
        } catch (err) {
          console.error('Erro durante o streaming:', err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      }
    });

  } catch (error: any) {
    console.error('Erro na API de Chat:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor ao processar a requisição.' },
      { status: 500 }
    );
  }
}
