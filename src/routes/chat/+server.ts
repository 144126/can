import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const url = 'https://bedrock-mantle.us-west-2.api.aws/openai/v1/chat/completions';

export const POST: RequestHandler = async ({ request, platform }) => {
	const key = platform?.env.AMAZON_BEDROCK_MANTLE_API_KEY ?? env.AMAZON_BEDROCK_MANTLE_API_KEY;
	if (!key) error(500, 'missing key');
	const { m } = (await request.json()) as { m: unknown };
	const r = await fetch(url, {
		method: 'POST',
		headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
		body: JSON.stringify({
			model: 'xai.grok-4.6',
			stream: true,
			reasoning_effort: 'low',
			messages: m
		})
	});
	return new Response(r.body, {
		status: r.status,
		headers: { 'content-type': r.ok ? 'text/event-stream' : 'text/plain' }
	});
};
