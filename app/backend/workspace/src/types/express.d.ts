import express from 'express';

declare global {
  namespace Express {
    // Extend this interface to add custom properties to Request
    // interface Request {
    //   user?: {
    //     id: string;
    //     email: string;
    //   };
    // }
  }
}

export {};