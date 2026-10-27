import type { APIRoute } from 'astro';

// 站点只有静态页面，直接枚举；404 不收录
const pages = ['/', '/about/'];

export const GET: APIRoute = ({ site }) => {
	const base = site ?? new URL('https://laity.work');
	const urls = pages.map((path) => `	<url><loc>${new URL(path, base).href}</loc></url>`);
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

	return new Response(xml, {
		headers: { 'content-type': 'application/xml; charset=utf-8' },
	});
};
