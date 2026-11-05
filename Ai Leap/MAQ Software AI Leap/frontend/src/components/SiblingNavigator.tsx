import { FC, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SiblingOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

interface SiblingNavigatorProps {
  currentId: string;
  options: SiblingOption[];
  onSelect: (id: string) => void;
  /** e.g. "Compliance" - shown as button text */
  currentLabel?: string;
  /** "dropdown" (default) shows a popover; "bar" shows all options inline as pills */
  variant?: "dropdown" | "bar";
}

const SiblingNavigator: FC<SiblingNavigatorProps> = ({
  currentId,
  options,
  onSelect,
  currentLabel,
  variant = "dropdown",
}) => {
  const [open, setOpen] = useState(false);

  if (options.length <= 1) return null;

  const currentOption = options.find((option) => option.id === currentId);
  const displayLabel = currentLabel || currentOption?.label || "Select";
  const CurrentIcon = currentOption?.icon
    ? (Icons[currentOption.icon as keyof typeof Icons] as LucideIcon)
    : null;

  // Inline bar variant — shows every option as a pill so there's no extra click.
  if (variant === "bar") {
    return (
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar min-w-0 max-w-full py-1">
        {options.map((option) => {
          const isActive = option.id === currentId;
          const IconComponent = option.icon
            ? (Icons[option.icon as keyof typeof Icons] as LucideIcon)
            : null;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              aria-pressed={isActive}
              title={option.subtitle ? `${option.label} — ${option.subtitle}` : option.label}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex min-h-[64px] sm:min-h-[72px] w-full max-w-[320px] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-foreground transition-all hover:bg-accent sm:px-5">
          {CurrentIcon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CurrentIcon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-lg font-semibold">{displayLabel}</p>
            {currentOption?.subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {currentOption.subtitle}
              </p>
            )}
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-full max-w-[320px] max-h-[420px] overflow-y-auto rounded-2xl p-3 custom-scrollbar bg-white dark:bg-gray-900"
      >
        {options.map((option) => {
          const isActive = option.id === currentId;
          const IconComponent = option.icon
            ? (Icons[option.icon as keyof typeof Icons] as LucideIcon)
            : null;

          return (
            <button
              key={option.id}
              onClick={() => {
                onSelect(option.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              {/* Icon */}
              {IconComponent && (
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? "bg-primary/20"
                      : "bg-muted"
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                </div>
              )}

              {/* Label + subtitle */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-base font-semibold">{option.label}</p>
                {option.subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {option.subtitle}
                  </p>
                )}
              </div>

              {/* Checkmark */}
              {isActive && (
                <Check className="h-5 w-5 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default SiblingNavigator;
