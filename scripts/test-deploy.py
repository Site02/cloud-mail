import importlib.util, pathlib, tomllib, unittest
p=pathlib.Path(__file__).with_name('deploy.py')
spec=importlib.util.spec_from_file_location('deploy',p); deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
class DeployTests(unittest.TestCase):
    def fixture(self):
        return {'CLOUDFLARE_ACCOUNT_ID':'0'*32,'CLOUDFLARE_API_TOKEN':'fake-token','JWT_SECRET':'j'*40,'BOOTSTRAP_SECRET':'b'*40,'ADMIN_PASSWORD':'p'*24,'ADMIN':'admin@haoxi1688.com','CUSTOM_DOMAIN':'mail.haoxi1688.com','DOMAIN':'["haoxi1688.com"]'}
    def test_secrets_are_not_written_into_generated_config(self):
        config=deploy.settings(self.fixture());text=deploy.render(config,'fake-d1','fake-kv');data=tomllib.loads(text)
        self.assertEqual(data['vars']['domain'],['haoxi1688.com'])
        self.assertEqual(data['routes'][0]['pattern'],'mail.haoxi1688.com')
        self.assertNotIn(config['JWT_SECRET'],text);self.assertNotIn(config['BOOTSTRAP_SECRET'],text);self.assertNotIn(config['ADMIN_PASSWORD'],text)
        self.assertNotIn('local_dev',data['vars'])
    def test_root_website_cannot_be_replaced_by_mail_worker(self):
        env=self.fixture();env['CUSTOM_DOMAIN']='haoxi1688.com'
        with self.assertRaises(ValueError):deploy.settings(env)
    def test_different_signing_and_bootstrap_secrets_required(self):
        env=self.fixture();env['BOOTSTRAP_SECRET']=env['JWT_SECRET']
        with self.assertRaises(ValueError):deploy.settings(env)
    def test_private_r2_binding_is_optional(self):
        env=self.fixture();env['R2_BUCKET_NAME']='haoxi-cloud-mail-attachments'; data=tomllib.loads(deploy.render(deploy.settings(env),'d','k'))
        self.assertEqual(data['r2_buckets'][0]['binding'],'r2')
        self.assertNotIn('send_email',data)
if __name__=='__main__':unittest.main()
