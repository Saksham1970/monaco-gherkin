
import { ansiToHtml } from './AnsiConverter';

const STATUS_COLORS = {
    READY: '#ccc',
    RUNNING: '#ccc',
    COMPLETED: '#0dbc79',
    FAILED: '#cd3131',
    ERROR: '#cd3131',
} as const;

const createTerminalHTML = () => `
  <div class="terminal-header">
    <select class="scenario-selector">
    </select>
    <div style="display:flex; align-items:center; gap:10px;">
      <span class="terminal-status"></span>
    </div>
  </div>
  <div class="terminal-body"></div>
  <div class="summary-bar" style="display:none">
     <div class="summary-item"><span style="color:#0dbc79">Passed:</span> <span class="pass-count">0</span></div>
     <div class="summary-item"><span style="color:#cd3131">Failed:</span> <span class="fail-count">0</span></div>
  </div>
`;

export class TerminalView {
    private readonly element: HTMLElement;
    private readonly body: HTMLElement;
    private readonly selector: HTMLSelectElement;
    private readonly statusSpan: HTMLElement;
    private readonly summaryBar: HTMLElement;
    private logs: Record<string, string> = { all: '' };
    private passed = 0;
    private failed = 0;

    constructor(container: HTMLElement) {
        this.element = document.createElement('div');
        this.element.className = 'terminal-instance';
        this.element.innerHTML = createTerminalHTML();

        this.body = this.element.querySelector('.terminal-body')!;
        this.selector = this.element.querySelector('.scenario-selector')!;
        this.statusSpan = this.element.querySelector('.terminal-status')!;
        this.summaryBar = this.element.querySelector('.summary-bar')!;

        this.selector.addEventListener('change', () => this.updateView());

        container.appendChild(this.element);
    }

    clear(): void {
        this.logs = {};
        this.selector.innerHTML = '';
        this.body.innerHTML = '';
        this.statusSpan.textContent = '';
        this.summaryBar.style.display = 'none';
        this.passed = 0;
        this.failed = 0;
    }

    setRunning(message: string): void {
        this.setStatus('RUNNING');
        this.body.innerHTML = `&gt;&gt;&gt; ${message}`;
    }

    setLogs(key: string, rawText: string): void {
        this.logs[key] = ansiToHtml(rawText);
        if (this.selector.value === key) {
            this.updateView();
        }
    }

    addScenarioOption(name: string): void {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        this.selector.appendChild(option);
        this.logs[name] = `&gt;&gt;&gt; Queued: ${name}...`;
    }

    updateSummary(passed: number, failed: number): void {
        this.passed = passed;
        this.failed = failed;
        this.summaryBar.style.display = 'flex';
        this.summaryBar.querySelector('.pass-count')!.textContent = passed.toString();
        this.summaryBar.querySelector('.fail-count')!.textContent = failed.toString();
    }

    setCompleted(failed: number): void {
        this.setStatus(failed === 0 ? 'COMPLETED' : 'FAILED');
    }

    setError(message: string): void {
        this.setStatus('ERROR');
        this.body.innerHTML = `<span style="color:#cd3131">Error: ${message}</span>`;
    }

    private setStatus(status: keyof typeof STATUS_COLORS): void {
        this.statusSpan.textContent = status;
        this.statusSpan.style.color = STATUS_COLORS[status];
    }

    private updateView(): void {
        this.body.innerHTML = this.logs[this.selector.value] || 'No logs available.';
    }

    dispose(): void {
        this.element.remove();
    }
}
