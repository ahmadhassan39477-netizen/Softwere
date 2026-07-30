import OpenAI from "openai";

function client() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function rewriteListing(title: string, description: string) {
  const response = await client().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return valid JSON with exactly two string fields: title and description. Do not invent product facts.",
      },
      {
        role: "user",
        content: `Rewrite this product listing for Facebook Marketplace, make it attractive, add 5 bullet points, keep it under 150 words.\n\nTitle: ${title}\nDescription: ${description}`,
      },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (!content) throw new Error("AI returned an empty response");
  return JSON.parse(content) as { title: string; description: string };
}

export async function createSalesReply(productDetails: string, message: string) {
  const response = await client().chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.6,
    max_tokens: 180,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful sales assistant for Glamore Beds. Never claim to be human; clearly say you are an AI assistant when relevant. Do not invent availability, delivery, or product facts.",
      },
      {
        role: "user",
        content: `Product is ${productDetails}. Customer asks: ${message}. Reply in friendly, human, short style in English and Roman Urdu. Ask if they want to confirm order. Never claim to be human, say you are AI assistant.`,
      },
    ],
  });
  return response.choices[0]?.message.content?.trim() || "";
}
