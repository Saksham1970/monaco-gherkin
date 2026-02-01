import { ansiToHtml } from '../utils/AnsiConverter';

export class TerminalView {
    private element: HTMLElement;
    private body: HTMLElement;
    private selector: HTMLSelectElement;
    private statusSpan: HTMLElement;
    private summaryBar: HTMLElement;
    private logs: Record<string, string> = { summary: "" };

    constructor(container: HTMLElement) {
        this.element = document.createElement('div');
        this.element.className = 'terminal-instance';

        const timestamp = new Date().toLocaleTimeString();
        this.element.innerHTML = `
      <div class="terminal-header">
        <span>Batch Run - ${timestamp}</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <select class="scenario-selector">
            <option value="summary">Run Summary</option>
          </select>
          <span class="terminal-status">READY</span>
        </div>
      </div>
      <div class="terminal-body">>>> Initializing...</div>
      <div class="summary-bar" style="display:none">
         <span style="color:#0dbc79">Passed: <span class="pass-count">0</span></span>
         <span style="color:#cd3131">Failed: <span class="fail-count">0</span></span>
      </div>
    `;

        this.body = this.element.querySelector('.terminal-body') as HTMLElement;
        this.selector = this.element.querySelector('.scenario-selector') as HTMLSelectElement;
        this.statusSpan = this.element.querySelector('.terminal-status') as HTMLElement;
        this.summaryBar = this.element.querySelector('.summary-bar') as HTMLElement;

        this.selector.addEventListener('change', () => this.updateView());

        container.appendChild(this.element);
        this.element.scrollIntoView({ behavior: 'smooth' });
    }

    setRunning(message: string) {
        this.statusSpan.textContent = 'RUNNING';
        this.statusSpan.parentElement!.style.color = '#ccc';
        this.body.innerHTML = `>>> ${message}`;
    }

    setLogs(key: string, rawText: string) {
        this.logs[key] = ansiToHtml(rawText);
        if (this.selector.value === key) {
            this.updateView();
        }
    }

    addScenarioOption(name: string) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        this.selector.appendChild(option);
        this.logs[name] = `>>> Queued: ${name}...`;
    }

    updateSummary(passed: number, failed: number) {
        this.summaryBar.style.display = 'flex';
        (this.summaryBar.querySelector('.pass-count') as HTMLElement).textContent = passed.toString();
        (this.summaryBar.querySelector('.fail-count') as HTMLElement).textContent = failed.toString();
    }

    setCompleted(failed: number) {
        this.statusSpan.textContent = failed === 0 ? 'COMPLETED' : 'FAILED';
        this.statusSpan.parentElement!.style.color = failed === 0 ? '#0dbc79' : '#cd3131';
    }

    setError(message: string) {
        this.statusSpan.textContent = 'ERROR';
        this.statusSpan.parentElement!.style.color = '#cd3131';
        this.body.innerHTML = `<span style="color:#cd3131">Error: ${message}</span>`;
    }

    private updateView() {
        this.body.innerHTML = this.logs[this.selector.value] || "No logs available.";
    }
}
