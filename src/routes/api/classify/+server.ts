import type { RequestHandler } from './$types';
import { apiResponse, apiError, parseBody } from '$lib/server/api';
import { processWebsite, readFiles } from '$lib/server/scrape'
import { classifySimplePrompt, classifyDistance } from '$lib/server/classify'
import { resolveWebsiteFromEmail } from '$lib/server/websiteFromEmail';

/**
 * POST /api/classify
 *
 * Create a new company entry with optional document upload.
 *
 * Body (multipart/form-data):
 *   companyName  - required, company name
 *   websiteUrl   - required, company website URL
 *   emailDomain  - required, email domain
 *   documents    - optional, file upload(s)
 */
export const POST: RequestHandler = async ({ request }) => {
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();

		// 1. Read form

		const companyName = formData.get('companyName') as string | null;
		let websiteUrl = formData.get('websiteUrl') as string | null;
		const emailDomain = formData.get('emailDomain') as string | null;
		const documents = formData.getAll('documents') as File[];

		if (!companyName?.trim()) {
			throw apiError(400, 'Missing required field: companyName');
		}

		// Filter out empty file entries (browsers send an empty File when no file is selected)
		const uploadedFiles = documents.filter((f) => f.size > 0);


		// 2. Processing path

		let processedTexts: Array<string> = [];


		// a. Extract url from email domain name - if web not given

		if (!websiteUrl?.trim() && emailDomain?.trim()) {
			console.log(`processing domain ${emailDomain}`)
			// If user provided email but no website, try to resolve it
			const resolved = await resolveWebsiteFromEmail(emailDomain);
			if (resolved) {
				websiteUrl = resolved;
			}
		}

		// b. Process page

		if (websiteUrl?.trim()) { 

			console.log(`processing page ${websiteUrl}`)

			let webResult = await processWebsite(websiteUrl)
			processedTexts.push(`Title: ${webResult.title}, Description: ${webResult.description}, Text: ${webResult.description} `)
		}

		// c. Process documents

		let filesResult = await readFiles(documents)

		const filesTextResult = filesResult.map((item, index) => {
			return `[File ${index} start] Name: ${item.name}: File Type: ${item.type}, File Content: ${item.text} [File ${index} end] `
		}).join(", ");

		processedTexts.push(filesTextResult)

		// 3. Classify

		const combinedText = processedTexts.join("\n");

		// a. Simple, single prompt classification
		const promptCodes = await classifySimplePrompt({ text: combinedText, model: "google/gemini-2.5-flash" });

		// b. Embedding-based distance classification
		const distanceCodes = await classifyDistance({ text: combinedText });

		return apiResponse(
			{
				message: 'POST /api/classify — form received successfully',
				received: {
					companyName: companyName.trim(),
					websiteUrl: websiteUrl?.trim() ?? "",
					emailDomain: emailDomain?.trim() ?? "",
					fileCount: uploadedFiles.length,
					fileNames: uploadedFiles.map((f) => f.name)
				},
				result: {
					prompt: promptCodes,
					distance: distanceCodes,
				}
			},
			201
		);
	}

	// Fallback: JSON body
	const body = await parseBody<{ name: string }>(request);

	if (!body?.name) {
		throw apiError(400, 'Missing required field: name');
	}

	// TODO: create the item
	// const created = await db.createItem(body);
	// return apiResponse(created, 201);

	return apiResponse(
		{ message: 'POST /api/classify — implement your logic here', received: body },
		201
	);
};
