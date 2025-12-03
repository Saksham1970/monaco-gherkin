import * as monaco from 'monaco-editor';

// Initialize Monaco Editor
const container = document.getElementById('editor-container');
if (!container) {
  throw new Error('Editor container not found');
}

const editor = monaco.editor.create(container, {
  value: '',
  language: 'plaintext',
  theme: 'vs-dark',
  automaticLayout: true,
  minimap: { enabled: false },
});

console.log('Monaco Editor initialized successfully');

