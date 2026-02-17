import { clsx } from "clsx";
export function cn(...inputs) {
    return clsx(inputs);
}
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
export function formatRelativeTime(date) {
    const now = new Date();
    const then = typeof date === "string" ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffSec < 60)
        return "just now";
    if (diffMin < 60)
        return `${diffMin}m ago`;
    if (diffHour < 24)
        return `${diffHour}h ago`;
    if (diffDay < 7)
        return `${diffDay}d ago`;
    return then.toLocaleDateString();
}
export function formatTime(date, short = false) {
    const then = typeof date === "string" ? new Date(date) : date;
    if (short) {
        return then.toLocaleTimeString("en-US", {
            hour: "numeric",
            hour12: true,
        });
    }
    return then.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
export function formatDate(date) {
    const then = typeof date === "string" ? new Date(date) : date;
    return then.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}
export function generateSnowflake() {
    const timestamp = Date.now() - 1420070400000;
    const workerId = Math.floor(Math.random() * 32);
    const processId = Math.floor(Math.random() * 32);
    const sequence = Math.floor(Math.random() * 4096);
    return ((timestamp << 22) | (workerId << 17) | (processId << 12) | sequence).toString();
}
//# sourceMappingURL=utils.js.map