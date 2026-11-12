import { getSystemPrompt, getUserPromptTemplate, type IntentData, IntentSchema } from '../../prompts/v1/identifyIntent.ts';
import { professionals } from '../../services/appointmentService.ts';
import { LlmService } from '../../services/openRouterServices.ts';
import type { GraphState } from '../graph.ts';

export function createIdentifyIntentNode(llmClient: LlmService) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log(`🔍 Identifying intent...`);
   const input = state.messages.at(-1)!.text;

    try {
      const systemPrompt= getSystemPrompt(professionals);
      const usersPrompt= getUserPromptTemplate(input);

      const result = await llmClient.generatorStructured<IntentData>(systemPrompt, usersPrompt, IntentSchema )

      if(!result.success){
        console.log(`⚠️  Intent identification failed: ${result.error}`);
        return {
          intent: 'unknown',
          error: result.error
        }
      }

      const intentData = result.data
      console.log(`✅ Intent identified: ${intentData?.intent}`);

      return {
        ...intentData,
      };
      
    } catch (error) {
      console.error('❌ Error in identifyIntent node:', error);
      return {
        ...state,
        intent: 'unknown',
        error: error instanceof Error ? error.message : 'Intent identification failed',
      };
    }
  };
}
