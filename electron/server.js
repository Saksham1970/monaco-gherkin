const express = require('express');
const path = require('path');
const { app } = require('electron');
const CucumberService = require('./cucumber-service');

const getMetadataPath = () =>
    app.isPackaged
        ? path.join(process.resourcesPath, 'assets', 'cucumber-metadata.json')
        : path.join(__dirname, '../src/assets/cucumber-metadata.json');

const startServer = () =>
    new Promise((resolve) => {
        const server = express();
        server.use(express.json());
        server.use(express.static(path.join(__dirname, '../dist')));

        server.get('/assets/cucumber-metadata.json', (_req, res) => {
            res.sendFile(getMetadataPath());
        });

        server.post('/run-cucumber', async (req, res) => {
            const { gherkin, line } = req.body;
            const result = await CucumberService.runCucumber(gherkin, line);
            res.json(result);
        });

        const listener = server.listen(0, 'localhost', () => {
            const port = listener.address().port;
            console.log(`Express server started on port ${port}`);
            resolve(port);
        });
    });

module.exports = { startServer };
