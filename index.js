const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose'); // For MongoDB interaction
const nodemailer = require('nodemailer'); // For sending emails
require('dotenv').config(); // Load environment variables

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors()); // Allow requests from your frontend

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Define Contact Schema and Model ---
const contactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, default: '' },
    message: { type: String, required: true },
    submissionDate: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// --- Nodemailer Transporter Setup ---
let transporter = nodemailer.createTransport({
    service: 'gmail', // Or 'smtp' for other providers
    auth: {
        user: process.env.EMAIL_USER, // Your sending email address
        pass: process.env.EMAIL_PASS  // Your app password or email password
    }
});

// Your contact form submission endpoint
app.post('/api/contact', async (req, res) => {
    const { name, email, company, message } = req.body;

    // Server-side validation
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
        // 1. Save to Database
        const newContact = new Contact({
            name,
            email,
            company: company || '', // Use empty string if company is not provided
            message
        });
        await newContact.save();
        console.log('Contact form data saved to MongoDB:', newContact);

        // 2. Send Welcome Email to Client
        const clientMailOptions = {
            from: process.env.EMAIL_USER,
            to: email, // Client's email
            subject: 'Thank You for Contacting Sandip Sarkar!',
            html: `
                <p>Dear ${name},</p>
                <p>Thank you for reaching out to Sandip Sarkar's Data & Automation Hub!</p>
                <p>I appreciate your interest and will get back to you shortly to discuss your needs.</p>
                <p>In the meantime, feel free to explore more of my projects and services on my website.</p>
                <p>Best regards,</p>
                <p>Sandip Sarkar</p>
                <p><a href="YOUR_WEBSITE_URL_HERE">My Portfolio</a></p>
            `
        };
        await transporter.sendMail(clientMailOptions);
        console.log('Welcome email sent to client.');

        // 3. Send Notification Email to You
        const myMailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Or a specific notification email like 'sarkarsandip966@gmail.com'
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <p>You have a new contact form submission!</p>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
                <p><strong>Message:</strong></p>
                <p>${message}</p>
                <p>Submitted on: ${new Date().toLocaleString()}</p>
                <p>Please contact them soon!</p>
            `
        };
        await transporter.sendMail(myMailOptions);
        console.log('Notification email sent to you.');

        // Send success response to frontend
        res.status(200).json({ message: 'Message sent successfully! Thank you.' });

    } catch (err) {
        console.error('Error processing contact form:', err);
        // Differentiate error messages based on what failed (DB save vs. email send) if needed
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
});

// Basic route for testing server availability
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});