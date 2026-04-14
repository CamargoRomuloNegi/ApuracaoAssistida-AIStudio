<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5cd09327-ab4c-4b24-8c48-a9965cdb5808

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Configure as variáveis de ambiente necessárias. Crie um arquivo `.env.local` na raiz do projeto com o seguinte formato:
   ```env
   GEMINI_API_KEY="sua_chave_do_google_gemini_aqui"
   SUPABASE_URL="https://seu-projeto.supabase.co"
   SUPABASE_ANON_KEY="sua-anon-key-aqui"
   ```
3. Run the app:
   `npm run dev`

## Deploy em Produção (ex: Vercel)

Para publicar a aplicação em um ambiente de produção escalável, recomendamos o uso da Vercel.

1. Conecte seu repositório do GitHub à Vercel.
2. Na etapa de configuração do projeto na Vercel (Project Settings > Environment Variables), adicione as seguintes variáveis:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. A Vercel detectará automaticamente que é um projeto Next.js e fará o build corretamente.

### Boas Práticas Adotadas

1. **Variáveis de Ambiente:** Em vez de varreduras na memória em busca de credenciais e risco de injeção/falhas, a aplicação agora exige chaves explícitas no formato `.env` ou no painel de configurações do provedor de nuvem.
2. **Resiliência (Fallback):** O RAG de legislações (Supabase) atua de forma rigorosa. Caso o banco esteja fora do ar, o sistema não confia em alucinações (hallucinations) do LLM geral do Google, mas bloqueia o acesso e alerta o usuário graciosamente, mantendo o nível e qualidade do consultor jurídico.
3. **Rate Limiting e Custos:** O código atual conta com um Rate Limiter simples em memória na rota (`/api/chat`) limitando a 15 requisições por minuto. Para garantir a escala do rate limit em ambientes serveless como Vercel, recomenda-se substituir a estrutura em memória por serviços de cache externos (ex: Vercel KV ou Upstash Redis). Adicionalmente, foi definido um `maxOutputTokens` no modelo do Gemini limitando o tamanho da resposta a fim de economizar recursos na camada gratuita.
