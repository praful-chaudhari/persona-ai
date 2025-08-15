import Joi from "joi";
import logger from "../utils/logger.js";

// Simplified message validation schema
const messageSchema = Joi.object({
    role: Joi.string().valid("user", "assistant", "system").required(),
    content: Joi.string().min(1).max(4000).required(),
    timestamp: Joi.string().optional(),
});

// Simplified persona validation schema - only required fields
const personaSchema = Joi.object({
    id: Joi.string().min(1).required(),
    name: Joi.string().min(1).required(),
    systemPrompt: Joi.string().min(1).required(),
    temperature: Joi.number().min(0).max(2).required(),
    maxTokens: Joi.number().min(1).max(4000).required(),
}).unknown(true); // Allow additional fields

// Chat request validation schema
const chatRequestSchema = Joi.object({
    messages: Joi.array().items(messageSchema).min(1).max(50).required(),
    persona: personaSchema.required(),
});

// Validation middleware with better error messages
export const validateChatRequest = (req, res, next) => {
    const { error, value } = chatRequestSchema.validate(req.body, {
        allowUnknown: true,
        stripUnknown: false,
    });

    if (error) {
        logger.warn("Validation error details", {
            error: error.details[0].message,
            path: error.details.path,
            receivedBody: JSON.stringify(req.body, null, 2),
            ip: req.ip,
        });

        return res.status(400).json({
            error: "Invalid request format",
            details: error.details.message,
            field: error.details.path
                ? error.details.path.join(".")
                : "unknown",
        });
    }

    // Additional business logic validation
    const lastMessage = value.messages[value.messages.length - 1];
    if (lastMessage.role !== "user") {
        return res.status(400).json({
            error: "Last message must be from user",
            details: "The conversation should end with a user message",
        });
    }

    req.validatedBody = value;
    next();
};

export default { validateChatRequest };
