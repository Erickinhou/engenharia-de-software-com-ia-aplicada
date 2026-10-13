import { OpenRouter } from "@openrouter/sdk";
import { type Config, config } from "./config.ts";

export class OpenRouterService {
    private client: OpenRouter;
    private config: Config;

    constructor(configOverride: Partial<Config>){
        this.config = {
            ...config,
            ...configOverride,
        };
        this.client = new OpenRouter({
            apiKey: this.config.apiKey,
            httpReferer: this.config.httpReferer,
            xTitle: this.config.xTitle,
        });
    }
    async generate(prompt: string ) {

    }
}