const encoder = new TextEncoder();

const saltHashUtils = {

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array));
	},


	async hashPassword(password) {
		const salt = this.generateSalt();
		const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
		// ponytail: Workers Web Crypto caps PBKDF2 at 100000 iterations; versioned format permits a future KDF upgrade.
		const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256);
		const hash = 'pbkdf2-sha256$100000$' + btoa(String.fromCharCode(...new Uint8Array(bits)));
		return { salt, hash };
	},

	async genHashPassword(password, salt) {
		const data = encoder.encode(salt + password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return btoa(String.fromCharCode(...hashArray));
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (typeof inputPassword !== 'string' || typeof storedHash !== 'string') return false;
		let hash;
		if (storedHash.startsWith('pbkdf2-sha256$')) {
			const [, rounds, expected] = storedHash.split('$');
			if (rounds !== '100000' || !expected) return false;
			const key = await crypto.subtle.importKey('raw', encoder.encode(inputPassword), 'PBKDF2', false, ['deriveBits']);
			const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: 100000 }, key, 256);
			hash = 'pbkdf2-sha256$100000$' + btoa(String.fromCharCode(...new Uint8Array(bits)));
		} else {
			hash = await this.genHashPassword(inputPassword, salt);
		}
		if (hash.length !== storedHash.length) return false;
		let difference = 0;
		for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
		return difference === 0;
	},

	genRandomPwd(length = 8) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < length; i++) {
			const random = crypto.getRandomValues(new Uint8Array(1))[0];
			if (random >= 256 - (256 % chars.length)) { i--; continue; }
			result += chars.charAt(random % chars.length);
		}
		return result;
	}
};

export default saltHashUtils;
