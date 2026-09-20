# deploy/

The files that go on the production server. **`docs/deployment.md` is the instructions** —
this is only what each file is and where it lands.

| File | Goes to | What it is |
|---|---|---|
| `.env.production.example` | `/home/forge/api.autevo.mk/api/.env` | Every production setting, with a note on what breaks while one is blank. Never commit the filled-in version. |
| `deploy.sh` | Forge → Site → Deploy Script | Pull, composer, migrate, seed, cache, restart the worker. Safe to run again. |
| `nginx-api.conf` | `/etc/nginx/sites-available/api.autevo.mk` | Forge writes its own; take the two marked blocks from this one. |
| `php.ini` | `/etc/php/8.4/fpm/conf.d/99-autevo.ini` | Upload limits. Without these a normal photo upload fails with a 413. |
| `autevo-queue.service` | `/etc/systemd/system/` | The queue worker. On Forge, a Daemon instead. |
| `autevo-scheduler.cron` | `crontab -u forge -e` | The scheduler. Four jobs depend on it and none of them complains when it is missing. |

Two things here are the ones that fail silently, so check them first when something
"just stopped": the **queue worker** and the **scheduler**.

Every path assumes the site root is `/home/forge/api.autevo.mk` and that **Laravel is in
its `api/` subdirectory** — this is a monorepo. The site's web directory is
`/api/public`, not `/public`.
