import "reflect-metadata";

import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express, { type Express, type Request, type Response } from "express";

import { AppModule } from "../apps/api/src/app.module";

let serverPromise: Promise<Express> | undefined;

async function createServer(): Promise<Express> {
  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.init();

  return server;
}

export default async function handler(
  request: Request,
  response: Response
): Promise<void> {
  serverPromise ??= createServer();
  const server = await serverPromise;
  const path = Array.isArray(request.query.path)
    ? request.query.path.join("/")
    : request.query.path;

  request.url = `/${path ?? ""}`;
  delete request.query.path;

  server(request, response);
}
