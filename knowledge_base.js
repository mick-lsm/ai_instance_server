//ai generated script

import database from "./database.js";
import ai from "./ai.js";

const { TextKnowledges } = database;

// Method 1: Query with reranking
export async function query(searchQuery, options = {}) {
    const {
        topK = 10,
        similarityThreshold = 0.7
    } = options;

    try {
        // Generate embedding for the query
        const queryEmbedding = await ai.embed(searchQuery);
        const queryVector = queryEmbedding.data[0].embedding;

        // Get all knowledge embeddings from database
        const knowledges = await database.TextKnowledges.findAll({
            where: { model: queryEmbedding.model }, raw: true
        });

        // Calculate similarity scores
        const scoredKnowledges = knowledges.map(knowledge => {
            const knowledgeVector = JSON.parse(knowledge.data);
            const similarity = cosineSimilarity(queryVector, knowledgeVector);
            return {
                data: knowledge.text,
                similarity
            };
        });

        // Filter by threshold and sort by similarity
        const relevantKnowledges = scoredKnowledges
            .filter(item => item.similarity >= similarityThreshold)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);

        return relevantKnowledges;
    } catch (error) {
        console.error("Query error:", error);
        throw new Error(`Query failed: ${error.message}`);
    }
}

// Method 2: Embed text as chunks and store in database
export async function embed(text, options = {}) {
    const {
        chunkSize = 1000,
        overlap = 100,
    } = options;

    try {
        // Chunk the text
        const chunks = chunkText(text, chunkSize, overlap);

        // Generate embeddings for each chunk
        const embeddingResults = await ai.embed(chunks);

        // Store each chunk in database
        const storedChunks = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddingResults.data[i].embedding;

            const stored = await TextKnowledges.create({
                text: chunk,
                data: embedding,
                model: embeddingResults.model
            });

            storedChunks.push(stored);
        }

        return {
            chunks: storedChunks.length,
            model: embeddingResults.model
        };
    } catch (error) {
        console.error("Embedding error:", error);
        throw new Error(`Embedding failed: ${error.message}`);
    }
}

function chunkText(text, maxChunkSize = 1000, overlap = 100) {
    const chunks = [];
    console.log(text);
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
                // Start new chunk with overlap from previous
                const words = currentChunk.split(' ');
                currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + ' ' + sentence;
            } else {
                // If even a single sentence is too long, split it
                const mid = Math.floor(sentence.length / 2);
                chunks.push(sentence.substring(0, mid));
                currentChunk = sentence.substring(mid);
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
}

// Cosine similarity calculation
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
}
