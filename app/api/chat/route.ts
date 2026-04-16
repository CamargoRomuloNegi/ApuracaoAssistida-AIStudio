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
    // Reescrito para ser ESPELHO EXATO da Ingestão no Python.
    // Ingestão usou: model_id="gemini-embedding-001" e task_type="RETRIEVAL_DOCUMENT"
    // Busca DEVE usar: model="text-embedding-004" (no novo Node SDK, 'gemini-embedding-001' é o nome legado, text-embedding-004 é a constante atual equivalente para essa família na v1)
    // E DEVE usar taskType="RETRIEVAL_QUERY"
    let queryEmbedding;
    let contextText = 'Nenhum artigo relevante encontrado na base de dados para esta pergunta.';

    try {
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: message,
        config: {
          taskType: 'RETRIEVAL_QUERY', // Este parâmetro é OBRIGATÓRIO para bater com a ingestão "RETRIEVAL_DOCUMENT"
        }
      });
      queryEmbedding = embeddingResponse.embeddings?.[0]?.values;

      if (!queryEmbedding) {
        throw new Error('Retorno do vetor veio vazio do Google.');
      }

      // Truncamento 768 para PGVector: A ingestão no Python usou `vector = res.embeddings[0].values[:768]`
      // Precisamos fazer o mesmo aqui na query para garantir que o tamanho bata perfeitamente!
      const queryVectorTruncado = queryEmbedding.slice(0, 768);

      // 5. Busca Vetorial no Supabase (RPC)
      const { data, error: dbError } = await supabase.rpc('buscar_artigos_reforma', {
        query_embedding: queryVectorTruncado, // Passa o array de 768 posições!
        match_threshold: 0.6, // Nota de corte (ajuste se necessário)
        match_count: 5        // Traz os 5 artigos mais relevantes
      });

      if (dbError) {
        console.error('Erro no Supabase:', dbError);
        throw new Error('Erro ao acessar o banco de dados de legislação.');
      }

      // 6. Montagem do Contexto (RAG)
      if (data && data.length > 0) {
        contextText = data.map((doc: any) =>
          `[Dispositivo: ${doc.codigo_dispositivo} | Contexto: ${doc.contexto_hierarquico}]\n${doc.conteudo_original}`
        ).join('\n\n---\n\n');
      } else {
        // Se a busca voltou, mas com 0 artigos atingindo o corte
         contextText = 'Nenhum artigo relevante encontrado na base de dados para esta pergunta com a precisão exigida.';
      }

    } catch (ragError: any) {
       console.error('Falha geral no bloco RAG/Embedding:', ragError);
       // Como acordado, o sistema não pode mascarar ou responder sem RAG e se passar por consultor jurídico sem a fonte!
       // Se o RAG falhar na raiz (embedding recusado pela API, BD fora), abortamos.
       throw new Error(`Falha crítica na Base de Conhecimento (RAG). Erro interno: ${ragError.message}. Por segurança jurídica, a resposta foi cancelada.`);
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
