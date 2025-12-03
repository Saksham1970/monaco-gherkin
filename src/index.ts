import * as monaco from 'monaco-editor';
import { configure } from '@cucumber/monaco';
import { buildStepDocuments, jsSearchIndex } from '@cucumber/suggest';
import { ExpressionFactory, ParameterTypeRegistry } from '@cucumber/cucumber-expressions';
import { getGherkinCompletionItems } from '@cucumber/language-service';

// Initialize Gherkin language support
async function initializeGherkin() {
  // Create ExpressionFactory with ParameterTypeRegistry
  const parameterTypeRegistry = new ParameterTypeRegistry();
  const expressionFactory = new ExpressionFactory(parameterTypeRegistry);

  // Build sample step expressions (in a real app, these would come from step definitions)
  const expressions = [
    expressionFactory.createExpression('I have {int} cukes in my belly'),
    expressionFactory.createExpression('there are {int} blind mice'),
    expressionFactory.createExpression('Given I have {int} cukes'),
    expressionFactory.createExpression('When I eat {int} cukes'),
    expressionFactory.createExpression('Then I should have {int} cukes'),
  ];

  // Build step documents and create search index
  const stepTexts = [
    'I have 42 cukes in my belly',
    'I have 96 cukes in my belly',
    'there are 38 blind mice',
  ];
  const docs = buildStepDocuments(stepTexts, expressions);
  const index = jsSearchIndex(docs);

  // Configure Monaco with Gherkin support
  configure(monaco, index, expressions);

  // Add Gherkin keyword completions by enhancing the existing provider
  // We need to register a new provider that includes both keywords and step completions
  const gherkinKeywords = [
    { label: 'Feature:', insertText: 'Feature: ${1:Feature Name}\n  ${2:Description}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'Scenario:', insertText: 'Scenario: ${1:Scenario Name}\n    ${2}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'Scenario Outline:', insertText: 'Scenario Outline: ${1:Scenario Name}\n    ${2}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'Background:', insertText: 'Background:\n    ${1}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'Given', insertText: 'Given ${1:step}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'When', insertText: 'When ${1:step}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'Then', insertText: 'Then ${1:step}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'And', insertText: 'And ${1:step}', kind: monaco.languages.CompletionItemKind.Keyword },
    { label: 'But', insertText: 'But ${1:step}', kind: monaco.languages.CompletionItemKind.Keyword },
  ];

  // Register enhanced completion provider that includes keywords
  // Note: This will override the one from configure(), but we'll include step completions too
  monaco.languages.registerCompletionItemProvider('gherkin', {
    provideCompletionItems: function (model, position) {
      const gherkinSource = model.getValue();
      const word = model.getWordUntilPosition(position);
      
      // Filter keyword completions based on current word
      const prefix = word.word.toLowerCase();
      const keywordCompletions = gherkinKeywords
        .filter(keyword => keyword.label.toLowerCase().startsWith(prefix))
        .map(keyword => ({
          ...keyword,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        }));

      // Get step completions from the language service
      const completionItems = getGherkinCompletionItems(
        gherkinSource,
        position.lineNumber - 1,
        index
      );
      
      const stepCompletions = completionItems
        .filter((ci) => ci.insertText !== undefined)
        .map((ci) => ({
          label: ci.label,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: ci.insertText!,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          },
        }));

      return {
        suggestions: [...keywordCompletions, ...stepCompletions],
      };
    },
  });

  console.log('Gherkin language support configured');
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

