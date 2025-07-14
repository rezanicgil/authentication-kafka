import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Kafka, Producer } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;

  constructor() {
    this.kafka = new Kafka({
      clientId: "user-microservice",
      brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      console.log("Kafka producer connected");
    } catch (error) {
      console.warn(
        "Kafka not available, continuing without events:",
        error.message,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      console.log("Kafka producer disconnected");
    } catch (error) {
      console.error("Failed to disconnect Kafka producer:", error);
    }
  }

  async sendUserEvent(eventType: string, data: any) {
    try {
      await this.producer.send({
        topic: "user-events",
        messages: [
          {
            key: data.userId,
            value: JSON.stringify({
              eventType,
              data,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });
      console.log(`User event sent: ${eventType}`, data);
    } catch (error) {
      console.error("Failed to send user event:", error);
    }
  }
}
