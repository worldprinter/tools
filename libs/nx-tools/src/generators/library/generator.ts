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

            for (const targetKey of Object.keys(targets)) {
                const target = targets[targetKey]

                if (target.executor === '@nx/rollup:rollup') {
                    project.targets[targetKey].options = {
                        ...project.targets[targetKey].options,
                        compiler: 'tsc',
                        format: ['esm', 'cjs'],
                        buildableProjectDepsInPackageJsonType: 'dependencies',
                        updateBuildableProjectDepsInPackageJson: true,
                        generateExportsField: true,
                        skipTypeCheck: true,
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

                project.targets[targetKey] = target
            }

            if (targets['build']) {
                const outputPath = targets['build'].options.outputPath
                if (outputPath) {
                    project.targets['static:server'] = {
                        executor: 'nx:run-commands',
                        options: {
                            commands: [
                                `pnpm nx run ${projectName}:build --watch`,
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
                    projectJson.targets.build.options = Object.keys(projectJson.targets.build.options)
                        .sort()
                        .reduce((acc, key) => {
                            acc[key] = projectJson.targets.build.options[key]
                            return acc
                        }, {})
                    tree.write(path.join(projectRoot, 'project.json'), JSON.stringify(projectJson, null, 2))
                }
            }
        }
    })

    await formatFiles(tree)
}

export default libraryGenerator
