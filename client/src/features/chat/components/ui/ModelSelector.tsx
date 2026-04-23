import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ModelSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const MODELS = [
  "gemini-flash",
  "llama-70b",
  "llama-8b",
  "phi-4-mini",
  "deepseek-r1",
  "kimi-k2",
  "minimax-2.7",
  "glm-4.7",
];

const ModelSelector = ({ value, onChange }: ModelSelectorProps) => {
  return (
    <div className="ml-1 mb-1 md:ml-3 md:mb-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className="
            w-[130px]
            bg-transparent
            text-white
            border border-neutral-700/60
            shadow-none
            px-2 py-2
            text-sm
            focus:ring-0
            hover:text-neutral-200
          "
        >
          <SelectValue />
        </SelectTrigger>

        <SelectContent
          position="popper"
          sideOffset={8}
          className="
            z-[9999]
            bg-[#2f2f2f]
            border border-neutral-700/60
            text-white
            rounded-xl
            overflow-hidden
          "
        >
          {MODELS.map((model) => (
            <SelectItem
              key={model}
              value={model}
              style={{ color: "white" }}
              className="
                text-sm cursor-pointer
                !text-white
                data-[highlighted]:!text-white
                data-[state=checked]:!text-white
                focus:bg-neutral-700/40
                data-[highlighted]:bg-neutral-500/40
                data-[state=checked]:bg-neutral-700/60
              "
            >
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
