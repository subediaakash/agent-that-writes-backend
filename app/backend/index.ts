import { generateText, streamText } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv'
import { openai } from '@ai-sdk/openai';
import { runJob } from './orchestrator';
dotenv.config();


const app = express();
app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
    const result = await generateText({
        model: openai('gpt-5.1'),
        prompt: 'you are a senior software engineer , your tasks is to create a structured planner for files in a node js based backend project . for  example if a user says i want to create a todo app , then you must return the essential strucutre of the project that includes , package.json, index.ts, and any other relevant files. you have to give a very specific responsse in the json format',
    });

    return res.status(200).json({ result });
});

app.post('/generate-backend', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const result = await runJob(prompt);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(8080, () => {
    console.log(`Example app listening on port ${8080}`);
});