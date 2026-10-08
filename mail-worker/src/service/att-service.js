import orm from '../entity/orm';
import { att } from '../entity/att';
import { and, eq, isNull, inArray, desc } from 'drizzle-orm';
import r2Service from './r2-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { attConst } from '../const/entity-const';
import { parseHTML } from 'linkedom';
import { v4 as uuidv4 } from 'uuid';
import domainUtils from '../utils/domain-uitls';
import settingService from "./setting-service";
import BizError from "../error/biz-error";
import {t} from "../i18n/i18n.js";

const attService = {

	newKey(filename) {
		const extension = fileUtils.getExtFileName(filename);
		const safeExtension = /^\.[a-zA-Z0-9]{1,12}$/.test(extension) ? extension.toLowerCase() : '';
		return constant.ATTACHMENT_PREFIX + uuidv4().replaceAll('-', '') + safeExtension;
	},

	async addAtt(c, attachments) {

		for (let attachment of attachments) {

			let metadate = {
				contentType: attachment.mimeType,
			}

			if (!attachment.contentId) {
				metadate.contentDisposition = `attachment;filename=${attachment.filename}`
			} else {
				metadate.contentDisposition = `inline;filename=${attachment.filename}`
				metadate.cacheControl = `max-age=259200`
			}

			await r2Service.putObj(c, attachment.key, attachment.content, metadate);

		}

		await orm(c).insert(att).values(attachments).run();
	},

	list(c, params, userId) {
		const { emailId } = params;

		return orm(c).select().from(att).where(
			and(
				eq(att.emailId, emailId),
				eq(att.userId, userId),
				eq(att.type, attConst.type.ATT),
				isNull(att.contentId)
			)
		).all();
	},

	async toImageUrlHtml(c, content, userId) {

		const { r2Domain } = await settingService.query(c);
		const storageOrigin = domainUtils.toOssDomain(r2Domain);

		const { document } = parseHTML(content);

		const images = Array.from(document.querySelectorAll('img'));

		let imageDataList = [];

		for (const img of images) {

			//邮件正文base64图片转cid附件
			const src = img.getAttribute('src');
			if (src && src.startsWith('data:image')) {
				const file = fileUtils.base64ToFile(src);
				const buff = await file.arrayBuffer();
				const cid = uuidv4().replace(/-/g, '');
				const key = this.newKey(file.name);

				img.setAttribute('src', 'cid:' + cid);

				const attData = {};
				attData.key = key;
				attData.filename = file.name;
				attData.mimeType = file.type;
				attData.size = file.size;
				attData.buff = buff;
				attData.content = fileUtils.base64ToDataStr(src);
				attData.contentId = cid;

				imageDataList.push(attData);
			}

			//邮件正文站内图片转cid附件
			if (src && ((storageOrigin && src.startsWith(storageOrigin + '/attachments/')) || src.startsWith('attachments/'))) {

				const cid = uuidv4().replace(/-/g, '')
				img.setAttribute('src', 'cid:' + cid);

				const attData = {};

				if (storageOrigin && src.startsWith(storageOrigin + '/attachments/')) {
					attData.key = src.replace(domainUtils.toOssDomain(r2Domain) + '/','');
				}

				if (src.startsWith('attachments/')) {
					attData.key = src;
				}

				attData.contentId = cid;
				attData.type = attConst.type.EMBED;
				imageDataList.push(attData);

			}

			const hasInlineWidth = img.hasAttribute('width');
			const style = img.getAttribute('style') || '';
			const hasStyleWidth = /(^|\s)width\s*:\s*[^;]+/.test(style);

			if (!hasInlineWidth && !hasStyleWidth) {
				const newStyle = (style ? style.trim().replace(/;$/, '') + '; ' : '') + 'max-width: 100%;';
				img.setAttribute('style', newStyle);
			}
		}

		//查询已有内嵌url图片信息
		const keys = [...new Set(imageDataList.filter(item => !item.content).map(item => item.key))];
		const dbImageList  = await this.selectOneByKeys(c, keys, userId);

		//设置给当前附件
		await Promise.all(imageDataList.map(async image => {
			if (image.content) {
				return;
			}

			const dbImage = dbImageList.find(dbImage => image.key === dbImage.key);
			if (!dbImage) throw new BizError(t(c, 'attachmentNotFound'), 404);

			image.size = dbImage.size;
			image.filename = dbImage.filename;
			image.mimeType = dbImage.mimeType;
			image.contentType = dbImage.mimeType;

			const obj = await r2Service.getObj(c, image.key);
			if (!obj) throw new BizError(t(c, 'attachmentNotFound'), 404);

			image.content = obj instanceof ArrayBuffer ? obj : await obj.arrayBuffer();
			image.buff = image.content;
			image.key = this.newKey(image.filename);
		}))

		imageDataList = imageDataList.filter(image => image.content);

		return { imageDataList, html: document.toString() };
	},

	async saveSendAtt(c, attList, userId, accountId, emailId) {

		const attDataList = [];

		for (let att of attList) {
			att.buff = fileUtils.base64ToUint8Array(att.content);
			att.key = this.newKey(att.filename);
			const attData = { userId, accountId, emailId };
			attData.key = att.key;
			attData.size = att.buff.length;
			attData.filename = att.filename;
			attData.mimeType = att.type;
			attData.type = attConst.type.ATT;
			attDataList.push(attData);
		}

		await orm(c).insert(att).values(attDataList).run();

		for (let att of attList) {
			await r2Service.putObj(c, att.key, att.buff, {
				contentType: att.type,
				contentDisposition: `attachment;filename=${att.filename}`
			});
		}

	},

	async saveArticleAtt(c, attDataList, userId, accountId, emailId) {

		for (let attData of attDataList) {
			attData.userId = userId;
			attData.emailId = emailId;
			attData.accountId = accountId;
			attData.type = attConst.type.EMBED;
			if (!attData.buff) {
				continue;
			}
			await r2Service.putObj(c, attData.key, attData.buff, {
				contentType: attData.mimeType,
				cacheControl: `max-age=259200`,
				contentDisposition: `inline;filename=${attData.filename}`
			});
			delete attData.buff;
		}

		await orm(c).insert(att).values(attDataList).run();

	},

	async removeByUserIds(c, userIds) {
		await this.removeAttByField(c, 'user_id', userIds);
	},

	async removeByEmailIds(c, emailIds) {
		await this.removeAttByField(c, 'email_id', emailIds);
	},

	selectByEmailIds(c, emailIds) {
		return orm(c).select().from(att).where(
			and(
				inArray(att.emailId, emailIds),
				eq(att.type, attConst.type.ATT)
			))
			.all();
	},

	selectAllByEmailId(c, emailId) {
		return orm(c).select().from(att).where(eq(att.emailId, emailId)).all();
	},

	async copyForDelivery(c, sourceRows) {
		const keyMap = new Map();
		const copies = [];
		for (const row of sourceRows) {
			if (!keyMap.has(row.key)) {
				const object = await r2Service.getObj(c, row.key);
				if (!object) throw new Error('Attachment source object is unavailable');
				const content = object instanceof ArrayBuffer ? object : await object.arrayBuffer();
				const key = this.newKey(row.filename || 'attachment');
				await r2Service.putObj(c, key, content, {
					contentType: row.mimeType,
					contentDisposition: `${row.type === attConst.type.EMBED ? 'inline' : 'attachment'};filename=${row.filename || 'attachment'}`,
					...(row.type === attConst.type.EMBED ? {cacheControl: 'max-age=259200'} : {})
				});
				keyMap.set(row.key, key);
			}
			copies.push({...row, key: keyMap.get(row.key), attId: null});
		}
		return {copies, keyMap};
	},

	async removeAttByField(c, fieldName, fieldValues) {
		if (!['user_id', 'email_id', 'account_id'].includes(fieldName)) {
			throw new Error('Unsupported attachment deletion field');
		}

		const values = [...new Set(fieldValues.map(Number))];
		if (values.some(value => !Number.isSafeInteger(value) || value <= 0)) {
			throw new Error('Invalid attachment deletion ID');
		}
		if (values.length === 0) return;

		const selectedIds = [];
		const selectedKeyCounts = new Map();
		const SELECT_PAGE_SIZE = 500;
		for (const value of values) {
			let afterId = 0;
			while (true) {
				const { results } = await c.env.db.prepare(
					`SELECT att_id AS attId, key FROM attachments WHERE ${fieldName} = ? AND att_id > ? ORDER BY att_id LIMIT ?`
				).bind(value, afterId, SELECT_PAGE_SIZE).all();
				if (!results.length) break;
				for (const row of results) {
					selectedIds.push(row.attId);
					selectedKeyCounts.set(row.key, (selectedKeyCounts.get(row.key) || 0) + 1);
				}
				afterId = results[results.length - 1].attId;
				if (results.length < SELECT_PAGE_SIZE) break;
			}
		}
		if (!selectedIds.length) return;

		const keysToDelete = [];
		const keys = [...selectedKeyCounts.keys()];
		const SQL_CHUNK_SIZE = 100;
		for (let i = 0; i < keys.length; i += SQL_CHUNK_SIZE) {
			const keyChunk = keys.slice(i, i + SQL_CHUNK_SIZE);
			const placeholders = keyChunk.map(() => '?').join(', ');
			const { results } = await c.env.db.prepare(
				`SELECT key, COUNT(*) AS refCount FROM attachments WHERE key IN (${placeholders}) GROUP BY key`
			).bind(...keyChunk).all();
			for (const row of results) {
				if (Number(row.refCount) === selectedKeyCounts.get(row.key)) {
					keysToDelete.push(row.key);
				}
			}
		}

		try {
			await this.batchDelete(c, keysToDelete);
		} catch (error) {
			console.error('Attachment object deletion failed', {
				field: fieldName,
				metadataRows: selectedIds.length,
				objects: keysToDelete.length,
				error
			});
			throw error;
		}

		const statements = [];
		for (let i = 0; i < selectedIds.length; i += SQL_CHUNK_SIZE) {
			const idChunk = selectedIds.slice(i, i + SQL_CHUNK_SIZE);
			const placeholders = idChunk.map(() => '?').join(', ');
			statements.push(c.env.db.prepare(`DELETE FROM attachments WHERE att_id IN (${placeholders})`).bind(...idChunk));
		}
		try {
			for (let i = 0; i < statements.length; i += 50) {
				const results = await c.env.db.batch(statements.slice(i, i + 50));
				if (results.some(result => result.success === false)) {
					throw new Error('Attachment metadata deletion failed');
				}
			}
		} catch (error) {
			console.error('Attachment metadata deletion failed', {
				field: fieldName,
				metadataRows: selectedIds.length,
				objects: keysToDelete.length,
				error
			});
			throw error;
		}
	},

	async batchDelete(c, keys) {
		if (!keys.length) return;

		const BATCH_SIZE = 100;

		for (let i = 0; i < keys.length; i += BATCH_SIZE) {
			const batch = keys.slice(i, i + BATCH_SIZE);
			await r2Service.delete(c, batch);
		}

	},

	async removeByAccountId(c, accountId) {
		await this.removeAttByField(c, "account_id", [accountId])
	},

	async selectOneByKeys(c, keys, userId) {
		if (!keys?.length || !Number.isSafeInteger(userId) || userId <= 0) return [];
		const {results} = await c.env.db.prepare(
			`SELECT a.key, a.filename, a.mime_type AS mimeType, a.size FROM attachments a
			 JOIN email e ON e.email_id = a.email_id
			 WHERE a.key IN (${keys.map(() => '?').join(',')}) AND a.type = 1
			 AND e.user_id = ? AND e.is_del = 0 ORDER BY a.att_id DESC`
		).bind(...keys, userId).all();
		return results;
	}
};

export default attService;
