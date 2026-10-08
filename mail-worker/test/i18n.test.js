import test from 'node:test';
import assert from 'node:assert/strict';

import translator, {requestLanguage, t} from '../src/i18n/i18n.js';
import emailTextTemplate from '../src/template/email-text.js';
import en from '../src/i18n/en.js';
import expanded from '../src/i18n/expanded.js';
import {languages} from '../../mail-vue/src/i18n/languages.js';

const context = value => ({req: {header: () => value}});

test('request language honors quality, whitespace, and unavailable choices', () => {
	assert.equal(requestLanguage(context('fr-FR,fr;q=0.9,en;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('fr; q=0.9, en; q=0.8')), 'fr');
	assert.equal(requestLanguage(context('de;q=0,ja;q=0.8')), 'ja');
	assert.equal(requestLanguage(context('es;q=0.8,fr;q=0.8')), 'es');
	assert.equal(requestLanguage(context('es;q=2,fr;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('nl-NL,fr-CA;q=0.9')), 'fr');
	assert.equal(requestLanguage(context('nl-NL')), 'en');
	assert.equal(requestLanguage(context('')), 'en');
	for (const {code} of languages) assert.equal(requestLanguage(context(code)), code);
});

test('script and regional variants select the corresponding available dictionary', () => {
	assert.equal(requestLanguage(context('zh-Hant')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-TW,zh;q=0.9,en;q=0.8')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-TW,zh-Hans-CN;q=0.9')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-HK')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-MO')), 'zh-Hant');
	assert.equal(requestLanguage(context('zh-SG')), 'zh');
	assert.equal(requestLanguage(context('zh-Hans')), 'zh');
	assert.equal(requestLanguage(context('zh-Latn,fr;q=0.8')), 'fr');
	assert.equal(requestLanguage(context('ar-Latn,hi-Latn;q=0.9')), 'en');
	assert.equal(requestLanguage(context('ar-EG')), 'ar');
	assert.equal(requestLanguage(context('pt-PT,pt;q=0.9,en;q=0.8')), 'pt');
	assert.equal(requestLanguage(context('pt-PT,pt-BR;q=0.9')), 'pt');
	assert.equal(requestLanguage(context('pt-BR')), 'pt');
});

test('additional server dictionaries contain only reviewed languages and preserve interpolation', () => {
	assert.deepEqual(Object.keys(expanded), ['zh-Hant']);
	const reference = Object.keys(en).sort();
	const placeholders = value => [...value.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
	for (const [language, messages] of Object.entries(expanded)) {
		assert.deepEqual(Object.keys(messages).sort(), reference, language);
		assert.deepEqual(Object.keys(messages.perms).sort(), Object.keys(en.perms).sort(), language + ':perms');
		for (const [key, source] of Object.entries(en)) {
			if (typeof source === 'string') {
				assert.ok(messages[key].trim(), language + ':' + key);
				assert.deepEqual(placeholders(messages[key]), placeholders(source), language + ':' + key);
			}
		}
		assert.equal(requestLanguage(context(language)), language);
		assert.equal(t(context(language), 'IncorrectPwd'), messages.IncorrectPwd);
		assert.match(t(context(language), 'minEmailPrefix', {msg: 6}), /6/);
		assert.match(messages.bannedSend, /權限/);
		assert.match(messages.isDelUser, /註銷/);
		assert.doesNotMatch(messages.isDelUser, /登出/);
		assert.match(messages.isBanUser, /停用/);
		assert.match(messages.attachmentGone, /附件/);
		assert.match(messages.perms['邮件删除'], /刪除/);
		assert.match(messages.perms['邮箱删除'], /刪除/);
		assert.match(messages.perms['用户删除'], /刪除/);
	}
});

test('system error pages use the request language without labeling mail content as English', () => {
	const french = context('fr-FR');
	const errorPage = emailTextTemplate(t(french, 'telegramAccessDenied'), requestLanguage(french));
	assert.match(errorPage, /<html lang='fr-FR' dir='ltr'>/);
	assert.ok(errorPage.includes(t(french, 'telegramAccessDenied')));
	const traditionalChinese = context('zh-TW');
	assert.match(emailTextTemplate(t(traditionalChinese, 'telegramAccessDenied'), requestLanguage(traditionalChinese)), /<html lang='zh-TW' dir='ltr'>/);
	const mailPage = emailTextTemplate('Bonjour');
	assert.match(mailPage, /<html>/);
	assert.doesNotMatch(mailPage, /lang='en'/);
});

test('all 16 published server languages have complete messages and interpolation fields', () => {
	const placeholders = value => [...value.matchAll(/\{\{\w+\}\}/g)].map(match => match[0]).sort();
	assert.equal(languages.length, 16);
	for (const {code: language} of languages) {
		const messages = translator.getResourceBundle(language, 'translation');
		assert.deepEqual(Object.keys(messages).sort(), Object.keys(en).sort(), language);
		assert.deepEqual(Object.keys(messages.perms).sort(), Object.keys(en.perms).sort(), language + ':perms');
		for (const [key, reference] of Object.entries(en)) {
			if (typeof reference !== 'string') continue;
			assert.ok(messages[key].trim(), language + ':' + key);
			assert.deepEqual(placeholders(messages[key]), placeholders(reference), language + ':' + key);
		}
		assert.equal(requestLanguage(context(language.toUpperCase() + '-XX')), language);
		assert.equal(t(context(language), 'bannedSend'), messages.bannedSend);
	}
});

test('destructive role permissions distinguish messages, addresses, and accounts', () => {
	for (const {code} of languages) {
		const {perms} = translator.getResourceBundle(code, 'translation');
		assert.notEqual(perms['邮件查看'], perms['邮箱查看'], `${code}: message vs address viewing`);
		assert.notEqual(perms['邮件删除'], perms['邮箱删除'], `${code}: message vs address deletion`);
		assert.notEqual(perms['用户注销'], perms['用户删除'], `${code}: own account vs user deletion`);
		assert.notEqual(perms['权限修改'], perms['身份修改'], `${code}: user role assignment vs role definition`);
	}
});

test('address permissions identify the address as their object', () => {
	const addressWords = {
		zh: /地址/, en: /address/i, es: /direcci/, fr: /adresse/, ja: /アドレス/,
		ko: /주소/, de: /Adresse/, pt: /endere/, ru: /адрес/, it: /indirizz/,
		id: /alamat/, vi: /địa chỉ/, tr: /adres/, ar: /عناوين|عنوان/,
		hi: /पता|पते/, 'zh-Hant': /地址/,
	};
	for (const {code} of languages) {
		const {perms} = translator.getResourceBundle(code, 'translation');
		for (const key of ['邮箱查看', '邮箱添加', '邮箱删除']) {
			assert.match(perms[key], addressWords[code], `${code}: ${key} must name an address`);
		}
	}
});

test('role and self-deletion permissions name the affected object in every language', () => {
	const terms = {
		zh: {own: /本人/, account: /账户/, user: /用户/, role: /角色/, rights: /权限/},
		en: {own: /own/i, account: /account/i, user: /user/i, role: /role/i, rights: /permissions/i},
		es: {own: /propia/, account: /cuenta/, user: /usuario/, role: /rol/, rights: /permisos/},
		fr: {own: /propre/, account: /compte/, user: /utilisateur/, role: /rôle/, rights: /autorisations/},
		ja: {own: /自分/, account: /アカウント/, user: /ユーザー/, role: /役割/, rights: /権限/},
		ko: {own: /내/, account: /계정/, user: /사용자/, role: /역할/, rights: /권한/},
		de: {own: /Eigenes/i, account: /Konto/, user: /Benutzer/, role: /rolle/i, rights: /berechtigungen/i},
		pt: {own: /própria/, account: /conta/, user: /usuário/, role: /função/, rights: /permissões/},
		ru: {own: /свою/, account: /учётную запись/, user: /пользователя/, role: /роль|роли/, rights: /права/},
		it: {own: /proprio/, account: /account/, user: /utente/, role: /ruolo/, rights: /permessi/},
		id: {own: /sendiri/, account: /akun/, user: /pengguna/, role: /peran/, rights: /izin/},
		vi: {own: /chính mình/, account: /tài khoản/, user: /người dùng/, role: /vai trò/, rights: /quyền/},
		tr: {own: /Kendi/i, account: /hesab/, user: /Kullanıc/i, role: /rol/i, rights: /izin/},
		ar: {own: /الشخصي/, account: /حساب/, user: /المستخدم/, role: /دور/, rights: /صلاحيات/},
		hi: {own: /अपना/, account: /खाता/, user: /उपयोगकर्ता/, role: /भूमिका/, rights: /अनुमतियाँ/},
		'zh-Hant': {own: /本人/, account: /帳戶/, user: /使用者/, role: /角色/, rights: /權限/},
	};
	for (const {code} of languages) {
		const perms = translator.getResourceBundle(code, 'translation').perms;
		const {own, account, user, role, rights} = terms[code];
		assert.match(perms['用户注销'], own, `${code}: deleting one's own account`);
		assert.match(perms['用户注销'], account, `${code}: deletion targets an account`);
		assert.match(perms['权限修改'], user, `${code}: changing a user's role`);
		assert.match(perms['权限修改'], role, `${code}: changing a user's role`);
		assert.match(perms['身份修改'], role, `${code}: editing a role definition`);
		assert.match(perms['身份修改'], rights, `${code}: editing role permissions`);
	}
});
