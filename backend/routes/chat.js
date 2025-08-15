import express from "express";
import openai from "../config/openai.js";
import { validateChatRequest } from "../middleware/validation.js";
import { chatRateLimit } from "../middleware/rateLimit.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Chat endpoint with ChatML format and traditional null checking
router.post("/", chatRateLimit, validateChatRequest, async (req, res) => {
    try {
        const { messages, persona } = req.validatedBody;

        logger.info("Chat request received", {
            personaId: persona.id,
            personaName: persona.name,
            messageCount: messages.length,
            lastMessage:
                messages[messages.length - 1] &&
                messages[messages.length - 1].content
                    ? messages[messages.length - 1].content.substring(0, 100)
                    : "No content",
            ip: req.ip,
        });

        // Prepare ChatML formatted messages
        const chatMessages = [];

        // Add system message in ChatML format
        chatMessages.push({
            role: "system",
            content: persona.systemPrompt,
        });

        // Add user messages, ensuring proper ChatML format
        const userMessages = messages.filter((msg) => msg.role !== "system");
        userMessages.forEach((msg) => {
            if (msg.role && msg.content) {
                chatMessages.push({
                    role: msg.role,
                    content: msg.content.toString().trim(),
                });
            }
        });

        // Log the ChatML request
        logger.info("Making OpenAI request with ChatML format", {
            model: "gpt-3.5-turbo",
            temperature: persona.temperature,
            maxTokens: persona.maxTokens,
            messageCount: chatMessages.length,
            chatMLMessages: chatMessages,
        });

        // Create completion request using ChatML
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: chatMessages,
            temperature: persona.temperature || 0.7,
            max_tokens: persona.maxTokens || 1000,
            presence_penalty: 0.1,
            frequency_penalty: 0.1,
            stream: false,
        });

        // Log the full OpenAI response for debugging (without optional chaining)
        logger.info("OpenAI raw response structure", {
            hasCompletion: completion !== null && completion !== undefined,
            hasChoices:
                completion &&
                completion.choices !== null &&
                completion.choices !== undefined,
            choicesLength:
                completion && completion.choices
                    ? completion.choices.length
                    : 0,
            hasFirstChoice:
                completion &&
                completion.choices &&
                completion.choices[0] !== undefined,
            hasMessage:
                completion &&
                completion.choices &&
                completion.choices &&
                completion.choices.message !== undefined,
            hasContent:
                completion &&
                completion.choices &&
                completion.choices &&
                completion.choices.message &&
                completion.choices.message.content !== undefined,
            responsePreview:
                completion &&
                completion.choices &&
                completion.choices &&
                completion.choices.message
                    ? completion.choices.message.content
                    : "No content available",
        });

        // Validate OpenAI response structure (traditional null checking)
        if (!completion) {
            throw new Error("OpenAI returned null/undefined completion");
        }

        if (!completion.choices || !Array.isArray(completion.choices)) {
            throw new Error("OpenAI response missing choices array");
        }

        if (completion.choices.length === 0) {
            throw new Error("OpenAI response has empty choices array");
        }

        const firstChoice = completion.choices[0];
        if (!firstChoice) {
            throw new Error("OpenAI response first choice is undefined");
        }

        if (!firstChoice.message) {
            throw new Error("OpenAI response missing message object");
        }

        if (typeof firstChoice.message.content !== "string") {
            throw new Error(
                "OpenAI response content is not a string: " +
                    typeof firstChoice.message.content
            );
        }

        // Extract the content safely
        const messageContent = firstChoice.message.content;

        if (!messageContent || messageContent.trim().length === 0) {
            throw new Error("OpenAI returned empty message content");
        }

        // Build response with safe property access
        const response = {
            message: messageContent.trim(),
            usage: {
                promptTokens:
                    completion.usage && completion.usage.prompt_tokens
                        ? completion.usage.prompt_tokens
                        : 0,
                completionTokens:
                    completion.usage && completion.usage.completion_tokens
                        ? completion.usage.completion_tokens
                        : 0,
                totalTokens:
                    completion.usage && completion.usage.total_tokens
                        ? completion.usage.total_tokens
                        : 0,
            },
            model: completion.model || "gpt-3.5-turbo",
            persona: {
                id: persona.id,
                name: persona.name,
            },
        };

        logger.info("Chat response generated successfully", {
            personaId: persona.id,
            tokensUsed:
                completion.usage && completion.usage.total_tokens
                    ? completion.usage.total_tokens
                    : 0,
            responseLength: messageContent.length,
            ip: req.ip,
        });

        res.json(response);
    } catch (error) {
        // Enhanced error logging without optional chaining
        logger.error("Chat endpoint error - FULL DETAILS", {
            errorName: error.name,
            errorMessage: error.message,
            errorCode: error.code,
            errorType: error.type,
            errorStatus: error.status,
            requestBody: {
                personaId:
                    req.validatedBody && req.validatedBody.persona
                        ? req.validatedBody.persona.id
                        : "unknown",
                personaName:
                    req.validatedBody && req.validatedBody.persona
                        ? req.validatedBody.persona.name
                        : "unknown",
                messageCount:
                    req.validatedBody && req.validatedBody.messages
                        ? req.validatedBody.messages.length
                        : 0,
            },
            ip: req.ip,
        });

        // Handle specific OpenAI errors
        if (error.code === "insufficient_quota") {
            return res.status(402).json({
                error: "API quota exceeded. Please check your OpenAI billing.",
                code: "insufficient_quota",
            });
        }

        if (error.code === "rate_limit_exceeded") {
            return res.status(429).json({
                error: "OpenAI rate limit exceeded. Please try again in a moment.",
                code: "rate_limit_exceeded",
            });
        }

        if (error.code === "invalid_api_key" || error.status === 401) {
            return res.status(401).json({
                error: "Invalid OpenAI API key configuration.",
                code: "invalid_api_key",
            });
        }

        if (error.code === "model_not_found" || error.status === 404) {
            return res.status(400).json({
                error: "AI model not available. Trying with GPT-3.5-turbo.",
                code: "model_not_found",
            });
        }

        if (error.code === "context_length_exceeded") {
            return res.status(400).json({
                error: "Message too long. Please shorten your conversation.",
                code: "context_length_exceeded",
            });
        }

        // Handle response structure errors
        if (
            error.message.includes("choices") ||
            error.message.includes("message") ||
            error.message.includes("content")
        ) {
            return res.status(502).json({
                error: "Invalid response from OpenAI API. Please try again.",
                code: "invalid_response_structure",
                details: error.message,
            });
        }

        // Network errors
        if (error.message && error.message.includes("ENOTFOUND")) {
            return res.status(503).json({
                error: "Cannot connect to OpenAI. Check your internet connection.",
                code: "network_error",
            });
        }

        // Generic error response
        res.status(500).json({
            error: "Failed to generate response. Please try again.",
            code: "unknown_error",
            details:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
});

export default router;
