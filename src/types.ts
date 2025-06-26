import Plugin from './models/plugin';

export interface PluginReq {
    name: string;
    type: string;
    priority: number;
    callback_url: string;
}

export interface PluginResult {
    before: Plugin[],
    after: Plugin[],
    parallels: Plugin[]
}