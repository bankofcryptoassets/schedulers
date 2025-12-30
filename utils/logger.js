const winston = require("winston")
const os = require("os")
const { DateTime } = require("luxon")

const logLevels = {
    // level: true,
    message: true,
    colors: { info: "blue", error: "red", debug: "yellow" },
}
const maxsize = parseInt(
    process.env.MAX_LOG_SIZE ? process.env.MAX : "5000000",
    10
)
const maxFiles = parseInt(
    process.env.MAX_LOG_FILES ? process.env.MAX_LOG_FILES : "10",
    10
)

function getTimeZone() {
    return DateTime.utc().toFormat("yyyy-LL-dd HH.mm.ss.SSS")
}

const combinedLogger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === "production" ? "error" : "debug",
            handleExceptions: false,
            format: winston.format.combine(
                winston.format.colorize(logLevels),
                winston.format.simple(),
                winston.format.printf(
                    (info) =>
                        `{"level": "${info.level.toUpperCase()}", "port" :"${
                            process.env.PORT
                        }","service_name":"${process.env.APP_NAME}", "message" : "${
                    info.message
                    }", "timestamp" : "${getTimeZone()}"}`
                )
            ),
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            level: "debug",
            handleExceptions: false,
            maxsize, // 5MB
            maxFiles,
            format: winston.format.combine(
                winston.format.ms(),
                winston.format.json(),
                winston.format.printf(
                    (info) =>
                        `{"level": "${info.level.toUpperCase()}", "env":"${
                            process.env.NODE_ENV
                        }","service_name":"${process.env.APP_NAME}","message" : "${
                            info.message
                        }", "timestamp" : "${getTimeZone()}","host": "${os.hostname()}", "port" :"${
                            process.env.EXTERNAL_PORT
                        }"}`
                )
            ),
        }),
        new winston.transports.File({
            filename: "logs/combined.log",
            level: "error",
            handleExceptions: false,
            maxsize, // 5MB
            maxFiles,
            format: winston.format.combine(
                winston.format.ms(),
                winston.format.json(),
                winston.format.printf(
                    (info) =>
                        `{"level": "${info.level.toUpperCase()}", "env":"${
                            process.env.NODE_ENV
                        }","service_name":"${process.env.APP_NAME}","message" : "${
                            info.message
                        }", "timestamp" : "${getTimeZone()}","host": "${os.hostname()}", "port" :"${
                            process.env.EXTERNAL_PORT
                        }"}`
                )
            ),
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: "logs/exceptions.log",
            maxFiles,
            maxsize,
            level: "error",
        }),
    ],
})

module.exports = { combinedLogger }
