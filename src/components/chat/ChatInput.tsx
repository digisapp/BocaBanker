'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizontal } from 'lucide-react';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const value = textareaRef.current?.value.trim();
    if (!value || isLoading) return;

    onSubmit(value);

    if (textareaRef.current) {
      textareaRef.current.value = '';
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to properly calculate new scrollHeight
    textarea.style.height = 'auto';

    // Limit to approximately 4 rows (4 * line height ~20px + padding)
    const maxHeight = 4 * 24;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  };

  return (
    <div className="flex items-end gap-2 p-4 border-t border-gray-200">
      <Textarea
        ref={textareaRef}
        placeholder="Ask Boca Banker about banking, mortgages, cost segregation, or tax strategy..."
        className="min-h-[44px] max-h-[96px] resize-none bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:border-amber-500 focus-visible:ring-amber-500/20 text-sm"
        rows={1}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={isLoading}
      />
      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        size="icon"
        className="h-[44px] w-[44px] flex-shrink-0 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-white transition-opacity disabled:opacity-40"
      >
        <SendHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}
