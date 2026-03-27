type QueryFilter = {
  type: 'eq' | 'in' | 'is' | 'limit' | 'order'
  column: string
  value: unknown
}

type QueryState = {
  table: string
  operation: 'select' | 'update' | 'insert' | 'upsert'
  columns?: string
  values?: Record<string, unknown>
  rows?: unknown[]
  options?: Record<string, unknown>
  filters: QueryFilter[]
  singleMode: 'single' | 'maybeSingle' | null
}

type QueryResult<T = unknown> = Promise<{
  data: T
  error: unknown
}>

type TableHandler = (state: QueryState) => QueryResult | {
  data: unknown
  error: unknown
}

export function createMockSupabaseClient(handlers: Record<string, TableHandler>) {
  class MockQuery {
    state: QueryState

    constructor(table: string) {
      this.state = {
        table,
        operation: 'select',
        filters: [],
        singleMode: null,
      }
    }

    select(columns: string) {
      if (this.state.operation === 'select') {
        this.state.operation = 'select'
      }
      this.state.columns = columns
      return this
    }

    update(values: Record<string, unknown>) {
      this.state.operation = 'update'
      this.state.values = values
      return this
    }

    insert(rows: unknown[] | Record<string, unknown>) {
      this.state.operation = 'insert'
      this.state.rows = Array.isArray(rows) ? rows : [rows]
      return this
    }

    upsert(rows: unknown[] | Record<string, unknown>, options?: Record<string, unknown>) {
      this.state.operation = 'upsert'
      this.state.rows = Array.isArray(rows) ? rows : [rows]
      this.state.options = options
      return this
    }

    eq(column: string, value: unknown) {
      this.state.filters.push({ type: 'eq', column, value })
      return this
    }

    in(column: string, value: unknown) {
      this.state.filters.push({ type: 'in', column, value })
      return this
    }

    is(column: string, value: unknown) {
      this.state.filters.push({ type: 'is', column, value })
      return this
    }

    limit(value: number) {
      this.state.filters.push({ type: 'limit', column: 'limit', value })
      return this
    }

    order(column: string, options?: Record<string, unknown>) {
      this.state.filters.push({ type: 'order', column, value: options ?? {} })
      return this
    }

    single() {
      this.state.singleMode = 'single'
      return this.execute()
    }

    maybeSingle() {
      this.state.singleMode = 'maybeSingle'
      return this.execute()
    }

    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return this.execute().then(resolve, reject)
    }

    execute() {
      const handler = handlers[this.state.table]

      if (!handler) {
        throw new Error(`No mock handler configured for table ${this.state.table}.`)
      }

      return Promise.resolve(handler(this.state))
    }
  }

  return {
    from(table: string) {
      return new MockQuery(table)
    },
  }
}
