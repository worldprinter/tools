import { addDependenciesToPackageJson, formatFiles, Tree } from '@nx/devkit'

import { updateEslintConfig } from '../../utils/eslint'

export async function workspaceGenerator(tree: Tree) {
    tree.write(
        '.prettierrc',
        JSON.stringify(
            {
                semi: false,
                singleQuote: true,
                jsxSingleQuote: true,
                tabWidth: 4,
                bracketSpacing: true,
                printWidth: 120,
                bracketSameLine: false,
                trailingComma: 'all',
                arrowParens: 'always',
                singleAttributePerLine: true,
                endOfLine: 'lf',
                importOrder: ['<THIRD_PARTY_MODULES>', '', '^@worldprinter/(.*)$', '', '^[./]'],
                importOrderCaseInsensitive: true,
                importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
                importOrderMergeDuplicateImports: true,
                importOrderCombineTypeAndValueImports: true,
                importOrderSortSpecifiers: true,
                plugins: ['@ianvs/prettier-plugin-sort-imports'],
            },
            null,
            2,
        ),
    )

    const task = addDependenciesToPackageJson(
        tree,
        {},
        {
            '@ianvs/prettier-plugin-sort-imports': 'latest',
        },
    )

    const eslintContent = JSON.parse(tree.read('.eslintrc.json').toString('utf-8'))
    const newEslintContent = updateEslintConfig(eslintContent)
    tree.write('.eslintrc.json', JSON.stringify(newEslintContent, null, 2))

    await formatFiles(tree)
    return task
}

export default workspaceGenerator
