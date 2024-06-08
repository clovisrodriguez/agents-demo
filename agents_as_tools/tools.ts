import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

export const getScheduleEventsByUser = new DynamicStructuredTool({
  name: 'getScheduleEventsByUser',
  description: 'Obtiene las citas para cada usuario',
  schema: z.object({
    user_name: z.string(),
  }),
  func: async ({ user_name }) => {
    const name = user_name.toLowerCase() as keyof typeof users;

    // let's pretend this is a database
    const users = {
      juan: [
        {
          name: 'consulta',
          date: '2024-06-01',
          time: '10:00',
        },
      ],
      andrea: [
        {
          name: 'control',
          date: '2024-06-12',
          time: '12:00',
        },
        {
          name: 'control',
          date: '2024-06-24',
          time: '13:00',
        },
      ],
    };

    const schedule = users?.[name];

    if (!schedule) {
      return `Lo siento, no ha cita para ${name}`;
    }

    return `citas encontradas: ${JSON.stringify(schedule)}`;
  },
});

export const createAppoinment = new DynamicStructuredTool({
  name: 'createAppoinment',
  description: 'Crea una cita para un usuario',
  schema: z.object({
    user_name: z.string(),
    schedule: z.object({
      date: z.string(),
      time: z.string(),
    }),
  }),
  func: async ({ user_name, schedule }) => {
    if (!user_name) {
      return `Por favor, proporciona un nombre de usuario`;
    }

    if (!schedule) {
      return `Por favor, proporciona un horario para la cita`;
    }

    return `Cita creada para ${user_name} en ${schedule}`;
  },
});

const users: any = {
  juan: {
    profile: {
      name: 'Juan',
      age: 30,
    },
    procedures: [
      {
        name: 'consulta',
        date: '2024-06-01',
        time: '10:00',
        description:
          'Consulta general, paciente presenta dolor de muela. Se receta analgésico. tomar cada 8 horas. por 3 días.',
        medications: ['Analgésico'],
      },
      {
        name: 'control',
        date: '2024-06-15',
        time: '10:30',
        description:
          'Revisión del dolor de muela, mejora notable. Se receta continuar con analgésicos. tomar cada 8 horas. por 2 días.',
        medications: ['Analgésico'],
      },
    ],
  },
  andrea: {
    profile: {
      name: 'Andrea',
      age: 25,
    },
    procedures: [
      {
        name: 'control',
        date: '2024-06-12',
        time: '12:00',
        description:
          'Control rutinario, todo en orden. No se recetan medicamentos.',
        medications: [],
      },
      {
        name: 'control',
        date: '2024-06-24',
        time: '13:00',
        description:
          'Seguimiento a tratamiento de control. No se recetan medicamentos.',
        medications: [],
      },
    ],
  },
};

export class PatientHistory {
  private user_name: string;
  private profile: { name: string; age: number } | null;
  private history: {
    date: string;
    name: string;
    description: string;
    medications: string[];
  }[];

  constructor(user_name: string) {
    this.user_name = user_name.toLowerCase();
    const user = users[this.user_name];
    if (user) {
      this.profile = user.profile;
      this.history = user.procedures.map((proc: any) => ({
        date: proc.date,
        name: proc.name,
        description: proc.description,
        medications: proc.medications,
      }));
    } else {
      this.profile = null;
      this.history = [];
    }
  }

  async initHistory() {
    if (!this.profile) {
      throw new Error(`Usuario ${this.user_name} no encontrado.`);
    }

    // simula una llamada al db
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return `Historia clínica iniciada para ${this.profile.name}, ${this.profile.age} años.`;
  }

  public addHistory() {
    return new DynamicStructuredTool({
      name: 'addHistory',
      description: 'Añade un registro a la historia clínica de un paciente',
      schema: z.object({
        date: z.string(),
        name: z.string(),
        description: z.string(),
        medications: z.array(z.string()),
      }),
      func: async ({
        date,
        name,
        description,
        medications,
      }: {
        date: string;
        name: string;
        description: string;
        medications: string[];
      }) => {
        if (!this.profile) {
          throw new Error(`Usuario ${this.user_name} no encontrado.`);
        }

        this.history.push({ date, name, description, medications });
        return `Registro añadido a la historia clínica de ${this.user_name}.`;
      },
    });
  }

  getHistory() {
    return new DynamicStructuredTool({
      name: 'getHistory',
      description: 'Obtiene la historia clínica de un paciente',
      schema: z.object({
        user_name: z.string(),
      }),
      func: async () => {
        // simula una llamada al db
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (!this.profile) {
          throw new Error(`Usuario ${this.user_name} no encontrado.`);
        }
        return JSON.stringify(this.history);
      },
    });
  }

  getMedicalCare() {
    return new DynamicStructuredTool({
      name: 'getMedicalCare',
      description: 'Obtiene los cuidados médicos de un paciente',
      schema: z.object({
        user_name: z.string(),
      }),
      func: async () => {
        if (!this.profile) {
          throw new Error(`Usuario ${this.user_name} no encontrado.`);
        }
        return this.history
          .map(
            (entry) =>
              `${entry.date}: ${
                entry.description
              } Medicamentos: ${entry.medications.join(', ')}`
          )
          .join('\n');
      },
    });
  }

  getProfile() {
    return new DynamicStructuredTool({
      name: 'getProfile',
      description: 'Obtiene el perfil de un paciente',
      schema: z.object({
        user_name: z.string(),
      }),
      func: async () => {
        if (!this.profile) {
          throw new Error(`Usuario ${this.user_name} no encontrado.`);
        }
        return JSON.stringify(this.profile);
      },
    });
  }
}
