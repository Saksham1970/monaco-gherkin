export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
}

declare global {
    interface Window {
        electronAPI?: {
            detectJava: () => Promise<string>;
            runCucumber: (gherkin: string, line?: number) => Promise<{ stdout: string; stderr: string; success: boolean }>;
        };
    }
}

export class CucumberRunner {
    static async execute(gherkin: string, line?: number): Promise<ExecutionResult> {
        if (window.electronAPI) {
            const result = await window.electronAPI.runCucumber(gherkin, line);
            return {
                success: result.success,
                stdout: result.stdout,
                stderr: result.stderr
            };
        }

        const response = await fetch('/run-cucumber', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gherkin, line })
        });

        if (!response.ok) {
            throw new Error(`Execution failed with status ${response.status}`);
        }

        return await response.json();
    }
}
