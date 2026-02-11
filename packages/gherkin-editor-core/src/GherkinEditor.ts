
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

    constructor(config: GherkinEditorConfig) {
        this.eventBus = new EventBus();
        this.terminalContainer = config.terminalContainer;
        this.statusElement = config.statusElement;

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

        configure(monaco, jsSearchIndex(buildStepDocuments(stepTexts, expressions as any)), expressions as any);
    }

    async runScenarios(): Promise<void> {
        const gherkin = this.editor.getValue();
        const scenarios = findScenarios(gherkin);
        const terminal = new TerminalView(this.terminalContainer);

        let passed = 0;
        let failed = 0;

        try {
            terminal.setRunning('Getting Summary...');
            if (this.statusElement) this.statusElement.innerText = 'Getting Summary...';

            const summaryResult = await this.requestRun(gherkin);
            terminal.setLogs('summary', summaryResult.stdout + (summaryResult.stderr || ''));

            for (const scenario of scenarios) {
                if (this.statusElement) this.statusElement.innerText = `Running: ${scenario.name}...`;
                terminal.addScenarioOption(scenario.name);

                const result = await this.requestRun(gherkin, scenario.line);
                terminal.setLogs(scenario.name, result.stdout + (result.stderr || ''));

                if (result.success) passed++;
                else failed++;

                terminal.updateSummary(passed, failed);
            }

            terminal.setCompleted(failed);
        } catch (error) {
            terminal.setError(error instanceof Error ? error.message : String(error));
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
