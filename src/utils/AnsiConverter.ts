import { AnsiUp } from 'ansi_up';

const ansiUp = new AnsiUp();

export function ansiToHtml(text: string): string {
    if (!text) return "";
    // ansi_up handles basic escaping and color conversion efficiently
    return ansiUp.ansi_to_html(text);
}
