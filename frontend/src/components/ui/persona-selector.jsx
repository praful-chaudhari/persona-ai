import React from "react";
import PersonaCard from "@/components/ui/persona-card";

const PersonaSelector = ({ selectedPersona, onPersonaChange, personas }) => {
    return (
        <div className="mb-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">
                    Choose Your AI Persona
                </h2>
                <p className="text-muted-foreground">
                    Select which person's communication style and expertise
                    you'd like to interact with
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                {Object.values(personas).map((persona) => (
                    <PersonaCard
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersona.id === persona.id}
                        onSelect={() => onPersonaChange(persona)}
                    />
                ))}
            </div>
        </div>
    );
};

export default PersonaSelector;
