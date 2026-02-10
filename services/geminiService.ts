import { GoogleGenAI } from "@google/genai";
import { MOCK_NOTION_PAGES } from "../constants";

// Initialize Gemini Client
// Note: In a real app, ensure API_KEY is set in your environment variables.
// Since we cannot prompt for it in a strictly UI output, we assume process.env.API_KEY is available or handle gracefully.
const apiKey = process.env.API_KEY || ''; 

// We construct a system prompt that includes the "Notion" knowledge base
const constructSystemInstruction = () => {
  const knowledgeBase = MOCK_NOTION_PAGES.map(p => 
    `Title: ${p.title}\nCategory: ${p.category}\nContent: ${p.content}`
  ).join('\n\n');

  return `You are the PICC Platform Intranet Assistant. 
  You help Sales Ops, Sales Reps, Ambassadors, and Finance teams find information.
  
  Here is the current internal knowledge base (simulating Notion data):
  ---
  ${knowledgeBase}
  ---
  
  Answer questions based on this knowledge base. If the answer isn't there, say you don't know but offer to draft a message to the relevant team.
  Be concise, professional, and helpful. Use markdown for formatting.`;
};

export const generateAIResponse = async (userMessage: string): Promise<string> => {
  if (!apiKey) {
    return "⚠️ API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY to use the AI features.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: constructSystemInstruction(),
      },
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error while processing your request. Please try again later.";
  }
};

export const generatePlatformOptimizations = async (): Promise<string> => {
  if (!apiKey) return "API Key missing. Cannot run platform analysis.";

  const ai = new GoogleGenAI({ apiKey });
  
  // Create a rich context of the "Notion Workspace" including hidden insights like Meeting Notes
  const docsContext = MOCK_NOTION_PAGES.map(d => 
    `TYPE: ${d.category}\nTITLE: ${d.title}\nCONTENT: ${d.content}`
  ).join('\n\n');

  const prompt = `
    You are a Senior Product Manager and UX Strategist for the PICC Platform. 
    
    Your task is to analyze the following "Notion Workspace" content, which includes formal policies, sales assets, and informal meeting notes/feedback.
    Identify patterns in user behavior, complaints, and information gaps. 
    Based on this analysis, recommend 3 specific, high-impact structural changes to the PICC Platform Intranet (the app itself) to improve user experience.

    Notion Workspace Content:
    -----------------------
    ${docsContext}
    -----------------------

    Instructions:
    1. Think deeply about the connections between different documents (e.g., if a policy exists but people keep asking about it in meeting notes, that's a discoverability issue).
    2. Suggest actionable changes to the UI/UX (e.g., "Add a Widget," "Create a Shortcut," "Rename a Section").
    3. Format the output as a clean Markdown list.

    Output Structure for each suggestion:
    ### [Title of Optimization]
    **Observation:** [What specific content in Notion led to this insight?]
    **Recommendation:** [What specific change should be made to the App?]
    **Expected Impact:** [Why will this help?]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using the reasoning model
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // High budget for deep analysis of patterns
      }
    });
    return response.text || "Analysis complete, but no specific suggestions were generated.";
  } catch (e) {
    console.error("Analysis Error:", e);
    return "Failed to analyze platform data. Please try again later.";
  }
};
