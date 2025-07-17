import { GoogleGenerativeAI } from '@google/generative-ai';
import { basePrompt as nodeBasePrompt } from '../defaults/node.js';
import { basePrompt as reactBasePrompt } from '../defaults/react.js';
import { BASE_PROMPT, getSystemPrompt } from './prompt.js';

export const aiTemplateService = async (req, res) => {
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Updated model version

        const systemPrompt = "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra";

        const prompt = {
            systemInstruction: systemPrompt,
            contents: [{
                role: 'user',
                parts: [{ text: message }],
            }],
        };

        const result = await model.generateContent(prompt);
        const response = result.response;
        const answer = response.text().trim().toLowerCase();

        console.log('AI Response:', answer);

        if (answer.includes('react')) {
            return res.status(200).json({
                prompts: [BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you. \nConsider the contents 
                of all files in the project .\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n - package-lock.json\n`],

                uiPrompts: [reactBasePrompt]
            });

        } else if (answer.includes('node')) {
            return res.status(200).json({
                prompts: [BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you. \nConsider the contents 
                of all files in the project .\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n - .gitignore\n - package-lock.json\n`],

                uiPrompts: [nodeBasePrompt]
            });
        }

        return res.status(400).json({
            error: "Unexpected response from AI",
            received: answer
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({
            error: error.message || "An error occurred while processing your request.",
            serviceName: "aiTemplateService"
        });
    }
}

export const aiService = async (req, res) => {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required." });
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Initialize model with maxOutputTokens and retries config
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Updated model version
            generationConfig: {
                maxOutputTokens: 12000,
            }
        });

        // Rest of the code remains the same...
        const systemPrompt = getSystemPrompt();

        const formattedContents = messages.map(msg => ({
            role: msg.role || "user",
            parts: [{ text: msg.content }]
        }));

        const prompt = {
            systemInstruction: systemPrompt,
            contents: formattedContents
        };

        console.log('Sending to Gemini:', JSON.stringify(prompt, null, 2));

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Transfer-Encoding', 'chunked');

        try {
            const MAX_RETRIES = 3;
            let retries = 0;
            let success = false;

            while (!success && retries < MAX_RETRIES) {
                try {
                    const result = await model.generateContentStream(prompt);
                    
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        res.write(chunkText);
                    }
                    
                    success = true;
                } catch (streamError) {
                    retries++;
                    console.log(`Stream error (attempt ${retries}/${MAX_RETRIES}):`, streamError.message);
                    
                    if (streamError.status === 503) {
                        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
                    } else if (retries >= MAX_RETRIES) {
                        throw streamError;
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!success) {
                throw new Error("Failed to generate content after multiple retries");
            }

            res.end();
        } catch (streamingError) {
            console.error("Streaming failed completely:", streamingError);
            
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: "AI service temporarily unavailable. Please try again later.",
                details: streamingError.message,
                status: streamingError.status || 500
            }));
        }

    } catch (error) {
        console.error("API Error:", error);
        
        if (!res.headersSent) {
            res.status(500).json({
                error: "An error occurred while processing your request.",
                details: error.message,
                serviceName: "aiService"
            });
        } else {
            res.end(JSON.stringify({
                error: "Service interrupted. Please try again later.",
                details: error.message
            }));
        }
    }
};