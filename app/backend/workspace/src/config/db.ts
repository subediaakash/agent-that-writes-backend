export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Simple in-memory store
const todos: Todo[] = [];

// Utility to generate simple unique IDs without external deps
let idCounter = 0;
const generateId = (): string => {
  idCounter += 1;
  return idCounter.toString();
};

export const db = {
  getAll: (): Todo[] => {
    return [...todos];
  },

  getById: (id: string): Todo | undefined => {
    return todos.find((t) => t.id === id);
  },

  create: (data: { title: string; completed?: boolean }): Todo => {
    const now = new Date();
    const todo: Todo = {
      id: generateId(),
      title: data.title,
      completed: data.completed ?? false,
      createdAt: now,
      updatedAt: now,
    };

    todos.push(todo);
    return todo;
  },

  update: (
    id: string,
    data: Partial<Pick<Todo, "title" | "completed">>
  ): Todo | undefined => {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    const now = new Date();
    const existing = todos[index];

    const updated: Todo = {
      ...existing,
      ...data,
      updatedAt: now,
    };

    todos[index] = updated;
    return updated;
  },

  delete: (id: string): boolean => {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return false;

    todos.splice(index, 1);
    return true;
  },

  // For testing or resetting state
  clear: (): void => {
    todos.length = 0;
    idCounter = 0;
  },
};

export default db;
