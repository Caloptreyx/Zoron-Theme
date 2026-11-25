//! Zoron's Carbon layout for the panel's ten emails, used only while the theme's `emailTemplates` ("Use Zoron
//! email templates" in Studio) is on; off, the default, the panel sends its own.
//!
//! The layout is written into each template's stored content (what Admin → Mail Templates saves), so turning
//! the setting on or off takes effect at once, without a restart. A template counts as Zoron's while its stored
//! content is exactly a layout Zoron wrote (`ours`): only those are replaced or, with the setting off, cleared
//! back to the panel's own. One an operator edited, or saved from scratch, is never touched. Zoron 1.0.8 put the
//! layout in as the panel's default content instead, on every install; a copy of it saved unchanged counts as
//! Zoron's too, so the first boot of a newer version (the setting off) restores those to stock.
//!
//! Colours, radii, the logo and the footer are global `zoron_email_*` variables the layout reads, synced from the
//! saved theme while the templates are on and "Sync emails with the saved theme" is.

use shared::{
    State,
    extensions::email_templates::{
        ExtensionEmailTemplateBuilder, UpdateEmailTemplate, UpdateEmailVariable,
    },
};

static SYNC: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

const DEFAULTS: &[(&str, &str)] = &[
    ("zoron_email_bg", "#0c0d10"),
    ("zoron_email_surface", "#15171b"),
    ("zoron_email_border", "#34363d"),
    ("zoron_email_text", "#e6e8ec"),
    ("zoron_email_accent", "#7c9fe0"),
    ("zoron_email_ink", "#0c0d10"),
    ("zoron_email_radius", "14px"),
    ("zoron_email_button_radius", "9px"),
    ("zoron_email_logo", ""),
    ("zoron_email_footer", ""),
];

/// The panel's templates the layout covers.
const KINDS: &[&str] = &[
    "account_created",
    "password_reset",
    "email_verification",
    "two_factor_code",
    "session_created",
    "connection_test",
    "added_to_server",
    "removed_from_server",
    "server_installed",
    "server_restored",
];

/// Every layout a released Zoron wrote, newest first. When the layout changes, add the new file in front and keep
/// the old ones, so templates still holding an old one are recognised as Zoron's.
const LAYOUTS: &[&str] = &[include_str!("../mails/carbon.html")];

/// Heads the content Zoron writes (a template comment, not part of the email), for operators reading it in Admin →
/// Mail Templates. Absent from what 1.0.8 used.
const MARKER: &str = "{# Zoron email template, from \"Use Zoron email templates\" in Zoron Studio. Zoron replaces or removes it while it is unchanged; edit it and it is yours. #}\n";

/// The variables the layout reads, with the Carbon defaults. Registered whether or not the templates are on, so
/// they can be turned on without a restart; the panel's own templates ignore them.
pub fn register(mut builder: ExtensionEmailTemplateBuilder) -> ExtensionEmailTemplateBuilder {
    for &(name, value) in DEFAULTS {
        builder = builder.add_template_variable(None, name, value);
    }
    builder
}

fn kind_prefix(kind: &str) -> String {
    format!("{{% set kind = '{kind}' %}}")
}

/// The content Zoron writes for one template.
fn generated(kind: &str) -> String {
    format!("{MARKER}{}{}", kind_prefix(kind), LAYOUTS[0])
}

/// Whether stored content is exactly a layout Zoron wrote for `kind` (this version's or an earlier one), give or
/// take line endings and trailing whitespace an editor may add on saving.
fn ours(kind: &str, content: &str) -> bool {
    let content = content.replace("\r\n", "\n");
    let content = content.strip_prefix(MARKER).unwrap_or(&content);
    content
        .strip_prefix(&kind_prefix(kind))
        .is_some_and(|layout| {
            LAYOUTS
                .iter()
                .any(|known| layout.trim_end() == known.trim_end())
        })
}

/// What to store for one template: `Some(Some(html))` writes the layout, `Some(None)` clears the stored content (the
/// panel's own again), `None` leaves it. `stored` is the template's stored content, None while it is the panel's own.
fn plan(kind: &str, stored: Option<&str>, on: bool) -> Option<Option<String>> {
    match stored {
        None if on => Some(Some(generated(kind))),
        Some(content) if ours(kind, content) => {
            if !on {
                Some(None)
            } else if content != generated(kind) {
                Some(Some(generated(kind)))
            } else {
                None
            }
        }
        _ => None,
    }
}

/// Whether the saved theme asks for Zoron's email templates; off unless it says so.
fn templates_on(theme: &serde_json::Value) -> bool {
    theme["emailTemplates"].as_bool() == Some(true)
}

/// The theme fields that decide what the panel's emails look like. A theme save that changes any of them changes
/// every panel email, so it needs core's `email-templates.update` as well (routes.rs).
#[derive(Debug, PartialEq)]
pub(crate) struct EmailSettings {
    templates: bool,
    sync: bool,
    logo: String,
    footer: String,
}

pub(crate) fn email_settings(theme: Option<&serde_json::Value>) -> EmailSettings {
    let theme = theme.unwrap_or(&serde_json::Value::Null);
    let text = |key: &str| theme[key].as_str().unwrap_or("").trim().to_owned();
    EmailSettings {
        templates: templates_on(theme),
        sync: theme["emailSync"].as_bool() != Some(false),
        logo: text("emailLogo"),
        footer: text("emailFooter"),
    }
}

fn safe_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    let path = lower
        .strip_prefix("https://")
        .or_else(|| lower.strip_prefix("http://"))
        .or_else(|| {
            (!lower.starts_with("//"))
                .then(|| lower.strip_prefix('/'))
                .flatten()
        });
    path.is_some_and(|path| !path.is_empty())
        && url.len() <= 8192
        && !url.chars().any(|c| {
            c.is_control()
                || c.is_whitespace()
                || matches!(
                    c,
                    '"' | '\'' | '(' | ')' | '\\' | '<' | '>' | ';' | '{' | '}'
                )
        })
}

fn footer(text: &str) -> String {
    let mut html = String::new();
    for c in text.trim().chars().filter(|c| !c.is_control()).take(200) {
        match c {
            '&' => html.push_str("&amp;"),
            '<' => html.push_str("&lt;"),
            '>' => html.push_str("&gt;"),
            '{' => html.push_str("&#123;"),
            '}' => html.push_str("&#125;"),
            _ => html.push(c),
        }
    }
    html
}

fn resolve(raw: &str, app_url: &str) -> Option<Vec<(&'static str, String)>> {
    let theme: serde_json::Value = serde_json::from_str(raw).unwrap_or_default();
    if theme["emailSync"].as_bool() == Some(false) {
        return None;
    }
    let text = |key: &str| theme[key].as_str().unwrap_or("").trim();
    let color = |key: &str| {
        let value = theme[key].as_str()?;
        (value.len() == 7
            && value.starts_with('#')
            && value.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit))
        .then(|| value.to_ascii_lowercase())
    };
    let radius = |key: &str, max: f64| {
        let value = theme[key].as_f64()?;
        Some(format!("{}px", (value + 0.5).floor().clamp(0.0, max)))
    };
    let logo = text("emailLogo");
    let accent = color("accent");
    let ink = accent.as_deref().and_then(|hex| {
        let rgb = u32::from_str_radix(&hex[1..], 16).ok()?;
        let linear = |shift: u32| {
            let c = ((rgb >> shift) & 255u32) as f64 / 255.0;
            if c <= 0.04045 {
                c / 12.92
            } else {
                ((c + 0.055) / 1.055).powf(2.4)
            }
        };
        let l = 0.2126 * linear(16) + 0.7152 * linear(8) + 0.0722 * linear(0);
        Some(if l >= 0.18 { "#0c0d10" } else { "#ffffff" }.to_owned())
    });
    Some(
        DEFAULTS
            .iter()
            .map(|&(name, default)| {
                let custom = match name {
                    "zoron_email_bg" => color("background"),
                    "zoron_email_surface" => color("surface"),
                    "zoron_email_text" => color("text"),
                    "zoron_email_accent" => accent.clone(),
                    "zoron_email_ink" => ink.clone(),
                    "zoron_email_radius" => radius("radius", 32.0),
                    "zoron_email_button_radius" => radius("controlRadius", 24.0),
                    "zoron_email_logo" if logo.len() <= 2048 && safe_url(logo) => {
                        let base = app_url.trim().trim_end_matches('/');
                        let url = if logo.starts_with('/') {
                            format!("{base}{logo}")
                        } else {
                            logo.to_owned()
                        };
                        (!url.starts_with('/') && safe_url(&url)).then_some(url)
                    }
                    "zoron_email_footer" => Some(footer(text("emailFooter"))),
                    _ => None,
                };
                (name, custom.unwrap_or_else(|| default.to_owned()))
            })
            .collect(),
    )
}

/// Brings the panel's emails in line with the saved theme: with `emailTemplates` on, writes the layout into every
/// template still on the panel's own content or holding a layout Zoron wrote, and syncs the colours; off, clears
/// every template holding a layout Zoron wrote, so the panel's own applies again. Runs on boot and on every save.
pub async fn sync_current(state: &State) -> Result<(), anyhow::Error> {
    let _guard = SYNC.lock().await;
    let settings = state.settings.get().await?;
    let raw = settings
        .find_extension_settings::<crate::settings::ExtensionSettingsData>()
        .map(|stored| stored.theme.as_str())
        .unwrap_or("");
    let on = templates_on(&serde_json::from_str(raw).unwrap_or_default());
    let values = if on {
        resolve(raw, &settings.app.url)
    } else {
        None
    };
    drop(settings);

    for &kind in KINDS {
        let Ok(template) = state.mail.templates.get_template(kind) else {
            continue;
        };
        let fetched = template.get(state).await?;
        // borrowed: no stored content, the template's default applies
        let stored = match &fetched.content {
            std::borrow::Cow::Owned(content) if content != template.default_content => {
                Some(content.as_str())
            }
            _ => None,
        };
        if let Some(content) = plan(kind, stored, on) {
            template
                .update(
                    state,
                    UpdateEmailTemplate {
                        content: Some(content),
                        subject: None,
                        enabled: None,
                    },
                )
                .await?;
        }
    }

    let Some(values) = values else {
        return Ok(());
    };
    let existing = state.mail.templates.get_variables(state, None).await?;
    for (name, desired) in values {
        let Some(variable) = existing.iter().find(|item| item.name == name) else {
            continue;
        };
        let value = (variable.default_value.as_deref() != Some(&desired)).then_some(desired);
        if variable.value != value {
            state
                .mail
                .templates
                .update_variable(
                    state,
                    variable,
                    UpdateEmailVariable {
                        value: Some(value),
                        value_translations: None,
                    },
                )
                .await?;
        }
    }
    Ok(())
}

pub fn spawn_boot_sync(state: State) {
    tokio::spawn(async move {
        for _ in 0..50 {
            if state
                .mail
                .templates
                .get_variables(&state, None)
                .await
                .is_ok_and(|vars| vars.iter().any(|v| v.name == "zoron_email_bg"))
            {
                if let Err(err) = sync_current(&state).await {
                    tracing::warn!("Zoron email branding boot sync failed: {err:#}");
                }
                return;
            }
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
        }
        tracing::warn!("Zoron email branding sync timed out waiting for email registration");
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn malformed_or_old_theme_uses_carbon() {
        for settings in ["", "broken", "{}"] {
            let values = resolve(settings, "").unwrap();
            assert!(
                values
                    .iter()
                    .zip(DEFAULTS)
                    .all(|((a, b), (x, y))| a == x && b == y)
            );
        }
        assert!(resolve(r#"{"emailSync":false}"#, "").is_none());
    }

    /// What Zoron 1.0.8 used as each template's default content, before the setting existed.
    fn released_1_0_8(kind: &str) -> String {
        format!(
            "{{% set kind = '{kind}' %}}{}",
            include_str!("../mails/carbon.html")
        )
    }

    #[test]
    fn templates_are_off_unless_the_theme_turns_them_on() {
        for raw in [
            "",
            "broken",
            "{}",
            r#"{"emailTemplates":false}"#,
            r#"{"emailTemplates":"yes"}"#,
        ] {
            assert!(
                !templates_on(&serde_json::from_str(raw).unwrap_or_default()),
                "{raw}"
            );
        }
        assert!(templates_on(&serde_json::json!({ "emailTemplates": true })));
        // off, a template on the panel's own content stays so
        for &kind in KINDS {
            assert_eq!(plan(kind, None, false), None);
        }
    }

    #[test]
    fn turning_on_writes_the_layout() {
        for &kind in KINDS {
            let written = plan(kind, None, true).unwrap().unwrap();
            assert!(written.starts_with(MARKER));
            assert!(written.contains(&format!("{{% set kind = '{kind}' %}}<!doctype html>")));
            assert!(ours(kind, &written));
            // already written: nothing to do
            assert_eq!(plan(kind, Some(&written), true), None);
        }
    }

    #[test]
    fn turning_off_restores_the_panels_own() {
        for &kind in KINDS {
            let written = generated(kind);
            assert_eq!(plan(kind, Some(&written), false), Some(None));
            // an editor's line endings and trailing newline still count as unchanged
            let resaved = format!("{}\r\n", written.replace('\n', "\r\n"));
            assert_eq!(plan(kind, Some(&resaved), false), Some(None));
        }
    }

    #[test]
    fn upgrade_restores_untouched_1_0_8_templates() {
        for &kind in KINDS {
            let old = released_1_0_8(kind);
            assert_eq!(plan(kind, Some(&old), false), Some(None));
            // on, the old layout is brought up to date
            assert_eq!(plan(kind, Some(&old), true), Some(Some(generated(kind))));
        }
    }

    #[test]
    fn customised_templates_are_never_touched() {
        let edited = generated("password_reset").replace("font-size:28px", "font-size:30px");
        let old_edited = released_1_0_8("password_reset").replace("Arial", "Georgia");
        let own = "<p>{{ vars.intro }}</p>";
        // another template's layout is not this one's
        let other_kind = generated("account_created");
        for stored in [
            edited.as_str(),
            old_edited.as_str(),
            own,
            other_kind.as_str(),
        ] {
            assert!(!ours("password_reset", stored));
            assert_eq!(plan("password_reset", Some(stored), false), None);
            assert_eq!(plan("password_reset", Some(stored), true), None);
        }
    }

    #[test]
    fn email_settings_change_only_with_the_email_fields() {
        let saved = serde_json::json!({ "accent": "#123456", "emailTemplates": true });
        let recoloured = serde_json::json!({ "accent": "#654321", "emailTemplates": true });
        assert_eq!(
            email_settings(Some(&saved)),
            email_settings(Some(&recoloured))
        );
        // missing fields read as their defaults
        assert_eq!(
            email_settings(None),
            email_settings(Some(
                &serde_json::json!({ "emailTemplates": false, "emailSync": true })
            ))
        );
        for changed in [
            serde_json::json!({ "accent": "#123456" }),
            serde_json::json!({ "accent": "#123456", "emailTemplates": true, "emailSync": false }),
            serde_json::json!({ "accent": "#123456", "emailTemplates": true, "emailLogo": "/x.png" }),
            serde_json::json!({ "accent": "#123456", "emailTemplates": true, "emailFooter": "Hi" }),
        ] {
            assert_ne!(email_settings(Some(&saved)), email_settings(Some(&changed)));
        }
    }

    #[test]
    fn resolves_logo_and_escapes_footer() {
        let raw = r#"{"emailLogo":"/mark.png","emailFooter":"<b>{{secret}}</b>","accent":"black","radius":999}"#;
        let values = resolve(raw, "https://panel.example").unwrap();
        let values: std::collections::BTreeMap<_, _> = values.into_iter().collect();
        assert_eq!(values["zoron_email_logo"], "https://panel.example/mark.png");
        assert_eq!(
            values["zoron_email_footer"],
            "&lt;b&gt;&#123;&#123;secret&#125;&#125;&lt;/b&gt;"
        );
        assert_eq!(values["zoron_email_accent"], "#7c9fe0");
        assert_eq!(values["zoron_email_radius"], "32px");
        for url in [
            "//outside.test/mark.png",
            "https://example.test/{{x}}",
            "data:image/png,x",
        ] {
            assert!(!safe_url(url));
        }
    }
}
