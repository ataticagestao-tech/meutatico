import httpx


class LogoService:
    """Busca logo de empresas pelo domínio do email."""

    TIMEOUT = 5

    GENERIC_PROVIDERS = {
        "gmail.com", "googlemail.com",
        "hotmail.com", "outlook.com", "live.com", "msn.com",
        "yahoo.com", "yahoo.com.br",
        "icloud.com", "me.com", "mac.com",
        "aol.com",
        "uol.com.br", "bol.com.br", "terra.com.br",
        "ig.com.br", "globo.com", "globomail.com",
        "zipmail.com.br", "oi.com.br",
        "protonmail.com", "proton.me",
        "tutanota.com", "zoho.com",
    }

    @staticmethod
    def extract_domain(email: str) -> str | None:
        if not email or "@" not in email:
            return None
        domain = email.split("@")[1].lower().strip()
        if domain in LogoService.GENERIC_PROVIDERS:
            return None
        return domain

    async def fetch_logo_url(self, email: str) -> str | None:
        domain = self.extract_domain(email)
        if not domain:
            return None

        async with httpx.AsyncClient(
            timeout=self.TIMEOUT, follow_redirects=True
        ) as client:
            # Tentativa 1: Clearbit
            try:
                clearbit_url = f"https://logo.clearbit.com/{domain}"
                resp = await client.head(clearbit_url)
                if resp.status_code == 200:
                    ct = resp.headers.get("content-type", "")
                    if "image" in ct:
                        return clearbit_url
            except Exception:
                pass

            # Tentativa 2: Google Favicons
            try:
                google_url = (
                    f"https://www.google.com/s2/favicons?domain={domain}&sz=128"
                )
                resp = await client.head(google_url)
                if resp.status_code == 200:
                    return google_url
            except Exception:
                pass

        return None
