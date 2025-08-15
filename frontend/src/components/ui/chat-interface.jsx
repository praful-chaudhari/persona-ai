import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, User, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";

const ChatInterface = ({ selectedPersona }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef(null);
    const { theme } = useTheme();

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop =
                scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        setMessages([]);
        toast.info(`Conversation cleared`, {
            description: `Starting fresh with ${selectedPersona.name}`,
            duration: 2000,
        });
    }, [selectedPersona.id]);

    // Sanitization functions
    const sanitizeMessages = (msgs) => {
        return msgs
            .map((msg) => ({
                role: String(msg.role || "user").trim(),
                content: String(msg.content || "").trim(),
                timestamp: msg.timestamp || new Date().toISOString(),
            }))
            .filter((msg) => msg.content.length > 0);
    };

    const sanitizePersona = (persona) => {
        return {
            id: String(persona.id || "").trim(),
            name: String(persona.name || "").trim(),
            systemPrompt: String(
                persona.systemPrompt || "You are a helpful assistant."
            ).trim(),
            temperature:
                typeof persona.temperature === "number"
                    ? Math.max(0, Math.min(2, persona.temperature))
                    : 0.7,
            maxTokens:
                typeof persona.maxTokens === "number"
                    ? Math.max(1, Math.min(4000, persona.maxTokens))
                    : 1000,
        };
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = {
            role: "user",
            content: input.trim(),
            timestamp: new Date().toISOString(),
        };

        // Create sanitized payload
        const newMessages = sanitizeMessages([...messages, userMessage]);
        const safePersona = sanitizePersona(selectedPersona);

        // Validate required fields
        if (!safePersona.id || !safePersona.name || !safePersona.systemPrompt) {
            toast.error("Invalid persona configuration", {
                description: "Please refresh the page and try again",
                duration: 4000,
            });
            return;
        }

        setMessages(newMessages);
        setInput("");
        setIsLoading(true);

        const payload = {
            messages: newMessages,
            persona: safePersona,
        };

        console.log("=== SENDING PAYLOAD ===");
        console.log(JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/chat`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.log("Error response:", errorText);

                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorMessage;
                    if (errorData.details) {
                        console.log("Validation details:", errorData.details);
                    }
                } catch (e) {
                    console.log("Could not parse error response as JSON");
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log("Success response:", data);

            setMessages([
                ...newMessages,
                {
                    role: "assistant",
                    content: data.message,
                    timestamp: new Date().toISOString(),
                },
            ]);

            if (newMessages.length === 1) {
                toast.success(`${selectedPersona.name} responded!`, {
                    duration: 2000,
                });
            }
        } catch (error) {
            console.error("Chat error:", error);

            // Rollback on error
            setMessages(messages);

            if (error.message.includes("Invalid request format")) {
                toast.error("Request validation failed", {
                    description: "Check console for details. Please try again.",
                    duration: 5000,
                });
            } else if (error.message.includes("fetch")) {
                toast.error("Connection failed", {
                    description:
                        "Cannot connect to server. Make sure backend is running.",
                    duration: 5000,
                });
            } else {
                toast.error("Failed to send message", {
                    description: error.message,
                    duration: 4000,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <Card className="h-[700px] flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                    <img
                        src={selectedPersona.avatar}
                        alt={selectedPersona.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                        onError={(e) => {
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                selectedPersona.name
                            )}&size=48&background=random`;
                        }}
                    />
                    <div>
                        <h3 className="font-semibold">
                            {selectedPersona.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            {selectedPersona.role}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                <img
                                    src={selectedPersona.avatar}
                                    alt={selectedPersona.name}
                                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700 mx-auto mb-4"
                                    onError={(e) => {
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            selectedPersona.name
                                        )}&size=80&background=random`;
                                    }}
                                />
                                <h4 className="font-medium mb-2">
                                    Start a conversation with{" "}
                                    {selectedPersona.name}
                                </h4>
                                <p className="text-sm max-w-md mx-auto">
                                    Send a message to begin chatting
                                </p>
                            </div>
                        )}

                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex items-start space-x-3 ${
                                    message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                {message.role === "assistant" && (
                                    <img
                                        src={selectedPersona.avatar}
                                        alt={selectedPersona.name}
                                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
                                        onError={(e) => {
                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                                selectedPersona.name
                                            )}&size=32&background=random`;
                                        }}
                                    />
                                )}

                                <div
                                    className={`max-w-[75%] rounded-lg px-4 py-3 ${
                                        message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : theme === "dark"
                                            ? "bg-gray-800 border"
                                            : "bg-gray-50 border"
                                    }`}
                                >
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content}
                                    </p>
                                    <div className="flex items-center space-x-1 mt-2 opacity-70">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-xs">
                                            {new Date(
                                                message.timestamp
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                </div>

                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                                        <User size={16} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start space-x-3">
                                <img
                                    src={selectedPersona.avatar}
                                    alt={selectedPersona.name}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                                    onError={(e) => {
                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            selectedPersona.name
                                        )}&size=32&background=random`;
                                    }}
                                />
                                <div
                                    className={`rounded-lg px-4 py-3 ${
                                        theme === "dark"
                                            ? "bg-gray-800 border"
                                            : "bg-gray-50 border"
                                    }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">
                                            {selectedPersona.name} is
                                            thinking...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="border-t p-4">
                    <div className="flex space-x-2">
                        <div className="relative flex-1">
                            <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={`Message ${selectedPersona.name}...`}
                                disabled={isLoading}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className={selectedPersona.color}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        Press Enter to send • Shift+Enter for new line
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default ChatInterface;
