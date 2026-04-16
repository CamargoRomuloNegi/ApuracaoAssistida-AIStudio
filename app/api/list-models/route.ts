import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API Key" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.list();

    let embedModels = [];
    let allModels = [];

    for await (let model of response) {
      if (model.name) {
          allModels.push(model.name);
          if (model.name.toLowerCase().includes('embed')) {
            embedModels.push({
              name: model.name,
              version: model.version,
            });
          }
      }
    }

    return NextResponse.json({
      success: true,
      total_models_available_for_key: allModels.length,
      found_embedding_models: embedModels.length > 0 ? embedModels : "Nenhum modelo com a palavra 'embed' foi autorizado para essa chave.",
      all_model_names_dump: allModels
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to list models" }, { status: 500 });
  }
}
