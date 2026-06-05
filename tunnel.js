const ngrok = require('ngrok');

const PORT = process.argv[2] || 3000;

(async () => {
  try {
    const url = await ngrok.connect({
      addr: PORT,
      onStatusChange: (status) => console.log(`ngrok status: ${status}`),
      onLogEvent: (log) => console.log(log),
    });
    console.log(`\n  🔗 HTTPS tunnel: ${url}`);
    console.log(`  📡 Forwarding to: http://localhost:${PORT}\n`);
  } catch (err) {
    if (err.message?.includes('authtoken')) {
      console.error('\n  ❌ ngrok requires an authtoken.');
      console.error('  📝 Sign up: https://dashboard.ngrok.com/signup');
      console.error('  🔑 Get token: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.error('  ⚙️  Run: ngrok config add-authtoken YOUR_TOKEN\n');
    } else {
      console.error('ngrok error:', err);
    }
    process.exit(1);
  }
})();
