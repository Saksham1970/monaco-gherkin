const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const execAsync = promisify(exec);

class CucumberService {
    static getConfigPath() {
        return app.isPackaged
            ? path.join(process.resourcesPath, 'monaco-gherkin.json')
            : path.join(__dirname, '../monaco-gherkin.json');
    }

    static getConfiguration() {
        const configPath = this.getConfigPath();

        if (!fs.existsSync(configPath)) {
            throw new Error(`Configuration not found at: ${configPath}`);
        }

        return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }

    static getJarPath(config) {
        return app.isPackaged
            ? path.join(process.resourcesPath, config.jarPath)
            : path.resolve(__dirname, '..', config.jarPath);
    }

    static createTempFeatureFile(gherkin) {
        const tempFileName = `temp_editor_${Date.now()}.feature`;
        const tempFilePath = path.join(app.getPath('temp'), tempFileName);
        fs.writeFileSync(tempFilePath, gherkin);
        return tempFilePath;
    }

    static cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error('Failed to cleanup temp file:', error);
        }
    }

    static buildCucumberCommand(javaBin, jarPath, gluePackage, featureTarget) {
        return `"${javaBin}" -Dcucumber.ansi-colors.disabled=false -cp "${jarPath}" io.cucumber.core.cli.Main --glue ${gluePackage} "${featureTarget}"`;
    }

    static async runCucumber(gherkin, line) {
        try {
            const config = this.getConfiguration();
            const jarPath = this.getJarPath(config);
            const javaBin = config.javaBin || 'java';
            const gluePackage = config.gluePackage || '';

            const tempFilePath = this.createTempFeatureFile(gherkin);
            const featureTarget = line ? `${tempFilePath}:${line}` : tempFilePath;
            const cmd = this.buildCucumberCommand(javaBin, jarPath, gluePackage, featureTarget);

            console.log(`Executing: ${cmd}`);

            try {
                const { stdout, stderr } = await execAsync(cmd, { cwd: path.dirname(jarPath) });
                return { stdout: stdout || '', stderr: stderr || '', success: true };
            } catch (error) {
                return {
                    stdout: error.stdout || '',
                    stderr: error.stderr || '',
                    success: false,
                };
            } finally {
                this.cleanupTempFile(tempFilePath);
            }
        } catch (err) {
            console.error('Cucumber execution error:', err);
            return {
                stdout: '',
                stderr: `Internal Error: ${err.message}`,
                success: false,
            };
        }
    }

    static async detectJava() {
        try {
            const { stdout, stderr } = await execAsync('java -version');
            return { detected: true, version: stderr || stdout };
        } catch (error) {
            return {
                detected: false,
                version: null,
                error: error.stderr || error.message,
            };
        }
    }
}

module.exports = CucumberService;
