
/**
 * Given an email domain (e.g. "acme.com" or "user@acme.com"),
 * attempt to resolve a working company website URL.
 */
export async function resolveWebsiteFromEmail(emailDomain: string): Promise<string | null> {
    // Extract domain from full email if needed
    const domain = emailDomain.includes("@")
        ? emailDomain.split("@").pop()!.trim()
        : emailDomain.trim();
    if (!domain || !domain.includes(".")) return null;
    // Try HTTPS first, fall back to HTTP
    const candidates = [
        `https://${domain}`,
        `https://www.${domain}`,
        `http://${domain}`,
    ];
    for (const url of candidates) {
        try {
            const resp = await fetch(url, {
                method: "HEAD",
                headers: { "User-Agent": "Mozilla/5.0 (compatible; CompanyProfiler/1.0)" },
                redirect: "follow",
                signal: AbortSignal.timeout(5000),
            });
            if (resp.ok) {

                console.log(`chosen url from domain: ${resp.url}`)

                // Return the final URL after redirects
                return resp.url;
            }
        } catch {
            // Timeout, DNS failure, connection refused — try next candidate
            continue;
        }
    }
    return null;
}