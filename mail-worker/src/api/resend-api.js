import resendService from '../service/resend-service';
import app from '../hono/hono';
import { Resend } from 'resend';
app.post('/webhooks',async (c) => {
	if (!c.env.resend_webhook_secret) return c.text('Webhook not configured', 503);
	const payload = await c.req.text();
	let event;
	try {
		event = new Resend('verification-only').webhooks.verify({
			payload,
			webhookSecret: c.env.resend_webhook_secret,
			headers: {
				id: c.req.header('svix-id'),
				timestamp: c.req.header('svix-timestamp'),
				signature: c.req.header('svix-signature'),
			},
		});
	} catch {
		return c.text('Invalid signature', 400);
	}
	try {
		const outcome = await resendService.webhooks(c, event);
		if (outcome === 'retry') return c.text('Email record pending', 503);
		return c.text('success', 200)
	} catch (e) {
		console.error('Webhook processing failed', e);
		return c.text('Temporary processing failure', 503)
	}
})
