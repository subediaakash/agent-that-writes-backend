export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoDTO {
  title: string;
  description?: string;
}

export interface UpdateTodoDTO {
  title?: string;
  description?: string;
  completed?: boolean;
}

export class TodoService {
  private todos: Map<string, Todo> = new Map();

  private generateId(): string {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).substring(2, 10)
    ).toLowerCase();
  }

  public async createTodo(payload: CreateTodoDTO): Promise<Todo> {
    if (!payload || typeof payload.title !== 'string' || !payload.title.trim()) {
      throw new Error('Title is required');
    }

    const now = new Date();
    const todo: Todo = {
      id: this.generateId(),
      title: payload.title.trim(),
      description: payload.description?.trim() || undefined,
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    this.todos.set(todo.id, todo);
    return todo;
  }

  public async getTodoById(id: string): Promise<Todo | null> {
    if (!id) return null;
    const todo = this.todos.get(id);
    return todo ?? null;
  }

  public async getAllTodos(): Promise<Todo[]> {
    return Array.from(this.todos.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  public async updateTodo(id: string, payload: UpdateTodoDTO): Promise<Todo | null> {
    if (!id) return null;

    const existing = this.todos.get(id);
    if (!existing) return null;

    const updated: Todo = {
      ...existing,
      title: payload.title !== undefined ? payload.title.trim() : existing.title,
      description:
        payload.description !== undefined
          ? payload.description.trim() || undefined
          : existing.description,
      completed:
        payload.completed !== undefined ? payload.completed : existing.completed,
      updatedAt: new Date(),
    };

    this.todos.set(id, updated);
    return updated;
  }

  public async deleteTodo(id: string): Promise<boolean> {
    if (!id) return false;
    return this.todos.delete(id);
  }

  public async clearCompleted(): Promise<number> {
    const toDelete: string[] = [];

    for (const [id, todo] of this.todos.entries()) {
      if (todo.completed) {
        toDelete.push(id);
      }
    }

    toDelete.forEach((id) => this.todos.delete(id));
    return toDelete.length;
  }

  public async setAllCompleted(completed: boolean): Promise<Todo[]> {
    const updated: Todo[] = [];
    const now = new Date();

    for (const [id, todo] of this.todos.entries()) {
      if (todo.completed !== completed) {
        const newTodo: Todo = { ...todo, completed, updatedAt: now };
        this.todos.set(id, newTodo);
        updated.push(newTodo);
      }
    }

    return updated;
  }
}

export const todoService = new TodoService();
