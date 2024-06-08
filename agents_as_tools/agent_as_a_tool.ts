import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatPromptTemplate, MessagesPlaceholder } from 'langchain/prompts';
import { PatientHistory } from './tools';
import { createOpenAIFunctionsAgent, AgentExecutor } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const secondLayerAgent = async (user_name: string, query: string) => {
  try {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `
                    Eres un enfermero que trabaja en un consultorio médico, ayudas con los cuidados de salud
                    asistes al equipo de consultas, obteninedo información de los pacientes y proporcionando
                    los cuados de salud de acuerdo a los procedimientos que se han realizado a los pacientes.
                    `,
      ],
      ['user', '{input}'],
      new MessagesPlaceholder({
        variableName: 'agent_scratchpad',
        optional: false,
      }),
    ]);

    const patientHistory = new PatientHistory(user_name);

    await patientHistory.initHistory();

    const tools = [
      patientHistory.getHistory(),
      patientHistory.getMedicalCare(),
      patientHistory.addHistory(),
      patientHistory.getProfile(),
    ];

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
  } catch (error) {
    return `No se encontró información para el usuario ${user_name}`;
  }
};

export const nurseAgent = new DynamicStructuredTool({
  name: 'nurseAgent',
  description: 'Indica los cuidados de salud que debe seguir el paciente, si tiene preguntas sobre que se le ha realizado en consultas anteriores o si necesita información de su perfil.',
  schema: z.object({
    user_name: z.string(),
    query: z
      .string()
      .describe('Consulta que tienes específica para el enfermero'),
  }),
  func: async ({ user_name, query }) => {
    const result = await secondLayerAgent(user_name, query);
    return result;
  },
});
