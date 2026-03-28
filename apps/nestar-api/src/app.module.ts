import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { SocketModule } from './socket/socket.module';

@Module({ // modul decoretor
  imports: [ // imports, controllers, providers = propetry
    ConfigModule.forRoot(), // envirable verible intigratse
    GraphQLModule.forRoot({ // GraphQL serverini sozlash.
      driver: ApolloDriver, // ApolloDriver engine
      playground: true, // GraphQL test interfaceni yoqadi
      uploads: false, // fayl yuklash imkoniyatini o‘chiradi.
      autoSchemaFile: true, // TypeScript dekoratorlaridan yaratiladi.
      formatError: (error: T) => { // Error handling
        console.log("error:", error);
        const graphQlFormatedError = {
          code: error?.extensions.code,
          message:
            error?.extensions?.exception?.response?.message ||
            error?.extensions?.response?.message ||
            error?.message,
        };
        console.log('GRAPHQL GLOBAL ERR:', graphQlFormatedError);
        return graphQlFormatedError
      }
    }),
    ComponentsModule, // yuqori standart uchun // koprik // HTTP
    DatabaseModule, SocketModule, // koprik // HTTP || TCP
  ],
  controllers: [AppController], // rest api
  providers: [AppService, AppResolver], // graphql api
})
export class AppModule { }
