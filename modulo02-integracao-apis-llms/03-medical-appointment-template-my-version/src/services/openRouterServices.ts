import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod/v4";
import {config, type  ModelConfig} from "../config.ts";
import { createAgent, HumanMessage, providerStrategy, SystemMessage } from "langchain";


export class  LlmService {
  private readonly config: ModelConfig;
  private readonly llmConfig: ChatOpenAI;

  constructor(configOverride?: ModelConfig){
    this.config = configOverride ?? config;
    this.llmConfig = new ChatOpenAI({
      apiKey: this.config.apiKey,
      model: this.config.models.at(0),
      temperature: this.config.temperature,
      configuration: {
        baseURL: this.config.baseUrl,
        defaultHeaders: {
          'HTTP-Referer': this.config.httpReferer,
          'X-title': this.config.xTitle
        }
      },
      
      //Conf openRouter
      modelKwargs: {
        models: this.config.models,
        provider: this.config.provider
      }
    })
  }

  async generatorStructured<T>(systemPrompt: string, userPrompt: string, schema:  z.ZodType<T>){
    try{
      const agent = createAgent({
        model: this.llmConfig,
        tools: [],
        responseFormat: providerStrategy(schema)
      })
  
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ]
  
      const data = await agent.invoke({messages});

      return { 
        success: true,
        data: data.structuredResponse
      }
    } catch (err){
        console.error("Error Open Router", err)

        return {
          success: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }
  }