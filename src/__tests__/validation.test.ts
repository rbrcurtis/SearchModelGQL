import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { graphql } from 'graphql'
import type { GraphQLSchema } from 'graphql'
import { KeywordType, SearchModel, StringType, ValidationError } from 'search-model'
import {
  GqlCreate,
  GqlDelete,
  GqlExpose,
  GqlGet,
  GqlList,
  GqlType,
  GqlUpdate,
  Resolver,
  buildSchema,
} from '../index'
import type {
  CreateMutation,
  DeleteMutation,
  GetQuery,
  ListQuery,
  UpdateMutation,
} from '../index'

@GqlType('Note')
class Note extends SearchModel<Note> {
  static readonly indexName = 'test_notes'

  @KeywordType({ required: true })
  @GqlExpose({ input: true })
  eventId!: string

  @StringType({ required: true })
  @GqlExpose({ input: true })
  title!: string
}

interface StoredNote extends Note {
  id: string
}

let notes: Map<string, StoredNote>
let nextId: number
let saveOptions: Array<Record<string, unknown> | undefined>
let createOptions: Array<Record<string, unknown> | undefined>
let deleteOptions: Array<Record<string, unknown> | undefined>

function requireTitle(input: Record<string, unknown>) {
  if (!input.title || input.title === 'duplicate') {
    throw new ValidationError({ title: 'Title is required' })
  }
}

function stubModel(): void {
  notes = new Map()
  nextId = 0
  saveOptions = []
  createOptions = []
  deleteOptions = []

  const statics = Note as unknown as Record<string, unknown>
  statics.getById = async (id: string) => notes.get(id) ?? null
  statics.findWithTotal = async (terms: string[], options?: { limit?: number }) => {
    let hits = [...notes.values()]
    for (const term of terms) {
      const match = term.match(/^(\w+):"?(.*?)"?$/)
      if (match) {
        hits = hits.filter(
          (note) =>
            String((note as unknown as Record<string, unknown>)[match[1]]) ===
            match[2]
        )
      }
    }
    return { hits: options?.limit ? hits.slice(0, options.limit) : hits, total: hits.length }
  }
  statics.create = async (
    input: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => {
    createOptions.push(options)
    requireTitle(input)
    nextId += 1
    const note = new Note(input as Partial<Note>) as StoredNote
    note.id = `note${nextId}`
    note.update = (data: Record<string, unknown>) => {
      Object.assign(note, data)
      return note
    }
    note.save = async (opts?: Record<string, unknown>) => {
      saveOptions.push(opts)
      return note
    }
    note.delete = async (opts?: Record<string, unknown>) => {
      deleteOptions.push(opts)
      notes.delete(note.id)
    }
    notes.set(note.id, note)
    return note
  }
}

function seed(): void {
  const note = new Note({ eventId: 'event-1', title: 'Seeded' }) as StoredNote
  note.id = 'note-seed'
  note.update = (data) => {
    Object.assign(note, data)
    return note
  }
  note.save = async (opts?: Record<string, unknown>) => {
    saveOptions.push(opts)
    return note
  }
  note.delete = async (opts?: Record<string, unknown>) => {
    deleteOptions.push(opts)
  }
  notes.set(note.id, note)
}

const actor = { userId: 'user-1', email: 'user@example.com' }

async function run(
  schema: GraphQLSchema,
  source: string,
  context: unknown = { user: actor }
) {
  return graphql({ schema, source, contextValue: context })
}

function codes(result: { errors?: ReadonlyArray<{ extensions?: unknown }> }): string[] {
  return (result.errors ?? []).map(
    (error) => ((error.extensions as { code?: string } | undefined)?.code ?? 'none') as string
  )
}

function fieldErrors(result: {
  errors?: ReadonlyArray<{ extensions?: unknown }>
}): Record<string, string> | undefined {
  return (result.errors?.[0]?.extensions as { fieldErrors?: Record<string, string> })
    ?.fieldErrors
}

beforeEach(() => {
  stubModel()
  seed()
})

describe('actor plumbing', () => {
  @Resolver()
  class NoteResolver {
    @GqlList(Note)
    declare notes: ListQuery<Note>

    @GqlCreate(Note)
    declare createNote: CreateMutation<Note>

    @GqlUpdate(Note)
    declare updateNote: UpdateMutation<Note>

    @GqlDelete(Note)
    declare deleteNote: DeleteMutation<Note>

    @GqlGet(Note)
    declare note: GetQuery<Note>
  }

  it('passes meta.actor to create, save and delete', async () => {
    const schema = buildSchema({
      resolvers: [NoteResolver],
      actor: (context) => (context as { user: unknown }).user,
    })

    const created = await run(
      schema,
      'mutation { createNote(input: { eventId: "event-1", title: "New" }) { id } }'
    )
    expect(created.errors).toBeUndefined()
    expect(createOptions[0]).toEqual({ wait: true, meta: { actor } })

    await run(schema, 'mutation { updateNote(id: "note-seed", input: { title: "Edited" }) { id } }')
    expect(saveOptions[0]).toEqual({ wait: true, meta: { actor } })

    await run(schema, 'mutation { deleteNote(id: "note-seed") }')
    expect(deleteOptions[0]).toEqual({ meta: { actor } })
  })

  it('omits meta entirely when no actor extractor is configured', async () => {
    const schema = buildSchema({ resolvers: [NoteResolver] })
    await run(schema, 'mutation { createNote(input: { eventId: "event-1", title: "New" }) { id } }')
    expect(createOptions[0]).toEqual({ wait: true, meta: undefined })
  })

  it('lets a per-operation meta hook add fields and replace the actor', async () => {
    @Resolver()
    class MetaResolver {
      @GqlList(Note)
      declare notes: ListQuery<Note>

      @GqlCreate(Note, { meta: () => ({ actor: { userId: 'override' }, reason: 'seed' }) })
      declare createNote: CreateMutation<Note>

      @GqlUpdate(Note, { meta: (info) => ({ actor: (info.context as { user: unknown }).user, flagged: true }) })
      declare updateNote: UpdateMutation<Note>
    }

    const schema = buildSchema({
      resolvers: [MetaResolver],
      actor: (context) => (context as { user: unknown }).user,
    })

    await run(schema, 'mutation { createNote(input: { eventId: "event-1", title: "New" }) { id } }')
    expect(createOptions[0]).toEqual({
      wait: true,
      meta: { actor: { userId: 'override' }, reason: 'seed' },
    })

    await run(schema, 'mutation { updateNote(id: "note-seed", input: { title: "Edited" }) { id } }')
    expect(saveOptions[0]).toEqual({ wait: true, meta: { actor, flagged: true } })
  })
})

describe('validation errors', () => {
  @Resolver()
  class NoteResolver {
    @GqlList(Note)
    declare notes: ListQuery<Note>

    @GqlCreate(Note)
    declare createNote: CreateMutation<Note>

    @GqlUpdate(Note)
    declare updateNote: UpdateMutation<Note>

    @GqlDelete(Note)
    declare deleteNote: DeleteMutation<Note>
  }

  it('maps a create validation failure to BAD_USER_INPUT with field errors', async () => {
    const schema = buildSchema({ resolvers: [NoteResolver], actor: () => actor })
    const before = notes.size
    const result = await run(
      schema,
      'mutation { createNote(input: { eventId: "event-1", title: "duplicate" }) { id } }'
    )

    expect(codes(result)).toEqual(['BAD_USER_INPUT'])
    expect(fieldErrors(result)).toEqual({ title: 'Title is required' })
    expect(notes.size).toBe(before)
  })

  it('maps a save validation failure to BAD_USER_INPUT with field errors', async () => {
    @Resolver()
    class FailingResolver {
      @GqlList(Note)
      declare notes: ListQuery<Note>

      @GqlUpdate(Note)
      declare updateNote: UpdateMutation<Note>
    }

    const schema = buildSchema({ resolvers: [FailingResolver], actor: () => actor })
    const original = notes.get('note-seed')!
    original.save = async () => {
      throw new ValidationError({ title: 'Title already taken' })
    }

    const result = await run(
      schema,
      'mutation { updateNote(id: "note-seed", input: { title: "Taken" }) { id } }'
    )
    expect(codes(result)).toEqual(['BAD_USER_INPUT'])
    expect(fieldErrors(result)).toEqual({ title: 'Title already taken' })
    expect(result.errors?.[0].message).toBe('Title already taken')
  })

  it('maps a delete validation failure to BAD_USER_INPUT', async () => {
    @Resolver()
    class DeleteGuardResolver {
      @GqlList(Note)
      declare notes: ListQuery<Note>

      @GqlDelete(Note)
      declare deleteNote: DeleteMutation<Note>
    }

    const schema = buildSchema({ resolvers: [DeleteGuardResolver], actor: () => actor })
    const original = notes.get('note-seed')!
    original.delete = async () => {
      throw new ValidationError({ id: 'Note is in use' })
    }

    const result = await run(schema, 'mutation { deleteNote(id: "note-seed") }')
    expect(codes(result)).toEqual(['BAD_USER_INPUT'])
    expect(fieldErrors(result)).toEqual({ id: 'Note is in use' })
  })

  it('re-throws non-validation errors untouched', async () => {
    @Resolver()
    class BoomResolver {
      @GqlList(Note)
      declare notes: ListQuery<Note>

      @GqlUpdate(Note)
      declare updateNote: UpdateMutation<Note>
    }

    const schema = buildSchema({ resolvers: [BoomResolver], actor: () => actor })
    const original = notes.get('note-seed')!
    original.save = async () => {
      throw new Error('disk on fire')
    }

    const result = await run(
      schema,
      'mutation { updateNote(id: "note-seed", input: { title: "Boom" }) { id } }'
    )
    expect(codes(result)).toEqual(['none'])
    expect(result.errors?.[0].message).toBe('disk on fire')
  })
})
