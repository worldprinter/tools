import { formatFiles, getProjects, updateProjectConfiguration, type Tree } from '@nx/devkit'
import * as path from 'path'

import { updateEslintConfig } from '../../utils/eslint'

export async function libraryGenerator(tree: Tree) {
    const projects = getProjects(tree)
    for (const projectsKey of [...projects.keys()]) {
        const project = projects.get(projectsKey)
        if (project) {
            const projectRoot = project.root
            const eslintConfigPath = path.join(projectRoot, '.eslintrc.json')
            const eslintConfig = JSON.parse(tree.read(eslintConfigPath).toString('utf-8'))
            const newEslintConfig = updateEslintConfig(eslintConfig)
            tree.write(eslintConfigPath, JSON.stringify(newEslintConfig, null, 2))

            const targets = project.targets

            let hasViteBuild = false

            for (const targetKey of Object.keys(targets)) {
                const target = targets[targetKey]
                if (target.executor === '@nx/vite:build') {
                    hasViteBuild = true
                    target.options = {
                        ...target.options,
                        emptyOutDir: true,
                        sourcemap: true,
                        minify: true,
                        manifest: true,
                        ssrManifest: true,
                        ssr: true,
                        logLevel: 'info',
                        force: true,
                        cssCodeSplit: true,
                        generatePackageJson: true,
                        includeDevDependenciesInPackageJson: true,
                    }
                }
                project.targets[targetKey] = target
            }

            if (!project.targets['static:server'] && hasViteBuild) {
                project.targets['static:server'] = {
                    executor: '@nx/vite:preview-server',
                    options: {
                        buildTarget: `${projectsKey}:build`,
                        port: 3000,
                        host: '0.0.0.0',
                        open: false,
                        logLevel: 'info',
                    },
                }
            }

            updateProjectConfiguration(tree, projectsKey, project)
        }
    }

    await formatFiles(tree)
}

export default libraryGenerator
