
import config from './config/default';
import Pulsar from 'pulsar-client';

export default class PulsarProducer {

  private static producers: PulsarProducer[] = [];
  private static podName = process.env.CLIENT_ID || 'default-client-id';
  private topic: string;
  public static async closeAll(): Promise<void> {
    await Promise.all(PulsarProducer.producers.map(producer => producer.disconnect()));
  }

  private producerPromise: Promise<void>|null = null;
  private pulsar: Pulsar.Client;
  private producer: Pulsar.Producer|null = null;
  public constructor(topic: string) {
    this.pulsar = new Pulsar.Client({
      serviceUrl: config.pulsar!.proxy,
    });
    this.topic = topic;
    PulsarProducer.producers.push(this);
  }

  async connect(): Promise<void> {
    if (this.producerPromise != null) return await this.producerPromise;
    this.producerPromise = this.pulsar.createProducer({
      topic: this.topic,
      producerName: PulsarProducer.podName + "-" + config.pipelinemanager!.first_topic
    }).then(p => {
      this.producer = p;
      console.log('Producer Pulsar connesso');
      return;
    });
  }

  async send(msgs: any[]): Promise<void> {
    try {
      await this.connect();
      await Promise.all(
          msgs.map(msg => this.producer!.send({
            data: Buffer.from(JSON.stringify(msg)),
          }))
      );
      console.log('Log inviato con successo a Kafka');
    } catch (error) {
      console.error('Errore nell\'invio del log a Kafka:', error);
    }
  }

  async disconnect(): Promise<void> {
    await this.connect();
    await this.producer!.close();
    await this.pulsar.close();
    console.log('Producer Kafka disconnesso');
  }
}
