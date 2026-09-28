import fs from 'fs';
import path from 'path';
import { guntherEnterprisePlugin, ElizaMemory, revenueStateProvider } from './plugin.js';

export interface GuntherRuntimeConfig {
  characterPath?: string;
}

export class GuntherElizaRuntime {
  private character: any;
  private isInitialized = false;

  constructor(config?: GuntherRuntimeConfig) {
    const charPath = config?.characterPath || path.resolve(process.cwd(), 'characters', 'gunther.character.json');
    if (fs.existsSync(charPath)) {
      this.character = JSON.parse(fs.readFileSync(charPath, 'utf-8'));
    }
  }

  async initialize() {
    this.isInitialized = true;
    console.log(`[ElizaOS] Runtime initialized for agent: ${this.character?.name || 'Günther'}`);
    console.log(`[ElizaOS] Plugin loaded: ${guntherEnterprisePlugin.name}`);
    console.log(`[ElizaOS] Actions registered: ${guntherEnterprisePlugin.actions.map(a => a.name).join(', ')}`);
  }

  /**
   * Retrieves the current context string including state providers
   */
  async getContext(): Promise<string> {
    const stateInfo = await revenueStateProvider.get();
    return `${stateInfo}\n\nSystem Prompt: ${this.character?.style?.all?.join(' ')}`;
  }

  /**
   * Dispatches a message or event to the ElizaOS plugin actions
   */
  async processEvent(memory: ElizaMemory): Promise<{ handled: boolean; result?: any }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const actionName = memory.content.action;
    const action = guntherEnterprisePlugin.actions.find(a => a.name === actionName);

    if (!action) {
      return { handled: false };
    }

    const isValid = await action.validate(memory);
    if (!isValid) {
      return { handled: false };
    }

    let outputResult: any;
    const success = await action.handler(memory, undefined, undefined, (resp) => {
      outputResult = resp;
    });

    return { handled: success, result: outputResult };
  }
}
