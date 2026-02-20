# Remaining Tasks

## Text Styling
- text styling doesnt work, bold, italic, underline, strikethrough, code, quote, blockquote, etc.

## Voice/Video Calling
- other users (when having the call id) can join the dms voicecall when using stuff like /sfu which shouldnt be possible either.
- Friends (DMs) Calling System (same as server, just rolling voice call/channel ids)
- Friends (DMs) Video Calling System
- Friends (DMs) Call timer after call ends -> displayed in chat

## User Settings
- User Settings -> Voice & Video -> Video Preview doesnt show video, successfully accesses the camera tho
- User Settings -> Advanced -> Developer options not implemented yet.
  - When toggled it should add a Copy ID to all right click menus, like copy channel id, copy voicechannel id, copy serverid, copy userid, copy role id, etc.

## Friend List
- friends menu should also hijack the right click menu, when right clicking a friend it should show the option to message the friend, remove friend, block friend, etc. (same menu as when clicking the 3 dots on the friend)

## Server Settings
- Server Settings -> Overview -> Change Icon does nothing, no popup, no change, no error.
- Server Settings -> Overview -> Server Banner upload is not implemented
- Server Settings -> Invites -> Server Invites are not in realtime, deleting does nothing etc.
- Server Settings -> Bans -> Server Bans are not in displaying any bans even if someone got banned
- Server Settings -> Overview -> Vanity URL -> Vanity URL is not implemented at all yet

## Code Quality & Testing
- Analyze the entire codebase for code smells, bad patterns, improve the code quality, and add comments where needed.
- Also analyze the codebase for hard coded values that should be in the user settings/ server settings, and add them there.
- Analyze the entire codebase for features and things implemented, and add them to the testing.md file to prepare for testing.
- Full e2e Playwright testing setup
    - Test EVERYTHING, all api calls, all pages, all features, all functions, all routes, etc.
    - Current setup has old tests, replace all old tests with entirely new ones for all the features etc.
