import 'reflect-metadata'
import { GraphQLInputObjectType, GraphQLObjectType } from 'graphql'
import type { GraphQLArgument, GraphQLField } from 'graphql'
import {
  BooleanType,
  KeywordType,
  NumberType,
  ObjectArrayType,
  SearchModel,
  StringType,
} from 'search-model'
import {
  Arg,
  Ctx,
  GqlCreate,
  GqlDelete,
  GqlExpose,
  GqlGet,
  GqlList,
  GqlMutation,
  GqlQuery,
  GqlType,
  GqlUpdate,
  Resolver,
  buildSchema,
  gqlEnum,
} from '../index'
import type { CreateMutation, DeleteMutation, GetQuery, ListQuery, UpdateMutation } from '../index'

const PostStatus = gqlEnum('PostStatus', ['draft', 'published'])

interface Tag {
  label?: string
  score?: number
}

@GqlType('Post')
class Post extends SearchModel<Post> {
  static readonly indexName = 'test_posts'

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
  @GqlExpose()
  isPinned!: boolean

  @StringType()
  internalNote?: string

  @ObjectArrayType({
    properties: {
      label: { type: 'string' },
      score: { type: 'number' },
    },
  })
  @GqlExpose({ input: true })
  tags!: Tag[]
}

@Resolver()
class PostResolver {
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

  @GqlQuery(() => Post)
  postBySlug(@Arg('slug', () => String) slug: string, @Ctx() ctx: unknown): Post | null {
    void slug
    void ctx
    return null
  }

  @GqlQuery(() => [Post])
  featuredPosts(): Post[] {
    return []
  }

  @GqlMutation(() => Boolean)
  doThing(): boolean {
    return true
  }
}

function build() {
  return buildSchema({ resolvers: [PostResolver] })
}

function argNames(field: GraphQLField<unknown, unknown>): string[] {
  return field.args.map((a) => a.name)
}

function argType(field: GraphQLField<unknown, unknown>, name: string): string {
  const found: GraphQLArgument | undefined = field.args.find((a) => a.name === name)
  if (!found) throw new Error(`missing argument ${name}`)
  return found.type.toString()
}

function inputFields(name: string): Record<string, string> {
  const type = build().getType(name)
  if (!(type instanceof GraphQLInputObjectType)) throw new Error(`${name} is not an input type`)
  const fields = type.getFields()
  return Object.fromEntries(Object.entries(fields).map(([key, f]) => [key, f.type.toString()]))
}

describe('buildSchema', () => {
  it('generates the standard CRUD operations', () => {
    const schema = build()
    const query = schema.getQueryType()
    const mutation = schema.getMutationType()
    expect(query).toBeTruthy()
    expect(mutation).toBeTruthy()

    const queries = query!.getFields()
    expect(queries.posts.type.toString()).toBe('PostListResult!')
    expect(queries.post.type.toString()).toBe('Post')
    expect(argNames(queries.posts)).toEqual(['search', 'pagination', 'sort'])
    expect(argType(queries.posts, 'search')).toBe('String')
    expect(argType(queries.posts, 'pagination')).toBe('PaginationInput')
    expect(argType(queries.post, 'id')).toBe('ID!')

    const mutations = mutation!.getFields()
    expect(Object.keys(mutations)).toEqual([
      'createPost',
      'updatePost',
      'deletePost',
      'doThing',
    ])
    expect(argType(mutations.createPost, 'input')).toBe('CreatePostInput!')
    expect(argType(mutations.updatePost, 'id')).toBe('ID!')
    expect(argType(mutations.updatePost, 'input')).toBe('UpdatePostInput!')
    expect(mutations.deletePost.type.toString()).toBe('Boolean!')
  })

  it('exposes the list result shape', () => {
    const type = build().getType('PostListResult')
    if (!(type instanceof GraphQLObjectType)) throw new Error('missing list result')
    const fields = type.getFields()
    expect(fields.hits.type.toString()).toBe('[Post!]!')
    expect(fields.total.type.toString()).toBe('Int!')
    expect(fields.page.type.toString()).toBe('Int!')
  })

  it('honors required in create input and makes update input fully optional', () => {
    const create = inputFields('CreatePostInput')
    expect(create.authorId).toBe('String!')
    expect(create.title).toBe('String!')
    expect(create.wordCount).toBe('Float!')
    expect(create.status).toBe('PostStatus!')
    expect(create.tags).toBe('[PostTagsInput!]')

    const update = inputFields('UpdatePostInput')
    expect(update.authorId).toBe('String')
    expect(update.title).toBe('String')
    expect(update.wordCount).toBe('Float')
    expect(update.status).toBe('PostStatus')
    expect(update.tags).toBe('[PostTagsInput!]')
  })

  it('never exposes id or unexposed fields on inputs, and exposes id as output only', () => {
    const create = inputFields('CreatePostInput')
    expect(create.id).toBeUndefined()
    expect(create.createdAt).toBeUndefined()
    expect(create.internalNote).toBeUndefined()
    // isPinned is output-only because `input` defaults to false
    expect(create.isPinned).toBeUndefined()

    const output = build().getType('Post')
    if (!(output instanceof GraphQLObjectType)) throw new Error('missing output type')
    const fields = output.getFields()
    expect(fields.id.type.toString()).toBe('ID!')
    expect(fields.isPinned.type.toString()).toBe('Boolean')
    expect(fields.internalNote).toBeUndefined()
  })

  it('generates nested object and input types for objectArray fields', () => {
    const schema = build()
    const output = schema.getType('PostTags')
    const input = schema.getType('PostTagsInput')
    expect(output).toBeInstanceOf(GraphQLObjectType)
    expect(input).toBeInstanceOf(GraphQLInputObjectType)
    const inputFieldsMap = (input as GraphQLInputObjectType).getFields()
    expect(inputFieldsMap.score.type.toString()).toBe('Float')
  })

  it('maps JS primitives and custom arg types', () => {
    const schema = build()
    const queries = schema.getQueryType()!.getFields()
    expect(queries.postBySlug.type.toString()).toBe('Post')
    expect(argNames(queries.postBySlug)).toEqual(['slug'])
    expect(argType(queries.postBySlug, 'slug')).toBe('String!')
    const mutations = schema.getMutationType()!.getFields()
    expect(mutations.doThing.type.toString()).toBe('Boolean')
  })

  it('defaults the type name to the class name with a bare or absent @GqlType', () => {
    // Bare @GqlType() pins the name; no decorator infers it. Both use the class name.
    @GqlType()
    class Widget extends SearchModel<Widget> {
      static readonly indexName = 'test_widgets'

      @StringType({ required: true })
      @GqlExpose({ input: true })
      label!: string
    }

    class Gadget extends SearchModel<Gadget> {
      static readonly indexName = 'test_gadgets'

      @StringType({ required: true })
      @GqlExpose({ input: true })
      label!: string
    }

    @Resolver()
    class MiscResolver {
      @GqlList(Widget)
      declare widgets: ListQuery<Widget>

      @GqlList(Gadget)
      declare gadgets: ListQuery<Gadget>
    }

    const schema = buildSchema({ resolvers: [MiscResolver] })
    expect(schema.getType('Widget')).toBeInstanceOf(GraphQLObjectType)
    expect(schema.getType('Gadget')).toBeInstanceOf(GraphQLObjectType)
    const queries = schema.getQueryType()!.getFields()
    expect(queries.widgets.type.toString()).toBe('WidgetListResult!')
    expect(queries.gadgets.type.toString()).toBe('GadgetListResult!')
  })
})

describe('schema descriptions', () => {
  @GqlType('Article', { description: 'A published blog article.' })
  class Article extends SearchModel<Article> {
    static readonly indexName = 'test_articles'

    @StringType({ required: true })
    @GqlExpose({ input: true, description: 'Headline shown on the article page.' })
    title!: string

    @StringType()
    @GqlExpose({ description: 'Author-supplied summary.' })
    summary?: string
  }

  @Resolver()
  class ArticleResolver {
    @GqlList(Article, { description: 'List articles, newest first.' })
    declare articles: ListQuery<Article>

    @GqlGet(Article)
    declare article: GetQuery<Article>

    @GqlCreate(Article)
    declare createArticle: CreateMutation<Article>

    @GqlUpdate(Article)
    declare updateArticle: UpdateMutation<Article>

    @GqlMutation(() => Boolean, { description: 'Publish a draft article.' })
    publishArticle(@Arg('id', () => String, { description: 'Article id.' }) id: string): boolean {
      void id
      return true
    }

    @GqlMutation(() => Boolean)
    archiveArticle(): boolean {
      return true
    }
  }

  const schema = buildSchema({ resolvers: [ArticleResolver] })

  it('describes the generated object type from @GqlType', () => {
    const article = schema.getType('Article')
    expect(article).toBeInstanceOf(GraphQLObjectType)
    expect((article as GraphQLObjectType).description).toBe('A published blog article.')
  })

  it('describes exposed fields from @GqlExpose', () => {
    const article = schema.getType('Article') as GraphQLObjectType
    expect(article.getFields().title.description).toBe('Headline shown on the article page.')
    expect(article.getFields().summary.description).toBe('Author-supplied summary.')
  })

  it('describes the generated input and list result types', () => {
    expect((schema.getType('CreateArticleInput') as GraphQLInputObjectType).description).toBe(
      'Input for creating a new Article record.'
    )
    expect((schema.getType('ArticleListResult') as GraphQLObjectType).description).toBe(
      'One page of Article records.'
    )
  })

  it('overrides generated operation descriptions and keeps the defaults', () => {
    const queries = schema.getQueryType()!.getFields()
    expect(queries.articles.description).toBe('List articles, newest first.')
    expect(queries.article.description).toBe('Fetch one Article by id. Returns null when not found.')
  })

  it('describes custom mutations and leaves the description undefined when omitted', () => {
    const mutations = schema.getMutationType()!.getFields()
    expect(mutations.publishArticle.description).toBe('Publish a draft article.')
    expect(mutations.archiveArticle.description).toBeUndefined()
  })
})

describe('nested type descriptions', () => {
  @GqlType('Ticket', { description: 'A ticket type on sale.' })
  class Ticket extends SearchModel<Ticket> {
    static readonly indexName = 'test_tickets'

    @StringType({ required: true })
    @GqlExpose({ input: true })
    label!: string

    @ObjectArrayType({
      properties: {
        label: { type: 'string', options: { required: true } },
      },
    })
    @GqlExpose({ input: true, description: 'Discount tiers for this ticket.' })
    tiers!: { label: string }[]
  }

  @Resolver()
  class TicketResolver {
    @GqlList(Ticket)
    declare tickets: ListQuery<Ticket>

    @GqlCreate(Ticket)
    declare createTicket: CreateMutation<Ticket>
  }

  const schema = buildSchema({ resolvers: [TicketResolver] })

  it('reuses the field description on the nested object and input types', () => {
    const object = schema.getType('TicketTiers') as GraphQLObjectType
    expect(object.description).toBe('Discount tiers for this ticket.')
    const input = schema.getType('TicketTiersInput') as GraphQLInputObjectType
    expect(input.description).toBe('Discount tiers for this ticket.')
  })
})

describe('custom query list return types', () => {
  it('maps a one-element model array thunk to a non-null list of the output type', () => {
    const schema = build()
    const field = schema.getQueryType()!.getFields().featuredPosts
    expect(field.type.toString()).toBe('[Post!]')
  })
})
