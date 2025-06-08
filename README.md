# Core Pipeline Manager

## Overview

The **Core Pipeline Manager** is a service responsible for managing and orchestrating the registration and execution order of pipeline stages in an event-driven processing system.

It acts as the central coordinator where different processing plugins register themselves and are ordered based on their priority and type to form a processing pipeline.

---

## Key Concepts

### Pipeline Stages

- A **pipeline stage** represents a step or plugin in the processing pipeline.
- Each stage processes incoming data and may produce output for the next stage.

### Priority

- Stages are assigned a **priority** which defines the execution order.
- Lower numeric values indicate higher priority.
- Priority `0` is reserved exclusively for the core stage — no other stages or plugins can be registered with this priority.
- Other plugins can register with priorities greater than 0, determining their relative order in the pipeline.

### Stage Types

The pipeline supports two types of stages/plugins:

- **Blocking**: These stages process events sequentially. They receive input from a Kafka topic and must send their output to a designated output Kafka topic, which is consumed by the next blocking stage.
- **Parallel**: These stages can run concurrently and do not block the pipeline flow.

---

## How It Works

1. **Core stage registration:**

   - The pipeline manager starts with a predefined core stage.
   - The core stage is registered with priority `0` (highest priority, reserved).

2. **Plugin registration:**

   - Plugins register by sending an HTTP request to the pipeline manager’s `/register` API endpoint.
   - Each plugin **must provide a unique `plugin_name`** as part of the registration request.
   - The registration payload includes:
     - `plugin_name` (string, unique)
     - `type` (`blocking` or `parallel`)
     - `priority` (integer > 0)
     - `callback_url` (string URL where the plugin will receive notifications if its Kafka topics change)
   - The pipeline manager validates the uniqueness of the `plugin_name` and the priority.
   - **Input and output Kafka topics are generated randomly** by the pipeline manager upon registration.
   - The plugin registration data (plugin name, type, priority, topics, callback URL) is persisted in a MySQL database to ensure recovery after system restarts.

3. **Pipeline reordering:**

   - When a new plugin is registered with a priority that falls between existing plugins (i.e., an intermediate priority), the pipeline manager may **reorder the pipeline** to maintain correct execution order.
   - In such cases, the pipeline manager will notify all affected plugins by calling their provided `callback_url` to communicate any changes in their assigned Kafka topics (input/output).
   - This allows plugins to dynamically adapt to the updated pipeline configuration.

4. **Response on registration:**

   - Upon successful registration, the pipeline manager responds with:
     - `input_topic`: The Kafka topic the plugin must consume.
     - `output_topic`: The Kafka topic the plugin must produce to (only for blocking plugins).

---

## API

### POST `/register`

Registers a new plugin in the pipeline.

**Request body:**

```json
{
  "plugin_name": "unique_plugin_name",
  "type": "blocking" | "parallel",
  "priority": <integer>,
  "callback_url": "https://plugin.example.com/notify"
}
