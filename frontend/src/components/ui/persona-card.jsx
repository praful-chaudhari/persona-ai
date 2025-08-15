import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/hooks/use-theme";

const PersonaCard = ({ persona, isSelected, onSelect }) => {
    const { theme } = useTheme();

    const getCardClasses = () => {
        if (isSelected) {
            return `border-2 ${persona.textColor} ${
                theme === "dark" ? persona.darkColor : persona.lightColor
            } cursor-pointer transition-all hover:shadow-lg`;
        }
        return "border cursor-pointer transition-all hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600";
    };

    return (
        <Card className={getCardClasses()} onClick={onSelect}>
            <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative">
                        <img
                            src={persona.avatar}
                            alt={persona.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                                // Fallback to a default avatar if image fails to load
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    persona.name
                                )}&size=80&background=random`;
                            }}
                        />
                        {/* Status indicator */}
                        <div
                            className={`absolute -bottom-1 -right-1 w-6 h-6 ${persona.color} rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center`}
                        >
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">
                            {persona.name}
                        </h3>
                        {isSelected && (
                            <Badge
                                variant="default"
                                className={`${persona.color} text-white mt-2`}
                            >
                                Active
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PersonaCard;
