
import { GherkinEditor } from '@monaco-gherkin/core';
import { JavaCucumberPlugin } from '@monaco-gherkin/cucumber-java';

import 'monaco-editor/min/vs/editor/editor.main.css';
import './styles.css';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('editor-container')!;
    const terminalContainer = document.getElementById('terminals-list')!;
    const settingsContainer = document.getElementById('settings-container')!;
    const statusElement = document.getElementById('status')!;
    const runBtn = document.getElementById('run-btn')!;
    const clearBtn = document.getElementById('clear-btn')!;
    const settingsToggle = document.getElementById('settings-toggle')!;
    const resizeHandle = document.getElementById('resize-handle')!;
    const outputContainer = document.getElementById('output-container')!;

    // Load config for default feature
    let initialValue = '';
    try {
        const configResponse = await fetch('monaco-gherkin.json');
        if (configResponse.ok) {
            const config = await configResponse.json();
            if (config.defaultFeature) initialValue = config.defaultFeature;
        }
    } catch { /* use empty string */ }

    const editor = new GherkinEditor({
        container,
        terminalContainer,
        settingsContainer,
        statusElement,
        initialValue,
        theme: 'vs-dark',
    });

    const javaPlugin = new JavaCucumberPlugin(editor);
    await javaPlugin.initialize();

    // --- Controls ---
    runBtn.addEventListener('click', () => editor.runScenarios());
    clearBtn.addEventListener('click', () => { terminalContainer.innerHTML = ''; });
    settingsToggle.addEventListener('click', () => editor.getSettingsPanel().toggle());

    // --- Terminal drag-resize ---
    let startY = 0;
    let startHeight = 0;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        startY = e.clientY;
        startHeight = outputContainer.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    });

    const onDrag = (e: MouseEvent) => {
        const delta = startY - e.clientY;
        const newHeight = Math.max(100, Math.min(window.innerHeight - 150, startHeight + delta));
        outputContainer.style.height = `${newHeight}px`;
    };

    const onDragEnd = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
    };
});
