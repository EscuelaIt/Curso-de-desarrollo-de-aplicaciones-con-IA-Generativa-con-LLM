import { useQuery } from "@tanstack/react-query";
import { listModels } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useLLMStore } from "@/lib/llm-store";

export function LLMSelector() {
  const { data } = useQuery({ queryKey: ["models"], queryFn: listModels });
  const current = useLLMStore((s) => s.model);
  const set = useLLMStore((s) => s.setModel);
  if (!data) return null;
  const available = data.available.includes(data.default)
    ? data.available
    : [data.default, ...data.available];
  return (
    <Select value={current ?? data.default} onValueChange={set}>
      <SelectTrigger className="h-8 w-56 text-xs">
        <SelectValue placeholder={data.default} />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4} align="start">
        {available.map((m) => (
          <SelectItem
            key={m}
            value={m}
            className="text-xs font-mono focus:bg-[var(--color-surface)] focus:text-[var(--color-text-primary)]"
          >
            {m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
