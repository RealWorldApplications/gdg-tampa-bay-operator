import { GoogleGenAI, Part } from '@google/genai';
import {
  checkReturnEligibilityDeclaration,
  generateReturnLabelDeclaration,
  checkReturnEligibility,
  generateReturnLabel,
} from './tools.js';

// Ensure GEMINI_API_KEY is set in your environment
const ai = new GoogleGenAI({});

// Map tool names to local implementations
const toolHandlers: Record<string, (args: any) => any> = {
  checkReturnEligibility: (args) => checkReturnEligibility(args.orderId),
  generateReturnLabel: (args) => generateReturnLabel(args.orderId, args.reason),
};

async function runOperatorDemo() {
  // Initialize a stateful chat session with tool declarations and guardrails
  const chat = ai.chats.create({
    model: 'gemini-3.5-flash-lite',
    config: {
      systemInstruction:
        'You are a helpful e-commerce support operator. Always verify return eligibility using tools before answering policy questions. Never generate a return label without asking the user for confirmation first.',
      tools: [
        {
          functionDeclarations: [
            checkReturnEligibilityDeclaration,
            generateReturnLabelDeclaration,
          ],
        },
      ],
    },
  });

  // Helper to handle the full model -> tool -> model round-trip
  async function sendUserTurn(userMessage: string) {
    console.log(`\n👤 USER: "${userMessage}"`);
    let response = await chat.sendMessage({ message: userMessage });

    // Loop while Gemini requests tool executions
    while (response.functionCalls && response.functionCalls.length > 0) {
      const functionResponseParts: Part[] = [];

      for (const call of response.functionCalls) {
        console.log(`⚙️  MODEL TOOL CALL: ${call.name}(${JSON.stringify(call.args)})`);

        const toolName = call.name ?? '';
        const handler = toolHandlers[toolName];
        const result = handler
          ? handler(call.args)
          : { error: `Unknown tool: ${call.name}` };

        console.log(`📦 BACKEND RESULT: ${JSON.stringify(result)}`);

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: result,
          },
        });
      }

      // Send tool results back to Gemini to synthesize the final response
      response = await chat.sendMessage({ message: functionResponseParts });
    }

    console.log(`🤖 AGENT: ${response.text}`);
  }

  // --- Live Demo Scenario ---
  // Turn 1: Read operation (autonomous tool execution)
  await sendUserTurn(
    'My shoes arrived scuffed on order #8841. Can I get my money back?'
  );

  // Turn 2: Write operation (triggered after human confirmation)
  await sendUserTurn(
    'Yes, please go ahead and create the return label for me.'
  );

  // Turn 3: Policy enforcement check (expired window)
  await sendUserTurn(
    'Also, what about my mechanical keyboard on order 8842? Can I return that too?'
  );
}

runOperatorDemo().catch(console.error);