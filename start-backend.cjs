const { spawn } = require('child_process');
const fs = require('fs');
const out = fs.openSync('C:\\Users\\Ahmed\\Desktop\\yemen-telecom\\backend7.log', 'w');
const s = spawn('C:\\Program Files\\nodejs\\node.exe', ['node_modules/tsx/dist/cli.mjs', 'server/src/index.ts'], { cwd: 'C:\\Users\\Ahmed\\Desktop\\yemen-telecom', detached: true, stdio: ['ignore', out, out] });
s.unref();
console.log('Backend PID:', s.pid);
