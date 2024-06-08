import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { getEncoding, encodingForModel } from 'js-tiktoken';
import { z } from 'zod';

console.log('...initializing');

// Custom Tracer Callback
class CustomTracer {
  inputTokens: number;
  totalTokens: number;
  outputTokens: number;
  enc: any;

  constructor() {
    this.totalTokens = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.enc = encodingForModel('gpt-4o');
  }

  encodeAndCountTokens(text: string): number {
    return this.enc.encode(text).length;
  }

  handleLLMNewToken(result: any) {
    console.log('Token:', result);
    this.totalTokens += 1; // Adjust as necessary based on tokenization
  }

  handleLLMEnd(result: any) {
    // console.log('result:', result);
    result.generations.forEach((generation: any) => {
      // console.log('Generation:', generation[0]?.message?.additional_kwargs);
      const content = generation[0]?.message?.text || '';
      // console.log('Content:', content);
      const calls = generation[0]?.message?.additional_kwargs || '';
      // console.log('Calls:', calls);
      const output = JSON.stringify(calls, null, 2);
      const tokens = this.encodeAndCountTokens(content + output);
      this.outputTokens += tokens;
    });
    console.log('Tokens for this LLMEnd:', this.outputTokens);
  }

  handleAgentAction(action: any) {
    const calls = action?.messageLog[0]?.additional_kwargs || '';
    const output = JSON.stringify(calls, null, 2);
    const tokens = this.encodeAndCountTokens(output);
    this.outputTokens += tokens;
    console.log('Agent Action:', action);
    console.log('Tokens for this action:', tokens);
  }

  handleChatModelStart(_, args) {
    args[0].forEach((arg) => {
      const content = arg?.content || '';
      const calls = arg?.additional_kwargs || '';

      const tokens = this.encodeAndCountTokens(content + JSON.stringify(calls, null, 2));
      this.inputTokens += tokens;
      console.log('content:', content, calls);
    });

    console.log('Tokens for this ChatModelStart:', this.inputTokens);
    // const { kwargs, id, type } = response;
    // console.log(`Step Name: ${id.join(' -> ')}`, kwargs);

    // let totalTokens = 0;
    // Object.keys(kwargs).forEach((key) => {
    //   const value = JSON.stringify(kwargs[key]);
    //   const tokens = this.encodeAndCountTokens(value);
    //   totalTokens += tokens;
    //   console.log(`Key: ${key}, Tokens: ${tokens}`);
    // });

    // console.log('Total Tokens for handleChatModelStart:', totalTokens);
    // this.totalTokens += totalTokens;
  }

  agentTracer() {
    return {
      // handleLLMNewToken: this.handleLLMNewToken.bind(this),
      // handleLLMEnd: this.handleLLMEnd.bind(this),
      // handleAgentAction: this.handleAgentAction.bind(this),
      // handleChatModelStart: this.handleChatModelStart.bind(this),
      // handleChainStart: (val) => console.log('holi', val),
    };
  }

  modelTracer() {
    return {
      handleChatModelStart: this.handleChatModelStart.bind(this),
      handleLLMEnd: this.handleLLMEnd.bind(this),
    };
  }

  sumTokens() {
    this.totalTokens = this.inputTokens + this.outputTokens;
  }
}

const customTracer = new CustomTracer();

const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `
        You are a events assistant, your role is to help users find information about the event, be joyful and helpful, answer with enthusiasm and provide the information requested.
        use emojis to make the conversation more engaging.
        `,
  ],
  ['user', '{input}'],
  new MessagesPlaceholder({
    variableName: 'agent_scratchpad',
    optional: false,
  }),
]);

const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.15,
  callbacks: [customTracer.modelTracer()],
});

const getScheduleEventsByUser = new DynamicStructuredTool({
  name: 'getScheduleEventsByUser',
  description: 'Get schedule events by user',
  schema: z.object({
    user_name: z.string(),
  }),
  func: async ({ user_name }) => {
    const name = user_name.toLowerCase() as keyof typeof users;

    // let's pretend this is a database
    const users = {
      alice: [
        {
          name: 'mock event 1',
          date: '2022-01-01',
          time: '10:00',
        },
        {
          name: 'mock event 2',
          date: '2022-01-02',
          time: '11:00',
        },
      ],
      bob: [
        {
          name: 'mock event 3',
          date: '2022-01-03',
          time: '12:00',
        },
        {
          name: 'mock event 4',
          date: '2022-01-04',
          time: '13:00',
        },
      ],
    };

    const schedule = users?.[name];

    if (!schedule) {
      return `I'm sorry, I couldn't find any events for ${name}`;
    }

    return `schedule found: ${JSON.stringify(schedule)}`;
  },
});

const registerForEvent = new DynamicStructuredTool({
  name: 'registerForEvent',
  description: 'Register for event, given a user name and event name',
  schema: z.object({
    user_name: z.string(),
    event_name: z.string(),
  }),
  func: async ({ user_name, event_name }) => {
    // if user_name or event_name is not provided, return an error message, the agent will handle it
    if (!user_name) {
      console.log('Please provide a user name');
      return `Please provide a user name`;
    }

    if (!event_name) {
      console.log('Please provide an event name');
      return `Please provide an event name`;
    }

    // let's pretend this is a database, in real life you would save this to a database
    console.log(`User ${user_name} has registered for event ${event_name}`);

    return `You have successfully registered for ${event_name}`;
  },
});

const tools = [getScheduleEventsByUser, registerForEvent]; // N number of tools

const agent = await createOpenAIFunctionsAgent({
  llm,
  tools,
  prompt,
});

const executor = new AgentExecutor({
  agent,
  tools,
//   callbacks: [
// {
//   handleLLMStart: () => console.log('handleLLMStart'),
//   handleLLMNewToken: () => console.log('handleLLMNewToken'),
//   handleLLMEnd: () => console.log('handleLLMEnd'),
//   handleChainStart: (val) => console.log('handleChainStart'),
//   handleChainEnd: () => console.log('handleChainEnd'),
//   handleChainError: () => console.log('handleChainError'),
//   handleChatModelStart: () => console.log('handleChatModelStart'),
//   handleAgentAction: () => console.log('handleAgentAction'),
//   handleAgentEnd: () => console.log('handleAgentEnd'),
//   handleToolStart: () => console.log('handleToolStart'),
//   handleToolEnd: () => console.log('handleToolEnd'),
//   handleToolError: () => console.log('handleToolError'),
//   handleText: () => console.log('handleText'),
//   handleRetrieverStart: () => console.log('handleRetrieverStart'),
//   handleRetrieverEnd: () => console.log('handleRetrieverEnd'),
//   handleRetrieverError: () => console.log('handleRetrieverError'),
//   }]
  // callbacks: [customTracer.agentTracer()],
});

// test the agent for the getScheduleEventsByUser tool
const result = await executor.invoke({
    input: 'I want to see the schedule of events for alice',
});

// test the agent for the registerForEvent tool, without providing the user_name
// const result = await executor.invoke({
//     input: 'register for event of data science on this evening',
// });

// test the agent for the registerForEvent tool
// const result = await executor.invoke({
//   input: 'I want to register for the event mock event 1, my name is Juan',
// });

console.log('result:\n\n', result.output, '\n\n');
customTracer.sumTokens();
console.log('tokens used:', {
  input: customTracer.inputTokens,
  output: customTracer.outputTokens,
  total: customTracer.totalTokens,
});
