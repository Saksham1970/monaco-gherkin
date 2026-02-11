
import { CucumberMetadata, ExecutionResult } from './types';

export interface CoreEvents {
    'run:request': { gherkin: string; line?: number };
}

export interface PluginEvents {
    'run:result': ExecutionResult;
    'error': { message: string };
}

type EventMap = CoreEvents & PluginEvents;
type EventKey = keyof EventMap;
type EventHandler<T extends EventKey> = (payload: EventMap[T]) => void;

export class EventBus {
    private listeners: Map<EventKey, Set<EventHandler<any>>> = new Map();

    on<T extends EventKey>(event: T, handler: EventHandler<T>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(handler);
    }

    off<T extends EventKey>(event: T, handler: EventHandler<T>): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    emit<T extends EventKey>(event: T, payload: EventMap[T]): void {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(payload);
                } catch (e) {
                    console.error(`Error in event handler for ${event}:`, e);
                }
            });
        }
    }
}
