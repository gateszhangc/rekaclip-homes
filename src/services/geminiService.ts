import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { DescribeOption } from "../types/image-describer";

// Helper to get the prompt based on selection
const getPromptForOption = (option: DescribeOption, customQuestion?: string): string => {
  switch (option) {
    case DescribeOption.DETAIL:
      return "Describe this image in extreme detail. Include lighting, colors, composition, subjects, and atmosphere.";
    case DescribeOption.BRIEF:
      return "Provide a brief, one-sentence caption for this image.";
    case DescribeOption.PERSON:
      return "Describe the people in this image. Focus on appearance, clothing, expressions, and actions. Do not hallucinate identities.";
    case DescribeOption.OBJECTS:
      return "List all the distinct objects visible in this image.";
    case DescribeOption.ART_STYLE:
      return "Analyze the art style, medium, and technique used in this image.";
    case DescribeOption.EXTRACT_TEXT:
      return "Extract and transcribe all legible text found in this image.";
    case DescribeOption.GENERAL_PROMPT:
      return "Write a high-quality text-to-image prompt that could be used to recreate this image.";
    case DescribeOption.FLUX_PROMPT:
      return "Write a prompt optimized for the FLUX AI image generator based on this image.";
    case DescribeOption.MIDJOURNEY:
      return "Write a detailed Midjourney prompt (v6) for this image. Include aspect ratio parameters if applicable.";
    case DescribeOption.STABLE_DIFFUSION:
      return "Write a Stable Diffusion prompt for this image, including positive and negative prompts.";
    case DescribeOption.CUSTOM:
      return customQuestion || "Describe this image.";
    default:
      return "Describe this image.";
  }
};

export const streamImageDescription = async function* (
  imageBase64: string,
  option: DescribeOption,
  language: string,
  customQuestion?: string
) {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set NEXT_PUBLIC_GEMINI_API_KEY or GEMINI_API_KEY in your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const basePrompt = getPromptForOption(option, customQuestion);
  const finalPrompt = `${basePrompt}\n\nIMPORTANT: Please provide the response in ${language}.`;

  // Strip prefix if present for the API call
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash-image', // "nano banana" / gemini-2.5-flash-image
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: finalPrompt
          }
        ]
      }
    });

    for await (const chunk of responseStream) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        yield c.text;
      }
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};