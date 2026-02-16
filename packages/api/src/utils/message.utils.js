export function generateMessagePreview(content, maxLength = 100) {
    if (!content || content.trim().length === 0) {
        return '';
    }
    let preview = content
        .replace(/```[\s\S]*?```/g, '[code]')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/(\*\*|__)(.*?)\1/g, '$2')
        .replace(/(\*|_)(.*?)\1/g, '$2')
        .replace(/~~(.*?)~~/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#+\s+/gm, '')
        .replace(/^>\s+/gm, '')
        .replace(/^[\s]*[-*+]\s+/gm, '')
        .replace(/^[\s]*\d+\.\s+/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (preview.length > maxLength) {
        preview = preview.substring(0, maxLength).trim() + '...';
    }
    return preview;
}
export function sanitizeMessageContent(content) {
    return content.trim();
}
//# sourceMappingURL=message.utils.js.map