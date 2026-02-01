export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
}

export class CucumberRunner {
    static async execute(gherkin: string, line?: number): Promise<ExecutionResult> {
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
