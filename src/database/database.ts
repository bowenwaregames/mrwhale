import 'reflect-metadata';
import { createConnection, Connection, ConnectionOptions } from 'typeorm';
import { logger, Logger } from 'yamdbf';

/**
 * Manages the typeorm connection.
 */
export class Database {
  private static _instance: Database;
  private connection: Connection;
  @logger private readonly logger: Logger;

  private constructor() {
    if (Database._instance) throw new Error('Cannot create multiple instances of Database.');
    Database._instance = this;
  }

  /**
   * Get the typeorm connection.
   */
  static get connection(): Connection {
    return Database.instance().connection;
  }

  /**
   * Returns the {@link Database} instance
   * containing the typeorm connection.
   */
  static instance(): Database {
    if (this._instance) return this._instance;
    return new Database();
  }

  /**
   * Initialise the database connection.
   */
  async init(connectionOptions?: ConnectionOptions): Promise<void> {
    try {
      if (connectionOptions) this.connection = await createConnection(connectionOptions);
      else this.connection = await createConnection();
    } catch (err) {
      await this.logger.error(`Failed to connect to database. Error: ${err}`);
      process.exit();
    }
  }
}
