const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { extractSteps } = require('../scripts/extract-steps');

const createCucumberMiddleware = (rootDir) => {
    return (req, res) => {
        try {
            const { gherkin, line } = req.body;

            // ... (rest of logic using gherkin and line)
            if (!gherkin) {
                // If body parser failed or empty
                throw new Error('No gherkin content provided');
            }

            const tempDir = path.join(rootDir, 'temp');

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const featureFilePath = path.join(tempDir, `temp-${Date.now()}.feature`);
            fs.writeFileSync(featureFilePath, gherkin);

            // Read config
            const configPath = path.join(rootDir, 'monaco-gherkin.json');
            const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

            const javaBin = config.javaBin || 'java';
            const jarPath = config.jarPath ? path.resolve(rootDir, config.jarPath) : null;
            const gluePackage = config.gluePackage || '';

            if (!jarPath || !fs.existsSync(jarPath)) {
                throw new Error('JAR not found. Please configure settings.');
            }

            // Build Command
            // Append line number to feature file path if present
            const target = line ? `"${featureFilePath}:${line}"` : `"${featureFilePath}"`;
            let command = `"${javaBin}" -cp "${jarPath}" io.cucumber.core.cli.Main ${target} --glue "${gluePackage}"`;

            try {
                const stdout = execSync(command, { encoding: 'utf8' });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, stdout }));
            } catch (e) {
                // Cucumber exits with 1 if tests fail
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                    success: false,
                    stdout: e.stdout ? e.stdout.toString() : '',
                    stderr: e.stderr ? e.stderr.toString() : e.message
                }));
            }

            // Cleanup
            try { fs.unlinkSync(featureFilePath); } catch (e) { }

        } catch (err) {
            console.error('Middleware Error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
        }
    };
};

const createExtractMiddleware = (rootDir) => {
    return (req, res) => {
        try {
            const config = req.body;
            console.log('Running extraction with config:', config);

            // Run extraction
            const metadata = extractSteps(config, rootDir);

            // Persist config and metadata for persistence
            const assetsDir = path.join(rootDir, 'apps/web/src/assets');
            if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
            fs.writeFileSync(path.join(assetsDir, 'cucumber-metadata.json'), JSON.stringify(metadata, null, 2));

            // Save config to monaco-gherkin.json
            fs.writeFileSync(path.join(rootDir, 'monaco-gherkin.json'), JSON.stringify(config, null, 2));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(metadata));
        } catch (e) {
            console.error('Extraction failed:', e);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: e.message }));
        }
    };
};

module.exports = { createCucumberMiddleware, createExtractMiddleware };
