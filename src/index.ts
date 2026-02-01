import * as monaco from 'monaco-editor';
import { configure } from '@cucumber/monaco';
import { buildStepDocuments, jsSearchIndex } from '@cucumber/suggest';
import { ExpressionFactory, ParameterTypeRegistry, ParameterType } from '@cucumber/cucumber-expressions';

import { findScenarios } from './utils/GherkinScanner';
import { CucumberRunner } from './services/CucumberRunner';
import { TerminalView } from './components/TerminalView';

// Standard Monaco Workers
(window as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: any, label: string) {
    if (label === 'json') return './json.worker.bundle.js';
    if (label === 'css' || label === 'scss' || label === 'less') return './css.worker.bundle.js';
    if (label === 'html' || label === 'handlebars' || label === 'razor') return './html.worker.bundle.js';
    if (label === 'typescript' || label === 'javascript') return './ts.worker.bundle.js';
    return './editor.worker.bundle.js';
  },
};

async function initializeGherkin() {
  const metadata = await (await fetch('assets/cucumber-metadata.json')).json();
  const ptr = new ParameterTypeRegistry();
  const ef = new ExpressionFactory(ptr);

  if (metadata.parameterTypes) {
    metadata.parameterTypes.forEach((pt: any) => {
      ptr.defineParameterType(new ParameterType(pt.name, new RegExp(pt.regex), null, (s) => s, true, false));
    });
  }

  const expressions = metadata.steps.map((step: any) => ef.createExpression(step.expression));

  // Use real step examples from feature files if available, otherwise use step expressions
  const stepTexts = metadata.stepExamples && metadata.stepExamples.length > 0
    ? metadata.stepExamples
    : metadata.steps.map((step: any) => step.expression);

  configure(monaco, jsSearchIndex(buildStepDocuments(stepTexts, expressions)), expressions);
  return metadata.defaultFeature || "";
}

async function runScenarios(gherkin: string) {
  const terminalsList = document.getElementById('terminals-list');
  const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
  const statusLine = document.getElementById('status');
  if (!terminalsList || !runBtn) return;

  runBtn.disabled = true;
  const scenarios = findScenarios(gherkin);
  const terminal = new TerminalView(terminalsList);

  let passed = 0, failed = 0;

  try {
    terminal.setRunning('Getting Summary...');
    if (statusLine) statusLine.innerText = 'Getting Summary...';

    const summary = await CucumberRunner.execute(gherkin);
    terminal.setLogs('summary', summary.stdout + (summary.stderr || ""));

    for (const scenario of scenarios) {
      if (statusLine) statusLine.innerText = `Running: ${scenario.name}...`;
      terminal.addScenarioOption(scenario.name);

      const res = await CucumberRunner.execute(gherkin, scenario.line);
      terminal.setLogs(scenario.name, res.stdout + (res.stderr || ""));

      if (res.success) passed++; else failed++;
      terminal.updateSummary(passed, failed);
    }
    terminal.setCompleted(failed);
  } catch (e: any) {
    terminal.setError(e.message);
  } finally {
    runBtn.disabled = false;
    if (statusLine) statusLine.innerText = '';
  }
}

async function initializeEditor() {
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

  document.getElementById('run-btn')?.addEventListener('click', () => runScenarios(editor.getValue()));
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    const list = document.getElementById('terminals-list');
    if (list) list.innerHTML = '';
  });
}

initializeEditor().catch(console.error);
