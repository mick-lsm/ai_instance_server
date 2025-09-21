import path from 'path';
import ai from './ai.js'
import database from './database.js';
import express from 'express';
import { existsSync, writeFileSync } from 'fs';
import { embed, query } from './knowledge_base.js';


const app = express();
app.use(express.json());
app.use(express.text());

app.post('/api/text-knowledge', async (req, res) => {
    const text = req.body;
    if (await database.TextKnowledges.findOne({ where: { input: text } }) != null) {
        res.status(400).end();
        return;
    }
    await embed(text);
    res.status(200).json({
        knowledge_id: knowledge.id
    });
});

app.post('/api/tools', async (req, res) => {
    const { name, description, parameters } = req.body; //STRING, STRING, TEXT ,JSON
    if (await database.Tools.findOne({ where: { name: name } }) != null) {
        res.status(400).end();
        return;
    }
    if (!existsSync(`./storage/tools/${name}.js`)) {
        res.status(400).end();
        return;
    }
    const tool = await database.Tools.create({
        name, description, parameters
    });
    res.status(200).json({
        tool_id: tool.id
    });
});

app.post('/api/processes', async (req, res) => {
    const { title, description } = req.body;
    const instanceProcess = await database.Processes.create({
        title, description
    });
    res.status(200).json({
        process_id: instanceProcess.id
    });
});

app.post('/api/processes/:id/complete', async (req, res) => {
    const process_id = req.params.id;
    if (await database.Processes.findOne({ where: { id: process_id } }) == null) {
        res.status(400).end();
        return;
    }
    startInstanceProcess(process_id);
    res.status(200).end();
});

async function startInstanceProcess(id) {
    console.log(`[${new Date().toISOString()}] Starting process with ID: ${id}`);

    const instanceProcess = await database.Processes.findOne({ where: { id: id } });
    if (instanceProcess == null) {
        console.error(`[${new Date().toISOString()}] ERROR: Process with ID ${id} not found`);
        throw new Error(`Process with ID ${id} not found`);
    }

    console.log(`[${new Date().toISOString()}] Found process: ${instanceProcess.title} - ${instanceProcess.description}`);

    const history = []; //chat history
    let iteration = 1;

    while (true) {
        console.log(`[${new Date().toISOString()}] Starting iteration ${iteration}`);

        const keywords = JSON.parse((await ai.chat(`Summarize the conversation into keywords. Maximum: 20. Minimum: 2. Response format: JSON. Format: ` + JSON.stringify([
            "keyword1",
            "keyword2"
        ]), [], [], 0.5, true)).content)

        const searchKeywords = keywords.join();
        const auto_retrieve_knowledge = await query(searchKeywords, {
            topK: 10,
            similarityThreshold: 0.4
        });
        console.log(` - Auto Retrieved Knowledge Length: ${auto_retrieve_knowledge.length}`);

        const variables = {
            timestamp: Date.now(),
            main_used_time_ISO: new Date().toISOString(),
            auto_retrieve_knowledge
        };
        const prompt = `Reply ###FINISHED_PROCESS### to finish the conversation or so called, "Process".\nPast Conversation history is stored in system prompt.\n` + JSON.stringify(variables);

        const response = await ai.chat(prompt, [
            {
                role: 'user',
                content: JSON.stringify({
                    title: instanceProcess.title,
                    description: instanceProcess.description,
                })
            },
            ...history
        ], (await database.Tools.findAll({ raw: true })).map(t => {
            const ai_tool = { type: "function", function: { name: t.name, description: t.description, parameters: JSON.parse(t.parameters) } };
            return ai_tool;
        }));
        history.push({
            role: 'assistant', //alwasy assistant
            content: response.content,
            tool_calls: response.tool_calls
        });

        console.log(`[${new Date().toISOString()}] AI Response received:`);
        console.log('- Content:', response.content);
        console.log('- Tool calls:', response.tool_calls?.length || 0);

        const tool_calls = response.tool_calls;
        const content = response.content;

        if (content.includes('###FINISHED_PROCESS###')) {
            console.log(`[${new Date().toISOString()}] FINISH signal detected in content`);
            break;
        }

        if (tool_calls && tool_calls.length > 0) {
            console.log(`[${new Date().toISOString()}] Processing ${tool_calls.length} tool calls`);

            for (const tool of tool_calls) {
                const name = tool.function.name;
                const parameters = JSON.parse(tool.function.arguments);

                console.log(`[${new Date().toISOString()}] Calling tool: ${name}`);
                console.log('- Parameters:', parameters);

                try {
                    const toolPath = path.join(process.cwd(), 'storage', 'tools', `${name}.js`);
                    const toolUrl = `file:///${toolPath.replace(/\\/g, '/')}`;
                    const tool_script = await import(toolUrl);
                    const result = await tool_script.run(parameters);
                    console.log(`[${new Date().toISOString()}] Tool ${name} completed successfully`);
                    console.log('- Result:', result.toString().substring(0, 25));

                    history.push({ role: 'tool', tool_call_id: tool.id, content: JSON.stringify(result) });
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] ERROR in tool ${name}:`, error.message);
                    history.push({ role: 'tool', tool_call_id: tool.id, content: error.message.toString() });
                }
            }
        } else {
            console.log(`[${new Date().toISOString()}] No tool calls in this iteration`);
        }

        console.log(`[${new Date().toISOString()}] >>>>>>>>>>> Iteration ${iteration} completed`);
        iteration++;
    }

    await database.ProcessRecords.create({
        history: history,
        process_id: id
    });

    console.log(`[${new Date().toISOString()}] ========== TASK COMPLETED ==========`);
    console.log(`[${new Date().toISOString()}] Final statistics:`);
    console.log(`- Total iterations: ${iteration - 1}`);
    console.log(`- History length: ${history.length}`);
    console.log(`[${new Date().toISOString()}] Process ${id} finished successfully`);
};
app.listen(3000);