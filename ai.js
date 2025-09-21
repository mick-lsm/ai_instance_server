import OpenAI from 'openai';


process.loadEnvFile('.env');

const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEKAPIKEY
});

const siliconFlow = new OpenAI({
    baseURL: 'https://api.siliconflow.cn/v1',
    apiKey: process.env.SILICONFLOWAPIKEY
});

async function embed(input) {
    const response = await siliconFlow.embeddings.create({
        model: "BAAI/bge-m3",
        input: input,
        encoding_format: "float"
    });
    return {
        model: response.model,
        data: response.data,
    }
}

async function chat(system_prompt, messages, tools, temperature = 0.2, json = false ) {

    const request = {
        model: 'deepseek-chat',
        messages: [{ role: "system", content: system_prompt}, ...messages],
        temperature: temperature,
        response_format: {
            type: json ? "json_object" : "text"
        }
    };
    if(tools.length != 0) request.tools = tools;
    const response = await deepseek.chat.completions.create(request);

    return response.choices[0].message;
}

export default { embed, chat }