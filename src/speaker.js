
import React, { createRef } from 'react';
import { withRouter } from 'react-router-dom';
import { Button, List, ListItem, Divider, IconButton} from '@material-ui/core';
import { yellow, lightBlue } from '@material-ui/core/colors';
import MicIcon from '@material-ui/icons/Mic';
import MicOffIcon from '@material-ui/icons/MicOff';
import EditIcon from '@material-ui/icons/Edit';
import LinkOffIcon from '@material-ui/icons/LinkOff';
import BlockIcon from '@material-ui/icons/Block';
import 'webrtc-adapter';

import './blink.css';
import Quill from './quill';
import config from './config';

const styles = {
    root: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexFlow: 'row, nowrap',
    },
    whiteboard: {
        flex: '1 1 auto',
        minWidth: '20em',
    },
    listeners: {
        flex: '0 0.5 max-content',
        minWidth: '15vw',
        padding: '0.5rem',
        paddingRight: 0,
        display: 'flex',
        flexFlow: 'column',
    },
    listener: {
        height: '2.75rem',
        padding: '0.5rem',
        display: 'flex',
        flexFlow: 'row nowrap',
    },
    listener_name: {
        paddingRight: '1rem',
        flex: '1 1 auto',
        maxWidth: '15vw',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    listener_buttons: {
        right: 0,
        flex: '0 0 max-content',
    },
    head: {
        flex: '0 0 auto',
    },
    list: {
        flex: '1 1 auto',
        overflowY: 'auto',
    },
    buttons: {
        flex: '0 0 auto',
        paddingTop: '0.3rem',
    },
    leave_button: {
        width: '100%',
    },
    listener_unmuted: {
        padding: '0.5rem',
        display: 'flex',
        height: '2.75rem',
        flexFlow: 'row nowrap',
        background: lightBlue[300],
        borderRadius: '0.2rem',
        animation: 'blinking_blue 5s infinite',
    },
    listener_asking: {
        padding: '0.5rem',
        display: 'flex',
        height: '2.75rem',
        flexFlow: 'row nowrap',
        background: yellow[400],
        borderRadius: '0.2rem',
        animation: 'blinking_yellow 0.75s infinite',
    },
    room_name: {
        fontSize: '1.5rem',
    },
};

class Speaker extends React.Component {
    constructor(props) {
        super(props);
        this.socket = props.socket;
        this.rtcs = { };
        this.local_audio = null;
        this.remote_audio = { };
        this.data_channels = { };
        this.state = {
            speaking: null,
            room_name: null,
            listeners: { },
        };
        this.second_sender = { };
        this.quill = createRef();
        this.room_name = null;
        this.audio = new Audio();

        this.handleLeave = this.handleLeave.bind(this);
        this.handleQuillChange = this.handleQuillChange.bind(this);
    }

    async handleMuteChange(listener) {
        if(this.state.speaking) {
            this.audio.srcObject = null;
            this.data_channels[this.state.speaking].send(JSON.stringify({
                type: 'stop_speaking',
            }));
            for(let rtc in this.rtcs) {
                if(rtc !== this.state.speaking) {
                    this.rtcs[rtc].removeTrack(this.second_sender[rtc]);
                }
            }
        }
        if(this.state.speaking === listener.id) {
            this.setState({
                speaking: null,
            });
        } else {
            if(this.remote_audio[listener.id]) {
                const media_stream = new MediaStream();
                media_stream.addTrack(this.remote_audio[listener.id]);
                this.audio.srcObject = media_stream ;
                this.audio.play();
                this.data_channels[listener.id].send(JSON.stringify({
                    type: 'start_speaking',
                }));
                for(let rtc in this.rtcs) {
                    if(rtc !== listener.id) {
                        this.second_sender[rtc] = this.rtcs[rtc].addTrack(this.remote_audio[listener.id]);
                    }
                }
                const new_listeners = { ...this.state.listeners };
                new_listeners[listener.id].asking = false;
                this.setState({
                    speaking: listener.id,
                    listeners: new_listeners,
                });
            }
        }
    }

    removeListener(listener) {
        delete this.remote_audio[listener.id];
        if(this.data_channels[listener.id]) {
            this.data_channels[listener.id].close();
            delete this.data_channels[listener.id]
        };
        if(this.rtcs[listener.id]) {
            this.rtcs[listener.id].close();
            delete this.rtcs[listener.id];
        }

        const new_listeners = { ...this.state.listeners };
        delete new_listeners[listener.id];
        this.setState({
            speaking: listener.id === this.state.speaking ? null : this.state.speaking,
            listeners: new_listeners,
        });
    }

    handleKick(listener) {
        this.socket.emit('kick', { listener_id: listener.id });
        this.removeListener(listener);
    }

    handleLeave() {
        this.socket.removeAllListeners();
        this.socket.emit('leave');
        for(let channel of Object.values(this.data_channels)) {
            channel.close();
        }
        for(let rtc of Object.values(this.rtcs)) {
            rtc.close();
        }
        this.props.history.push('/');
    }

    componentDidMount() {
        try {
            const whiteboard_mem = localStorage.getItem('whiteboard' + this.props.match.params.id);
            this.quill.current.setContent(JSON.parse(whiteboard_mem));
        } catch(e) {}
        this.socket.on('room_info', data => {
            this.setState({
                room_name: data.name,
            });
        });
        this.socket.on('kick', this.handleLeave);
        this.socket.on('session', async data => {
            if(this.rtcs[data.sender_id]) {
                const session_desc = new RTCSessionDescription(data.session);
                await this.rtcs[data.sender_id].setRemoteDescription(session_desc);
            }
        });
        this.socket.on('candidate', data => {
            if(this.rtcs[data.sender_id]) {
                const ice_candidate = new RTCIceCandidate(data.candidate);
                this.rtcs[data.sender_id].addIceCandidate(ice_candidate);
            }
        });
        this.socket.on('leave', data => {
            if(this.state.listeners[data.listener_id]) {
                this.removeListener(this.state.listeners[data.listener_id]);
            }
        });
        this.socket.on('join', async data => {
            const listener = {
                id: data.listener_id,
                name: data.name,
                asking: false,
            };

            const peer_connection = new RTCPeerConnection({ iceServers: config.ice_servers }, {"optional": [{"DtlsSrtpKeyAgreement": true}]});
            this.rtcs[listener.id] = peer_connection;
            peer_connection.onicecandidate = event => {
                if (event.candidate) {
                    this.socket.emit('candidate', {
                        receiver_id: listener.id,
                        candidate: {
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            candidate: event.candidate.candidate,
                        }
                    });
                }
            };

            peer_connection.addTrack(this.local_audio.getTracks()[0]);
            peer_connection.ontrack = event => {
                this.remote_audio[listener.id] = event.track;
                const new_listeners = { ...this.state.listeners };
                new_listeners[listener.id].has_auido = true;
                this.setState({
                    listeners: new_listeners,
                });
            };
            peer_connection.onnegotiationneeded = async event => {
                const session_desc = await peer_connection.createOffer();
                await peer_connection.setLocalDescription(session_desc);
                this.socket.emit('session', { receiver_id: listener.id, session: session_desc });
            };

            const data_channel = peer_connection.createDataChannel('data');
            this.data_channels[listener.id] = data_channel;
            data_channel.onmessage = event => {
                const data = JSON.parse(event.data);
                if(data.type === 'whiteboard_update' && listener.id === this.state.speaking) {
                    this.quill.current.updateContent(data.data);
                } else if(data.type === 'start_asking') {
                    const new_listeners = { ...this.state.listeners };
                    new_listeners[listener.id].asking = true;
                    this.setState({
                        listeners: new_listeners,
                    });
                } else if(data.type === 'stop_asking') {
                    const new_listeners = { ...this.state.listeners };
                    new_listeners[listener.id].asking = false;
                    this.setState({
                        listeners: new_listeners,
                    });
                }
            };
            data_channel.onopen = () => {
                data_channel.send(JSON.stringify({
                    type: 'whiteboard_set',
                    data: this.quill.current.getContent(),
                }));
                data_channel.send(JSON.stringify({
                    type: 'state_set',
                    data: this.state,
                }));
            }

            const new_listeners = { ...this.state.listeners };
            new_listeners[listener.id] = listener;
            this.setState({
                listeners: new_listeners,
            });
        });
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                this.local_audio = stream;
                this.socket.emit('start', { room_id: this.props.match.params.id, key: this.props.match.params.key });
            }).catch(() => {
                alert("You chose not to provide access to the microphone, the application will not work.");
                this.handleLeave();
            });
        } else if(navigator.getUserMedia) {
            navigator.getUserMedia({ audio: true }, stream => {
                this.local_audio = stream;
                this.socket.emit('start', { room_id: this.props.match.params.id, key: this.props.match.params.key });
            }, () => {
                alert("You chose not to provide access to the microphone, the application will not work.");
                this.handleLeave();
            });
        } else {
            alert("Can't open the microphone, the application will not work.");
            this.handleLeave();
        }
    }

    componentDidUpdate() {
        for(let channel of Object.values(this.data_channels)) {
            if(channel.readyState === 'open') {
                channel.send(JSON.stringify({
                    type: 'state_set',
                    data: this.state,
                }));
            }
        }
    }

    handleQuillChange(delta, __, source) {
        localStorage.setItem('whiteboard' + this.props.match.params.id, JSON.stringify(this.quill.current.getContent()));
        for(let id in this.data_channels) {
            if(this.data_channels[id].readyState === 'open' && (source === 'user' || id !== this.state.speaking)) {
                this.data_channels[id].send(JSON.stringify({
                    type: 'whiteboard_update',
                    data: delta,
                }));
            }
        }
    }

    render() {
        return (
            <div style={styles.root}>
                <div style={styles.listeners}>
                    <div style={styles.head}>
                        <div style={styles.room_name}>{ this.state.room_name }</div>
                        <div>Listeners:</div>
                        <Divider/>
                    </div>
                    <List style={styles.list}>
                        {Object.values(this.state.listeners).map(listener => (
                            <ListItem style={
                                this.state.speaking === listener.id
                                    ? styles.listener_unmuted
                                    : listener.asking
                                        ? styles.listener_asking
                                        : styles.listener
                                } key={listener.id}>
                                <span style={styles.listener_name}>{listener.name}</span>
                                <div style={styles.listener_buttons}>
                                    {listener.has_auido
                                        ? (<IconButton onClick={() => this.handleMuteChange(listener)} size="small">
                                                { this.state.speaking !== listener.id ? (<MicIcon/>) : (<MicOffIcon/>) }
                                            </IconButton>)
                                        : (<IconButton onClick={() => this.handleMuteChange(listener)} size="small">
                                                { this.state.speaking !== listener.id ? (<EditIcon/>) : (<LinkOffIcon/>) }
                                            </IconButton>)
                                    }
                                    <IconButton onClick={() => this.handleKick(listener)} size="small">
                                        <BlockIcon/>
                                    </IconButton>
                                </div>
                            </ListItem>
                        ))}
                    </List>
                    <div style={styles.buttons}>
                        <Button style={styles.leave_button} variant="outlined" color="primary" onClick={this.handleLeave}>Leave</Button>
                    </div>
                </div>
                <div style={styles.whiteboard}>
                    <Quill onChange={this.handleQuillChange} ref={this.quill}/>
                </div>
            </div>
        );
    }
}

export default withRouter(Speaker);

