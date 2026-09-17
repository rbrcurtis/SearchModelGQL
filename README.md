# search-model-gql

Decorator-driven GraphQL schema generation for [`search-model`](https://github.com/rbrcurtis/SearchModel).

Annotate your search-model fields once. The library builds the GraphQL output
type, the create and update input types, and the standard CRUD queries and
mutations from the same field metadata.

## Why

- **One class, both directions.** A single model class produces the output type
  and the input types. No parallel input classes.
- **Per-field exposure.** Each field chooses output and input independently.
  `output` defaults to `true`, `input` to `false`.
- **Default-deny.** A field with no `@GqlExpose` is not in the schema. Nothing
  leaks by omission.
- **No reflection metadata.** Types come from explicit values, so it works under
  tsx, SWC (Next.js), and esbuild, where `design:type` is not emitted.

## Install

```bash
yarn add github:rbrcurtis/SearchModelGQL
```

Peer dependencies: `search-model` and `graphql`.

## Quick start

### 1. Annotate the model

```ts
import { SearchModel, KeywordType, StringType, NumberType, BooleanType } from 'search-model'
import { GqlType, GqlExpose, gqlEnum } from 'search-model-gql'

const PostStatus = gqlEnum('PostStatus', ['draft', 'published'])

@GqlType('Post')
export class Post extends SearchModel<Post> {
  static readonly indexName = 'posts'

  @KeywordType({ required: true })
  @GqlExpose({ input: true })
  authorId!: string

  @StringType({ required: true })
  @GqlExpose({ input: true })
  title!: string

  @NumberType({ required: true })
  @GqlExpose({ input: true })
  wordCount!: number

  @StringType({ required: true })
  @GqlExpose({ input: true, type: () => PostStatus })
  status!: 'draft' | 'published'

  @BooleanType({ default: () => true })
  @GqlExpose() // output only
  isPinned!: boolean

  @StringType()
  internalNote?: string // never exposed
}
```

### 2. Declare the resolver

`@GqlList`, `@GqlGet`, `@GqlCreate`, `@GqlUpdate`, and `@GqlDelete` generate the
operation. Use `declare` fields so you write only the decorators.

```ts
import {
  Resolver,
  GqlList,
  GqlGet,
  GqlCreate,
  GqlUpdate,
  GqlDelete,
} from 'search-model-gql'
import type {
  ListQuery,
  GetQuery,
  CreateMutation,
  UpdateMutation,
  DeleteMutation,
} from 'search-model-gql'

@Resolver()
export class PostResolver {
  @GqlList(Post)
  declare posts: ListQuery<Post>

  @GqlGet(Post)
  declare post: GetQuery<Post>

  @GqlCreate(Post)
  declare createPost: CreateMutation<Post>

  @GqlUpdate(Post)
  declare updatePost: UpdateMutation<Post>

  @GqlDelete(Post)
  declare deletePost: DeleteMutation<Post>
}
```

### 3. Build and serve the schema

```ts
import { createYoga } from 'graphql-yoga'
import { buildSchema } from 'search-model-gql'

const schema = buildSchema({ resolvers: [PostResolver] })
const yoga = createYoga({ schema })
```

## Generated operations

For a model named `Post`:

```graphql
posts(search: String, pagination: PaginationInput, sort: SortInput): PostListResult!
post(id: ID!): Post
createPost(input: CreatePostInput!): Post!
updatePost(id: ID!, input: UpdatePostInput!): Post!
deletePost(id: ID!): Boolean!
```

Generated types: `Post`, `PostListResult { hits, total, page }`,
`CreatePostInput`, `UpdatePostInput`.

- **List** filters with the `search` string using Elasticsearch query syntax.
  There are no per-model filter inputs.
- **Create** honors `required` from the search-model decorator. A required field
  with a default is optional in the input.
- **Update** takes `id` plus an input where every field is optional.
- `id` is always `ID!` output-only. It never appears in an input.

## Field type inference

| search-model decorator | GraphQL type |
| --- | --- |
| `@StringType`, `@KeywordType` | `String` |
| `@NumberType` | `Float` |
| `@BooleanType` | `Boolean` |
| `@DateType` | `DateTime` |
| `@DateOnlyType` | `String` |
| `@StringArrayType` | `[String]` |
| `@StringMapType` | `JSON` |
| `@GeoPointType` | `GeoPoint` |
| `@ObjectType` | generated object type |
| `@ObjectArrayType` | `[generated object type!]` |

`@VectorType` is not supported. Use `@GqlExpose({ type: ... })` for enums and
computed fields.

## Custom queries and mutations

```ts
@Resolver()
class ReportingResolver {
  @GqlQuery(() => Post)
  async postBySlug(
    @Arg('slug', () => String) slug: string,
    @Ctx() ctx: unknown
  ): Promise<Post | null> {
    void ctx
    return Post.findOne([`slug:${slug}`])
  }

  @GqlMutation(() => Boolean)
  async archivePost(@Arg('id', () => String) id: string): Promise<boolean> {
    void id
    return true
  }
}
```

Return and argument type thunks accept a GraphQL type, a JS primitive
(`String`, `Boolean`, `Number`, `Date`), or a search-model class. A search-model
class maps to its generated output type (return) or create input type (argument).

## Notes and limitations

- Nested input properties are always nullable so one nested input type serves
  both create and update. search-model still validates required nested
  properties on save.
- `PaginationInput` is one-based (`page: 1` is the first page), matching
  search-model.
- `@GqlType` is optional. The type name defaults to the class name, so a model
  needs the decorator only to override the name. A bare `@GqlType()` pins the
  name to the class name as an explicit marker against class renaming.

## Development

```bash
yarn test        # vitest
yarn build       # lib + esm + types
yarn lint
```
