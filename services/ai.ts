import { AppSettings } from '../types';

export interface AIResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
    error?: {
        message: string;
    };
}

export const summarizeArticle = async (content: string, settings: AppSettings): Promise<string> => {
    if (!settings.aiApiKey) {
        throw new Error('API Key is missing');
    }

    // Strip HTML tags to save tokens and reduce noise
    const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000); // Limit length

    const targetLanguage = settings.language === 'zh' ? 'Simplified Chinese' : 'English';
    const prompt = `Please summarize the following article in ${targetLanguage}. 
    Rules:
    1. Output strictly in ${targetLanguage}.
    2. Keep it concise and capture the key points.
    3. Use Markdown formatting.
    
    Article Content:
    ${plainText}`;

    try {
        const response = await fetch(`${settings.aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.aiApiKey}`,
            },
            body: JSON.stringify({
                model: settings.aiModel,
                messages: [
                    { role: 'system', content: 'You are a helpful reading assistant.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
        }

        const data: AIResponse = await response.json();
        return data.choices[0]?.message?.content || 'No summary generated.';
    } catch (error) {
        console.error('AI Request Failed:', error);
        throw error;
    }
};

export const generateDailyDigest = async (articles: any[], settings: AppSettings): Promise<string> => {
    if (!settings.aiApiKey) {
        throw new Error('API Key is missing');
    }

    if (articles.length === 0) {
        return "No articles found for the last 24 hours.";
    }

    // Create a concise list of articles
    const articleList = articles.map(a => {
        let snippet = a.contentSnippet || '';
        if (!snippet && a.content) {
            snippet = a.content.replace(/<[^>]*>/g, ' ').substring(0, 300);
        } else if (snippet.length > 300) {
            snippet = snippet.substring(0, 300);
        }
        // Clean up whitespace
        snippet = snippet.replace(/\s+/g, ' ').trim();

        return `- Title: ${a.title}\n  Source: ${a.feedTitle || 'Unknown'}\n  Content: ${snippet}...\n  ID: ${a.id}`;
    }).join('\n\n');

    const targetLanguage = settings.language === 'zh' ? 'Simplified Chinese' : 'English';
    const prompt = `Please generate a "Daily Digest" based on the following list of articles (titles and content snippets) from the last 24 hours.
    
    Rules:
    1. Group the news by topic (e.g., Technology, World, Business, etc.).
    2. Provide a brief 1-sentence summary for each key story, using the content snippet for more context.
    3. Use Markdown formatting (bold headers, bullet points).
    4. Keep it concise and easy to read.
    5. Language: Output strictly in ${targetLanguage}.
    6. Attribution: For each item, YOU MUST include the source name linked to the original article using its ID. Format: ([Source Name](#ID)).

    Articles:
    ${articleList}`;

    try {
        const response = await fetch(`${settings.aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.aiApiKey}`,
            },
            body: JSON.stringify({
                model: settings.aiModel,
                messages: [
                    { role: 'system', content: 'You are a helpful news editor.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
        }

        const data: AIResponse = await response.json();
        return data.choices[0]?.message?.content || 'No digest generated.';
    } catch (error) {
        console.error('AI Request Failed:', error);
        throw error;
    }
};

export const generateDailyDigestStream = async (
    articles: any[],
    settings: AppSettings,
    onProgress: (chunk: string) => void
): Promise<string> => {
    if (!settings.aiApiKey) {
        throw new Error('API Key is missing');
    }

    if (articles.length === 0) {
        return "No articles found for the last 24 hours.";
    }

    // Create a concise list of articles
    const articleList = articles.map(a => {
        let snippet = a.contentSnippet || '';
        if (!snippet && a.content) {
            snippet = a.content.replace(/<[^>]*>/g, ' ').substring(0, 300);
        } else if (snippet.length > 300) {
            snippet = snippet.substring(0, 300);
        }
        // Clean up whitespace
        snippet = snippet.replace(/\s+/g, ' ').trim();

        return `- Title: ${a.title}\n  Source: ${a.feedTitle || 'Unknown'}\n  Content: ${snippet}...\n  ID: ${a.id}`;
    }).join('\n\n');

    const targetLanguage = settings.language === 'zh' ? 'Simplified Chinese' : 'English';
    const prompt = `You are a professional news editor. Generate a structured "Daily Digest" from the provided articles.

    **Structure & Style:**
    1.  **Executive Summary:** Start with a 2-3 sentence high-level overview of the day's most important themes.
    2.  **Categorized Sections:** Group stories logically (e.g., "Global Affairs", "Technology & Innovation", "Markets", "Culture"). Do NOT use generic "Topic 1" headers.
    3.  **Narrative Flow:** Write in cohesive paragraphs, not just bullet points. Connect related stories.
    4.  **Conciseness:** Be brief but informative.
    5.  **Language:** Output strictly in ${targetLanguage}.

    **Critical Citation Rule:**
    - Every claim or story MUST cite its source immediately.
    - Format: ([Source Name](#ID))
    - Example: "Apple announced a new iPhone ([TechCrunch](#123))."
    - The ID is provided in the article list below. DO NOT make up IDs.

    **Articles:**
    ${articleList}`;

    try {
        const response = await fetch(`${settings.aiBaseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.aiApiKey}`,
            },
            body: JSON.stringify({
                model: settings.aiModel,
                messages: [
                    { role: 'system', content: 'You are a helpful news editor.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                stream: true, // Enable streaming
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `HTTP Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';

        if (!reader) {
            throw new Error('Response body is not readable');
        }

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;
                            onProgress(fullContent);
                        }
                    } catch (e) {
                        console.warn('Error parsing stream chunk', e);
                    }
                }
            }
        }

        return fullContent || 'No digest generated.';
    } catch (error) {
        console.error('AI Request Failed:', error);
        throw error;
    }
};
