const mongoose = require("mongoose")
const dotenv = require("dotenv")
const { combinedLogger } = require("./logger")
dotenv.config()

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        combinedLogger.info("Database connected successfully")
    } catch (error) {
        combinedLogger.error(
            "Database connection failed: " +
            JSON.stringify(error, Object.getOwnPropertyNames(error))
        )
    }
}

const closeDatabaseConnection = async () => {
    try {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
            combinedLogger.info('Database connection closed');
        }
    } catch (error) {
        combinedLogger.error('Error closing database connection: ' +
            JSON.stringify(error, Object.getOwnPropertyNames(error))
        );
    }
}

module.exports = { dbConnection, closeDatabaseConnection }