const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class CucumberService {
    static getConfiguration() {
        const configPath = app.isPackaged
            ? path.join(process.resourcesPath, 'monaco-gherkin.json')
            : path.join(__dirname, '../monaco-gherkin.json');

        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration not found at: ${configPath}`);
        }

        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    static getJarPath(config) {
        const jarPath = app.isPackaged
            ? path.join(process.resourcesPath, config.jarPath)
            : path.resolve(__dirname, '..', config.jarPath);

        return jarPath;
    }

    static async runCucumber(gherkin, line) {
        return new Promise((resolve) => {
            try {
                const config = this.getConfiguration();
                const jarPath = this.getJarPath(config);
                const javaBin = config.javaBin || 'java';
                const gluePackage = config.gluePackage || '';

                // Write temp feature file
                const tempFileName = `temp_editor_${Date.now()}.feature`;
                const tempFilePath = path.join(app.getPath('temp'), tempFileName);
                fs.writeFileSync(tempFilePath, gherkin);

                // Build command
                const featureTarget = line ? `${tempFilePath}:${line}` : tempFilePath;
                const cmd = `"${javaBin}" -Dcucumber.ansi-colors.disabled=false -cp "${jarPath}" io.cucumber.core.cli.Main --glue ${gluePackage} "${featureTarget}"`;

                console.log(`Executing: ${cmd}`);

                exec(cmd, { cwd: path.dirname(jarPath) }, (error, stdout, stderr) => {
                    // Cleanup
                    try {
                        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                    } catch (cleanupError) {
                        console.error('Failed to cleanup temp file:', cleanupError);
                    }

                    resolve({
                        stdout: stdout || '',
                        stderr: stderr || '',
                        success: !error,
                    });
                });
            } catch (err) {
                console.error('Cucumber execution error:', err);
                resolve({
                    stdout: '',
                    stderr: `Internal Error: ${err.message}`,
                    success: false
                });
            }
        });
    }

    static async detectJava() {
        return new Promise((resolve) => {
            exec('java -version', (error, stdout, stderr) => {
                if (error) {
                    resolve({ detected: false, version: null, error: stderr || error.message });
                } else {
                    // java -version outputs to stderr usually
                    resolve({ detected: true, version: stderr || stdout });
                }
            });
        });
    }
}

module.exports = CucumberService;
