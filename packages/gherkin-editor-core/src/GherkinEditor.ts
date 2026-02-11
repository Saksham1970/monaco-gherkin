
import * as monaco from 'monaco-editor';
import { configure } from '@cucumber/monaco';
import { buildStepDocuments, jsSearchIndex } from '@cucumber/suggest';
import { ExpressionFactory, ParameterTypeRegistry, ParameterType } from '@cucumber/cucumber-expressions';

import { EventBus } from './EventBus';
import { TerminalView } from './TerminalView';
import { SettingsPanel } from './SettingsPanel';
import { findScenarios } from './GherkinScanner';
import { CucumberMetadata, OptionGroup, ExecutionResult } from './types';

export interface GherkinEditorConfig {
    container: HTMLElement;
    terminalContainer: HTMLElement;
    settingsContainer: HTMLElement;
    statusElement?: HTMLElement;
    theme?: string;
    initialValue?: string;
}

export class GherkinEditor {
    private editor: monaco.editor.IStandaloneCodeEditor;
    private eventBus: EventBus;
    private settingsPanel: SettingsPanel;
    private terminalContainer: HTMLElement;
    private statusElement?: HTMLElement;
    private terminal?: TerminalView;

    constructor(config: GherkinEditorConfig) {
        this.eventBus = new EventBus();
        this.terminalContainer = config.terminalContainer;
        this.statusElement = config.statusElement;

        // Register language BEFORE creating editor
        if (!monaco.languages.getLanguages().some(l => l.id === 'gherkin')) {
            monaco.languages.register({ id: 'gherkin' });
        }

        this.editor = monaco.editor.create(config.container, {
            value: config.initialValue || '',
            language: 'gherkin',
            theme: config.theme || 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            'semanticHighlighting.enabled': true,
        });



        this.settingsPanel = new SettingsPanel(config.settingsContainer);

        // Register built-in editor options
        this.registerEditorOptions();

        // Apply saved settings
        this.applySavedSettings();
    }

    private applySavedSettings(): void {
        const theme = this.settingsPanel.loadFromLocalStorage('editor', 'theme') as string || 'vs-dark';
        const fontSize = this.settingsPanel.loadFromLocalStorage('editor', 'fontSize') as number || 14;

        if (theme) {
            monaco.editor.setTheme(theme);
            document.body.classList.remove('theme-vs-dark', 'theme-vs');
            document.body.classList.add(`theme-${theme}`);
        }

        if (fontSize) {
            document.documentElement.style.setProperty('--app-font-size', `${fontSize}px`);
            this.editor.updateOptions({ fontSize });
        }
    }

    private registerEditorOptions(): void {
        const editor = this.editor;
        this.settingsPanel.addGroup({
            id: 'editor',
            label: 'Editor',
            icon: '✏️',
            options: [
                {
                    key: 'theme',
                    label: 'Theme',
                    type: 'select',
                    defaultValue: 'vs-dark',
                    choices: ['vs-dark', 'vs'],
                },
                {
                    key: 'fontSize',
                    label: 'Font Size',
                    type: 'number',
                    defaultValue: 14,
                },
            ],
            onSave: async (values) => {
                // Apply theme globally
                if (values.theme) {
                    const theme = values.theme as string;
                    monaco.editor.setTheme(theme);
                    document.body.classList.remove('theme-vs-dark', 'theme-vs');
                    document.body.classList.add(`theme-${theme}`);
                }
                // Apply font size globally
                const size = values.fontSize as number;
                document.documentElement.style.setProperty('--app-font-size', `${size}px`);
                editor.updateOptions({ fontSize: size });
            },
        });
    }

    getEventBus(): EventBus {
        return this.eventBus;
    }

    getEditor(): monaco.editor.IStandaloneCodeEditor {
        return this.editor;
    }

    getSettingsPanel(): SettingsPanel {
        return this.settingsPanel;
    }

    registerOptionGroup(group: OptionGroup): void {
        this.settingsPanel.addGroup(group);
    }

    configureGherkin(metadata: CucumberMetadata): void {
        const registry = new ParameterTypeRegistry();
        const expressionFactory = new ExpressionFactory(registry);

        if (metadata.parameterTypes) {
            metadata.parameterTypes.forEach(({ name, regex }) => {
                try {
                    if (!registry.lookupByTypeName(name)) {
                        registry.defineParameterType(
                            new ParameterType(name, regex, null, (s) => s, true, false)
                        );
                    }
                } catch {
                    console.warn(`Skipping re-definition of parameter type: ${name}`);
                }
            });
        }

        const expressions = metadata.steps.map((step) =>
            expressionFactory.createExpression(step.expression)
        );

        const stepTexts = metadata.steps.map((step) => step.example);

        try {
            configure(monaco, jsSearchIndex(buildStepDocuments(stepTexts, expressions as any)), expressions as any);

            // Force model recreation to trigger onDidCreateModel in @cucumber/monaco
            const currentModel = this.editor.getModel();
            if (currentModel) {
                const value = currentModel.getValue();
                const newModel = monaco.editor.createModel(value, 'gherkin');
                this.editor.setModel(newModel);
                currentModel.dispose();
            }

        } catch (e) {
            console.error('Failed to configure Gherkin:', e);
        }
    }

    clearTerminal(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = undefined;
        }
        this.terminalContainer.innerHTML = '';
    }

    async runScenarios(): Promise<void> {
        const gherkin = this.editor.getValue();
        const scenarios = findScenarios(gherkin);

        if (scenarios.length === 0) {
            console.warn('No scenarios found to run.');
            return;
        }

        // Reuse or create terminal
        if (!this.terminal) {
            this.terminal = new TerminalView(this.terminalContainer);
        } else {
            this.terminal.clear();
        }

        let passed = 0;
        let failed = 0;

        try {
            for (const scenario of scenarios) {
                if (this.statusElement) this.statusElement.innerText = `Running: ${scenario.name}...`;
                this.terminal.addScenarioOption(scenario.name);

                const result = await this.requestRun(gherkin, scenario.line);
                this.terminal.setLogs(scenario.name, result.stdout + (result.stderr || ''));

                if (result.success) passed++;
                else failed++;

                this.terminal.updateSummary(passed, failed);
            }

            this.terminal.setCompleted(failed);
        } catch (error) {
            this.terminal.setError(error instanceof Error ? error.message : String(error));
        } finally {
            if (this.statusElement) this.statusElement.innerText = '';
        }
    }

    private requestRun(gherkin: string, line?: number): Promise<ExecutionResult> {
        return new Promise((resolve, reject) => {
            const cleanup = () => {
                this.eventBus.off('run:result', onResult);
                this.eventBus.off('error', onError);
            };

            const onResult = (result: ExecutionResult) => {
                cleanup();
                resolve(result);
            };

            const onError = (err: { message: string }) => {
                cleanup();
                reject(new Error(err.message));
            };

            this.eventBus.on('run:result', onResult);
            this.eventBus.on('error', onError);

            this.eventBus.emit('run:request', { gherkin, line });
        });
    }

    dispose(): void {
        this.editor.dispose();
    }
}
