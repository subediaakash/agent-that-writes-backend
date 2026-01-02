import { Router, Request, Response } from 'express';

const router = Router();

// In-memory store for todos (for demonstration only)
interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

let todos: Todo[] = [];
let nextId = 1;

// GET /todos - List all todos
router.get('/todos', (req: Request, res: Response) => {
  res.json(todos);
});

// GET /todos/:id - Get a todo by id
router.get('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id parameter' });
  }

  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  res.json(todo);
});

// POST /todos - Create a new todo
router.post('/todos', (req: Request, res: Response) => {
  const { title, completed } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }

  const todo: Todo = {
    id: nextId++,
    title: title.trim(),
    completed: typeof completed === 'boolean' ? completed : false,
  };

  todos.push(todo);

  res.status(201).json(todo);
});

// PUT /todos/:id - Replace a todo
router.put('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id parameter' });
  }

  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const { title, completed } = req.body ?? {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
  }

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed is required and must be a boolean' });
  }

  const updated: Todo = {
    id,
    title: title.trim(),
    completed,
  };

  todos[index] = updated;

  res.json(updated);
});

// PATCH /todos/:id - Partially update a todo
router.patch('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id parameter' });
  }

  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const existing = todos[index];
  const { title, completed } = req.body ?? {};

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    return res.status(400).json({ error: 'Title, if provided, must be a non-empty string' });
  }

  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed, if provided, must be a boolean' });
  }

  const updated: Todo = {
    ...existing,
    ...(title !== undefined ? { title: title.trim() } : {}),
    ...(completed !== undefined ? { completed } : {}),
  };

  todos[index] = updated;

  res.json(updated);
});

// DELETE /todos/:id - Delete a todo
router.delete('/todos/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ error: 'Invalid id parameter' });
  }

  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }

  const [deleted] = todos.splice(index, 1);

  res.json(deleted);
});

export default router;
