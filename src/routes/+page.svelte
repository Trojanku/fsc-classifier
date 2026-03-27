<script lang="ts">
	interface PromptResult {
		fsc: string;
		description: string;
	}

	interface DistanceResult {
		fsc: string;
		description: string;
		similarity: number;
	}

	interface ApiData {
		message: string;
		received: {
			companyName: string;
			websiteUrl: string;
			emailDomain: string;
			fileCount: number;
			fileNames: string[];
		};
		warning?: string;
		result: {
			prompt: PromptResult[];
			distance: DistanceResult[];
		};
	}

	let companyName = $state('');
	let websiteUrl = $state('');
	let emailDomain = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let selectedFiles = $state<File[]>([]);

	let submitting = $state(false);
	let result = $state<{ success: boolean; data?: ApiData; error?: string } | null>(null);

	function onFilesChanged() {
		selectedFiles = fileInput?.files ? Array.from(fileInput.files) : [];
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		result = null;

		const formData = new FormData();
		formData.append('companyName', companyName);
		formData.append('websiteUrl', websiteUrl);
		formData.append('emailDomain', emailDomain);

		for (const file of selectedFiles) {
			formData.append('documents', file);
		}

		try {
			const response = await fetch('/api/classify', {
				method: 'POST',
				body: formData
			});

			const json = await response.json();

			if (!response.ok) {
				result = { success: false, error: json?.message ?? `Error ${response.status}` };
			} else {
				result = { success: true, data: json.data };

				// Reset form on success
				companyName = '';
				websiteUrl = '';
				emailDomain = '';
				selectedFiles = [];
				if (fileInput) fileInput.value = '';
			}
		} catch (err) {
			result = { success: false, error: 'Network error. Please try again.' };
		} finally {
			submitting = false;
		}
	}
</script>

<div class="h-screen bg-gray-50 flex flex-col overflow-hidden">
	<!-- Header -->
	<div class="border-b border-gray-200 bg-white px-6 py-4 shrink-0">
		<h1 class="text-2xl font-bold tracking-tight text-gray-900">Company Information</h1>
		<p class="mt-1 text-sm text-gray-600">
			Fill out the details below to submit your company information.
		</p>
	</div>

	<!-- Split layout -->
	<div class="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0 overflow-hidden">

		<!-- Left: Form -->
		<div class="overflow-y-auto border-r border-gray-200 p-6 lg:p-8">
			<form
				onsubmit={handleSubmit}
				class="max-w-lg space-y-6"
			>
				<!-- Company Name -->
				<div>
					<label for="companyName" class="block text-sm font-medium text-gray-700">
						Company Name
					</label>
					<input
						id="companyName"
						type="text"
						bind:value={companyName}
						required
						placeholder="Acme Corporation"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900
						       placeholder:text-gray-400 shadow-sm
						       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
						       transition-colors duration-150"
					/>
				</div>

				<!-- Website URL -->
				<div>
					<label for="websiteUrl" class="block text-sm font-medium text-gray-700">
						Website URL
					</label>
					<input
						id="websiteUrl"
						type="text"
						bind:value={websiteUrl}
						placeholder="https://example.com"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900
						       placeholder:text-gray-400 shadow-sm
						       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
						       transition-colors duration-150"
					/>
				</div>

				<!-- Email Domain -->
				<div>
					<label for="emailDomain" class="block text-sm font-medium text-gray-700">
						Email Domain
					</label>
					<input
						id="emailDomain"
						type="text"
						bind:value={emailDomain}
						placeholder="example.com"
						class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900
						       placeholder:text-gray-400 shadow-sm
						       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none
						       transition-colors duration-150"
					/>
				</div>

				<!-- File Upload -->
				<div>
					<label for="documents" class="block text-sm font-medium text-gray-700">
						Documents <span class="text-gray-400 font-normal">(optional)</span>
					</label>
					<div
						class="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300
						        px-6 py-8 transition-colors duration-150
						        hover:border-gray-400"
					>
						<div class="text-center">
							<svg
								class="mx-auto h-10 w-10 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
								/>
							</svg>
							<p class="mt-2 text-sm text-gray-600">
								<button
									type="button"
									class="font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
									onclick={() => fileInput?.click()}
								>
									Choose files
								</button>
								or drag and drop
							</p>
							<p class="mt-1 text-xs text-gray-500">PDF, DOC, DOCX, TXT, CSV up to 10MB</p>
							<input
								id="documents"
								type="file"
								multiple
								accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
								bind:this={fileInput}
								onchange={onFilesChanged}
								class="sr-only"
							/>
						</div>
					</div>
					{#if selectedFiles.length > 0}
						<ul class="mt-2 space-y-1">
							{#each selectedFiles as file}
								<li class="flex items-center gap-2 text-sm text-gray-600">
									<svg
										class="h-4 w-4 text-gray-400 shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									{file.name}
									<span class="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				<!-- Submit Button -->
				<div class="pt-2">
					<button
						type="submit"
						disabled={submitting}
						class="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm
						       hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
						       disabled:opacity-50 disabled:cursor-not-allowed
						       transition-colors duration-150 cursor-pointer"
					>
						{#if submitting}
							Submitting...
						{:else}
							Submit
						{/if}
					</button>
				</div>
			</form>
		</div>

		<!-- Right: Output -->
		<div class="overflow-y-auto bg-gray-50 p-6 lg:p-8">
			{#if submitting}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<svg class="mx-auto h-8 w-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						<p class="mt-3 text-sm text-gray-500">Processing request...</p>
					</div>
				</div>
			{:else if result}
			{#if result.success && result.data}
				<div class="space-y-6">
					<!-- Header -->
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-green-500 shrink-0"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
						<h2 class="text-lg font-semibold text-green-800">
							Classification complete for {result.data.received.companyName}
						</h2>
					</div>

					{#if result.data.warning}
						<div class="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-4">
							<p class="text-sm text-amber-800">{result.data.warning}</p>
						</div>
					{/if}

					<!-- Approach 1: LLM Prompt -->
					<div class="rounded-lg bg-white ring-1 ring-gray-900/5 shadow-sm p-5">
						<div class="mb-4">
							<div class="flex items-center gap-2 mb-1">
								<span class="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-700/10">
									Approach 1
								</span>
								<h3 class="text-sm font-semibold text-gray-900">LLM Prompt Classification</h3>
							</div>
							<p class="text-xs text-gray-500">
								An AI model reads the full text and reasons about which FSC codes apply.
								Best for nuanced, context-dependent matching.
							</p>
						</div>

						{#if result.data.result.prompt.length > 0}
							<div class="space-y-2">
								{#each result.data.result.prompt as item, i}
									<div class="flex items-start gap-3 rounded-md px-3 py-2 {i === 0 ? 'bg-purple-50' : 'bg-gray-50'}">
										<span class="inline-flex items-center justify-center rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800 shrink-0 font-mono">
											{item.fsc}
										</span>
										<span class="text-sm text-gray-700">{item.description}</span>
										{#if i === 0}
											<span class="ml-auto text-xs text-purple-600 font-medium shrink-0">Top match</span>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-400 italic">No matching codes found.</p>
						{/if}
					</div>

					<!-- Approach 2: Embedding Distance -->
					<div class="rounded-lg bg-white ring-1 ring-gray-900/5 shadow-sm p-5">
						<div class="mb-4">
							<div class="flex items-center gap-2 mb-1">
								<span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-700/10">
									Approach 2
								</span>
								<h3 class="text-sm font-semibold text-gray-900">Semantic Similarity</h3>
							</div>
							<p class="text-xs text-gray-500">
								Compares the meaning of the input text against each FSC description using vector embeddings.
								This is a surface-level comparison based on vocabulary and topic overlap -- it does not reason
								about context the way the LLM approach does. The similarity score (0-100%) indicates how
								close the text is to each category.
							</p>
						</div>

						{#if result.data.result.distance.length > 0}
							<div class="space-y-3">
								{#each result.data.result.distance as item, i}
									{@const pct = Math.round(item.similarity * 100)}
									<div class="rounded-md px-3 py-2 {i === 0 ? 'bg-blue-50' : 'bg-gray-50'}">
										<div class="flex items-center gap-3 mb-1.5">
											<span class="inline-flex items-center justify-center rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 shrink-0 font-mono">
												{item.fsc}
											</span>
											<span class="text-sm text-gray-700 flex-1">{item.description}</span>
											<span class="text-xs font-semibold tabular-nums shrink-0
												{pct >= 70 ? 'text-green-700' : pct >= 50 ? 'text-amber-600' : 'text-gray-500'}">
												{pct}%
											</span>
										</div>
										<div class="w-full bg-gray-200 rounded-full h-1.5">
											<div
												class="h-1.5 rounded-full transition-all duration-300
													{pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-400'}"
												style="width: {pct}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-400 italic">No codes above similarity threshold.</p>
						{/if}
					</div>

					<!-- Submitted info summary (collapsed) -->
					<details class="rounded-lg bg-white ring-1 ring-gray-900/5 shadow-sm">
						<summary class="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-50 rounded-lg">
							Submission details
						</summary>
						<div class="px-5 pb-4 pt-1 text-sm text-gray-600 space-y-1 border-t border-gray-100">
							<p><span class="font-medium text-gray-700">Company:</span> {result.data.received.companyName}</p>
							{#if result.data.received.websiteUrl}
								<p><span class="font-medium text-gray-700">Website:</span> {result.data.received.websiteUrl}</p>
							{/if}
							{#if result.data.received.emailDomain}
								<p><span class="font-medium text-gray-700">Email:</span> {result.data.received.emailDomain}</p>
							{/if}
							{#if result.data.received.fileCount > 0}
								<p><span class="font-medium text-gray-700">Files:</span> {result.data.received.fileNames.join(', ')}</p>
							{/if}
						</div>
					</details>
				</div>
				{:else}
					<div class="space-y-4">
						<div class="flex items-center gap-2">
							<svg
								class="h-5 w-5 text-red-500 shrink-0"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v4a1 1 0 002 0V5zm-1 8a1 1 0 100 2 1 1 0 000-2z"
									clip-rule="evenodd"
								/>
							</svg>
							<h2 class="text-lg font-semibold text-red-800">Request failed</h2>
						</div>
						<div class="rounded-lg bg-red-50 ring-1 ring-red-200 p-4">
							<p class="text-sm text-red-700">{result.error}</p>
						</div>
					</div>
				{/if}
			{:else}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<svg class="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
							/>
						</svg>
						<p class="mt-3 text-sm text-gray-400">Submit the form to see results here</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
