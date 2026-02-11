
export interface CucumberMetadata {
    parameterTypes?: Array<{ name: string; regex: string }>;
    steps: Array<{ type?: string; expression: string; example: string }>;
}

export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
}

export interface Scenario {
    name: string;
    line: number;
}

export interface PluginOption {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    defaultValue: unknown;
    choices?: string[];
    description?: string;
}

export interface OptionGroup {
    id: string;
    label: string;
    icon?: string;
    options: PluginOption[];
    onSave?: (values: Record<string, unknown>) => void | Promise<void>;
}
