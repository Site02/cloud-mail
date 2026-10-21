import resendService from '../service/resend-service';
import app from '../hono/hono';
import { Resend } from 'resend';

app.post('/webhooks', async (c) => {
        try {
                const payload = await c.req.text();

                const svixId = c.req.header('svix-id');
                const svixTimestamp = c.req.header('svix-timestamp');
                const svixSignature = c.req.header('svix-signature');

                if (!svixId || !svixTimestamp || !svixSignature) {
                        return c.text('Missing webhook signature', 400);
                }

                if (!c.env.RESEND_WEBHOOK_SECRET) {
                        console.error('RESEND_WEBHOOK_SECRET is not configured');
                        return c.text('Webhook secret not configured', 500);
                }

                const resend = new Resend(c.env.RESEND_API_KEY);

                const event = resend.webhooks.verify({
                        payload,
                        headers: {
                                id: svixId,
                                timestamp: svixTimestamp,
                                signature: svixSignature
                        },
                        webhookSecret: c.env.RESEND_WEBHOOK_SECRET
                });

                await resendService.webhooks(c, event);

                return c.text('success', 200);

        } catch (e) {
                console.error('Webhook verification failed:', e);
                return c.text('Invalid webhook signature', 400);
        }
});