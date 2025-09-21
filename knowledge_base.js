//ai generated script

import database from "./database.js";
import ai from "./ai.js";

const { TextKnowledges } = database;

await embed('TOOL CREATION FORMAT AND LIMITS\n' +
    '\n' +
    'Tool File Structure Requirements:\n' +
    '1. File Location: Must be placed in /storage/tools/ directory\n' +
    '2. File Naming: {tool_name}.js (exactly matches registered name)\n' +
    '3. File Existence: Tool file must exist before registration\n' +
    '4. File Format: JavaScript ES module with export function\n' +
    '\n' +
    'Required Tool Function Structure:\n' +
    "- Must export an async function named 'run'\n" +
    '- Function should accept a single parameter object\n' +
    '- Function should return a string or Promise<string>\n' +
    '- Must include proper error handling\n' +
    '\n' +
    'Example Tool Template:\n' +
    '```javascript\n' +
    'import database from "../../database.js";\n' +
    "import { existsSync } from 'fs';\n" +
    '\n' +
    'export async function run({ param1, param2, param3 }) {\n' +
    '    try {\n' +
    '        // Tool logic here\n' +
    '        return "Success result";\n' +
    '    } catch (error) {\n' +
    '        return `ERROR: ${error.message}`;\n' +
    '    }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Registration Parameters Format:\n' +
    '- Must follow OpenAI compatible API format\n' +
    '- Parameters object should match function parameters\n' +
    '- Each parameter must have type and description\n' +
    '- Parameter names must exactly match function parameters\n' +
    '\n' +
    'Example Registration Parameters:\n' +
    '```json\n' +
    '{\n' +
    '  "type": "object",\n' +
    '  "properties": {\n' +
    '    "path": {\n' +
    '      "type": "string", \n' +
    '      "description": "File path to read"\n' +
    '    }\n' +
    '  },\n' +
    '  "required": ["path"]\n' +
    '}\n' +
    '```\n' +
    '\n' +
    'Limitations and Constraints:\n' +
    '1. No duplicate tool names allowed\n' +
    '2. Tool file must exist before registration\n' +
    '3. Parameters must exactly match between registration and implementation\n' +
    '4. Tools must be pure JavaScript (no external dependencies unless included)\n' +
    '5. Tools should handle errors gracefully and return descriptive error messages\n' +
    '6. Tools should not perform destructive operations without validation\n' +
    '\n' +
    'Error Handling Requirements:\n' +
    '- Return error messages starting with "ERROR!" for system recognition\n' +
    '- Validate inputs before processing\n' +
    '- Catch and handle exceptions appropriately\n' +
    '- Return meaningful error messages to users\n' +
    '\n' +
    'Best Practices:\n' +
    '1. Include input validation in tool functions\n' +
    '2. Use descriptive parameter names and descriptions\n' +
    '3. Document tool functionality in comments\n' +
    '4. Test tools before registration\n' +
    '5. Follow consistent error message format\n' +
    '6. Keep tools focused on single responsibilities\n' +
    '\n' +
    'Common Validation Checks:\n' +
    '- File existence checks using existsSync\n' +
    '- Parameter type validation\n' +
    '- Input sanitization\n' +
    '- Permission checks where applicable\n' +
    '\n' +
    'Tool Execution Flow:\n' +
    '1. Tool registered via register_tool_to_database\n' +
    '2. Tool file created via write_tool_script (optional)\n' +
    '3. Tool called during process execution\n' +
    '4. Results returned as string\n' +
    '5. Errors handled and logged in process records');

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
