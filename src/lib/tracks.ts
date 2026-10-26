import http from 'node:http';
import https from 'node:https';

export type Track = { title: string; url: string; date: string };

export type FeedResponse = { status: number; body: string };

const FEED_TIMEOUT_MS = 6000;

// 刻意不用全局 fetch：undici 池化的 TLS 套接字在 astro build 退出时仍挂着，Windows 下会触发 libuv 断言导致非零退出
function getFeed(url: string, redirectsLeft = 3): Promise<FeedResponse> {
	return new Promise((resolve, reject) => {
		const target = new URL(url);
		const client = target.protocol === 'http:' ? http : https;
		const req = client.get(
			target,
			{ timeout: FEED_TIMEOUT_MS, agent: new client.Agent({ keepAlive: false }) },
			(res) => {
				const status = res.statusCode ?? 0;
				const location = res.headers.location;
				if (status >= 300 && status < 400 && location && redirectsLeft > 0) {
					res.resume();
					getFeed(new URL(location, target).href, redirectsLeft - 1).then(resolve, reject);
					return;
				}
				const chunks: Buffer[] = [];
				res.on('data', (chunk: Buffer) => chunks.push(chunk));
				res.on('end', () =>
					resolve({
						status,
						body: Buffer.concat(chunks).toString('utf8'),
					})
				);
				res.on('error', reject);
			}
		);
		req.on('timeout', () => req.destroy(new Error('feed timeout')));
		req.on('error', reject);
	});
}

const tagText = (block: string, tag: string) => {
	const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
	if (!m) return '';
	return m[1]
		.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&amp;/g, '&')
		.trim();
};

// 与前后志站的展示口径一致：按 Asia/Shanghai 取日。UTC 截取会把带 +08:00 的时间戳串到前一天
const feedDate = (date: Date) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);

// 拉取失败/超时/拿回的是站点 catch-all 的 HTML 壳时返回空数组，由页面降级成占位文案
export async function fetchLatestTracks(feedUrl: string, limit: number): Promise<Track[]> {
	try {
		const res = await getFeed(feedUrl);
		if (res.status !== 200) return [];
		// catch-all 宿主会用 200 返回 HTML 壳，所以判据取正文形状，不依赖宿主给 .xml 配的 content-type
		if (/^\s*(<!DOCTYPE\s+html|<html[\s>])/i.test(res.body)) return [];
		const items = res.body.match(/<item[\s\S]*?<\/item>/gi);
		if (!items) return [];
		return items
			.map((item) => {
				const link = tagText(item, 'link');
				const pubDate = new Date(tagText(item, 'pubDate'));
				return {
					title: tagText(item, 'title'),
					url: /^https?:\/\//i.test(link) ? link : '',
					date: Number.isNaN(pubDate.getTime()) ? '' : feedDate(pubDate),
				};
			})
			.filter((track) => track.title && track.url)
			.slice(0, limit);
	} catch {
		return [];
	}
}
