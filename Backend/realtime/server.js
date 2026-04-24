require('dotenv').config();
const cluster = require('cluster');
const os = require('os');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const path = require('path');
const morgan = require('morgan');

const { onMessageHandler, onCloseHandler } = require('./source/handler/datahandler');

// Keep the worker count aligned with the actual host capacity.
const hostCpuCount = os.cpus().length || 1;
const requestedWorkers = Number(process.env.WS_WORKER_COUNT || hostCpuCount);
const numCPUs = Math.max(1, Math.min(hostCpuCount, requestedWorkers || 1));

if (cluster.isMaster) {
    console.log(`Master process ${process.pid} is running`);

    // Fork workers for each CPU core
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Listen for workers exiting
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited with code ${code}, signal: ${signal}`);
        console.log('Starting a new worker...');
        cluster.fork();
    });
} else {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocket.Server({ server });

    app.use(express.static(path.join(__dirname, 'public')));
    app.use(morgan('combined'));

    app.get('/rt', (req, res) => {
        res.status(200).json({ success: true, message: 'Server is running!' });
    });

    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ip = ip.replace(",35.201.73.5", "")
        console.log(`User connected: ${ip} on worker ${process.pid}`);

        ws.on('message', (message) => onMessageHandler(ws, wss, message));
        ws.on('close', () => onCloseHandler(ws));
    });

    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
        console.log(`Worker ${process.pid} listening on port ${PORT}`);
    });
}
