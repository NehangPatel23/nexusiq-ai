"use client";

import { X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function TagsInput({
  id,
  value,
  onChange,
  placeholder = "Add a tag and press Enter",
  maxTags = 20,
  className,
  disabled = false,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || value.includes(tag) || value.length >= maxTags) {
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((current) => current !== tag));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(draft);
            }
            if (event.key === "Backspace" && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              addTag(draft);
            }
          }}
          placeholder={placeholder}
          disabled={disabled || value.length >= maxTags}
          aria-describedby={id ? `${id}-hint` : undefined}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => addTag(draft)}
          disabled={disabled || !draft.trim() || value.length >= maxTags}
        >
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2" role="list" aria-label="Project tags">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1 pr-1" role="listitem">
              {tag}
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-muted"
                onClick={() => removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                disabled={disabled}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p id={id ? `${id}-hint` : undefined} className="text-xs text-muted-foreground">
        {value.length}/{maxTags} tags · press Enter to add
      </p>
    </div>
  );
}
