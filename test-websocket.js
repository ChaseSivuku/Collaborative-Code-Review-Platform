const WebSocket = require('ws');

if (process.argv.length < 3) {
  console.log('Usage: node test-websocket.js <JWT_TOKEN>');
  console.log('Example: node test-websocket.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  process.exit(1);
}

const token = process.argv[2];
const ws = new WebSocket(`ws://localhost:3000?token=${token}`);

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server');
  console.log('📡 Waiting for notifications...\n');
});

ws.on('message', function message(data) {
  try {
    const notification = JSON.parse(data);
    console.log('📬 Received notification:');
    console.log('   Type:', notification.type);
    console.log('   Title:', notification.data?.title || 'N/A');
    console.log('   Message:', notification.data?.message || 'N/A');
    console.log('   Full data:', JSON.stringify(notification.data, null, 2));
    console.log('');
  } catch (error) {
    console.log('📬 Received message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('   Make sure the server is running on port 3000');
  }
});

ws.on('close', function close(code, reason) {
  console.log('🔌 Disconnected from WebSocket server');
  if (code === 1008) {
    console.log('   Reason: Invalid or expired token');
  }
});

process.on('SIGINT', () => {
  console.log('\n👋 Closing WebSocket connection...');
  ws.close();
  process.exit(0);
});

