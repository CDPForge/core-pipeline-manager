import { Config } from "@cdp-forge/types";
type Parsed = string | number | boolean | string[] | number[];

function env<T extends Parsed>(key: string, fallback: T, type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]'  = 'string'): T {
    const val = process.env[key];
    if (val === undefined) return fallback;
    switch (type) {
        case "string[]":
            return val.split(',').map(s => s.trim()) as T;
        case "number[]":
            return val.split(',').map(s => Number(s.trim())) as T;
        case "boolean":
            return (val.toLowerCase() === 'true') as T;
        case "number":
            return Number(val) as T;
        case "string":
            return val as T;
    }
}

const config: Config =  {
    kafka: {
        brokers: env<string[]>('KAFKA_BROKERS', ['cdp-forge-kafka-kafka-bootstrap:9092'], 'string[]'),
    },
    mysql: {
        uri: env("MYSQL_URI","mysql://root:cdp-forge-root-2024@cdp-forge-mysql:3306/cdpforge")
    },
    opensearch:{
        url: env("OPENSEARCH_URL","https://opensearch-cluster-master:9200"),
        username: env("OPENSEARCH_USERNAME","admin"),
        password: env("OPENSEARCH_PASSWORD","CdpForge@2024!")
    },
    pipelinemanager: {
        config_topic: env("PIPELINEMANAGER_CONFIG_TOPIC","config"),
        url: env("PIPELINEMANAGER_URL","http://cdp-forge-core-pipeline-manager"),
        first_topic: env("PIPELINEMANAGER_FIRST_TOPIC", "logs")
    },
    pod: {
        name: env("CLIENT_ID", Math.random().toString(36).substring(2, 10))
    },
    port: env<number>("PORT", 3000),
    coreStagePluginName: env("CORE_STAGE_PLUGIN_NAME", 'core_pipeline_stage'),
    cron: {
        enabled: true,
        time: '*/1 * * * *'
    }
};

export default config;