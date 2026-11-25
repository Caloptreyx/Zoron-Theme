use shared::{
    State,
    extensions::email_templates::{ExtensionEmailTemplateBuilder, UpdateEmailVariable},
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

pub fn register(mut builder: ExtensionEmailTemplateBuilder) -> ExtensionEmailTemplateBuilder {
    macro_rules! layouts {
        ($($kind:literal),+ $(,)?) => {
            $(
                let content = concat!("{% set kind = '", $kind, "' %}", include_str!("../mails/carbon.html"));
                builder = builder.mutate_template($kind, |template| {
                    template.default_content = content;
                });
            )+
        };
    }
    layouts!(
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
    );
    for &(name, value) in DEFAULTS {
        builder = builder.add_template_variable(None, name, value);
    }
    builder
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

pub async fn sync_current(state: &State) -> Result<(), anyhow::Error> {
    let _guard = SYNC.lock().await;
    let settings = state.settings.get().await?;
    let raw = settings
        .find_extension_settings::<crate::settings::ExtensionSettingsData>()
        .map(|stored| stored.theme.as_str())
        .unwrap_or("");
    let values = resolve(raw, &settings.app.url);
    drop(settings);
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
