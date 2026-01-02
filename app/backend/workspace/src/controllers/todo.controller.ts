import { Request, Response, NextFunction } from 'express';

// In-memory store for example purposes only
interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const todos: Todo[] = [];

const generateId = (): string => {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
};

export const getTodos = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(200).json(todos);
};

export const getTodoById = (req: Request, res: Response, _next: NextFunction): void => {
  const { id } = req.params;
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    res.status(404).json({ message: 'Todo not found' });
    return;
  }

  res.status(200).json(todo);
};

export const createTodo = (req: Request, res: Response, _next: NextFunction): void => {
  const { title, completed } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ message: 'Field "title" is required and must be a non-empty string' });
    return;
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ message: 'Field "completed" must be a boolean if provided' });
    return;
  }

  const now = new Date().toISOString();

  const todo: Todo = {
    id: generateId(),
    title: title.trim(),
    completed: completed ?? false,
    createdAt: now,
    updatedAt: now,
  };

  todos.push(todo);

  res.status(201).json(todo);
};

export const updateTodo = (req: Request, res: Response, _next: NextFunction): void => {
  const { id } = req.params;
  const { title, completed } = req.body ?? {};

  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ message: 'Todo not found' });
    return;
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ message: 'Field "title" must be a non-empty string when provided' });
    return;
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    res.status(400).json({ message: 'Field "completed" must be a boolean when provided' });
    return;
  }

  const existing = todos[index];

  const updated: Todo = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    completed: completed !== undefined ? completed : existing.completed,
    updatedAt: new Date().toISOString(),
  };

  todos[index] = updated;

  res.status(200).json(updated);
};

export const deleteTodo = (req: Request, res: Response, _next: NextFunction): void => {
  const { id } = req.params;

  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    res.status(404).json({ message: 'Todo not found' });
    return;
  }

  const [removed] = todos.splice(index, 1);

  res.status(200).json(removed);
};
