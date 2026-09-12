import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

function calculateEmissions(activityAmount: number, emissionFactor: number): number {
  return activityAmount * emissionFactor;
}

function getEmissionFactor(activityType: string, region: string): number {
  const factors: Record<string, number> = {
    "electricity": 0.383, // kgCO2e/kWh (Example EPA)
    "diesel_freight": 2.68, // kgCO2e/liter
  };
  return factors[activityType] || 0.0;
}

const calculateEmissionsDeclaration: FunctionDeclaration = {
  name: "calculate_emissions",
  description: "Performs deterministic arithmetic to prevent LLM math hallucinations. Calculates total emissions (tCO2e) = Activity x Emission Factor.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      activity_amount: {
        type: Type.NUMBER,
        description: "The amount of the activity.",
      },
      emission_factor: {
        type: Type.NUMBER,
        description: "The emission factor for the activity.",
      },
    },
    required: ["activity_amount", "emission_factor"],
  },
};

const getEmissionFactorDeclaration: FunctionDeclaration = {
  name: "get_emission_factor",
  description: "Looks up the official EPA/DEFRA emission factor for a specific activity.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      activity_type: {
        type: Type.STRING,
        description: "The type of activity, e.g., 'electricity', 'diesel_freight'.",
      },
      region: {
        type: Type.STRING,
        description: "The region for the emission factor lookup.",
      },
    },
    required: ["activity_type", "region"],
  },
};

export async function runEsgCopilot(documentText: string): Promise<string> {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: "You are an ESG Compliance Copilot. Extract data, classify Scope 1/2/3, use tools for factor lookups and ALL math. Redact PII.",
      tools: [{ functionDeclarations: [calculateEmissionsDeclaration, getEmissionFactorDeclaration] }],
    },
  });

  let response = await chat.sendMessage({
    message: `Analyze this invoice/ERP data and generate a CSRD disclosure: ${documentText}`,
  });

  while (response.functionCalls && response.functionCalls.length > 0) {
    const parts: any[] = [];
    for (const call of response.functionCalls) {
      if (call.name === "calculate_emissions") {
        const args = call.args as any;
        const result = calculateEmissions(args.activity_amount, args.emission_factor);
        parts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result },
          },
        });
      } else if (call.name === "get_emission_factor") {
        const args = call.args as any;
        const result = getEmissionFactor(args.activity_type, args.region);
        parts.push({
          functionResponse: {
            id: call.id,
            name: call.name,
            response: { result },
          },
        });
      }
    }

    if (parts.length > 0) {
      response = await chat.sendMessage({
        message: parts,
      });
    } else {
      break;
    }
  }

  return response.text || "";
}
