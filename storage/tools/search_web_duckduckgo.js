import axios from 'axios';

export async function run({ query, limit = 5 }) {
    try {
        // Validate inputs
        if (!query || typeof query !== 'string') {
            return "ERROR: Query parameter is required and must be a string";
        }
        
        if (limit && (typeof limit !== 'number' || limit < 1 || limit > 20)) {
            return "ERROR: Limit must be a number between 1 and 20";
        }

        // DuckDuckGo Instant Answer API
        const response = await axios.get('https://api.duckduckgo.com/', {
            params: {
                q: query,
                format: 'json',
                no_html: 1,
                skip_disambig: 1
            },
            timeout: 10000
        });

        const data = response.data;
        
        let results = [];
        
        // Extract main result (Abstract)
        if (data.Abstract) {
            results.push({
                title: data.Heading || 'DuckDuckGo Result',
                url: data.AbstractURL || '',
                description: data.Abstract,
                source: 'DuckDuckGo Instant Answer'
            });
        }

        // Extract related topics
        if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            data.RelatedTopics.forEach(topic => {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || 'Related Topic',
                        url: topic.FirstURL,
                        description: topic.Text,
                        source: 'DuckDuckGo Related Topics'
                    });
                }
            });
        }

        // Limit results
        const limitedResults = results.slice(0, limit);
        
        if (limitedResults.length === 0) {
            return `No results found for query: "${query}"`;
        }

        // Format results
        const formattedResults = limitedResults.map((result, index) => 
            `[${index + 1}] ${result.title}\n   URL: ${result.url}\n   Description: ${result.description}\n   Source: ${result.source}\n`
        ).join('\n');

        return `Search results for "${query}":\n\n${formattedResults}`;
        
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            return "ERROR: Request timeout - DuckDuckGo API is not responding";
        }
        if (error.response) {
            return `ERROR: DuckDuckGo API error - ${error.response.status}: ${error.response.statusText}`;
        }
        return `ERROR: ${error.message}`;
    }
}