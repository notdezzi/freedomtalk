/**
 * Main Application Entry Point
 * FreedomTalk Backend - Discord Clone
 */

export default function handler(req: Request) {
  return new Response('FreedomTalk API - Coming Soon', {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export const config = {
  runtime: 'nodejs',
};
