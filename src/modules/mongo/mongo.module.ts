import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MongoClient } from "mongodb";
import schemas from "./schema.module";

@Module({
    imports: [
        MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: async (config: ConfigService) => {
                const mongoUrl = config.getOrThrow<string>('mongo.uri')
                const client = new MongoClient(mongoUrl)
                try {
                    await client.connect()
                    return {
                        uri: mongoUrl,
                        dbName: config.getOrThrow<string>('mongo.db')
                    }
                } catch (error) {
                    throw new Error(`Failed to connect to MongoDb: ${error}`)
                }
            }
        }),
        ...schemas
    ],
    exports: [MongooseModule, ...schemas]
})
export class MongoModule {}