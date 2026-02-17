"use client";

import React from "react";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";

interface ReactionPickerProps {
  onselect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onselect, onClose }: ReactionPickerProps) {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onselect(emojiData.emoji);
    onClose();
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        theme={Theme.DARK}
        autoFocusSearch={false}
        skinTonesDisabled
        previewConfig={{
          showPreview: false,
        }}
        width={350}
        height={400}
      />
    </div>
  );
}
