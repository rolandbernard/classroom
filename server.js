
const config = require('./src/config');
const express = require('express');
const path = require('path');
const http = require('http');
const io  = require('socket.io')();

const app = express()
app.get('/', (__, res) => {
    res.sendFile(path.join(__dirname, './build/index.html'));
});
app.use("/", express.static(path.join(__dirname, "./build/"), { /*cacheControl: true , maxAge: 3600000*/ }));

const server = http.createServer(app)
server.listen(config.port);

let next_room_id = BigInt(42);
const rooms = {};
const connections = {};

io.on('connection', socket => {
    socket.on('create', data => {
        const room_id = next_room_id.toString();
        next_room_id = (next_room_id + BigInt(363720103)) % BigInt(1000000007);
        const room = {
            id: room_id,
            name: data.name,
            key: data.key,
            speaker: null,
            listeners: {},
            last_access: (new Date()).getTime(),
        }
        rooms[room_id] = room;
        socket.emit('created', { room_id: room_id });
    });
    socket.on('find', data => {
        if(rooms[data.room_id]) {
            socket.emit('found');
        } else {
            socket.emit('not_found');
        }
    });
    socket.on('join', data => {
        if(rooms[data.room_id]) {
            if(rooms[data.room_id].speaker) {
                rooms[data.room_id].speaker.socket.emit('join', {
                    name: data.name,
                    listener_id: socket.id,
                });
            }
            connections[socket.id] = {
                room: rooms[data.room_id],
                socket: socket,
                id: socket.id,
                name: data.name,
            };
            rooms[data.room_id].listeners[socket.id] = connections[socket.id];
            rooms[data.room_id].last_access = (new Date()).getTime();
        } else {
            socket.emit('kick');
        }
    });
    socket.on('start', data => {
        if(rooms[data.room_id] && rooms[data.room_id].speaker === null && rooms[data.room_id].key === data.key) {
            connections[socket.id] = {
                room: rooms[data.room_id],
                socket: socket,
                id: socket.id,
            };
            rooms[data.room_id].speaker = connections[socket.id];
            for(let listener of Object.values(rooms[data.room_id].listeners)) {
                rooms[data.room_id].speaker.socket.emit('join', {
                    name: listener.name,
                    listener_id: listener.id,
                });
            }
        } else {
            socket.emit('kick');
        }
    });
    socket.on('kick', data => {
        if(connections[socket.id]) {
            const room = connections[socket.id].room;
            if(room.speaker === connections[socket.id]) {
                if(room.listeners[data.listener_id]) {
                    room.speaker.socket.emit('leave', { listener_id: data.listener_id });
                    room.listeners[data.listener_id].socket.emit('kick');
                    delete room.listeners[data.listener_id];
                    delete connections[data.listener_id];
                }
            }
        }
    });
    const handleLeave = () => {
        if(connections[socket.id]) {
            const room = connections[socket.id].room;
            if(room.speaker === connections[socket.id]) {
                room.speaker = null;
                delete connections[socket.id];
            } else {
                if(room.speaker) {
                    room.speaker.socket.emit('leave', { listener_id: socket.id });
                }
                delete room.listeners[socket.id];
                delete connections[socket.id];
            }
        }
    };
    socket.on('leave', handleLeave);
    socket.on('disconnect', handleLeave);
    socket.on('session', data => {
        if(connections[socket.id] && connections[data.receiver_id]) {
            connections[data.receiver_id].socket.emit('session', {
                sender_id: socket.id,
                session: data.session,
            });
        }
    });
    socket.on('candidate', data => {
        if(connections[socket.id] && connections[data.receiver_id]) {
            connections[data.receiver_id].socket.emit('candidate', {
                sender_id: socket.id,
                candidate: data.candidate,
            });
        }
    });
});
io.listen(server);

