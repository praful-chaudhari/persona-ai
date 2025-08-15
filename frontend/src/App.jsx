import { useState, useEffect } from "react";
import PersonaSelector from "@/components/ui/persona-selector";
import ChatInterface from "@/components/ui/chat-interface";
import ThemeToggle from "@/components/ui/theme-toggle";
import { personas } from "@/lib/personas";
import { Toaster, toast } from "sonner";
import { useTheme } from "@/hooks/use-theme";

function App() {
    const [selectedPersona, setSelectedPersona] = useState(personas.alex);
    const { theme } = useTheme();

    // Show toast when persona changes
    const handlePersonaChange = (newPersona) => {
        if (newPersona.id !== selectedPersona.id) {
            setSelectedPersona(newPersona);
            toast.success(`Switched to ${newPersona.name}`, {
                duration: 2000,
            });
        }
    };

    // Welcome toast on app load
    useEffect(() => {
        const timer = setTimeout(() => {
            toast.info("Welcome to AI Persona Chat!", {
                description: "Select a persona to start chatting",
                duration: 3000,
            });
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="min-h-screen bg-background transition-colors">
            <div className="container mx-auto py-8 px-4 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            AI Persona Chat
                        </h1>
                        <p className="text-muted-foreground">
                            Chat with AI personas with unique communication
                            styles
                        </p>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Persona Selection */}
                <PersonaSelector
                    selectedPersona={selectedPersona}
                    onPersonaChange={handlePersonaChange}
                    personas={personas}
                />

                {/* Chat Interface */}
                <ChatInterface selectedPersona={selectedPersona} />

                {/* Current Persona Info - Simplified */}
                <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        Currently chatting with{" "}
                        <span className="font-medium">
                            {selectedPersona.name}
                        </span>
                    </p>
                </div>
            </div>

            {/* Sonner Toaster with theme support */}
            <Toaster
                position="bottom-right"
                theme={theme}
                richColors
                closeButton
                toastOptions={{
                    style: {
                        background:
                            theme === "dark"
                                ? "hsl(var(--card))"
                                : "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--card-foreground))",
                    },
                }}
            />
        </div>
    );
}

export default App;
