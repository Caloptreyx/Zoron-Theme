#!/usr/bin/env python3
"""Render the actual email layout with Calagopus English variables (requires Jinja2)."""

import json
import re
import sys
from html import escape
from pathlib import Path

from jinja2 import Environment
from markupsafe import Markup

root = Path(__file__).resolve().parents[1]
env = Environment(autoescape=True)
template = env.from_string((root / "backend/mails/carbon.html").read_text())
source = (root / "backend/src/mail.rs").read_text()
defaults = dict(re.findall(r'\("(zoron_email_\w+)", "([^"]*)"\)', source))
identifiers = re.findall(r'"(\w+)"', source.split("const KINDS", 1)[1].split("];", 1)[0])
wording = json.loads(Path(sys.argv[1]).read_text())

context = {
    "language": "en",
    "settings": {"app": {"name": "Zoron", "url": "https://panel.example.test"}},
    "user": {"username": "Alex"},
    "server": {"name": "Survival"},
    "email": "alex@example.test",
    "code": "482 961",
    "ip": "192.0.2.42",
    "user_agent": "Firefox on Linux",
    **{name: "https://panel.example.test" for name in (
        "reset_link", "verification_link", "server_link", "sessions_link",
    )},
}

frames = []
for identifier in identifiers:
    vars_ = {key: Markup(env.from_string(value).render(**context))
             for key, value in wording[identifier].items()}
    subject = str(vars_["subject"])
    email = template.render(**context, vars=defaults | vars_, subject=subject, kind=identifier)
    frames.append(
        f'<section><h2>{escape(subject)}</h2>'
        f'<iframe sandbox title="{escape(subject)}" srcdoc="{escape(email)}"></iframe></section>'
    )
assert len(frames) == 10
print("""<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Zoron email preview</title>
<style>
:root { color-scheme: dark; font: 16px system-ui; background: #0c0d10; color: #e6e8ec; }
body { margin: 2rem auto; padding: 0 1rem; max-width: 76rem; }
h1 { margin-bottom: .5rem; }
p { color: #abafba; margin: 0 0 2rem; }
main { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(100%,34rem),1fr)); gap: 1.5rem; }
h2 { font-size: .95rem; font-weight: 600; }
iframe { width: 100%; height: 34rem; border: 1px solid #34363d; border-radius: 14px; box-sizing: border-box; }
</style>
<h1>Zoron email preview</h1>
<p>Ten core emails in the default Carbon palette, rendered with sample data. No emails are sent.</p>
<main>""")
print("\n".join(frames))
print("</main></html>")
