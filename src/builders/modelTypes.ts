import { getFieldMetadata } from 'search-model'
import {
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
} from 'graphql'
import type {
  GraphQLFieldConfigMap,
  GraphQLInputFieldConfigMap,
  GraphQLInputType,
  GraphQLOutputType,
} from 'graphql'
import { getFieldMetadataForClass, getTypeName } from '../metadata'
import type { GqlFieldMetadata } from '../metadata'
import { leafInputType, leafOutputType } from '../infer'
import { upperFirst } from '../naming'
import type { SearchFieldMetadata, SearchModelClass } from '../searchModel'
import { buildNestedInputType, buildNestedOutputType } from './nested'

/** All GraphQL types generated from one search-model model class. */
export interface ModelTypeSet {
  model: SearchModelClass
  typeName: string
  output: GraphQLObjectType
  createInput: GraphQLInputObjectType
  updateInput: GraphQLInputObjectType
  listResult: GraphQLObjectType
}

function outputFieldType(
  typeName: string,
  exposure: GqlFieldMetadata,
  searchField: SearchFieldMetadata | undefined
): GraphQLOutputType {
  if (exposure.type) return exposure.type() as GraphQLOutputType
  if (!searchField) {
    throw new Error(
      `Field "${exposure.propertyKey}" on ${typeName} has no search-model decorator and no explicit type`
    )
  }
  if (searchField.type === 'object' && searchField.options?.properties) {
    return buildNestedOutputType(
      `${typeName}${upperFirst(exposure.propertyKey)}`,
      searchField.options.properties
    )
  }
  if (searchField.type === 'objectArray' && searchField.options?.properties) {
    return new GraphQLList(
      new GraphQLNonNull(
        buildNestedOutputType(
          `${typeName}${upperFirst(exposure.propertyKey)}`,
          searchField.options.properties
        )
      )
    )
  }
  const leaf = leafOutputType(searchField.type)
  if (!leaf) {
    throw new Error(
      `Field "${exposure.propertyKey}" on ${typeName} has unsupported type "${searchField.type}"`
    )
  }
  return leaf
}

function inputFieldType(
  typeName: string,
  exposure: GqlFieldMetadata,
  searchField: SearchFieldMetadata | undefined
): GraphQLInputType {
  if (exposure.type) return exposure.type() as GraphQLInputType
  if (!searchField) {
    throw new Error(
      `Field "${exposure.propertyKey}" on ${typeName} has no search-model decorator and no explicit type`
    )
  }
  if (searchField.type === 'object' && searchField.options?.properties) {
    return buildNestedInputType(
      `${typeName}${upperFirst(exposure.propertyKey)}Input`,
      searchField.options.properties
    )
  }
  if (searchField.type === 'objectArray' && searchField.options?.properties) {
    return new GraphQLList(
      new GraphQLNonNull(
        buildNestedInputType(
          `${typeName}${upperFirst(exposure.propertyKey)}Input`,
          searchField.options.properties
        )
      )
    )
  }
  const leaf = leafInputType(searchField.type)
  if (!leaf) {
    throw new Error(
      `Field "${exposure.propertyKey}" on ${typeName} has unsupported type "${searchField.type}"`
    )
  }
  return leaf
}

/**
 * Build the GraphQL types for one model: the output type, the create and update
 * input types, and the list-result type.
 *
 * `id` is always exposed as `ID!` output-only. A field with no `@GqlExpose` is
 * not present in any type.
 */
export function buildModelTypes(model: SearchModelClass): ModelTypeSet {
  const ctor = model as unknown as Function
  const typeName = getTypeName(ctor)
  const exposures = getFieldMetadataForClass(ctor)
  const searchFields = getFieldMetadata(model.prototype) as unknown as SearchFieldMetadata[]
  const searchByKey = new Map(searchFields.map((f) => [f.propertyKey, f]))

  const outputFields: GraphQLFieldConfigMap<unknown, unknown> = {
    id: { type: new GraphQLNonNull(GraphQLID), description: 'Document id.' },
  }
  const createInputFields: GraphQLInputFieldConfigMap = {}
  const updateInputFields: GraphQLInputFieldConfigMap = {}

  for (const exposure of exposures) {
    if (exposure.propertyKey === 'id') continue
    const searchField = searchByKey.get(exposure.propertyKey)
    const modelRequired = searchField?.options?.required === true
    const hasDefault = searchField?.options?.default !== undefined

    if (exposure.output !== false) {
      const type = outputFieldType(typeName, exposure, searchField)
      const nonNull =
        exposure.nullable === true
          ? false
          : searchField
            ? modelRequired
            : exposure.nullable === false
      outputFields[exposure.propertyKey] = {
        type: nonNull ? new GraphQLNonNull(type) : type,
        description: exposure.description,
      }
    }

    if (exposure.input === true) {
      const type = inputFieldType(typeName, exposure, searchField)
      const createNonNull =
        exposure.nullable === true
          ? false
          : searchField
            ? modelRequired && !hasDefault
            : exposure.nullable === false
      createInputFields[exposure.propertyKey] = {
        type: createNonNull ? new GraphQLNonNull(type) : type,
        description: exposure.description,
      }
      updateInputFields[exposure.propertyKey] = {
        type,
        description: exposure.description,
      }
    }
  }

  const output = new GraphQLObjectType({ name: typeName, fields: outputFields })
  const createInput = new GraphQLInputObjectType({
    name: `Create${upperFirst(typeName)}Input`,
    fields: createInputFields,
  })
  const updateInput = new GraphQLInputObjectType({
    name: `Update${upperFirst(typeName)}Input`,
    fields: updateInputFields,
  })
  const listResult = new GraphQLObjectType({
    name: `${typeName}ListResult`,
    fields: {
      hits: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(output))),
        description: `Matching ${typeName} records.`,
      },
      total: { type: new GraphQLNonNull(GraphQLInt), description: 'Total matches.' },
      page: { type: new GraphQLNonNull(GraphQLInt), description: 'Current one-based page.' },
    },
  })

  return { model, typeName, output, createInput, updateInput, listResult }
}
