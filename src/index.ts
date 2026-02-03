import * as monaco from 'monaco-editor';
import { configure } from '@cucumber/monaco';
import { buildStepDocuments, jsSearchIndex } from '@cucumber/suggest';
import { ExpressionFactory, ParameterTypeRegistry, ParameterType } from '@cucumber/cucumber-expressions';

import { findScenarios } from './utils/GherkinScanner';
import { CucumberRunner } from './services/CucumberRunner';
import { TerminalView } from './components/TerminalView';

const MONACO_ENVIRONMENT = {
  getWorkerUrl: (_moduleId: unknown, label: string) => {
    const workers: Record<string, string> = {
      json: './json.worker.bundle.js',
      css: './css.worker.bundle.js',
      scss: './css.worker.bundle.js',
      less: './css.worker.bundle.js',
      html: './html.worker.bundle.js',
      handlebars: './html.worker.bundle.js',
      razor: './html.worker.bundle.js',
      typescript: './ts.worker.bundle.js',
      javascript: './ts.worker.bundle.js',
    };
    return workers[label] || './editor.worker.bundle.js';
  },
};

(window as any).MonacoEnvironment = MONACO_ENVIRONMENT;

interface CucumberMetadata {
  parameterTypes?: Array<{ name: string; regex: string }>;
  steps: Array<{ type?: string, expression: string; example: string }>;
}

const registerParameterTypes = (
  registry: ParameterTypeRegistry,
  parameterTypes: CucumberMetadata['parameterTypes']
): void => {
  if (!parameterTypes) return;

  parameterTypes.forEach(({ name, regex }) => {
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
};

const initializeGherkin = async (): Promise<string> => {
  const response = await fetch('assets/cucumber-metadata.json');
  const metadata: CucumberMetadata = await response.json();

  const registry = new ParameterTypeRegistry();
  const expressionFactory = new ExpressionFactory(registry);

  registerParameterTypes(registry, metadata.parameterTypes);

  const expressions = metadata.steps.map((step) =>
    expressionFactory.createExpression(step.expression)
  );

  const stepTexts = metadata.steps.map((step) => step.example);

  configure(monaco, jsSearchIndex(buildStepDocuments(stepTexts, expressions)), expressions);

  return ''; // defaultFeature removed from metadata
};

const runScenarios = async (gherkin: string): Promise<void> => {
  const terminalsList = document.getElementById('terminals-list');
  const runBtn = document.getElementById('run-btn') as HTMLButtonElement | null;
  const statusLine = document.getElementById('status');

  if (!terminalsList || !runBtn) return;

  runBtn.disabled = true;
  const scenarios = findScenarios(gherkin);
  const terminal = new TerminalView(terminalsList);

  let passed = 0;
  let failed = 0;

  try {
    terminal.setRunning('Getting Summary...');
    if (statusLine) statusLine.innerText = 'Getting Summary...';

    const summary = await CucumberRunner.execute(gherkin);
    terminal.setLogs('summary', summary.stdout + (summary.stderr || ''));

    for (const scenario of scenarios) {
      if (statusLine) statusLine.innerText = `Running: ${scenario.name}...`;
      terminal.addScenarioOption(scenario.name);

      const result = await CucumberRunner.execute(gherkin, scenario.line);
      terminal.setLogs(scenario.name, result.stdout + (result.stderr || ''));

      if (result.success) passed++;
      else failed++;

      terminal.updateSummary(passed, failed);
    }

    terminal.setCompleted(failed);
  } catch (error) {
    terminal.setError(error instanceof Error ? error.message : String(error));
  } finally {
    runBtn.disabled = false;
    if (statusLine) statusLine.innerText = '';
  }
};

const initializeEditor = async (): Promise<void> => {
  const initialValue = await initializeGherkin();
  const container = document.getElementById('editor-container');

  if (!container) return;

  container.innerHTML = '';

  const editor = monaco.editor.create(container, {
    value: initialValue,
    language: 'gherkin',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    'semanticHighlighting.enabled': true,
  });

  (window as any).editor = editor;

  document.getElementById('run-btn')?.addEventListener('click', () =>
    runScenarios(editor.getValue())
  );

  document.getElementById('clear-btn')?.addEventListener('click', () => {
    const list = document.getElementById('terminals-list');
    if (list) list.innerHTML = '';
  });
};

initializeEditor().catch(console.error);
