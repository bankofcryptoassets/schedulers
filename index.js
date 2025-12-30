const express = require('express');
const cron = require('node-cron');
const { dbConnection, closeDatabaseConnection } = require('./utils/db');
const { execute: executeSwap } = require('./crons/relay');
const { execute: executeLiquidation } = require('./crons/liquidation');
const { combinedLogger } = require('./utils/logger');
const app = express();
const PORT = process.env.PORT || 3000;

// Function to gracefully shutdown the application
const shutdown = async (signal) => {
    await closeDatabaseConnection();
    process.exit(0);
};

// Handle process termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    await closeDatabaseConnection();
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    await closeDatabaseConnection();
    process.exit(1);
});

try {
    // Middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    dbConnection();

    // Routes
    app.get('/', (req, res) => {
        res.json({ message: 'Welcome to the Express API' });
    });

    cron.schedule(process.env.SWAP_CRON_EXP, () => {
        executeSwap();
    });

    cron.schedule(process.env.LIQUIDATION_CRON_EXP, () => {
        executeLiquidation();
    })

    // Start server
    app.listen(PORT, () => {
        combinedLogger.info(`Server is running on port ${PORT}`);
    });
} catch (error) {
    console.error('Error starting application:', error);
    closeDatabaseConnection().then(() => {
        process.exit(1);
    });
}

