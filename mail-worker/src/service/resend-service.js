import emailService from './email-service';
import { emailConst } from '../const/entity-const';

const resendService = {

	async webhooks(c, body) {
		const events = ['email.delivered', 'email.complained', 'email.bounced', 'email.delivery_delayed', 'email.failed'];
		if (!events.includes(body?.type) || !body?.data?.email_id) return 'ignored';

		const params = {
			resendEmailId: body.data.email_id,
			status: emailConst.status.SENT
		}

		if (body.type === 'email.delivered') {
			params.status = emailConst.status.DELIVERED
			params.message = null
		}

		if (body.type === 'email.complained') {
			params.status = emailConst.status.COMPLAINED
			params.message = null
		}

		if (body.type === 'email.bounced') {
			let bounce = body.data.bounce
			bounce = JSON.stringify(bounce);
			params.status = emailConst.status.BOUNCED
			params.message = bounce
		}

		if (body.type === 'email.delivery_delayed') {
			params.status = emailConst.status.DELAYED
			params.message = null
		}

		if (body.type === 'email.failed') {
			params.status = emailConst.status.FAILED
			params.message = JSON.stringify({ message: body.data.failed?.reason || 'Delivery failed' })
		}

		const emailRow = await emailService.updateEmailStatus(c, params)

		if (!emailRow) {
			const existing = await c.env.db.prepare('SELECT email_id FROM email WHERE resend_email_id = ? LIMIT 1').bind(params.resendEmailId).first();
			if (existing) return 'ignored'; // Out-of-order events cannot regress a final status.
			// A callback can arrive before send() has inserted its D1 record.
			// Retry only fresh events; unrelated older events must not disable the webhook.
			const age = Date.now() - Date.parse(body.created_at);
			return Number.isFinite(age) && age >= -10000 && age < 90000 ? 'retry' : 'ignored';
		}
		return 'updated';

	}
}

export default resendService
