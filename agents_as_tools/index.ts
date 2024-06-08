import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { createAppoinment, getScheduleEventsByUser } from './tools';
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents';
import { nurseAgent } from './agent_as_a_tool';

const firstLayerAgent = async (query: string) => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `
              Eres un asistente que trabaja en un consultorio médico, ayudas con las dudas generales
              que tengan los pacientes, con respecto a sus citas, pagos y cuaidados de salud.
              `,
    ],
    ['user', '{input}'],
    new MessagesPlaceholder({
      variableName: 'agent_scratchpad',
      optional: false,
    }),
  ]);

  const tools = [getScheduleEventsByUser, createAppoinment, nurseAgent];

  const llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.15,
  });

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  const executor = new AgentExecutor({
    agent,
    tools,
  });

  const result = await executor.invoke({
    input: query,
  });

  return result.output;
};

const response = await firstLayerAgent('Hola mi nombre es Juan y quiero saber que me mando el doctor en la ultima consulta');
console.log(response);