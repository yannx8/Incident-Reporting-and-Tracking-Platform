import { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';
import { ValidationError } from './errors.js';

type Validatable = { body?: unknown; query?: unknown; params?: unknown };

export const validate = (schema: ZodType) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      } satisfies Validatable);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };

export const validateBody = (schema: ZodType) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };

export const validateQuery = (schema: ZodType) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.query = parsed as Request['query'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };

export const validateParams = (schema: ZodType) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed as Request['params'];
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        next(new ValidationError(details));
      } else {
        next(error);
      }
    }
  };
