"use client";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

interface Props {
  value: string | null;
  suggestions?: string[];
  placeholder?: string;
}

export const AutocompleteEditor = forwardRef(function AutocompleteEditor(
  props: Props,
  ref,
) {
  const [value, setValue] = useState<string>(props.value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const options = props.suggestions ?? [];

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    isPopup: () => true,
    afterGuiAttached: () => inputRef.current?.focus(),
  }));

  return (
    <div style={{ width: 280, background: "#fff", boxShadow: "0 4px 16px rgba(0,0,0,.12)", borderRadius: 4 }}>
      <Autocomplete
        freeSolo
        autoHighlight
        openOnFocus
        options={options}
        value={value}
        onChange={(_, v) => setValue(typeof v === "string" ? v : v ?? "")}
        onInputChange={(_, v) => setValue(v)}
        renderInput={(p) => (
          <TextField {...p} inputRef={inputRef} size="small" autoFocus placeholder={props.placeholder ?? "Type to search…"} />
        )}
      />
    </div>
  );
});
