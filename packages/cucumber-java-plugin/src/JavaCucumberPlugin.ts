
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
        try {
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

            // Also update local config
            this.config = config;

        } catch (e) {
            console.error('Extraction failed:', e);
            throw e;
        }
    }

    dispose(): void {
        if (this.runHandler) {
            this.editor.getEventBus().off('run:request', this.runHandler);
        }
    }
}
