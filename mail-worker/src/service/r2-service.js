import s3Service from './s3-service';
import settingService from './setting-service';
import kvObjService from './kv-obj-service';

const r2Service = {

	async storageType(c) {

		const setting = await settingService.query(c);
		const { bucket, endpoint, s3AccessKey, s3SecretKey } = setting;

		if (!!(bucket && endpoint && s3AccessKey && s3SecretKey)) {
			return 'S3';
		}

		if (c.env.r2) {
			return 'R2';
		}

		return 'KV';
	},

	async putObj(c, key, content, metadata) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.putObj(c, key, content, metadata);
		}

		if (storageType === 'R2') {
			await c.env.r2.put(key, content, {
				httpMetadata: { ...metadata }
			});
		}

		if (storageType === 'S3') {
			await s3Service.putObj(c, key, content, metadata);
		}

	},

	async getObj(c, key) {
		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			return await kvObjService.getObj(c, key);
		}

		if (storageType === 'R2') {
			return await c.env.r2.get(key);
		}

		if (storageType === 'S3') {
			return await s3Service.getObj(c, key);
		}
	},

	async delete(c, key) {

		const storageType = await this.storageType(c);

		if (storageType === 'KV') {
			await kvObjService.deleteObj(c, key);
		}

		if (storageType === 'R2') {
			await c.env.r2.delete(key);
		}

		if (storageType === 'S3'){
			await s3Service.deleteObj(c, key);
		}

	},

	async toObjResp(c, key) {
		let obj;
		try { obj = await this.getObj(c, key); }
		catch (error) {
			if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) obj = null;
			else throw error;
		}
		if (!obj) return new Response('Not found', { status: 404 });
		const headers = obj instanceof Response ? new Headers(obj.headers) : new Headers();
		if (!(obj instanceof Response)) obj.writeHttpMetadata?.(headers);
		headers.set('X-Content-Type-Options', 'nosniff');
		if (key.startsWith('attachments/')) {
			headers.set('Cache-Control', 'private, no-store');
			headers.set('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'");
			const type = headers.get('Content-Type') || 'application/octet-stream';
			if (!/^image\/(png|jpeg|gif|webp|bmp)(;|$)/i.test(type)) {
				const disposition = headers.get('Content-Disposition');
				headers.set('Content-Disposition', disposition?.replace(/^inline/i, 'attachment') || 'attachment');
			}
		}
		return new Response(obj.body, { status: obj instanceof Response ? obj.status : 200, headers });
	}

};
export default r2Service;
