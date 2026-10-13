console.assert(process.env.OPEN_ROUTER_API_KEY, "OPEN_ROUTER_API_KEY is not set in env files");

export type ModelConfig = {
    apiKey: string;
    httpReferer: string;
    xTitle: string;
    port: number;
    models: string[];
    temperature: number;
    maxTokens: number;
    systemPrompt: string;

    provider: {
        sort: {
            by: string,
            partition: string,
        }
    }
}


export const config: ModelConfig = {
    apiKey: process.env.OPEN_ROUTER_API_KEY as string,
    httpReferer: 'http://pos-ia.com',
    xTitle: 'SmartModelRouterGetway',
    port:3000,
    models: [],
    temperature: 0.2,
    maxTokens: 50,
    systemPrompt: 'You are a helpful assistant.',
    provider: {
        sort: {
            by: 'price',
            partition: 'none',
        }
    }
}

export type Config = typeof config;