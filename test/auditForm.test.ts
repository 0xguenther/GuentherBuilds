import { afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';
import fs from 'fs';
import vm from 'vm';

describe.each(['de', 'en'])('audit form (%s)', lang => {
  const windows: Window[] = [];
  afterEach(async () => {
    for (const window of windows.splice(0)) await window.happyDOM.close();
  });

  async function form(paused: boolean, response: object = { errors: ['Unsupported model'] }, status = 400) {
    const window = new Window();
    windows.push(window);
    const html = await fs.promises.readFile(lang === 'de' ? 'public/audit/index.html' : 'public/en/audit/index.html', 'utf8');
    window.document.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
    const fetch = vi.fn(async (url: string) => {
      if (url === '/api/audit/availability') return { ok: true, json: async () => ({ paused }) };
      if (url === '/api/audit/models') return { ok: true, json: async () => [{ id: 'fixture-model', label: 'Fixture Model' }] };
      return { ok: status < 400, json: async () => response };
    });
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    const context = vm.createContext({ document: window.document, window, Option: window.Option, fetch });
    for (const script of scripts) vm.runInContext(script[1], context);
    await new Promise(resolve => setImmediate(resolve));
    return { window, document: window.document, fetch };
  }

  it('loads models, counts prompt characters and submits language and full tool definitions', async () => {
    const { window, document, fetch } = await form(false);
    expect(document.querySelector<HTMLSelectElement>('#model')!.value).toBe('fixture-model');
    const prompt = document.querySelector<HTMLTextAreaElement>('#systemPrompt')!;
    expect(prompt.maxLength).toBe(8000);
    prompt.value = 'Agent prompt';
    prompt.dispatchEvent(new window.Event('input'));
    expect(document.querySelector('#prompt-count')!.textContent).toBe('12 / 8000');
    document.querySelector<HTMLInputElement>('#agb')!.checked = true;
    document.querySelector<HTMLInputElement>('#email')!.value = 'buyer@example.test';
    document.querySelector('#form')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    const calls = fetch.mock.calls as unknown as Array<[string, { body: string }]>;
    const body = JSON.parse(calls.find(([url]) => url === '/api/audit/orders')![1].body);
    expect(body).toMatchObject({ lang, model: 'fixture-model', systemPrompt: 'Agent prompt' });
    expect(body.tools[0]).toMatchObject({ kind: 'write', parameters: { type: 'object', properties: { amount: { type: 'number' } } } });
    expect(document.querySelector('#msg')!.textContent).toBe('Unsupported model');
    expect(document.querySelector<HTMLButtonElement>('#go')!.disabled).toBe(false);
  });

  it('keeps paused orders blocked even after models load or the form is submitted', async () => {
    const { window, document, fetch } = await form(true);
    expect(document.querySelector<HTMLButtonElement>('#go')!.disabled).toBe(true);
    document.querySelector('#form')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
    expect(fetch.mock.calls.map(([url]) => url)).not.toContain('/api/audit/orders');
    expect(document.querySelector('#msg')!.textContent).toMatch(/paus/);
  });

  it('keeps the button blocked if the server pauses orders during checkout', async () => {
    const { window, document } = await form(false, { error: 'paused', paused: true }, 503);
    document.querySelector<HTMLInputElement>('#agb')!.checked = true;
    document.querySelector('#form')!.dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    expect(document.querySelector<HTMLButtonElement>('#go')!.disabled).toBe(true);
    expect(document.querySelector('#msg')!.textContent).toMatch(/paus/);
  });
});
