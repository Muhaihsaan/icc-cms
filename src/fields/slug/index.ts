import type { CheckboxField, Field, TextField } from 'payload'

import { formatSlugHook } from './format-slug'

export const slugField = (fieldToUse = 'title'): [Field, Field] => {
  const checkBoxField: CheckboxField = {
    name: 'slugLock',
    type: 'checkbox',
    defaultValue: true,
    admin: {
      hidden: true,
      position: 'sidebar',
    },
  }

  const slugFieldConfig: TextField = {
    name: 'slug',
    type: 'text',
    index: true,
    label: 'Slug',
    hooks: {
      beforeValidate: [formatSlugHook(fieldToUse)],
    },
    admin: {
      position: 'sidebar',
      components: {
        Field: {
          path: '@/fields/slug/slug-component#SlugComponent',
          clientProps: {
            fieldToUse,
            checkboxFieldPath: checkBoxField.name,
          },
        },
      },
    },
  }

  return [slugFieldConfig, checkBoxField]
}
