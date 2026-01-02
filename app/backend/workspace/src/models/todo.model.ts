export type TodoStatus = 'pending' | 'in_progress' | 'completed';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: TodoStatus;
  createdAt: Date;
  updatedAt: Date;
}

let todos: Todo[] = [];

const generateId = (): string => {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).substring(2, 10)
  );
};

export const TodoModel = {
  create(data: { title: string; description?: string; status?: TodoStatus }): Todo {
    const now = new Date();
    const todo: Todo = {
      id: generateId(),
      title: data.title,
      description: data.description,
      status: data.status ?? 'pending',
      createdAt: now,
      updatedAt: now,
    };

    todos.push(todo);
    return todo;
  },

  findAll(): Todo[] {
    return [...todos];
  },

  findById(id: string): Todo | undefined {
    return todos.find((todo) => todo.id === id);
  },

  update(
    id: string,
    data: Partial<Pick<Todo, 'title' | 'description' | 'status'>>
  ): Todo | undefined {
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) return undefined;

    const current = todos[index];
    const updated: Todo = {
      ...current,
      ...data,
      updatedAt: new Date(),
    };

    todos[index] = updated;
    return updated;
  },

  delete(id: string): boolean {
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) return false;
    todos.splice(index, 1);
    return true;
  },

  clear(): void {
    todos = [];
  },
};
