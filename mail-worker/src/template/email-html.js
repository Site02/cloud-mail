function escapeAttribute(value) {
	return String(value).replace(/[&<>"']/g, char => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[char]);
}

export default function emailHtmlTemplate(html, origin) {
	const content = `<!doctype html><meta charset="utf-8">`
		+ `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${origin} data: blob:; style-src 'unsafe-inline'">`
		+ `<meta name="referrer" content="no-referrer"><base target="_blank">`
		+ `<style>body{margin:0;padding:14px;background:#fff;color:#13181d;font:14px/1.5 sans-serif;word-break:break-word}`
		+ `img{max-width:100%;height:auto}table{max-width:100%}</style>${html}`;
	return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>`
		+ `<body style="margin:0"><iframe sandbox="allow-popups allow-popups-to-escape-sandbox" referrerpolicy="no-referrer"`
		+ ` style="display:block;width:100%;min-height:100vh;border:0" srcdoc="${escapeAttribute(content)}"></iframe></body></html>`;
}
