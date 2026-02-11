
import { ExecutionResult } from '@monaco-gherkin/core';

export class CucumberRunner {
    private static isElectron(): boolean {
        return !!(window as any).electronAPI;
    }

    static async execute(gherkin: string, line?: number): Promise<ExecutionResult> {
        if (this.isElectron()) {
            return (window as any).electronAPI!.runCucumber(gherkin, line);
        }

        const response = await fetch('/run-cucumber', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gherkin, line }),
        });

        if (!response.ok) {
            throw new Error(`Execution failed with status ${response.status}`);
        }

        return response.json();
    }
}
