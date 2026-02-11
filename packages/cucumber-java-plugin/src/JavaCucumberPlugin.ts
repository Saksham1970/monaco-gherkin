
import { GherkinEditor, CucumberMetadata } from '@monaco-gherkin/core';
import { CucumberRunner } from './CucumberRunner';
import { JavaPluginConfig } from './types';

export class JavaCucumberPlugin {
    private editor: GherkinEditor;
    private config?: JavaPluginConfig;
    private runHandler?: (payload: { gherkin: string; line?: number }) => void;

    constructor(editor: GherkinEditor, config?: JavaPluginConfig) {
        this.editor = editor;
        this.config = config;
    }

    async initialize(): Promise<void> {
        try {
            // Register plugin settings
            this.editor.registerOptionGroup({
                id: 'cucumber-java',
                label: 'Cucumber Java',
                icon: '☕',
                options: [
                    { key: 'jarPath', label: 'JAR Path', type: 'string', defaultValue: this.config?.jarPath ?? 'backend-demo/build/libs/backend-demo.jar', description: 'Path to the Cucumber fat JAR (relative to project root)' },
                    { key: 'javaBin', label: 'Java Binary', type: 'string', defaultValue: this.config?.javaBin ?? 'java', description: 'Path to the Java executable' },
                    { key: 'gluePackage', label: 'Glue Package', type: 'string', defaultValue: this.config?.gluePackage ?? 'com.example.coffee', description: 'Cucumber glue code package' },
                    { key: 'featuresPath', label: 'Features Path', type: 'string', defaultValue: this.config?.featuresPath ?? 'backend-demo/src/test/resources', description: 'Directory containing .feature files' },
                ],
                onSave: async (values) => {
                    await this.extractAndConfigure(values as unknown as JavaPluginConfig);
                },
            });

            // Load metadata from the assets served by the web app
            const response = await fetch('assets/cucumber-metadata.json');
            if (response.ok) {
                const metadata: CucumberMetadata = await response.json();
                this.editor.configureGherkin(metadata);
            } else {
                console.warn('Failed to load cucumber-metadata.json. Autocomplete may not work until extraction.');
            }

            // Listen for run requests
            this.runHandler = async (payload) => {
                try {
                    const result = await CucumberRunner.execute(payload.gherkin, payload.line);
                    this.editor.getEventBus().emit('run:result', result);
                } catch (err) {
                    this.editor.getEventBus().emit('run:result', {
                        success: false,
                        stdout: '',
                        stderr: err instanceof Error ? err.message : String(err)
                    });
                }
            };

            this.editor.getEventBus().on('run:request', this.runHandler);

        } catch (e) {
            console.error('Error initializing JavaCucumberPlugin:', e);
            this.editor.getEventBus().emit('error', { message: 'Failed to initialize Java plugin' });
        }
    }

    async extractAndConfigure(config: JavaPluginConfig): Promise<void> {
        const response = await fetch('/extract-steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Extraction failed');
        }

        const metadata: CucumberMetadata = await response.json();
        this.editor.configureGherkin(metadata);
        this.config = config;
    }

    dispose(): void {
        if (this.runHandler) {
            this.editor.getEventBus().off('run:request', this.runHandler);
        }
    }
}
