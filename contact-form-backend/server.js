const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs');
const { parse } = require('json2csv');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static files from the public directory
app.use(express.static('public'));

// Connect to SQLite3 database
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
    db.run("CREATE TABLE contacts (name TEXT, email TEXT, message TEXT)", (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table created successfully');
        }
    });
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Define the root route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Define the POST route to handle form submissions
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    const stmt = db.prepare("INSERT INTO contacts VALUES (?, ?, ?)");
    stmt.run(name, email, message, (err) => {
        if (err) {
            console.error('Error saving contact:', err.message);
            res.status(500).send('Error saving contact');
        } else {
            console.log('Contact saved successfully');
            // Send email notification
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER,
                subject: 'New Contact Form Submission',
                text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Error sending email:', error.message);
                    res.status(500).send('Error sending email');
                } else {
                    console.log('Email sent:', info.response);
                    res.status(200).send('Contact saved and email sent successfully');
                }
            });
        }
    });
    stmt.finalize();
});

// Define the GET route to export data to CSV
app.get('/export', (req, res) => {
    db.all("SELECT * FROM contacts", [], (err, rows) => {
        if (err) {
            console.error('Error retrieving contacts:', err.message);
            res.status(500).send('Error retrieving contacts');
        } else {
            const csv = parse(rows);
            fs.writeFile('contacts.csv', csv, (err) => {
                if (err) {
                    console.error('Error writing CSV file:', err.message);
                    res.status(500).send('Error writing CSV file');
                } else {
                    console.log('CSV file created successfully');
                    res.download('contacts.csv');
                }
            });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});