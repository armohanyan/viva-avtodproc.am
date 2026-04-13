import path from 'path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { API_VERSION_PREFIX } from './constants';
import config from './config';
import ErrorHandlerMiddleware from './middleware/error-handler.middleware';
import routes from './routes';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.app.use(helmet());
    this.app.use('/upload', express.static(path.join(process.cwd(), 'upload')));
  }

  init() {
    this.setRequestLogger();
    this.setCors();
    this.setRequestParser();
    this.initializeApi();
    this.setErrorHandler();
  }

  private setRequestLogger(): void {
    if (config.DISABLE_REQUEST_LOG !== '1') {
      this.app.use(morgan('dev'));
    }
  }

  private setCors(): void {
    this.app.use(
      cors({
        origin: config.CORS_ORIGINS,
        methods: ['GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'Origin'],
        credentials: true,
        optionsSuccessStatus: 204,
        maxAge: 86400,
      }),
    );
  }

  private setRequestParser(): void {
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ limit: '1mb', extended: true }));
  }

  private initializeApi(): void {
    this.app.use(API_VERSION_PREFIX, routes);
  }

  private setErrorHandler(): void {
    this.app.use(ErrorHandlerMiddleware.init);
  }
}

export default new App();
