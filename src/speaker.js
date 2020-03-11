
import React from 'react';
import { withRouter } from 'react-router-dom';
import { Button, List, ListItem, ButtonGroup, Divider } from '@material-ui/core';

import Quill from './quill';

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
        minWidth: '5rem',
        padding: '0.5rem',
        paddingRight: 0,
        display: 'flex',
        flexFlow: 'column',
    },
    listener: {
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
    },
    buttons: {
        flex: '0 0 auto',
    },
    leave_button: {
        width: '100%',
    },
    listener_unmuted: {
        padding: '0.5rem',
        display: 'flex',
        flexFlow: 'row nowrap',
        background: 'lightblue',
        borderRadius: '0.2rem',
    }
};

class Speaker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            speaking: null,
            listeners: {
                "1": { id: 1, name: "Lizard" },
                "2": { id: 2, name: "Unusualy long name msadsfduhka shfjkshdjkvbajsbvkja bjbvjsbakjbf" },
                "3": { id: 3, name: "Lizard" },
            },
        };
    }
    render() {
        return (
            <div style={styles.root}>
                <div style={styles.listeners}>
                    <div style={styles.head}>
                        <div>Listeners:</div>
                        <Divider/>
                    </div>
                    <List style={styles.list}>
                        {Object.values(this.state.listeners).map(listener => (
                            <ListItem style={styles.listener} key={listener.id}>
                                <span style={styles.listener_name}>{listener.name}</span>
                                <ButtonGroup style={styles.listener_buttons} size="small" color="primary">
                                    <Button>
                                        { this.state.speaking === listener.id ? "Mute" : "Unmute" }
                                    </Button>
                                    <Button>
                                        Kick
                                    </Button>
                                </ButtonGroup>

                            </ListItem>
                        ))}
                    </List>
                    <div style={styles.buttons}>
                        <Button style={styles.leave_button} variant="outlined" color="primary">Leave</Button>
                    </div>
                </div>
                <div style={styles.whiteboard}>
                    <Quill/>
                </div>
            </div>
        );
    }
}

export default withRouter(Speaker);

