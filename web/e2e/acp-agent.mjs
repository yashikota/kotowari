import { createInterface } from 'node:readline';

const send = (message) =>
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);
let waiting;
createInterface({ input: process.stdin }).on('line', (line) => {
  const m = JSON.parse(line);
  if (m.id === 'permission' && !m.method) {
    send({
      method: 'session/update',
      params: {
        sessionId: 'browser-session',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: 'The ADR comparison is ready.' },
        },
      },
    });
    send({ id: waiting, result: { stopReason: 'end_turn' } });
    return;
  }
  switch (m.method) {
    case 'initialize':
      send({ id: m.id, result: { protocolVersion: 1, agentCapabilities: { loadSession: true } } });
      break;
    case 'session/new':
      send({ id: m.id, result: { sessionId: 'browser-session' } });
      break;
    case 'session/load':
      send({ id: m.id, result: {} });
      break;
    case 'session/prompt':
      waiting = m.id;
      if (m.params.prompt[0].text.includes('Wait forever')) break;
      send({
        id: 'permission',
        method: 'session/request_permission',
        params: {
          sessionId: 'browser-session',
          toolCall: { title: 'Compare the document' },
          options: [
            { optionId: 'yes', name: 'Allow once', kind: 'allow_once' },
            { optionId: 'no', name: 'Reject', kind: 'reject_once' },
          ],
        },
      });
      break;
    case 'session/cancel':
      send({ id: waiting, result: { stopReason: 'cancelled' } });
      break;
    default:
      send({ id: m.id, error: { code: -32601, message: 'Unknown method' } });
  }
});
