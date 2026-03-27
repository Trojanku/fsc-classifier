
import { PDFParse } from "pdf-parse";

interface ScrapeResult {
    title: string;
    description: string;
    text: string;
}

export async function processWebsite(url: string): Promise<ScrapeResult> {
    const resp = await fetch(url, {
        headers: {
            "User-Agent":
                "Mozilla/5.0 (compatible; CompanyProfiler/1.0)",
            Accept: "text/html",
        },
        redirect: "follow",
    });
    if (!resp.ok) {
        throw new Error(`Failed to fetch ${url}: ${resp.status}`);
    }
    const html = await resp.text();
    // Extract <title>
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
    // Extract meta description
    const description =
        html.match(
            /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i
        )?.[1]?.trim() ??
        html.match(
            /<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i
        )?.[1]?.trim() ??
        "";
    // Strip noise: scripts, styles, svg, nav, footer, header, forms
    let clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
        .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
        .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
        .replace(/<header[\s\S]*?<\/header>/gi, " ")
        .replace(/<form[\s\S]*?<\/form>/gi, " ")
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ");
    // Strip all remaining HTML tags
    clean = clean.replace(/<[^>]+>/g, " ");
    // Decode common HTML entities
    clean = clean
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/ /g, " ");
    // Collapse whitespace, trim blank lines
    const text = clean
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").trim())
        .filter((l) => l.length > 0)
        .join("\n");
    return { title, description, text };
}

interface FileContent {
    name: string;
    type: string;
    text: string;
}

export async function readFiles(files: File[]): Promise<FileContent[]> {
    const results: FileContent[] = [];
    for (const file of files) {
        const type = file.type || inferType(file.name);
        let text = "";
        if (type === "application/pdf") {
            const buffer = await file.arrayBuffer();
            const parser = new PDFParse({ data: new Uint8Array(buffer) });
            const parsed = await parser.getText();
            text = parsed.text
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l.length > 0)
                .join("\n");
            await parser.destroy();
        } else if (type.startsWith("image/")) {
            text = `[Image file: ${file.name}, ${file.size} bytes - requires OCR]`;
        } else {
            text = await file.text();
            if (type === "text/html" || file.name.endsWith(".html")) {
                text = stripHtml(text);
            }
            if (type === "text/csv" || file.name.endsWith(".csv")) {
                text = formatCsv(text);
            }
        }
        results.push({ name: file.name, type, text });
    }
    return results;
}

function stripHtml(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/ /g, " ")
        .split("\n")
        .map((l) => l.replace(/\s+/g, " ").trim())
        .filter((l) => l.length > 0)
        .join("\n");
}

function formatCsv(csv: string): string {
    const lines = csv.trim().split("\n");
    if (lines.length === 0) return "";
    return lines.slice(0, 101).join("\n");
}

function inferType(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
        txt: "text/plain",
        csv: "text/csv",
        json: "application/json",
        xml: "application/xml",
        html: "text/html",
        htm: "text/html",
        md: "text/markdown",
        pdf: "application/pdf",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        svg: "image/svg+xml",
    };
    return map[ext] ?? "text/plain";
}