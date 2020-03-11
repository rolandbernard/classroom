
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import 'typeface-roboto';

import App from './app';

ReactDOM.render((
    <Router>
        <App />
    </Router>
), document.getElementById('root'));

