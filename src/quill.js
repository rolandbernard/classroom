
import React, { createRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import katex from 'katex';
import 'katex/dist/katex.css';

import './quill.css';

const styles = {
    root: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexFlow: 'column',
        padding: '0.5rem',
    },
};

const toolbar_options = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],

    [{ 'header': 1 }, { 'header': 2 }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],

    [{ 'size': ['small', false, 'large', 'huge'] }],

    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],

    ['link', 'image', 'video', 'formula'],

    ['clean']
];

class QuillComponent extends React.Component {
    constructor(props) {
        super(props)
        window.katex = katex;
        this.quill_container_ref = createRef();
        this.quill_toolbar_ref = createRef();
    }

    componentDidMount() {
        this.quill = new Quill(this.quill_container_ref.current, {
            modules: {
                toolbar: toolbar_options,
            },
            theme: 'snow',
        });
    }

    render() {
        return (
            <div style={styles.root}>
                <div ref={this.quill_container_ref}/>
            </div>
        );
    }
}

export default QuillComponent;

