Please implement a complete hierarchical role-based permission system with the following specifications.

First, implement default permissions for Direct Messages (DMs). DM permissions are global and not role-based. If a user does not explicitly have permission to perform an action in DMs, the action must be denied by default.

For Servers, implement mandatory role structure rules. Every server must automatically contain a default @everyone role. The @everyone role cannot be deleted or renamed, is always the lowest role in the hierarchy, is automatically assigned to every member, is the default role for every new user and member that joins the server, and is the default role applied to every newly created channel. The @everyone role defines the server’s base permissions.

Implement an Owner role that is automatically assigned to the server creator. The Owner role must always be the highest role in the hierarchy and must be the only role capable of deleting the server.

Implement a three-state permission model for every permission:
- Allow
- Neutral
- Deny  

Permission resolution must follow a hierarchical waterfall system:
- Roles are ordered from highest to lowest.
- Permissions are evaluated from highest role downward.
- The first non-neutral value (Allow or Deny) determines the final result.
- Allow overrides Neutral and Deny if it appears in a higher role.
- Deny overrides Neutral if no higher role explicitly allows.
- Neutral means inherit from the next lower role.
- If all roles resolve to Neutral, the permission must default to Deny.

This ensures the highest role has the strongest authority while still supporting inheritance from lower roles.

Enforce the following rule globally: if a user does not resolve to Allow for a permission after evaluation, the action must not be executed.

Implement the following permission categories and individual permissions:

General Server Permissions:
- View Channels
- Manage Channels
- Manage Roles
- Manage Server
- Manage Messages  

Membership Permissions:
- Create Invite
- Change Nickname
- Manage Nicknames
- Kick Members
- Ban Members
- Timeout Members  

Text Channel Permissions:
- View Channel
- Send Messages
- Send TTS Messages
- Manage Messages
- Embed Links
- Attach Files
- Read Message History
- Mention Everyone
- Use External Emojis
- Add Reactions
- Use Application Commands
- Create Public Threads
- Create Private Threads
- Send Messages in Threads
- Pin Messages  

Voice Permissions:
- Connect to Voice Channels
- Speak in Voice Channels
- Stream in Voice Channels
- Mute Members
- Deafen Members
- Move Members
- Use Voice Activity
- Use Voice Push-to-Talk  

Advanced Permissions:
- Administrator  

If a role has Administrator set to Allow, it must automatically grant all permissions and bypass all permission checks. Administrator should only be assignable intentionally and must not be granted implicitly.

Ensure the system is deterministic, hierarchy-driven, and strictly enforces deny-by-default behavior.
