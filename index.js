const express = require('express');
const cron = require('node-cron');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Express API' });
});

// Cron job - runs every minute
cron.schedule('0 */6 * * *', () => {
    executeSwap();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

