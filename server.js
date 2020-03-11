
const config = require('./config');
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

let next_room_id = BigInt(75600);
const rooms = {};
const connections = {};

io.on('connection', socket => {
    socket.on('create', data => {
        const room_id = next_room_id;
        next_room_id = (next_room_id + BigInt(999983)) % BigInt(1000000007);
        const room = {
            id: room_id,
            name: data.name,
            key: data.key,
            speaker: null,
            listeners: {},
            last_access: (new Date()).getTime(),
        }
        rooms[room_id] = room;
        socket.emit('created', { room_id: room_id.toString() });
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
            rooms[data.room_id].speaker.socket.emit('join', {
                name: data.name,
                listener_id: socket.id,
            });
            connections[socket.id] = {
                room: rooms[data.id],
                socket: socket,
                id: socket.id,
                name: data.name,
            };
            rooms[data.id].listeners[socket.id] = connections[socket.id];
        }
    });
    socket.on('start', data => {
        // TODO
    });
    socket.on('kick', data => {
        // TODO
    });
    const handleLeave = () => {

    };
    socket.on('leave', handleLeave);
    socket.on('disconnect', handleLeave);
    socket.on('session', data => {
        connections[data.receiver_id].socket.emit('session', {
            sender_id: socket.id,
            session: data.session,
        });
    });
    socket.on('candidate', data => {
        connections[data.receiver_id].socket.emit('candidate', {
            sender_id: socket.id,
            candidate: data.candidate,
        });
    });
});
io.listen(server);

