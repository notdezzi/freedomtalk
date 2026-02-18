Server Settings -> when pressing on the server name, it should open a modal to edit the server name, icon, banner, description, etc. -> this is currently missing
furthermore the server settings modal should include a way to create custom invites to the server and share them with your friends. 
## Error Type
Runtime TypeError

## Error Message
Cannot read properties of undefined (reading 'charAt')


    at <unknown> (components/server/ServerMembersTab.tsx:156:64)
    at Array.map (<anonymous>:null:null)
    at ServerMembersTab (components/server/ServerMembersTab.tsx:139:26)
    at ServerSettingsModal (components/server/ServerSettingsModal.tsx:136:15)
    at ServerSettingsModal (components/modals/ServerSettingsModal.tsx:13:10)
    at ModalRenderer (components/modals/ModalRenderer.tsx:23:7)
    at AppRootLayout (app/app/layout.tsx:12:7)

## Code Frame
  154 |                   ) : (
  155 |                     <span className="text-sm font-bold text-background">
> 156 |                       {(member.displayName || member.username).charAt(0).toUpperCase()}
      |                                                                ^
  157 |                     </span>
  158 |                   )}
  159 |                 </div>

Next.js version: 16.1.6 (Turbopack)
when opening the members section of the server settings


Call Functionality, the default server creator creates a voice channel called "General" but there is no way to call anyone in the voice channel. Furthermore theres now a new second Voice Channel just called Join Voice, which doesnt work either. both calls cant be joined, nor actually used to call. furthermore when trying to join the "Join Voice" voice channel it trys to connect to the api server [07:31:03 UTC] INFO: incoming request
    reqId: "req-11"
    req: {
      "method": "OPTIONS",
      "url": "/api/v1/voice/channels/282234147475296259/join",
      "host": "localhost:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 49581
    }
[07:31:03 UTC] INFO: request completed
    reqId: "req-11"
    res: {
      "statusCode": 204
    }
    responseTime: 2.1169170141220093
[07:31:03 UTC] INFO: incoming request
    reqId: "req-12"
    req: {
      "method": "POST",
      "url": "/api/v1/voice/channels/282234147475296259/join",
      "host": "localhost:3001",
      "remoteAddress": "127.0.0.1",
      "remotePort": 49592
    }
[07:31:03 UTC] INFO: request completed
    reqId: "req-12"
    res: {
      "statusCode": 200
    }
    responseTime: 108.91241598129272
but doesnt do anything else. no errors are thrown, but it also doesnt connect to the voice channel.

Creating, moving, editing server channels is not working, the add channel / category button does nothing, the cogwheel to edit a category does nothing, and there is no way to move channels and categories.

the member list is not working as intended and only shows users that have sent a message in the channel, but even they are shown as offline and Unkown User, instead show a slow updating user list of all the users within the entire server with online activity status updates every 2-3 minutes. and if the server has more than 100 members, only show the online ones.

pressing on the username of a user in a dm or in the member list should open the user's profile, which is currently missing. furthermore the message grouping is not perfect, becasue it shows the date of the first message instead of the date of the last message in the group. etc

inviting people to servers is not working, because the invite button is missing in the server settings modal, and the invite button in the server settings panel is not working either. furthermore the mute server and leave server buttons are not working either when rightclicking the server in the server list. furthermore the servers should be reordable in the server list but this is also not working. 

ALL CHANGES should be synced with the backend/ apiserver to ensure it stays consistent with the data stored in the database. so when i create a new server, it should be created in the database and the frontend should reflect the changes. furthermore when i delete a server, it should be deleted in the database and the frontend should reflect the changes. also when moving channels and categories the positions should be updated in the database and the frontend should reflect the changes. same goes for moving the servers in the server list. or changing settings which is one of the most important things to get working properly before release.

in the dms, when sending a message it only shows for the socket currently connected, but doesnt save the message in the database. so when refreshing the page, the message is gone. 
in a server or dms, also when editing a message, it just sends a new message instead of editing the existing one. furthermore when editing a message, the message should be updated in the database and the frontend should reflect the changes. same goes for deleting a message, it should be deleted in the database and the frontend should reflect the changes. 

also the pins button in dms isnt working, same gies for the settings button and the notifications button. Furthermore the call and videocall buttons in dms are not working either. and do nothing.

Currently all users show up as being online in the friend list, but they are not online. furthermore the online friends should be separated from the offline friends in the friend list. and should be marked as online.
also the friendlist currently isnt really working in realtime atm, and instead needs manual refreshing between sending a friend request and the other person seeing it. same goes for accepting friend requests. and also for deleting friends. 

And also the Onboarding after logging in the first time shouldnt show up when logging in again (or clearing localstorage). and instead it should be checked against the database if the user has already completed the onboarding. and if not, then it should show the onboarding. but if the user has already completed the onboarding, then it should skip the onboarding and go straight to the homepage.

furthermore the discover servers page doesnt include the server list sidebar which it should, because without it you get stuck on discver servers page, and cant go back to the server list without using the browser back button.

also the search friends bar in the top right corner of the firends section searches everyone for usernames instead of just ur friendslist, this should be fixed to only search through your friendslist. same goes for the search bar in the server list, it searches all servers instead of just the servers you have joined. 

Also a user thats not in your friendslist shouldnt send socket prensence updates to another user that has no relation to him, because it just creates unneeded traffic and is a waste of resources. 
and also slow down on the update rate of the presence updates, because it is currently updating way too often. it doesnt need to perfectly track online and offline status of users, because it is not that important. it should only update every 30 seconds or so. 

