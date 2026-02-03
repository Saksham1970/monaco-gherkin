const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../monaco-gherkin.json');

function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error("Config file not found: " + CONFIG_PATH);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

/**
 * Recursively find all .feature files in a directory
 */
function findFeatureFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;

    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            results.push(...findFeatureFiles(filePath));
        } else if (file.endsWith('.feature')) {
            results.push(filePath);
        }
    }
    return results;
}

/**
 * Extract step text from feature files and match to step definitions.
 * Returns only ONE example per step definition to keep metadata lean.
 */
function extractStepExamples(featureFiles, stepDefinitions) {
    const stepKeywords = /^\s*(Given|When|Then|And|But)\s+(.+)$/;
    const allSteps = [];

    // First, collect all steps from feature files
    for (const featureFile of featureFiles) {
        const content = fs.readFileSync(featureFile, 'utf8');
        const lines = content.split(/\r?\n/);

        for (const line of lines) {
            const match = line.match(stepKeywords);
            if (match) {
                const stepText = match[2].trim();
                // Skip scenario outline placeholders
                if (!stepText.includes('<') && !stepText.includes('>')) {
                    allSteps.push(stepText);
                }
            }
        }
    }

    // Match each step definition to ONE example from feature files
    const stepExamples = new Map();

    for (const stepDef of stepDefinitions) {
        // Try to find a matching step from feature files
        for (const stepText of allSteps) {
            // Simple heuristic: if step text contains key words from the expression
            const expressionWords = stepDef.expression
                .replace(/\{[^}]+\}/g, '') // Remove parameter placeholders
                .split(/\s+/)
                .filter(w => w.length > 2); // Only significant words

            const matches = expressionWords.every(word =>
                stepText.toLowerCase().includes(word.toLowerCase())
            );

            if (matches && !stepExamples.has(stepDef.expression)) {
                stepExamples.set(stepDef.expression, stepText);
                break; // Only keep the first match
            }
        }
    }

    return Array.from(stepExamples.values());
}

function extractSteps() {
    const config = loadConfig();
    const jarPath = path.resolve(__dirname, '..', config.jarPath);
    const javaBin = config.javaBin || 'java';
    const gluePackage = config.gluePackage || '';
    const featuresPath = config.featuresPath ? path.resolve(__dirname, '..', config.featuresPath) : null;

    if (!fs.existsSync(jarPath)) {
        console.error("JAR not found: " + jarPath);
        process.exit(1);
    }

    const jdkBin = path.dirname(javaBin);
    const javapCmd = path.join(jdkBin, 'javap.exe');
    const jarCmd = path.join(jdkBin, 'jar.exe');

    console.log(`Extracting from ${jarPath} (Glue: ${gluePackage})...`);

    let fileList;
    try {
        fileList = execSync(`"${jarCmd}" tf "${jarPath}"`).toString().split(/\r?\n/);
    } catch (e) {
        console.error("Failed to run jar command.");
        throw e;
    }

    const gluePath = gluePackage.replace(/\./g, '/');

    const classes = fileList
        .filter(f => {
            if (!f.endsWith('.class') || f.includes('module-info') || f.includes('$')) return false;
            if (gluePath && !f.startsWith(gluePath)) return false;
            return true;
        })
        .map(f => f.replace(/\.class$/, '').replace(/\//g, '.'));

    const metadata = {
        parameterTypes: [],
        steps: [],
        stepExamples: [],
        defaultFeature: config.defaultFeature || ""
    };

    console.log(`Analyzing ${classes.length} targeted classes...`);

    const stepAnnotationRegex = /io\.cucumber\.java\.en\.((?:Given|When|Then|And|But))\(\s*value=\"(.*)\"\s*\)/;
    const parameterTypeAnnotationRegex = /io\.cucumber\.java\.ParameterType\(\s*value=\"(.*)\"\s*\)/;

    // Static extraction loop
    for (const className of classes) {
        try {
            const output = execSync(`"${javapCmd}" -cp "${jarPath}" -p -v ${className}`).toString();

            const blocks = output.split(/^\s*(?:public|private|protected|static)\s+/m);

            for (const block of blocks) {
                const ptMatch = block.match(parameterTypeAnnotationRegex);
                if (ptMatch) {
                    const regex = ptMatch[1];
                    const nameMatch = block.match(/(?:[a-zA-Z0-9_$<>\[\]]+\s+)+([a-zA-Z0-9_$]+)\(/);
                    if (nameMatch) {
                        const name = nameMatch[1];
                        // javap shows doubled backslashes (e.g. \\d). 
                        // We un-escape once so the string is \d, then JSON.stringify makes it \\d in the file.
                        metadata.parameterTypes.push({ name, regex: regex.replace(/\\\\/g, '\\') });
                        console.log(`Found ParameterType: {${name}} -> /${regex}/`);
                    }
                }

                const stepMatch = block.match(stepAnnotationRegex);
                if (stepMatch) {
                    const keyword = stepMatch[1];
                    const expression = stepMatch[2].replace(/\\\\/g, '\\');
                    metadata.steps.push({ type: keyword, expression });
                    console.log(`Found Step: [${keyword}] ${expression}`);
                }
            }
        } catch (e) {
            console.warn(`Failed to process ${className}`);
        }
    }

    // Dynamic extraction of standard parameter types
    console.log("Extracting standard parameter types...");
    try {
        const extractorSource = path.join(__dirname, 'ParameterExtractor.java');
        // We use the project's JAR path for classpath
        const classpath = jarPath;

        const extractorCmd = `"${javaBin}" -cp "${classpath}" "${extractorSource}"`;
        const extractorOutput = execSync(extractorCmd).toString();

        let inSection = false;
        const lines = extractorOutput.split(/\r?\n/);
        for (const line of lines) {
            if (line.includes("--- BEGIN PARAMETER TYPES ---")) {
                inSection = true;
                continue;
            }
            if (line.includes("--- END PARAMETER TYPES ---")) {
                inSection = false;
                continue;
            }

            if (inSection && line.includes(":")) {
                const parts = line.split(":");
                const name = parts[0];
                const regex = parts.slice(1).join(":");

                // Skip anonymous parameter type (empty name) as it's built-in
                if (!name || name.trim() === '') continue;

                // Avoid duplicates if we already found it via static analysis
                if (!metadata.parameterTypes.find(pt => pt.name === name)) {
                    // Dynamic extractor provides single backslashes in its output (e.g. \d).
                    // We keep it as-is so JSON.stringify makes it \\d in the file.
                    metadata.parameterTypes.push({ name, regex });
                    console.log(`Found Standard ParameterType: {${name}} -> /${regex}/`);
                }
            }
        }

    } catch (e) {
        console.error("Failed to run dynamic parameter extractor: " + e.message);
        // Don't fail the whole process, just log error
    }

    // Extract real examples from feature files (1 per step definition)
    if (featuresPath) {
        console.log(`\nScanning feature files in ${featuresPath}...`);
        const featureFiles = findFeatureFiles(featuresPath);
        console.log(`Found ${featureFiles.length} feature files`);

        metadata.stepExamples = extractStepExamples(featureFiles, metadata.steps);
        console.log(`Extracted ${metadata.stepExamples.length} step examples (1 per definition)`);
    }

    const outputFile = path.join(__dirname, '../src/assets/cucumber-metadata.json');
    fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
    console.log(`\nWrote ${metadata.steps.length} steps, ${metadata.parameterTypes.length} parameter types, and ${metadata.stepExamples.length} examples to ${outputFile}`);
}

extractSteps();
