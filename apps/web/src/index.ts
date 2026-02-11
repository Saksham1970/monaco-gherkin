
import { GherkinEditor } from '@monaco-gherkin/core';
import { JavaCucumberPlugin } from '@monaco-gherkin/cucumber-java';

// Styles
import 'monaco-editor/min/vs/editor/editor.main.css';

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

    // Handle resizing
    window.addEventListener('resize', () => {
        editor.getEditor().layout();
    });
});
