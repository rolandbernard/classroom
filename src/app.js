
import React, { createRef } from 'react';
import {  Route, Switch, withRouter, matchPath } from 'react-router-dom';
import { Button, TextField, AppBar, Paper, Divider, IconButton } from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import { v4 as uuid } from 'uuid';
import io from 'socket.io-client';
import clipboard from 'copy-to-clipboard';

import logo from './logo.svg';
import Speaker from './speaker';
import Listener from './listener';

const styles = {
    root: {
        height: 'calc(100% - 3rem)',
    },
    logo: {
        height: '2.5rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        paddingLeft: '0.5rem',
        paddingRight: '0.5rem',
        pointerEvents: 'none',
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: 500,
        padding: '0.5rem',
        display: 'inline-block',
        verticalAlign: 'middle',
    },
    id: {
        fontSize: '1.5rem',
        padding: '0.5rem',
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'all',
        color: grey[400],
    },
    copy_button: {
        display: 'inline-block',
        verticalAlign: 'middle',
        color: grey[400],
    },
    app_bar: {
        whiteSpace: 'nowrap',
    },
    wrapper: {
        width: '90%',
        position: 'absolute',
        top: 'calc(50% + 1.5rem)',
        left: '50%',
        transform: 'translate(-50%, -50%)',
    },
    inner_wrapper: {
        width: '20em',
        maxWidth: '90vw',
        padding: '1rem',
        margin: 'auto',
    },
    divider: {
        margin: '5vh',
    },
    text_field: {
        display: 'block',
    },
    text_field_margin: {
        display: 'block',
        marginBottom: '1rem',
    },
    button: {
        display: 'block',
        marginTop: '0.5rem',
    },
};

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            new_room_error: false,
            new_room_error_msg: " ",
            join_id_error: false,
            join_name_error: false,
            join_error_msg: " ",
        };
        this.new_room_text_field_ref = createRef();
        this.join_id_text_field_ref = createRef();
        this.join_name_text_field_ref = createRef();
        this.socket = io('http://192.168.1.114:8080');

        this.handleCreateNewRoom = this.handleCreateNewRoom.bind(this);
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
    }

    handleCreateNewRoom() {
        const name = this.new_room_text_field_ref.current.value;
        if(name.length > 2) {
            this.setState({ new_room_error: false, new_room_error_msg: " " });
            const key = uuid();
            const onCreated = data => {
                this.socket.removeListener('created', onCreated);
                this.props.history.push(`speaker/${data.room_id}/${key}`);
            }
            this.socket.on('created', onCreated);
            this.socket.emit('create', { name: name, key: key });
        } else {
            this.setState({ new_room_error: true, new_room_error_msg: "Please enter longer name" });
        }
    }

    handleJoinRoom() {
        const name = this.join_name_text_field_ref.current.value;
        const room_id = this.join_id_text_field_ref.current.value;
        if(name.length > 2) {
            const onNotFound = () => {
                this.socket.removeListener('not_found', onNotFound);
                this.socket.removeListener('found', onFound);
                this.setState({ join_id_error: true, join_error_msg: "Room not found" });
            }
            const onFound = () => {
                this.socket.removeListener('not_found', onNotFound);
                this.socket.removeListener('found', onFound);
                this.props.history.push(`listener/${room_id}/${name}`);
            }
            this.socket.on('not_found', onNotFound);
            this.socket.on('found', onFound);
            this.socket.emit('find', { room_id: room_id });
            this.setState({ join_name_error: false, join_error_msg: " " });
        } else {
            this.setState({ join_name_error: true, join_error_msg: "Please enter longer name" });
        }
    }

    handleCopyId(id) {
        clipboard(id);
    }

    render() {
        const match = matchPath(this.props.location.pathname, {
            path: "/:role/:id",
        });
        return (
            <div style={styles.root}>
                <AppBar position="static" style={styles.app_bar}>
                    <div>
                        <img alt="logo" src={logo} style={styles.logo}/>
                        <span style={styles.title}>Classroom</span>
                        {match && (
                            <span>
                                <span style={styles.id}>{match.params.id}</span>
                                <IconButton style={styles.copy_button} onClick={() => this.handleCopyId(match.params.id)}>
                                    <FileCopyIcon/>
                                </IconButton>
                            </span>
                        )}
                    </div>
                </AppBar>
                <Switch>
                    <Route exact path="/">
                        <div style={styles.wrapper}>
                            <Paper variant="outlined" style={styles.inner_wrapper}>
                                <TextField
                                    inputRef={this.join_id_text_field_ref}
                                    variant="outlined"
                                    label="Room id"
                                    size="small"
                                    fullWidth
                                    style={styles.text_field_margin}
                                    error={this.state.join_id_error}
                                />
                                <TextField
                                    inputRef={this.join_name_text_field_ref}
                                    variant="outlined"
                                    label="Your name"
                                    size="small"
                                    fullWidth
                                    style={styles.text_field}
                                    error={this.state.join_name_error}
                                    helperText={this.state.join_error_msg}
                                />
                                <Button variant="contained" color="primary" style={styles.button} onClick={this.handleJoinRoom}>Join room</Button>
                            </Paper>
                            <Divider style={styles.divider}/>
                            <Paper variant="outlined" style={styles.inner_wrapper}>
                                <TextField
                                    inputRef={this.new_room_text_field_ref}
                                    variant="outlined"
                                    label="Name your classroom"
                                    size="small"
                                    fullWidth
                                    style={styles.text_field}
                                    error={this.state.new_room_error}
                                    helperText={this.state.new_room_error_msg}
                                />
                                <Button variant="contained" color="primary" style={styles.button} onClick={this.handleCreateNewRoom}>Create new room</Button>
                            </Paper>
                        </div>
                    </Route>
                    <Route path="/speaker/:id/:key">
                        <Speaker socket={this.socket}/>
                    </Route>
                    <Route path="/listener/:id/:name">
                        <Listener socket={this.socket}/>
                    </Route>
                </Switch>
            </div>
        );
    }
}

export default withRouter(App);

