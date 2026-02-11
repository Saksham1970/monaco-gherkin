
import { GherkinEditor } from '@monaco-gherkin/core';
import { JavaCucumberPlugin } from '@monaco-gherkin/cucumber-java';

// Styles
import 'monaco-editor/min/vs/editor/editor.main.css';
import './styles.css';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('editor-container');
    const terminalContainer = document.getElementById('terminals-list');
    const statusElement = document.getElementById('status');
    const runBtn = document.getElementById('run-btn');
    const clearBtn = document.getElementById('clear-btn');

    if (!container || !terminalContainer) {
        console.error('Required DOM elements not found');
        return;
    }

    // Load config to get default feature (if any) or start empty
    let initialValue = '';

    try {
        const configResponse = await fetch('monaco-gherkin.json');
        if (configResponse.ok) {
            const config = await configResponse.json();
            if (config.defaultFeature) {
                initialValue = config.defaultFeature;
            }
        }
    } catch (e) {
        // use empty string
    }

    const editor = new GherkinEditor({
        container,
        terminalContainer,
        statusElement: statusElement || undefined,
        initialValue,
        theme: 'vs-dark'
    });

    const javaPlugin = new JavaCucumberPlugin(editor);
    await javaPlugin.initialize();

    runBtn?.addEventListener('click', () => {
        editor.runScenarios();
    });

    clearBtn?.addEventListener('click', () => {
        const list = document.getElementById('terminals-list');
        if (list) list.innerHTML = '';
    });

    // Settings Panel Logic
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');
    const extractBtn = document.getElementById('extract-btn') as HTMLButtonElement;

    // Inputs
    const jarPathInput = document.getElementById('jarPath') as HTMLInputElement;
    const javaBinInput = document.getElementById('javaBin') as HTMLInputElement;
    const gluePackageInput = document.getElementById('gluePackage') as HTMLInputElement;
    const featuresPathInput = document.getElementById('featuresPath') as HTMLInputElement;

    settingsToggle?.addEventListener('click', () => {
        settingsPanel?.classList.toggle('visible');
    });

    extractBtn?.addEventListener('click', async () => {
        const originalText = extractBtn.innerText;
        extractBtn.innerText = 'Extracting...';
        extractBtn.disabled = true;

        try {
            const config = {
                jarPath: jarPathInput.value,
                javaBin: javaBinInput.value,
                gluePackage: gluePackageInput.value,
                featuresPath: featuresPathInput.value
            };

            await javaPlugin.extractAndConfigure(config);

            if (statusElement) statusElement.innerText = 'Steps extracted & loaded successfully';
            settingsPanel?.classList.remove('visible');
        } catch (e) {
            if (statusElement) statusElement.innerText = `Error: ${e instanceof Error ? e.message : String(e)}`;
            console.error(e);
        } finally {
            extractBtn.innerText = originalText;
            extractBtn.disabled = false;
        }
    });

    // Handle resizing
    window.addEventListener('resize', () => {
        editor.getEditor().layout();
    });
});
