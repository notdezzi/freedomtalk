Grid layout with changing content. 
2 rows, 4 columns. 
First row is 1/16 of the height, second row is 15/16 of the height. 
First column is 1/16 of the width, second column is 3/16 of the width, third column is 8/16 of the width, fourth column is 4/16 of the width. 
The first row will contain the current section, so when im in the friends section, it will say "Friends". if in a specific server, it will say the name of the server.
the second row is the main content.
the first column is the server list, with the home button on top, and the add server button on the bottom.
the second column is the channel list. or when in the home section so /app it will be the dms list.
the third column is the main content. so either the chat when in a text channel, the friends list when in the friends section, or the dm content when in a dm. or the call view when in a voice channel.
the fourth column is the members list, with the online members on top, and the offline members below. but when in a dm, it is supposed to show the profile of the other person in the dm. or when in the friends section, it will show the activities of some online friends. in dms the column should be able to toggle between showing and hidden.

at the bottom of the first and second column should be the user profile picture, username, and below that the current status, with mute and deafen buttons and a settings button. this should be called the user panel. (maybe its better to create 3 columns instead of 4 and have column 1 and 2 be 4/16 width and be split into two columns inside of that column instead and having it then 1/4 and 3/4 width instead)

everything else should just be modal popups etc.

when pressing on the settings icon in the user panel, it should open the settings modal.
when pressing on the add server button, it should open the create server modal.
when pressing on the home button, it should open the dms list.
when pressing on the server in the server list, it should open the channel list for that server, and the members list should show the members for that server. and auto open the general channel.
when pressing on a dm in the dms list, it should open the dm content in the third column, and the members list should show the profile of the other person in the dm.
when pressing on a friend in the friends list, it should open the dm with that friend, and the members list should show the profile of that friend.
when pressing on a username in the chat it should open the profile of that user in a modal popup aswell, giving us the option to send a friend request or message them. or if we are friends, it will open the dm with them. and also showing their status, and if they are in a voice channel, it should show what channel they are in. and if they are in a game, it should show what game they are playing. 

everything should be modular and dynamic. so when pressing on a server, it should change the channel list, and the members list. and when pressing on a dm, it should change the members list to the other person in the dm. and when pressing on a friend, it should open the dm with that friend, and change the members list to the other person in the dm aswell. 



please analyze the entire webserver and all of its components etc. then please create a list of all the components that exist, and need to exist. based on that list, please generalize all of the components so we can reuse as much code as possible. for example the server list and the dm list are basically the same thing, so we should be able to use the same component for both. just with different data. same for the chat view and the dm view, they are basically the same thing. just with different data. and a little bit different layout. so we should be able to use the same component for both. Please also create a list of all the data that is needed for each component. so we can create a generalized component that can be used for multiple things. but still have the option to customize it a little bit for specific use cases. also Take note of all the possible states that a component can be in. for example a message in a chat can be in a "sending", "sent", "delivered", "read" state. and a message can be a normal message, or a voice message, or an image message etc. aswell as if a user is typing, or if a user is editing a message etc. and also api calls etc. that the component needs to be able to do. and what data it needs to be able to display. after completing all that, please delete the entire frontend from /app and all of its contents. and then rewrite the entire frontend ( just /app not the landingpage or auth ) from scratch based on the new architecture that we have discussed. 

so the new layout should be like this:

the top row is the "header" row. and it should be sticky. and it should contain the current section name, and the user panel.
the second row is the "content" row. and it should contain all of the actual content:
the first column is the "navigation" column. and it should be sticky. and it should contain all of the navigation buttons and lists. like the server list, the dm list, the friends list etc. and the user profile picture, username, status, mute, deafen, settings buttons. this first column should be split into two columns again, so 1/4 of the width for the first column, and 3/4 of the width for the second column. so 1/4th for the server list, and 3/4th for the channel/dm list.
the second column is the "content" column. and it should contain the actual content. like the channel list, the chat view, the dm view, the friends list view etc. 
the third column is the "members" column. and it should contain the members list, or the profile view when in a dm. and it should be sticky. this column should be able to be toggled between showing and hidden. when hidden, the second column should expand to take its place. 