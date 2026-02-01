export interface Scenario {
    name: string;
    line: number;
}

export function findScenarios(gherkin: string): Scenario[] {
    const lines = gherkin.split(/\r?\n/);
    const scenarios: Scenario[] = [];
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*(?:Scenario|Example):\s*(.*)$/);
        if (match) {
            scenarios.push({
                name: match[1].trim() || `Scenario at line ${i + 1}`,
                line: i + 1
            });
        }
    }
    return scenarios;
}
