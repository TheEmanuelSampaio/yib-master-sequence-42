
import { TimeRestriction } from "@/types";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface RestrictionItemProps {
  restriction: TimeRestriction;
  onDelete: () => void;
  onUpdate: (changes: Partial<TimeRestriction>) => void;
}

export function RestrictionItem({ restriction, onDelete, onUpdate }: RestrictionItemProps) {
  const getDayName = (day: number) => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return days[day];
  };

  const formatTime = (hours: number, minutes: number) => {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleToggleActive = () => {
    onUpdate({ active: !restriction.active });
  };

  return (
    <div className={`flex items-center justify-between p-2 border rounded-md ${!restriction.active ? 'bg-muted/20' : ''}`}>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="font-medium">{restriction.name}</span>
          <Switch
            checked={restriction.active}
            onCheckedChange={handleToggleActive}
            className="h-5 w-9"
          />
        </div>
        <div className="flex flex-wrap gap-1 mb-1">
          {restriction.days.map((day) => (
            <Badge key={`day-${restriction.id}-${day}`} variant="outline" className="text-xs">
              {getDayName(day)}
            </Badge>
          ))}
        </div>
        <p className="text-sm">
          {formatTime(restriction.startHour, restriction.startMinute)} - {formatTime(restriction.endHour, restriction.endMinute)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}
