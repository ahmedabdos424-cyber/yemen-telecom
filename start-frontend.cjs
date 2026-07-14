const { spawn } = require('child_process');
const fs = require('fs');
const out = fs.openSync('C:\\Users\\Ahmed\\Desktop\\yemen-telecom\\frontend.log', 'w');
const s = spawn('C:\\Program Files\\nodejs\\node.exe', ['node_modules/vite/bin/vite.js', '--port=3000', '--host=0.0.0.0'], { cwd: 'C:\\Users\\Ahmed\\Desktop\\yemen-telecom', detached: true, stdio: ['ignore', out, out] });
s.unref();
console.log('PID:', s.pid);
