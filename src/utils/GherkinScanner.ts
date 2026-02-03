export interface Scenario {
    name: string;
    line: number;
}

const SCENARIO_PATTERN = /^\s*(?:Scenario|Example):\s*(.*)$/;

export const findScenarios = (gherkin: string): Scenario[] =>
    gherkin.split(/\r?\n/).reduce<Scenario[]>((scenarios, line, index) => {
        const match = line.match(SCENARIO_PATTERN);
        if (match) {
            scenarios.push({
                name: match[1].trim() || `Scenario at line ${index + 1}`,
                line: index + 1,
            });
        }
        return scenarios;
    }, []);
