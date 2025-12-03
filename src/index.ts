import * as monaco from 'monaco-editor';
import { configure } from '@cucumber/monaco';
import { buildStepDocuments, jsSearchIndex } from '@cucumber/suggest';
import { ExpressionFactory, ParameterTypeRegistry } from '@cucumber/cucumber-expressions';

async function initializeGherkin() {
  // Create ExpressionFactory with ParameterTypeRegistry
  const parameterTypeRegistry = new ParameterTypeRegistry();
  const expressionFactory = new ExpressionFactory(parameterTypeRegistry);

  // Build sample step expressions (in a real app, these would come from step definitions)
  const expressions = [
    expressionFactory.createExpression('I have {int} cukes in my belly'),
    expressionFactory.createExpression('there are {int} blind mice'),
    expressionFactory.createExpression('I have {int} cukes'),
    expressionFactory.createExpression('I eat {int} cukes'),
    expressionFactory.createExpression('I should have {int} cukes'),
  ];

  // Build step documents and create search index
  // This is required for autocomplete to work - the index needs to be populated
  // with step documents that match step texts to expressions
  const stepTexts = [
    'I have 42 cukes in my belly',
    'I have 96 cukes in my belly',
    'there are 38 blind mice',
  ];
  const docs = buildStepDocuments(stepTexts, expressions);
  const index = jsSearchIndex(docs);
  
  configure(monaco, index, expressions);

  console.log('Gherkin language support configured using language service');
}

// Initialize Monaco Editor with Gherkin support
async function initializeEditor() {
  await initializeGherkin();

  const container = document.getElementById('editor-container');
  if (!container) {
    throw new Error('Editor container not found');
  }

  const editor = monaco.editor.create(container, {
    value: '',
    language: 'gherkin',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    'semanticHighlighting.enabled': true,
  });

  console.log('Monaco Editor with Gherkin support initialized successfully');
}

// Start initialization
initializeEditor().catch(console.error);

