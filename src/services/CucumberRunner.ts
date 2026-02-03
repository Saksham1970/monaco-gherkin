export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
}

declare global {
    interface Window {
        electronAPI?: {
            detectJava: () => Promise<string>;
            runCucumber: (gherkin: string, line?: number) => Promise<ExecutionResult>;
        };
    }
}

export class CucumberRunner {
    private static isElectron(): boolean {
        return !!window.electronAPI;
    }

    static async execute(gherkin: string, line?: number): Promise<ExecutionResult> {
        if (this.isElectron()) {
            return window.electronAPI!.runCucumber(gherkin, line);
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
