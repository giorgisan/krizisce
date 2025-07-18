import { Button } from "@/components/ui/button";

interface SourceFilterProps {
  selectedSource: string;
  onSourceChange: (source: string) => void;
}

const sources = [
  { name: "Vse", value: "", color: "bg-primary" },
  { name: "Slovenske novice", value: "Slovenske novice", color: "bg-blue-500" },
  { name: "Delo", value: "Delo", color: "bg-orange-500" },
  { name: "RTVSLO", value: "RTVSLO", color: "bg-red-500" },
  { name: "24ur", value: "24ur", color: "bg-green-500" },
  { name: "Zurnal24", value: "Zurnal24", color: "bg-purple-500" },
  { name: "Siol.net", value: "Siol.net", color: "bg-cyan-500" },
];

export default function SourceFilter({ selectedSource, onSourceChange }: SourceFilterProps) {
  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex space-x-2 pb-2">
        {sources.map((source) => (
          <Button
            key={source.value}
            variant={selectedSource === source.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSourceChange(source.value)}
            className={`flex-shrink-0 transition-all duration-200 ${
              selectedSource === source.value
                ? `${source.color} text-white hover:${source.color}/90 shadow-lg`
                : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {source.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
