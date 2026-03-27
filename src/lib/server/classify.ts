import fscData from "$lib/data/fsc_class_assignments.json";
import { OPENROUTER_API_KEY } from '$env/static/private';

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Build a flat { fsc_code: description } lookup from the fsc_assignments array
const codesMap: Record<string, string> = Object.fromEntries(
    fscData.fsc_assignments.map((entry: { fsc: string; description: string }) => [entry.fsc, entry.description])
);


// --- Simple prompt classification ---

interface ClassifyOptions {
    text: string;
    model?: string;
}

interface ClassifyResult {
    fsc: string;
    description: string;
}

// TODO:
// Confidence based on AI model output - we can ask AI in prompt to give confidence for all of them 
// but this is made up from AI - non deterministic
export async function classifySimplePrompt({ text, model = "anthropic/claude-sonnet-4" }: ClassifyOptions): Promise<ClassifyResult[]> {
    const descriptions = Object.entries(codesMap)
        .map(([key, desc]) => `- ${key}: ${desc}`)
        .join("\n");

    const resp = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a classifier. Given a list of categories (key: description), " +
                        "return ALL category keys that fit the user's text. " +
                        "Respond with ONLY the matching keys as a JSON array of strings, " +
                        "ordered from most relevant to least relevant. " +
                        'Example response: ["5306","5305","5310"]\n' +
                        "No explanation, no extra text — just the JSON array.",
                },
                {
                    role: "user",
                    content: `Categories:\n${descriptions}\n\nText to classify:\n${text}`,
                },
            ],
        }),
    });

    if (!resp.ok) {
        const errorBody = await resp.text();
        throw new Error(`OpenRouter API error (${resp.status}): ${errorBody}`);
    }

    const data = await resp.json();

    if (!data.choices?.length) {
        throw new Error(`OpenRouter API returned no choices: ${JSON.stringify(data)}`);
    }

    const raw = data.choices[0].message.content.trim();

    let keys: string[];
    try {
        keys = JSON.parse(raw);
    } catch {
        // Fallback: the LLM may have returned comma-separated or newline-separated keys
        keys = raw
            .replace(/[\[\]"]/g, "")
            .split(/[\s,]+/)
            .map((k: string) => k.trim())
            .filter(Boolean);
    }

    if (!Array.isArray(keys) || keys.length === 0) {
        throw new Error(`LLM returned no valid keys: "${raw}"`);
    }

    const invalid = keys.filter((k) => !(k in codesMap));
    if (invalid.length > 0) {
        throw new Error(`LLM returned unexpected keys: ${JSON.stringify(invalid)}`);
    }

    return keys.map((k) => ({ fsc: k, description: codesMap[k] }));
}



// --- Embedding-based classification ---

interface ClassifyDistanceOptions {
    text: string;
    threshold?: number;
}

interface ClassifyDistanceResult {
    fsc: string;
    description: string;
    similarity: number;
}

// THIS IS OUR IN MEMORY STORAGE FOR EMBEDDINGS - IT WILL FILLED ONCE 
let descriptionEmbeddings: number[][] | null = null;

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// classifyDistance classified given text by using cosine similiarity.
// It generated embeddings from 
export async function classifyDistance({ text, threshold = 0.3 }: ClassifyDistanceOptions): Promise<ClassifyDistanceResult[]> {
    const descEmbeddings = await getDescriptionEmbeddings();
    const [textEmbedding] = await embed(text);

    const scored = Object.keys(codesMap).map((fsc, i) => ({
        fsc,
        description: codesMap[fsc],
        similarity: cosineSimilarity(textEmbedding, descEmbeddings[i]),
    }));

    return scored
        .filter((r) => r.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
}

// Get embeddings for FSC description codes
async function getDescriptionEmbeddings(): Promise<number[][]> {
    if (descriptionEmbeddings) return descriptionEmbeddings;

    console.log(`[classifyDistance] Computing embeddings for ${Object.values(codesMap).length} FSC descriptions...`);
    descriptionEmbeddings = await embed(Object.keys(codesMap));
    console.log(`[classifyDistance] Embeddings cached (${descriptionEmbeddings.length} vectors)`);

    return descriptionEmbeddings;
}

// Calls open router for embeddings for given input string.
async function embed(input: string | string[], model = "openai/text-embedding-3-small"): Promise<number[][]> {
    const resp = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, input }),
    });

    if (!resp.ok) {
        const errorBody = await resp.text();
        throw new Error(`Embeddings API error (${resp.status}): ${errorBody}`);
    }

    const data = await resp.json();
    return data.data
        .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
        .map((d: { embedding: number[] }) => d.embedding);
}