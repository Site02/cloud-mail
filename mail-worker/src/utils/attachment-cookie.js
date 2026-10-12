export function attachmentCookieOptions(c) {
  const local = c.env.local_dev === true;
  return {
    name: local ? 'cloudmail-local-attachment' : '__Host-cloudmail-attachment',
    options: { secure: !local, httpOnly: true, sameSite: 'Strict', path: '/', maxAge: 60 * 60 * 24 * 7 },
  };
}
