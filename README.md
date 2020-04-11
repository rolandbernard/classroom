# Classroom

This application was inspired by the COVID-19-Virus out brake and the resulting school closings in many countries.

The application allows users to create new virtual classrooms and using the rooms id other users can join the room as listeners. The creator of a room is able to talk to the listeners and write in a rich text editor, all using peer-to-peer connections. The speaker can also allow certain listeners to talk and manipulate the editor. Listeners that have a question can use the "Ask to speak" button to notify the speaker that they want to talk. The speaker also has the option to kick users if he so desires.  There is no video, mainly because I find that to be useless and the fact that it would use up valuable bandwidth for people with a poor internet connection.

To deploy this web application change the config in `src/config.js`, run `npm install`, `npm run build` and then start the server by running `node server.js`.
