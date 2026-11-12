import {
  getSystemPrompt,
  getUserPromptTemplate,
  type MessageResponse,
  MessageSchema,
} from "../../prompts/v1/messageGenerator.ts";
import { LlmService } from "../../services/openRouterServices.ts";
import type { GraphState } from "../graph.ts";
import { AIMessage } from "langchain";

export function createMessageGeneratorNode(llmClient: LlmService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log(`💬 Generating response message...`);
    try {
      const hasSucceeded = state.actionSuccess ? "success" : "error";
      const scenario = `${state.intent ?? "unknown"}_${hasSucceeded}`;
      const details = {
        professionalName: state.professionalName,
        datetime: state.datetime,
        patientName: state.patientName,
        error: state.error,
      };

      const systemPrompt = getSystemPrompt();
      const usersPrompt = getUserPromptTemplate({ scenario, details });

      const result = await llmClient.generatorStructured<MessageResponse>(
        systemPrompt,
        usersPrompt,
        MessageSchema,
      );

      if (!result.success) {
        console.log(`⚠️  Intent identification failed: ${result.error}`);
        return {
          intent: "unknown",
          error: result.error,
        };
      }

      return {
        messages: [...state.messages, result?.data?.message],
      };
    } catch (error) {
      console.error("❌ Error in messageGenerator node:", error);
      return {
        messages: [
          ...state.messages,
          new AIMessage("An error occurred while processing your request."),
        ],
      };
    }
  };
}
