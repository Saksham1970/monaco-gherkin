const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../monaco-gherkin.json');

const STEP_ANNOTATION_REGEX = /io\.cucumber\.java\.en\.((?:Given|When|Then|And|But))\(\s*value=\"(.*)\"\s*\)/;
const PARAMETER_TYPE_ANNOTATION_REGEX = /io\.cucumber\.java\.ParameterType\(\s*value=\"(.*)\"\s*\)/;
const STEP_KEYWORDS_REGEX = /^\s*(Given|When|Then|And|But)\s+(.+)$/;

const DELIMITER = {
    BEGIN: '--- BEGIN PARAMETER TYPES ---',
    END: '--- END PARAMETER TYPES ---',
    FIELD: ':',
};

const loadConfig = () => {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`Config file not found: ${CONFIG_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
};

const findFeatureFiles = (dir) => {
    if (!fs.existsSync(dir)) {
        console.error(`Feature directory not found: ${dir}`);
        process.exit(1);
    }

    return fs.readdirSync(dir).flatMap((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        return stat.isDirectory() ? findFeatureFiles(filePath) : file.endsWith('.feature') ? [filePath] : [];
    });
};

const escapeRegex = (str) => str.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

const convertCucumberExpressionToRegex = (expression, parameterTypes) => {
    let pattern = expression;

    pattern = escapeRegex(pattern);

    parameterTypes.forEach(({ name, regex }) => {
        const placeholder = escapeRegex(`{${name}}`);
        pattern = pattern.replaceAll(placeholder, `(?:${regex})`);
    });

    return new RegExp(`^${pattern}$`, 'i');
};

const extractStepExamples = (featureFiles, stepDefinitions, parameterTypes) => {
    const stepWithExamples = new Map();

    for (const stepDef of stepDefinitions) {
        if (stepWithExamples.has(stepDef.expression)) continue;

        const regex = convertCucumberExpressionToRegex(stepDef.expression, parameterTypes);

        for (const featureFile of featureFiles) {
            const content = fs.readFileSync(featureFile, 'utf8');
            const lines = content.split(/\r?\n/);

            for (const line of lines) {
                const match = line.match(STEP_KEYWORDS_REGEX);
                if (!match) continue;

                const stepText = match[2].trim();
                if (regex.test(stepText)) {
                    stepWithExamples.set(stepDef.expression, stepText);
                    break;
                }
            }

            if (stepWithExamples.has(stepDef.expression)) break;
        }
    }

    return stepWithExamples;
};

const executeCommand = (command) => execSync(command).toString();

const unescapeRegex = (regex) => regex.replace(/\\\\/g, '\\');

const extractParameterTypesFromClass = (javapCmd, jarPath, className, metadata) => {
    try {
        const output = executeCommand(`"${javapCmd}" -cp "${jarPath}" -p -v ${className}`);
        const blocks = output.split(/^\s*(?:public|private|protected|static)\s+/m);

        for (const block of blocks) {
            const ptMatch = block.match(PARAMETER_TYPE_ANNOTATION_REGEX);
            if (ptMatch) {
                const regex = ptMatch[1];
                const nameMatch = block.match(/(?:[a-zA-Z0-9_$<>\[\]]+\s+)+([a-zA-Z0-9_$]+)\(/);
                if (nameMatch) {
                    const name = nameMatch[1];
                    metadata.parameterTypes.push({ name, regex: unescapeRegex(regex) });
                    console.log(`Found ParameterType: {${name}} -> /${regex}/`);
                }
            }

            const stepMatch = block.match(STEP_ANNOTATION_REGEX);
            if (stepMatch) {
                const keyword = stepMatch[1];
                const expression = unescapeRegex(stepMatch[2]);
                metadata.steps.push({ type: keyword, expression });
                console.log(`Found Step: [${keyword}] ${expression}`);
            }
        }
    } catch (e) {
        console.warn(`Failed to process ${className}`);
    }
};

const extractStandardParameterTypes = (javaBin, jarPath, metadata) => {
    console.log('Extracting standard parameter types...');
    try {
        const extractorSource = path.join(__dirname, 'ParameterExtractor.java');
        const extractorCmd = `"${javaBin}" -cp "${jarPath}" "${extractorSource}"`;
        const extractorOutput = executeCommand(extractorCmd);

        let inSection = false;
        extractorOutput.split(/\r?\n/).forEach((line) => {
            if (line.includes(DELIMITER.BEGIN)) {
                inSection = true;
                return;
            }
            if (line.includes(DELIMITER.END)) {
                inSection = false;
                return;
            }

            if (inSection && line.includes(DELIMITER.FIELD)) {
                const [name, ...regexParts] = line.split(DELIMITER.FIELD);
                const regex = regexParts.join(DELIMITER.FIELD);

                if (!name || name.trim() === '') return;

                if (!metadata.parameterTypes.find((pt) => pt.name === name)) {
                    metadata.parameterTypes.push({ name, regex });
                    console.log(`Found Standard ParameterType: {${name}} -> /${regex}/`);
                }
            }
        });
    } catch (e) {
        console.error(`Failed to run dynamic parameter extractor: ${e.message}`);
    }
};

const extractSteps = () => {
    const config = loadConfig();
    const jarPath = path.resolve(__dirname, '..', config.jarPath);
    const javaBin = config.javaBin || 'java';
    const gluePackage = config.gluePackage || '';
    const featuresPath = config.featuresPath ? path.resolve(__dirname, '..', config.featuresPath) : null;

    if (!fs.existsSync(jarPath)) {
        console.error(`JAR not found: ${jarPath}`);
        process.exit(1);
    }

    const jdkBin = path.dirname(javaBin);
    const javapCmd = path.join(jdkBin, 'javap.exe');
    const jarCmd = path.join(jdkBin, 'jar.exe');

    console.log(`Extracting from ${jarPath} (Glue: ${gluePackage})...`);

    const fileList = executeCommand(`"${jarCmd}" tf "${jarPath}"`).split(/\r?\n/);
    const gluePath = gluePackage.replace(/\./g, '/');

    const classes = fileList
        .filter((f) => {
            if (!f.endsWith('.class') || f.includes('module-info') || f.includes('$')) return false;
            if (gluePath && !f.startsWith(gluePath)) return false;
            return true;
        })
        .map((f) => f.replace(/\.class$/, '').replace(/\//g, '.'));

    const metadata = {
        parameterTypes: [],
        steps: [],
    };

    console.log(`Analyzing ${classes.length} targeted classes...`);

    classes.forEach((className) => extractParameterTypesFromClass(javapCmd, jarPath, className, metadata));

    extractStandardParameterTypes(javaBin, jarPath, metadata);

    if (featuresPath) {
        console.log(`\nScanning feature files in ${featuresPath}...`);
        const featureFiles = findFeatureFiles(featuresPath);
        console.log(`Found ${featureFiles.length} feature files`);

        const examplesMap = extractStepExamples(featureFiles, metadata.steps, metadata.parameterTypes);

        metadata.steps = metadata.steps.map(step => ({
            ...step,
            example: examplesMap.get(step.expression) || step.expression
        }));

        console.log(`Matched examples for ${examplesMap.size} of ${metadata.steps.length} steps`);
    }

    const outputFile = path.join(__dirname, '../src/assets/cucumber-metadata.json');
    fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
    console.log(`\nWrote ${metadata.steps.length} steps and ${metadata.parameterTypes.length} parameter types to ${outputFile}`);
};

extractSteps();
