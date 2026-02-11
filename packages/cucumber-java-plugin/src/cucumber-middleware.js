const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const createCucumberMiddleware = (rootDir) => async (req, res) => {
    const { gherkin, line } = req.body;

    try {
        const config = JSON.parse(
            fs.readFileSync(path.join(rootDir, 'monaco-gherkin.json'), 'utf8')
        );

        const jarPath = path.resolve(rootDir, config.jarPath);
        const javaBin = config.javaBin || 'java';
        const gluePackage = config.gluePackage || '';

        const tempFileName = 'temp_editor.feature';
        const tempFilePath = path.join(rootDir, tempFileName);
        fs.writeFileSync(tempFilePath, gherkin);

        const featureTarget = line ? `${tempFileName}:${line}` : tempFileName;
        const cmd = `"${javaBin}" -Dcucumber.ansi-colors.disabled=false -cp "${jarPath}" io.cucumber.core.cli.Main --glue ${gluePackage} ${featureTarget}`;

        console.log(`Executing: ${cmd} in ${rootDir}`);

        exec(cmd, { cwd: rootDir }, (error, stdout, stderr) => {
            try {
                if (fs.existsSync(tempFilePath)) {
                    fs.unlinkSync(tempFilePath);
                }
            } catch (cleanupError) {
                console.error('Failed to cleanup temp file:', cleanupError);
            }

            res.json({
                success: !error,
                stdout,
                stderr,
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            stdout: '',
            stderr: `Configuration error: ${error.message}`,
        });
    }
};

module.exports = { createCucumberMiddleware };
