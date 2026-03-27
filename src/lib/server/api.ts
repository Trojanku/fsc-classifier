import { json, error } from '@sveltejs/kit';

/**
 * Standard API success response.
 *
 * Usage:
 *   return apiResponse(data);
 *   return apiResponse(data, 201);
 */
export function apiResponse<T>(data: T, status = 200) {
	return json({ success: true, data }, { status });
}

/**
 * Standard API error response.
 * Throws a SvelteKit `error` that is automatically serialised as JSON.
 *
 * Usage:
 *   throw apiError(404, 'Resource not found');
 */
export function apiError(status: number, message: string): never {
	error(status, { message });
}

/**
 * Safely parse the JSON body from a Request.
 * Returns `null` if the body is missing or malformed.
 */
export async function parseBody<T = unknown>(request: Request): Promise<T | null> {
	try {
		return (await request.json()) as T;
	} catch {
		return null;
	}
}
