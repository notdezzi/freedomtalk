"use client";
import React from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
export function ReactionPicker({ onselect, onClose }) {
    const handleEmojiClick = (emojiData) => {
        onselect(emojiData.emoji);
        onClose();
    };
    return (<div className="relative" onClick={(e) => e.stopPropagation()}>
      <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.DARK} autoFocusSearch={false} skinTonesDisabled previewConfig={{
            showPreview: false,
        }} width={350} height={400}/>
    </div>);
}
//# sourceMappingURL=ReactionPicker.jsx.map