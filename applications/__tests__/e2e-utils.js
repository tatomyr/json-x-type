/* global process */
import {execSync} from 'child_process'

export const runCommand = cmd => {
  let stderr, stdout
  try {
    const out = execSync(cmd, {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        NO_COLOR: 'TRUE',
      },
    })
    stdout = out.toString('utf-8')
  } catch (err) {
    stdout = err.stdout?.toString('utf-8') || ''
    stderr = err.stderr?.toString('utf-8') || ''
  }
  return {stderr, stdout}
}

export const stripCWD = str => str?.replace(process.cwd(), '.') ?? str
