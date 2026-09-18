import { Module, Global, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
let memoryReplSet: any = null;

export async function getInMemoryReplSetUri(): Promise<string> {
  if (!memoryReplSet) {
    const logger = new Logger('MongoMemoryReplSet');
    logger.log('Starting MongoMemoryReplSet for local transactions...');
    const { MongoMemoryReplSet } = await import('mongodb-memory-server');
    memoryReplSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    await memoryReplSet.waitUntilRunning();
    const uri = memoryReplSet.getUri();
    logger.log(`MongoMemoryReplSet running at ${uri}`);
  }
  return memoryReplSet.getUri();
}

export async function stopInMemoryReplSet(): Promise<void> {
  if (memoryReplSet) {
    await memoryReplSet.stop();
    memoryReplSet = null;
  }
}

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        const nodeEnv = configService.get<string>('app.nodeEnv') || process.env.NODE_ENV;
        const isVercel = Boolean(process.env.VERCEL);
        let uri = configService.get<string>('database.uri') || process.env.MONGODB_URI;

        // On Vercel serverless, ensure Atlas connection string is used and never launch in-memory replica set
        if (isVercel) {
          if (!uri || uri.includes('127.0.0.1') || uri.includes('localhost')) {
            uri = 'mongodb+srv://business:qFeM7VXjvX7Fcqsg@cluster0.57pbeou.mongodb.net/business?appName=Cluster0';
          }
        }

        // In test mode or when specifically requested, use in-memory replica set
        if (!isVercel && (nodeEnv === 'test' || process.env.USE_MEMORY_DB === 'true')) {
          uri = await getInMemoryReplSetUri();
          return { uri, autoIndex: true };
        }

        // In development (only when not on Vercel), test if provided URI is reachable; if not, gracefully fallback to in-memory replica set
        if (!isVercel && nodeEnv === 'development' && uri && uri.includes('127.0.0.1')) {
          try {
            const net = await import('net');
            const isPortOpen = await new Promise<boolean>((resolve) => {
              const socket = new net.Socket();
              socket.setTimeout(800);
              socket.on('connect', () => {
                socket.destroy();
                resolve(true);
              });
              socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
              });
              socket.on('error', () => {
                socket.destroy();
                resolve(false);
              });
              socket.connect(27017, '127.0.0.1');
            });

            if (!isPortOpen) {
              logger.warn(
                'Local MongoDB port 27017 is not accessible. Initializing embedded replica set for local development.',
              );
              uri = await getInMemoryReplSetUri();
            }
          } catch {
            logger.warn('Error testing local port, falling back to embedded replica set.');
            uri = await getInMemoryReplSetUri();
          }
        }

        logger.log(
          `Connecting to MongoDB at: ${uri?.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`,
        );

        return {
          uri,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
          autoIndex: nodeEnv !== 'production' && !isVercel,
        };
      },
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
