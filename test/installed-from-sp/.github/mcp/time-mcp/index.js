#!/usr/bin/env node
/**
 * Time MCP Server - Model Context Protocol stdio runner
 */

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

function sendResponse(id, result, error = null) {
    const res = { jsonrpc: '2.0', id };
    if (error) res.error = error;
    else res.result = result;
    process.stdout.write(JSON.stringify(res) + '\n');
}

rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
        const msg = JSON.parse(line);

        if (msg.method === 'initialize') {
            sendResponse(msg.id, {
                protocolVersion: '2024-11-05',
                capabilities: { tools: {} },
                serverInfo: { name: 'time-mcp', version: '1.0.0' }
            });
        } else if (msg.method === 'notifications/initialized') {
            // No response required for notification
        } else if (msg.method === 'tools/list') {
            sendResponse(msg.id, {
                tools: [
                    {
                        name: 'get_current_time',
                        description: 'Get current time in a specific timezone',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timezone: {
                                    type: 'string',
                                    description: 'IANA timezone name (e.g., UTC, America/New_York, Asia/Kolkata)'
                                }
                            },
                            required: ['timezone']
                        }
                    },
                    {
                        name: 'convert_time',
                        description: 'Convert time between timezones',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                source_timezone: { type: 'string' },
                                time: { type: 'string', description: 'HH:MM format' },
                                target_timezone: { type: 'string' }
                            },
                            required: ['source_timezone', 'time', 'target_timezone']
                        }
                    }
                ]
            });
        } else if (msg.method === 'tools/call') {
            const toolName = msg.params?.name;
            const args = msg.params?.arguments || {};

            if (toolName === 'get_current_time') {
                const tz = args.timezone || 'UTC';
                try {
                    const now = new Date();
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: tz,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                        weekday: 'long'
                    });
                    sendResponse(msg.id, {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    timezone: tz,
                                    datetime: now.toISOString(),
                                    formatted: formatter.format(now),
                                    status: 'ok'
                                }, null, 2)
                            }
                        ]
                    });
                } catch (err) {
                    sendResponse(msg.id, null, { code: -32602, message: `Invalid timezone: ${tz}` });
                }
            } else if (toolName === 'convert_time') {
                sendResponse(msg.id, {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                source_timezone: args.source_timezone,
                                time: args.time,
                                target_timezone: args.target_timezone,
                                result: 'converted'
                            }, null, 2)
                        }
                    ]
                });
            } else {
                sendResponse(msg.id, null, { code: -32601, message: `Tool '${toolName}' not found.` });
            }
        }
    } catch (e) {
        // ignore unparseable
    }
});
