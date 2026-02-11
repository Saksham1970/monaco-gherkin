
import { OptionGroup, PluginOption } from './types';

const STORAGE_PREFIX = 'monaco-gherkin-settings';

export class SettingsPanel {
    private readonly element: HTMLElement;
    private readonly tabBar: HTMLElement;
    private readonly body: HTMLElement;
    private readonly groups: OptionGroup[] = [];
    private activeTabId: string | null = null;
    private visible = false;

    constructor(container: HTMLElement) {
        this.element = document.createElement('div');
        this.element.className = 'settings-panel';

        this.tabBar = document.createElement('div');
        this.tabBar.className = 'settings-tabs';

        this.body = document.createElement('div');
        this.body.className = 'settings-body';

        this.element.appendChild(this.tabBar);
        this.element.appendChild(this.body);
        container.appendChild(this.element);
    }

    toggle(): void {
        this.visible = !this.visible;
        this.element.classList.toggle('visible', this.visible);
    }

    addGroup(group: OptionGroup): void {
        this.groups.push(group);
        this.renderTabs();
        if (this.groups.length === 1) this.selectTab(group.id);
    }

    private renderTabs(): void {
        this.tabBar.innerHTML = '';
        for (const group of this.groups) {
            const tab = document.createElement('button');
            tab.className = 'settings-tab';
            tab.dataset.id = group.id;
            tab.textContent = `${group.icon || '⚙'} ${group.label}`;
            if (group.id === this.activeTabId) tab.classList.add('active');
            tab.addEventListener('click', () => this.selectTab(group.id));
            this.tabBar.appendChild(tab);
        }
    }

    private selectTab(id: string): void {
        this.activeTabId = id;
        this.renderTabs();
        this.renderBody();
    }

    private renderBody(): void {
        const group = this.groups.find(g => g.id === this.activeTabId);
        if (!group) return;

        this.body.innerHTML = '';
        const form = document.createElement('div');
        form.className = 'settings-form';

        for (const opt of group.options) {
            const row = document.createElement('div');
            row.className = 'settings-row';

            const label = document.createElement('label');
            label.textContent = opt.label;
            label.htmlFor = `opt-${group.id}-${opt.key}`;
            if (opt.description) label.title = opt.description;

            const input = this.createInput(opt, group.id);
            row.appendChild(label);
            row.appendChild(input);
            form.appendChild(row);
        }

        this.body.appendChild(form);

        if (group.onSave) {
            const actions = document.createElement('div');
            actions.className = 'settings-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'settings-save-btn';
            saveBtn.textContent = 'Save & Apply';
            saveBtn.addEventListener('click', async () => {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Applying...';
                try {
                    const values = this.collectValues(group);
                    await group.onSave!(values);
                    this.saveToLocalStorage(group.id, values);
                    saveBtn.textContent = '✓ Applied';
                    setTimeout(() => {
                        saveBtn.textContent = 'Save & Apply';
                        saveBtn.disabled = false;
                    }, 1500);
                } catch (e) {
                    saveBtn.textContent = 'Error — Retry';
                    saveBtn.disabled = false;
                }
            });

            actions.appendChild(saveBtn);
            this.body.appendChild(actions);
        }
    }

    private createInput(opt: PluginOption, groupId: string): HTMLElement {
        const id = `opt-${groupId}-${opt.key}`;
        const savedValue = this.loadFromLocalStorage(groupId, opt.key);
        const value = savedValue !== null ? savedValue : opt.defaultValue;

        if (opt.type === 'boolean') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = id;
            checkbox.checked = value as boolean;
            return checkbox;
        }

        if (opt.type === 'select' && opt.choices) {
            const select = document.createElement('select');
            select.id = id;
            for (const choice of opt.choices) {
                const option = document.createElement('option');
                option.value = choice;
                option.textContent = choice;
                if (choice === value) option.selected = true;
                select.appendChild(option);
            }
            return select;
        }

        if (opt.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = id;
            input.value = String(value ?? '');
            return input;
        }

        // Default: string
        const input = document.createElement('input');
        input.type = 'text';
        input.id = id;
        input.value = String(value ?? '');
        return input;
    }

    private collectValues(group: OptionGroup): Record<string, unknown> {
        const values: Record<string, unknown> = {};
        for (const opt of group.options) {
            const el = this.body.querySelector(`#opt-${group.id}-${opt.key}`) as HTMLInputElement | HTMLSelectElement;
            if (!el) continue;

            if (opt.type === 'boolean') {
                values[opt.key] = (el as HTMLInputElement).checked;
            } else if (opt.type === 'number') {
                values[opt.key] = Number(el.value);
            } else {
                values[opt.key] = el.value;
            }
        }
        return values;
    }

    private saveToLocalStorage(groupId: string, values: Record<string, unknown>): void {
        for (const [key, value] of Object.entries(values)) {
            const storageKey = `${STORAGE_PREFIX}-${groupId}-${key}`;
            localStorage.setItem(storageKey, JSON.stringify(value));
        }
    }

    loadFromLocalStorage(groupId: string, key: string): unknown {
        const storageKey = `${STORAGE_PREFIX}-${groupId}-${key}`;
        const item = localStorage.getItem(storageKey);
        return item !== null ? JSON.parse(item) : null;
    }
}
