"use client";
import React from "react";
export function TypingIndicator({ usernames }) {
    if (usernames.length === 0)
        return null;
    const getText = () => {
        if (usernames.length === 1) {
            return (<>
          <span className="font-medium">{usernames[0]}</span>
          <span> is typing</span>
        </>);
        }
        if (usernames.length === 2) {
            return (<>
          <span className="font-medium">{usernames[0]}</span>
          <span> and </span>
          <span className="font-medium">{usernames[1]}</span>
          <span> are typing</span>
        </>);
        }
        return (<>
        <span className="font-medium">{usernames[0]}</span>
        <span> and {usernames.length - 1} others are typing</span>
      </>);
    };
    return (<div className="flex items-center gap-2 px-4 py-1 text-sm text-[var(--text-muted)]">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "0ms" }}/>
        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "150ms" }}/>
        <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: "300ms" }}/>
      </div>
      <span>{getText()}</span>
    </div>);
}
//# sourceMappingURL=TypingIndicator.jsx.map