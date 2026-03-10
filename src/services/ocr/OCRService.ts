// OCR Service — Uses OpenAI Vision API to extract text from images

export async function extractTextFromImage(
    imageDataUrl: string,
    apiKey: string,
    model: string = 'gpt-4.1-mini'
): Promise<string> {
    if (!apiKey) {
        throw new Error('OpenAI API key not configured. Please set it in extension options.');
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    const body = {
        model,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Extract all visible text from this image. Return only the extracted text exactly as it appears, preserving line breaks and formatting. Do not add any commentary, explanations, or annotations.',
                    },
                    {
                        type: 'image_url',
                        image_url: {
                            url: imageDataUrl,
                            detail: 'high',
                        },
                    },
                ],
            },
        ],
        max_tokens: 4096,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
            errorData?.error?.message ||
            `API request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    return text;
}
