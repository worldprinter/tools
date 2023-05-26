const ruleTarget = ['*.ts', '*.tsx', '*.js', '*.jsx'].sort().join(',')

function isSame(target: any[]) {
    if (typeof target === 'string') {
        target = [target]
    }
    return target.sort().join(',') === ruleTarget
}

export function updateEslintConfig(config: any) {
    config.overrides = config.overrides.map((override: any) => {
        if (isSame(override.files)) {
            override.rules = {
                ...override.rules,

                '@typescript-eslint/consistent-type-imports': [
                    'error',
                    {
                        prefer: 'type-imports',
                        disallowTypeAnnotations: false,
                        fixStyle: 'separate-type-imports',
                    },
                ],
                '@typescript-eslint/ban-ts-comment': ['off'],
                'no-unused-vars': ['off'],
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    {
                        argsIgnorePattern: '^_',
                    },
                ],
                '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
                '@typescript-eslint/consistent-type-exports': ['error'],
                '@typescript-eslint/no-explicit-any': ['off'],
                '@typescript-eslint/ban-types': ['off'],
            }
        }
        return override
    })

    return config
}
