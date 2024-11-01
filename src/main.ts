import * as fs from 'fs'
import * as path from 'path'
import * as installer from './installer'
import * as deps from './dependencies'
import * as fonts from './fonts'
import * as core from '@actions/core'
import * as exec from '@actions/exec'

async function run(): Promise<void> {
  try {
    const version = core.getInput('version')
    const filePath = core.getInput('path')
    const outputPath = core.getInput('output')
    const publish = core.getInput('publish')

    // Fail fast if file does not exist.
    if (filePath) {
      if (!fs.existsSync(filePath)) {
        core.error(`File ${filePath} does not exist`)
      } else {
        // Check that `filePath` is a file, and that we can read it.
        fs.accessSync(filePath, fs.constants.F_OK)
        fs.accessSync(filePath, fs.constants.R_OK)
      }
    }

    await fonts.install()
    await deps.install()
    const bin = await installer.install(version)

    core.info('Adding VHS to PATH')
    core.addPath(path.dirname(bin))

    // Unset the CI variable to prevent Termenv from ignoring terminal ANSI sequences.
    core.exportVariable('CI', '')

    // GitHub Actions support terminal true colors, so we can enable it.
    core.exportVariable('COLORTERM', 'truecolor')

    if (filePath) {
      core.info('Running VHS')
      await exec.exec(`${bin} ${filePath}`)

      if (publish) { // if publish is 'true'
        // Check if output path is provided and exists
        if (outputPath) {
          const outputFile = path.join(process.cwd(), outputPath)
          if (!fs.existsSync(outputFile)) {
            throw new Error(`Output file ${outputFile} does not exist`)
          }
        }

        // Run publish command and capture the output
        core.info('Publishing recording')
        const publishOutput = await exec.getExecOutput(`${bin} publish ${outputPath}`)

        // Set the entire output string as a GitHub Actions output
        core.setOutput('gif-url', publishOutput.stdout)
      } else {
        core.info('Skipping publishing')
      }
    } else if (publish === 'true') {
      core.info('wrong check')
    } else {
      core.info('No path provided, skipping publishing')
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()