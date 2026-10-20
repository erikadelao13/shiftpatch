import { useRef, useState, type DragEvent } from "react";

type FileDropOptions = {
  disabled: boolean;
  onFile: (file: File) => void;
};

export function useFileDrop({ disabled, onFile }: FileDropOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (!disabled) setDragging(true);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    const input = inputRef.current;
    if (!file || !input || disabled) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    onFile(file);
  }

  return {
    inputRef,
    dragging,
    handleDragOver,
    handleDragLeave: () => setDragging(false),
    handleDrop,
  };
}
