const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({apiKey: 'fake'});
async function test() {
  try {
    await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: "Hello",
    });
  } catch (e) {
    console.log(e);
  }
}
test();
