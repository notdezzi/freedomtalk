export function toDMChannelResponse(dmChannel, participants) {
    return {
        id: dmChannel.id,
        type: dmChannel.type,
        name: dmChannel.name,
        iconUrl: dmChannel.icon_url,
        ownerId: dmChannel.owner_id,
        createdAt: dmChannel.created_at.toISOString(),
        updatedAt: dmChannel.updated_at.toISOString(),
        participants: participants.map((p) => ({
            id: p.id,
            userId: p.user_id,
            joinedAt: p.joined_at.toISOString(),
            leftAt: p.left_at ? p.left_at.toISOString() : null,
            isActive: p.is_active,
        })),
    };
}
//# sourceMappingURL=dm-channel.types.js.map