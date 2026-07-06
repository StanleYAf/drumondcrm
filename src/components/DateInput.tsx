import * as React from "react";
import { cn } from "@/lib/utils";
import { applyDateMask, isoToBr, brToIso } from "@/lib/dateMask";

export interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [display, setDisplay] = React.useState(() => isoToBr(value));

    React.useEffect(() => {
      setDisplay(isoToBr(value));
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const masked = applyDateMask(e.target.value);
      setDisplay(masked);
      const iso = brToIso(masked);
      if (iso) {
        onChange(iso);
      } else if (masked === "") {
        onChange("");
      }
    }

    function handleBlur() {
      const iso = brToIso(display);
      if (iso) {
        setDisplay(isoToBr(iso));
      } else if (display !== "") {
        // Limpa se inválido ao sair do campo
        setDisplay("");
        onChange("");
      }
    }

    return (
      <input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={10}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />
    );
  }
);
DateInput.displayName = "DateInput";

export { DateInput };
