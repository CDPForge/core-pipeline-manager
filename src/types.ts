import Plugin from './models/plugin';

export interface PluginReq {
    name: string;
    type: string;
    priority: number;
}

export interface PluginResult {
    before: Plugin[],
    after: Plugin[],
    parallels: Plugin[]
}