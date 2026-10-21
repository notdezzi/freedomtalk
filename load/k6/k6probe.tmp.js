import http from 'k6/http';
import { withSio } from './lib/sio.client.js';
import { SioSocket } from './lib/sio.client.js';

export const options = { vus: 1, iterations: 1 };
const TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzNjYyMzk1MDE5NjM0OTc0NzIiLCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiMzY2MjQzMjA1ODYxMDg1MTg0IiwiaWF0IjoxNzkxMzg2Mzg0LCJleHAiOjE3OTEzOTM1ODR9.Wdvz7b0n2DLjjzjr1tzpl0OsKB7NLnfZ-NACjJ6P3wMl_1xdNw3wRjNwMneMAFb58TrY3BZzwafAx6tgnHIsBeS1vTveSuVqO7yYAdYy4YNOb019X0ufX-APRGjf_QjbP3pt2sqaJ5oNXJtEMOGTZ7jcIOnG1eHV3TUaYJfuLvXjhgS_WdU-ULdsdNsT1vtdPyYUZXWS_TtHjR-UdKmCnXz2hW0P2BmdaUdIE5dSs09Zz0eZdzjwvIY_rzjgTMp0V5gjCOHG4euTl-1Th6gIOjPxrW4VEIdLBbsyDl5Sew6PQj5cClgMrg1XhM4Ae69-djdwagRK9pZYlfmOmwb6Tw';
const CHANNEL = '366239503314063362';

export default function () {
  const state = withSio({ baseUrl: 'http://localhost:3001', token: TOKEN, origin: 'http://localhost:3000' }, async (client) => {
    client._k6.on('message', (m) => console.log('FRAME<', String(m).slice(0, 80)));
    const origSend = client._send.bind(client);
    client._send = (f) => { console.log('FRAME>', String(f).slice(0, 80)); origSend(f); };
    console.log('handler start');
    await client.ready(8000);
    console.log('READY resolved');
    client.emit('room:join', { roomType: 'channel', roomId: CHANNEL });
    const r = await client.waitFor('room:joined', 5000);
    console.log('ROOM JOINED:', JSON.stringify(r).slice(0, 80));
  });
  console.log('withSio returned; error:', state.error ? String(state.error).slice(0, 100) : 'none');
}
