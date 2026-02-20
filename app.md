Current issues:
- Invites creation cant be changed ( how many uses, how long it lasts, etc. )
- Channels inside of a category cannot be moved at all anymore and are stuck
- Bans not working 500error
- kicks not working 500error
- Server Settings doesnt sync/show server name etc, image not changeable
- message features like editing, deleting, pinning not working
- reactions not working
- file upload not working
- file download not working
- file delete not working
- file preview not working
- file attachment not working
- file upload progress not showing
- file upload cancel not working

- Friends Calling System
- Friends Video Calling System
- Friends Call timer after call ends -> displayed in chat

UserProfileModal not sycing any proper information except username and avatar, not checking for friendship status, roles, userbanner etc


- Online status not working properly, all friends are shown as online, also not showing online status in UserProfileModal 
- Changing the user PFP doesnt work [07:48:58 UTC] ERROR: Request error
    requestId: "req-6t"
    method: "PUT"
    url: "/api/v1/users/@me"
    ip: "127.0.0.1"
    error: {
      "name": "error",
      "message": "update \"user_profiles\" set \"display_name\" = $1, \"avatar_url\" = $2, \"updated_at\" = $3 where \"user_id\" = $4 - value too long for type character varying(500)",
      "stack":
          error: update "user_profiles" set "display_name" = $1, "avatar_url" = $2, "updated_at" = $3 where "user_id" = $4 - value too long for type character varying(500)
              at parseErrorMessage (/Users/Maximilian.Zenkel/Documents/privprojects/freedomtalk/node_modules/pg-protocol/src/parser.ts:394:9)
              at Parser.handlePacket (/Users/Maximilian.Zenkel/Documents/privprojects/freedomtalk/node_modules/pg-protocol/src/parser.ts:212:19)
              at Parser.parse (/Users/Maximilian.Zenkel/Documents/privprojects/freedomtalk/node_modules/pg-protocol/src/parser.ts:105:30)
              at Socket.<anonymous> (/Users/Maximilian.Zenkel/Documents/privprojects/freedomtalk/node_modules/pg-protocol/src/index.ts:7:48)
              at Socket.emit (node:events:508:20)
              at addChunk (node:internal/streams/readable:564:12)
              at readableAddChunkPushByteMode (node:internal/streams/readable:515:3)
              at Readable.push (node:internal/streams/readable:395:5)
              at TCP.onStreamRead (node:internal/stream_base_commons:189:23)
    }
