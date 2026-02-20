# Remaining Tasks

## Voice/Video Calling
- Other users (when having the call id) can join the DMs voice call when using stuff like /sfu - need DM participation check
- Friends (DMs) Calling System (same as server, just rolling voice call/channel ids)
- Friends (DMs) Video Calling System
- Friends (DMs) Call timer after call ends -> displayed in chat

## User Settings
- User Settings -> Voice & Video -> Video Preview doesnt show video, successfully accesses the camera tho
- User Settings -> Advanced -> Developer options not implemented yet.
  - When toggled it should add a Copy ID to all right click menus, like copy channel id, copy voicechannel id, copy serverid, copy userid, copy role id, etc.

## Server Settings
- Server Settings -> Overview -> Vanity URL -> Vanity URL is not implemented at all yet

## Code Quality & Testing
- Analyze the entire codebase for code smells, bad patterns, improve the code quality, and add comments where needed.
- Also analyze the codebase for hard coded values that should be in the user settings/ server settings, and add them there.
- Analyze the entire codebase for features and things implemented, and add them to the testing.md file to prepare for testing.
- Full e2e Playwright testing setup
    - Test EVERYTHING, all api calls, all pages, all features, all functions, all routes, etc.
    - Current setup has old tests, replace all old tests with entirely new ones for all the features etc.
