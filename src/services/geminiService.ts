export const generateAIResponse = async (userMessage: string): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.response || 'Unable to generate response.';
  } catch (error) {
    console.error('Gemini API Error:', error);
    return `Sorry, I encountered an error: ${(error as Error).message}. Please try again later.`;
  }
};

export const generatePlatformOptimizations = async (): Promise<string> => {
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'You are a UX analyst. Based on common workplace intranet patterns, provide 3-5 specific, actionable suggestions for improving the PICC Platform structure. Focus on reducing navigation depth for frequently-accessed features like Commission Structure and PPP Status.'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate optimizations: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || 'Unable to generate suggestions.';
  } catch (error) {
    console.error('Optimization API Error:', error);
    return 'Unable to analyze workspace at this time. Please check your Gemini API configuration.';
  }
};
