import * as path from 'path'
import { formatFiles, getProjects, updateProjectConfiguration, type Tree } from '@nx/devkit'

import { updateEslintConfig } from '../../utils/eslint'

let startPort = 4500

export async function libraryGenerator(tree: Tree) {
    const projects = getProjects(tree)

    const projectNames = [...projects.keys()]

    projectNames.forEach((projectName) => {
        const project = projects.get(projectName)
        if (project && project.projectType === 'library') {
            const projectRoot = project.root
            const eslintConfigPath = path.join(projectRoot, '.eslintrc.json')
            const eslintConfig = JSON.parse(tree.read(eslintConfigPath).toString('utf-8'))
            const newEslintConfig = updateEslintConfig(eslintConfig)
            tree.write(eslintConfigPath, JSON.stringify(newEslintConfig, null, 2))

            const targets = project.targets

            let hasBuild = false
            for (const targetKey of Object.keys(targets)) {
                let target = targets[targetKey]
                if (targetKey === 'build') {
                    hasBuild = true
                }

                if (target.executor === '@nx/rollup:rollup') {
                    project.targets[targetKey].executor = '@nx/vite:build'
                    project.targets[targetKey].options = {
                        ...project.targets[targetKey].options,
                        compiler: 'tsc',
                        format: ['esm', 'cjs'],
                        buildableProjectDepsInPackageJsonType: 'dependencies',
                        updateBuildableProjectDepsInPackageJson: true,
                        generateExportsField: true,
                        assets: [
                            {
                                glob: `${projectRoot}/README.md`,
                                input: '.',
                                output: '.',
                            },
                            {
                                glob: `${projectRoot}/CHANGELOG.md`,
                                input: '.',
                                output: '.',
                            },
                        ],
                    }
                }

                if (target.executor === '@nx/vite:build') {
                    // add .babelrc
                    tree.write(
                        path.join(projectRoot, '.babelrc'),
                        JSON.stringify(
                            {
                                presets: [
                                    [
                                        '@nx/react/babel',
                                        {
                                            runtime: 'automatic',
                                            useBuiltIns: 'usage',
                                            importSource: '@emotion/react',
                                        },
                                    ],
                                ],
                                plugins: ['@emotion/babel-plugin'],
                            },
                            null,
                            2,
                        ),
                    )
                    // add jest.config.ts
                    tree.write(
                        path.join(projectRoot, 'jest.config.ts'),
                        `/* eslint-disable */
export default {
  displayName: '${projectName}',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/${projectRoot}',
};
`,
                    )
                    // replace tsconfig.spec.json
                    tree.write(
                        path.join(projectRoot, 'tsconfig.spec.json'),
                        JSON.stringify(
                            {
                                extends: './tsconfig.json',
                                compilerOptions: {
                                    outDir: '../../dist/out-tsc',
                                    module: 'commonjs',
                                    types: ['jest', 'node'],
                                },
                                include: [
                                    'jest.config.ts',
                                    'src/**/*.test.ts',
                                    'src/**/*.spec.ts',
                                    'src/**/*.test.tsx',
                                    'src/**/*.spec.tsx',
                                    'src/**/*.test.js',
                                    'src/**/*.spec.js',
                                    'src/**/*.test.jsx',
                                    'src/**/*.spec.jsx',
                                    'src/**/*.d.ts',
                                ],
                            },
                            null,
                            2,
                        ),
                    )
                    // remove vite.config.ts
                    tree.delete(path.join(projectRoot, 'vite.config.ts'))

                    project.targets[targetKey] = target = {
                        executor: '@nx/rollup:rollup',
                        outputs: ['{options.outputPath}'],
                        options: {
                            outputPath: target.options.outputDir,
                            tsConfig: `${projectRoot}/tsconfig.lib.json`,
                            project: `${projectRoot}/package.json`,
                            entryFile: `${projectRoot}/src/index.ts`,
                            external: ['react', 'react-dom', 'react/jsx-runtime'],
                            rollupConfig: '@nx/react/plugins/bundle-rollup',
                            compiler: 'tsc',
                            format: ['esm', 'cjs'],
                            buildableProjectDepsInPackageJsonType: 'dependencies',
                            updateBuildableProjectDepsInPackageJson: true,
                            generateExportsField: true,
                            assets: [
                                {
                                    glob: `${projectRoot}/README.md`,
                                    input: '.',
                                    output: '.',
                                },
                                {
                                    glob: `${projectRoot}/CHANGELOG.md`,
                                    input: '.',
                                    output: '.',
                                },
                            ],
                        },
                    }
                }

                project.targets[targetKey] = target
            }

            if (hasBuild) {
                const outputPath = targets['build'].options.outputPath
                if (outputPath) {
                    project.targets['static:server'] = {
                        executor: 'nx:run-commands',
                        options: {
                            commands: [
                                `pnpm nx run ${projectName}:build`,
                                `http-server ${outputPath} -p ${startPort++} -d -i -g -b --cors -c-1 --log-ip --utc-time`,
                            ],
                            parallel: true,
                        },
                    }
                }
            }

            updateProjectConfiguration(tree, projectName, project)

            const projectJson = JSON.parse(tree.read(path.join(projectRoot, 'project.json')).toString('utf-8'))

            if (projectJson.targets && projectJson.targets.build && projectJson.targets.build.options) {
                if (!projectJson.targets.build.options.outputPath) {
                    projectJson.targets.build.options.outputPath = `dist/${project.root}`
                    tree.write(path.join(projectRoot, 'project.json'), JSON.stringify(projectJson, null, 2))
                }
            }
        }
    })

    await formatFiles(tree)
}

export default libraryGenerator
