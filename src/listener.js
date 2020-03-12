
import React, { createRef } from 'react';
import { withRouter } from 'react-router-dom';
import { Button, List, ListItem, Divider, ButtonGroup } from '@material-ui/core';
import { yellow, lightBlue } from '@material-ui/core/colors';
import MicIcon from '@material-ui/icons/Mic';
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
        whiteSpace: 'nowrap',
    },
    listener_unmuted: {
        padding: '0.5rem',
        height: '2.75rem',
        display: 'flex',
        flexFlow: 'row nowrap',
        background: lightBlue[300],
        borderRadius: '0.2rem',
        animation: 'blinking_blue 5s infinite',
    },
    listener_asking: {
        padding: '0.5rem',
        height: '2.75rem',
        display: 'flex',
        flexFlow: 'row nowrap',
        background: yellow[400],
        borderRadius: '0.2rem',
        animation: 'blinking_yellow 0.75s infinite',
    },
};

class Listener extends React.Component {
    constructor(props) {
        super(props);
        this.socket = props.socket;
        this.rtc = null;
        this.local_audio = null;
        this.data_channel = null;
        this.state = {
            speaking: null,
            listeners: { },
            asking: false,
        };
        this.quill = createRef();
        this.audio1 = createRef();
        this.audio2 = createRef();

        this.handleLeave = this.handleLeave.bind(this);
        this.handleAskToSpeak = this.handleAskToSpeak.bind(this);
        this.handleQuillChange = this.handleQuillChange.bind(this);
    }

    handleAskToSpeak() {

    }

    handleLeave() {
        this.socket.removeAllListeners();
        this.socket.emit('leave');
        if(this.data_channel) {
            this.data_channel.close();
        }
        if(this.rtc) {
            this.rtc.close();
        }
        this.props.history.push('/');
    }

    componentDidMount() {
        this.quill.current.enable(false);
        this.socket.on('kick', this.handleLeave);
        this.socket.on('session', async data => {
            this.rtc = new RTCPeerConnection({ iceServers: config.ice_servers }, {"optional": [{"DtlsSrtpKeyAgreement": true}]});
            if(this.local_audio) {
                for(let track of this.local_audio.getTracks()) {
                    this.rtc.addTrack(track, this.local_audio);
                }
            }
            this.rtc.onicecandidate = event => {
                if (event.candidate) {
                    this.socket.emit('candidate', {
                        receiver_id: data.sender_id,
                        candidate: {
                            sdpMLineIndex: event.candidate.sdpMLineIndex,
                            candidate: event.candidate.candidate,
                        }
                    });
                }
            };
            this.rtc.ontrack = event => {
                console.log(event);
                this.audio1.current.srcObject = event.streams[0];
                this.audio1.current.play();
            };
            this.rtc.ondatachannel = event => {
                this.data_channel = event.channel;
                this.data_channel.onmessage = event => {
                    const data = JSON.parse(event.data);
                    if(data.type === 'whiteboard_set') {
                        this.quill.current.setContent(data.data);
                    }
                    if(data.type === 'whiteboard_update') {
                        this.quill.current.updateContent(data.data);
                    }
                    if(data.type === 'state_set') {
                        this.setState(data.data);
                    }
                };
            }
            const session_desc = new RTCSessionDescription(data.session);
            await this.rtc.setRemoteDescription(session_desc);
            const answer = await this.rtc.createAnswer();
            await this.rtc.setLocalDescription(answer);
            this.socket.emit('session', { receiver_id: data.sender_id, session: answer });
        });
        this.socket.on('candidate', data => {
            if(this.rtc) {
                const ice_candidate = new RTCIceCandidate(data.candidate);
                this.rtc.addIceCandidate(ice_candidate);
            }
        });
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                this.local_audio = stream;
                this.socket.emit('join', { room_id: this.props.match.params.id, name: this.props.match.params.name });
            }).catch(() => {
                this.socket.emit('join', { room_id: this.props.match.params.id, name: this.props.match.params.name });
            });
        } else {
            this.socket.emit('join', { room_id: this.props.match.params.id, name: this.props.match.params.name });
        }
    }

    handleQuillChange(delta) {
    }

    render() {
        return (
            <div style={styles.root}>
                <audio ref={this.audio1}/>
                <audio ref={this.audio2}/>
                <div style={styles.listeners}>
                    <div style={styles.head}>
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
                                { this.state.speaking === listener.id && (<MicIcon size="small"/>) }
                            </ListItem>
                        ))}
                    </List>
                    <div style={styles.buttons}>
                        <ButtonGroup style={styles.leave_button} variant="outlined" color="primary" >
                        <Button style={styles.leave_button} onClick={this.handleAskToSpeak}>{ this.state.asking ? 'Cancel' : 'Ask to speak'}</Button>
                        <Button style={styles.leave_button} onClick={this.handleLeave}>Leave</Button>
                        </ButtonGroup>
                    </div>
                </div>
                <div style={styles.whiteboard}>
                    <Quill onChange={this.handleQuillChange} ref={this.quill}/>
                </div>
            </div>
        );
    }
}

export default withRouter(Listener);

